import { apiClient } from "./api";

export type PaymentMethod = "cash" | "upi" | "card" | "cheque";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
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
  tenant_id?: string; // PlatformOwner only
}

export interface PaymentsSearchResponse {
  items: Payment[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const paymentsApi = {
  async create(payment: CreatePaymentRequest, tenantId?: string): Promise<Payment> {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await apiClient.post<Payment>("/payments", payment, { params });
    return response.data;
  },

  async list(params?: PaymentsSearchParams): Promise<PaymentsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.invoice_id) queryParams.append("invoice_id", params.invoice_id);
    if (params?.tenant_id) queryParams.append("tenant_id", params.tenant_id);
    
    const queryString = queryParams.toString();
    const url = `/payments${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<PaymentsSearchResponse>(url);
    return response.data;
  },

  async getById(paymentId: string, tenantId?: string): Promise<Payment> {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await apiClient.get<Payment>(`/payments/${paymentId}`, { params });
    return response.data;
  },
};

