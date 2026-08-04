import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { InvoiceStatus } from "./invoicesApi";

export type PaymentMethod = "cash" | "upi" | "card" | "cheque";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  patient_id?: string;
  patient_name?: string;
  patient_mobile?: string;
  payment_number: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  payment_date: string; // ISO 8601
  status: PaymentStatus;
  notes: string | null;
  invoice_number?: string | null;
  invoice_type?: string | null;
  service_category?: string | null;
  invoice_amount?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentRequest {
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string | null;
  payment_date?: string; // ISO 8601, defaults to now
  notes?: string;
}

export interface PaymentsSearchParams {
  page?: number;
  page_size?: number;
  invoice_id?: string;
  patient_id?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  tenant_id?: string; // PlatformOwner only
}

export interface PaymentsSearchResponse {
  items: Payment[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaymentMethodSummaryItem {
  payment_method: string;
  transaction_count: number;
  total_amount: number;
  percentage: number;
}

export interface PaymentReportSummaryResponse {
  start_date: string | null;
  end_date: string | null;
  total_collected: number;
  total_transactions: number;
  by_payment_method: PaymentMethodSummaryItem[];
  items: Payment[];
}

export interface PaymentReportParams {
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  status?: string;
  tenant_id?: string;
}

export type BillingTransactionRowType = "invoice" | "payment";

/**
 * One row of the combined Billing screen feed: either an invoice (with its
 * payments nested under `payments`, possibly empty), or a payment that has no
 * invoice at all (e.g. a surgery advance) - `payment` is set, all invoice-only
 * fields are null.
 */
export interface BillingTransactionRow {
  row_type: BillingTransactionRowType;
  id: string;
  row_date: string; // ISO 8601
  patient_id: string | null;
  patient_name: string | null;
  patient_mobile: string | null;
  invoice_number: string | null;
  invoice_status: InvoiceStatus | null;
  subtotal: number | null; // original, pre-discount amount
  discount: number | null;
  total_amount: number | null; // agreed/discounted amount owed
  paid_amount: number | null;
  fee_overridden: boolean;
  original_consultation_fee: number | null;
  /**
   * True pre-discount/pre-override amount when it differs from `subtotal` -
   * covers cases where the override was baked into the line item price rather
   * than recorded as a discount (OPD fee override, lab test price override).
   * Null when `subtotal` already reflects the original price correctly.
   */
  original_amount: number | null;
  payments: Payment[];
  payment: Payment | null;
}

export interface BillingTransactionsSearchParams {
  page?: number;
  page_size?: number;
  patient_id?: string;
  payment_method?: string;
  status?: InvoiceStatus;
  start_date?: string;
  end_date?: string;
  tenant_id?: string;
}

export interface BillingTransactionsSearchResponse {
  items: BillingTransactionRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Filters accepted by the Billing screen's dashboard stats - patient/date only,
 * deliberately not status or payment_method (see BillingStatsResponse). */
export interface BillingStatsParams {
  patient_id?: string;
  start_date?: string;
  end_date?: string;
  tenant_id?: string;
}

/**
 * Dashboard summary for the Billing screen: revenue/paid/pending totals plus a
 * collected-by-payment-method breakdown. Filtered by patient/date range only -
 * stays stable while the transaction list below is narrowed by status/method.
 */
/**
 * Received/refunded/net breakdown for one payment method, used by the Billing
 * screen's dashboard stats (separate from PaymentMethodSummaryItem, which the
 * older payment-method report still uses).
 */
export interface PaymentMethodBreakdown {
  payment_method: string;
  transaction_count: number;
  received_amount: number;
  refunded_amount: number;
  actual_amount: number;
  percentage: number;
}

export interface BillingStatsResponse {
  total_revenue: number;
  total_paid: number;
  total_pending: number;
  total_invoices: number;
  by_payment_method: PaymentMethodBreakdown[];
}

export const paymentsApi = {
  async create(payment: CreatePaymentRequest, tenantId?: string): Promise<Payment> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<Payment>("/payments", payment, { params });
    return response.data;
  },

  async list(params?: PaymentsSearchParams): Promise<PaymentsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.invoice_id) queryParams.append("invoice_id", params.invoice_id);
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);
    
    const queryString = queryParams.toString();
    const url = `/payments${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<PaymentsSearchResponse>(url);
    return response.data;
  },

  async getById(paymentId: string, tenantId?: string): Promise<Payment> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<Payment>(`/payments/${paymentId}`, { params });
    return response.data;
  },

  async getByInvoiceId(invoiceId: string, tenantId?: string): Promise<Payment[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<Payment[]>(`/payments/invoice/${invoiceId}`, { params });
    return response.data;
  },

  async getPaymentMethodReport(params?: PaymentReportParams): Promise<PaymentReportSummaryResponse> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.payment_method) queryParams.append("payment_method", params.payment_method);
    if (params?.status) queryParams.append("status", params.status);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/payments/reports/by-payment-method${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get<PaymentReportSummaryResponse>(url);
    return response.data;
  },

  async downloadPaymentReportCsv(params?: PaymentReportParams): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.payment_method) queryParams.append("payment_method", params.payment_method);
    if (params?.status) queryParams.append("status", params.status);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/payments/reports/export-csv${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get<Blob>(url, { responseType: "blob" });
    return response.data;
  },

  async getBillingStats(params?: BillingStatsParams): Promise<BillingStatsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/payments/stats${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get<BillingStatsResponse>(url);
    return response.data;
  },

  async listTransactions(
    params?: BillingTransactionsSearchParams
  ): Promise<BillingTransactionsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.payment_method) queryParams.append("payment_method", params.payment_method);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/payments/transactions${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get<BillingTransactionsSearchResponse>(url);
    return response.data;
  },

  async exportTransactionsCsv(
    params?: Omit<BillingTransactionsSearchParams, "page" | "page_size">
  ): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.payment_method) queryParams.append("payment_method", params.payment_method);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/payments/transactions/export-csv${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get<Blob>(url, { responseType: "blob" });
    return response.data;
  },

  async createRefund(
    paymentId: string,
    refund: {
      refund_amount: number;
      refund_method: PaymentMethod;
      refund_reference?: string | null;
      reason: string;
      notes?: string | null;
    },
    tenantId?: string
  ) {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post(`/payments/${paymentId}/refund`, refund, { params });
    return response.data;
  },
};


