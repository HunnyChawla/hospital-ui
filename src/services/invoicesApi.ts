import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type InvoiceStatus = "pending" | "partial" | "paid" | "cancelled" | "refunded";

export interface InvoiceLineItem {
  id?: string;
  billing_item_id?: string | null;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  discount?: number | string;
  total?: number;
  total_price?: number | string;
  created_at?: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  patient_id: string;
  patient_name?: string;
  patient_mobile?: string;
  visit_id: string | null;
  invoice_number: string;
  invoice_date: string; // YYYY-MM-DD
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount?: number;
  status: InvoiceStatus;
  invoice_type?: string;
  payment_id?: string | null;
  gst_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceLineItem {
  billing_item_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface CreateInvoiceRequest {
  patient_id: string;
  visit_id?: string | null;
  invoice_date?: string; // YYYY-MM-DD, defaults to today
  line_items: CreateInvoiceLineItem[];
  tax_rate?: number; // 0-100, defaults to 0
  discount?: number;
  gst_number?: string;
  notes?: string;
}

export interface InvoicesSearchParams {
  page?: number;
  page_size?: number;
  patient_id?: string;
  status?: InvoiceStatus;
  tenant_id?: string; // PlatformOwner only
}

export interface InvoicesSearchResponse {
  items: Invoice[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const invoicesApi = {
  async create(invoice: CreateInvoiceRequest, tenantId?: string): Promise<Invoice> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<Invoice>("/invoices", invoice, { params });
    return response.data;
  },

  async list(params?: InvoicesSearchParams): Promise<InvoicesSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.status) queryParams.append("status", params.status);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);
    
    const queryString = queryParams.toString();
    const url = `/invoices${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<InvoicesSearchResponse>(url);
    return response.data;
  },

  async getById(invoiceId: string, tenantId?: string): Promise<Invoice> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<Invoice>(`/invoices/${invoiceId}`, { params });
    return response.data;
  },
};

