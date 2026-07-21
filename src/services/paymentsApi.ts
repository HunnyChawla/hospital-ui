import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

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
};


