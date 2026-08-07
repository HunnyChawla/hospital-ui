import { apiClient } from "./api";
import {
  Quote,
  CreateQuoteRequest,
  UpdateQuoteRequest,
  PlatformInvoice,
  CreatePlatformInvoiceRequest,
  UpdatePlatformInvoiceRequest,
  Receipt,
  CreateReceiptRequest,
  Agreement,
  CreateAgreementRequest,
  UpdateAgreementRequest,
  AgreementClause,
  QuoteStatus,
  PlatformInvoiceStatus,
  AgreementStatus,
} from "@/types/platformBilling";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface QuoteSearchParams {
  page?: number;
  page_size?: number;
  tenant_id?: string;
  status?: QuoteStatus;
}

export interface InvoiceSearchParams {
  page?: number;
  page_size?: number;
  tenant_id?: string;
  status?: PlatformInvoiceStatus;
  start_date?: string;
  end_date?: string;
}

export interface ReceiptSearchParams {
  page?: number;
  page_size?: number;
  tenant_id?: string;
  platform_invoice_id?: string;
}

export interface AgreementSearchParams {
  page?: number;
  page_size?: number;
  tenant_id?: string;
  status?: AgreementStatus;
}

export const platformBillingApi = {
  quotes: {
    async create(data: CreateQuoteRequest): Promise<Quote> {
      const response = await apiClient.post<Quote>("/platform/quotes", data);
      return response.data;
    },

    async list(params?: QuoteSearchParams): Promise<PaginatedResponse<Quote>> {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
      if (params?.tenant_id) queryParams.append("tenant_id", params.tenant_id);
      if (params?.status) queryParams.append("status", params.status);

      const response = await apiClient.get<PaginatedResponse<Quote>>(`/platform/quotes?${queryParams.toString()}`);
      return response.data;
    },

    async getById(id: string): Promise<Quote> {
      const response = await apiClient.get<Quote>(`/platform/quotes/${id}`);
      return response.data;
    },

    async update(id: string, data: UpdateQuoteRequest): Promise<Quote> {
      const response = await apiClient.put<Quote>(`/platform/quotes/${id}`, data);
      return response.data;
    },

    async send(id: string): Promise<Quote> {
      const response = await apiClient.post<Quote>(`/platform/quotes/${id}/send`);
      return response.data;
    },

    async accept(id: string): Promise<Quote> {
      const response = await apiClient.post<Quote>(`/platform/quotes/${id}/accept`);
      return response.data;
    },

    async reject(id: string): Promise<Quote> {
      const response = await apiClient.post<Quote>(`/platform/quotes/${id}/reject`);
      return response.data;
    },

    async downloadPdf(id: string): Promise<Blob> {
      const response = await apiClient.get(`/platform/quotes/${id}/pdf`, {
        responseType: "blob",
      });
      return response.data;
    },
  },

  invoices: {
    async create(data: CreatePlatformInvoiceRequest): Promise<PlatformInvoice> {
      const response = await apiClient.post<PlatformInvoice>("/platform/invoices", data);
      return response.data;
    },

    async createFromQuote(quoteId: string, dueDate: string): Promise<PlatformInvoice> {
      const response = await apiClient.post<PlatformInvoice>(
        `/platform/invoices/from-quote/${quoteId}?due_date=${dueDate}`
      );
      return response.data;
    },

    async list(params?: InvoiceSearchParams): Promise<PaginatedResponse<PlatformInvoice>> {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
      if (params?.tenant_id) queryParams.append("tenant_id", params.tenant_id);
      if (params?.status) queryParams.append("status", params.status);
      if (params?.start_date) queryParams.append("start_date", params.start_date);
      if (params?.end_date) queryParams.append("end_date", params.end_date);

      const response = await apiClient.get<PaginatedResponse<PlatformInvoice>>(
        `/platform/invoices?${queryParams.toString()}`
      );
      return response.data;
    },

    async getById(id: string): Promise<PlatformInvoice> {
      const response = await apiClient.get<PlatformInvoice>(`/platform/invoices/${id}`);
      return response.data;
    },

    async update(id: string, data: UpdatePlatformInvoiceRequest): Promise<PlatformInvoice> {
      const response = await apiClient.put<PlatformInvoice>(`/platform/invoices/${id}`, data);
      return response.data;
    },

    async send(id: string): Promise<PlatformInvoice> {
      const response = await apiClient.post<PlatformInvoice>(`/platform/invoices/${id}/send`);
      return response.data;
    },

    async downloadPdf(id: string): Promise<Blob> {
      const response = await apiClient.get(`/platform/invoices/${id}/pdf`, {
        responseType: "blob",
      });
      return response.data;
    },
  },

  receipts: {
    async create(data: CreateReceiptRequest): Promise<Receipt> {
      const response = await apiClient.post<Receipt>("/platform/receipts", data);
      return response.data;
    },

    async list(params?: ReceiptSearchParams): Promise<PaginatedResponse<Receipt>> {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
      if (params?.tenant_id) queryParams.append("tenant_id", params.tenant_id);
      if (params?.platform_invoice_id)
        queryParams.append("platform_invoice_id", params.platform_invoice_id);

      const response = await apiClient.get<PaginatedResponse<Receipt>>(`/platform/receipts?${queryParams.toString()}`);
      return response.data;
    },

    async getById(id: string): Promise<Receipt> {
      const response = await apiClient.get<Receipt>(`/platform/receipts/${id}`);
      return response.data;
    },

    async downloadPdf(id: string): Promise<Blob> {
      const response = await apiClient.get(`/platform/receipts/${id}/pdf`, {
        responseType: "blob",
      });
      return response.data;
    },
  },

  agreements: {
    async getDefaultClauses(): Promise<AgreementClause[]> {
      const response = await apiClient.get<AgreementClause[]>("/platform/agreements/default-clauses");
      return response.data;
    },

    async create(data: CreateAgreementRequest): Promise<Agreement> {
      const response = await apiClient.post<Agreement>("/platform/agreements", data);
      return response.data;
    },

    async list(params?: AgreementSearchParams): Promise<PaginatedResponse<Agreement>> {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
      if (params?.tenant_id) queryParams.append("tenant_id", params.tenant_id);
      if (params?.status) queryParams.append("status", params.status);

      const response = await apiClient.get<PaginatedResponse<Agreement>>(
        `/platform/agreements?${queryParams.toString()}`
      );
      return response.data;
    },

    async getById(id: string): Promise<Agreement> {
      const response = await apiClient.get<Agreement>(`/platform/agreements/${id}`);
      return response.data;
    },

    async update(id: string, data: UpdateAgreementRequest): Promise<Agreement> {
      const response = await apiClient.put<Agreement>(`/platform/agreements/${id}`, data);
      return response.data;
    },

    async share(id: string): Promise<Agreement> {
      const response = await apiClient.post<Agreement>(`/platform/agreements/${id}/share`);
      return response.data;
    },

    async downloadPdf(id: string): Promise<Blob> {
      const response = await apiClient.get(`/platform/agreements/${id}/pdf`, {
        responseType: "blob",
      });
      return response.data;
    },

    async uploadSigned(id: string, file: File): Promise<Agreement> {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post<Agreement>(`/platform/agreements/${id}/upload-signed`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },

    async downloadSigned(id: string): Promise<Blob> {
      const response = await apiClient.get(`/platform/agreements/${id}/signed-document`, {
        responseType: "blob",
      });
      return response.data;
    },
  },
};
