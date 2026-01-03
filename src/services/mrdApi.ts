import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type MRDDocumentCategory =
  | "DISCHARGE_SUMMARY"
  | "LAB_REPORT"
  | "RADIOLOGY_REPORT"
  | "PRESCRIPTION"
  | "INSURANCE_DOCUMENT"
  | "ID_PROOF"
  | "CONSENT_FORM"
  | "ADMISSION_FORM"
  | "MEDICAL_CERTIFICATE"
  | "IPD_REPORT"
  | "OPD_REPORT"
  | "PATHOLOGY_REPORT"
  | "DIAGNOSTIC_REPORT"
  | "SURGICAL_REPORT"
  | "OTHER";

export type DocumentType = "PDF" | "IMAGE" | "DOC" | "DOCX" | "XLS" | "XLSX" | "OTHER";

export interface MRDDocument {
  id: string;
  tenant_id: string;
  patient_id: string;
  admission_id: string | null;
  lab_booking_id: string | null;
  visit_id: string | null;
  document_name: string;
  document_type: DocumentType;
  category: MRDDocumentCategory;
  file_path: string;
  file_size: number;
  mime_type: string;
  description: string | null;
  tags: string[];
  metadata: Record<string, any>;
  uploaded_by: string;
  download_url: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMRDDocumentRequest {
  file: File;
  document_name: string;
  category: MRDDocumentCategory;
  patient_id: string;
  description?: string;
  tags?: string[];
  admission_id?: string;
  lab_booking_id?: string;
  visit_id?: string;
}

export interface UpdateMRDDocumentRequest {
  document_name?: string;
  description?: string;
  category?: MRDDocumentCategory;
  tags?: string[];
}

export interface MRDDocumentsSearchParams {
  page?: number;
  limit?: number;
  patient_id?: string;
  admission_id?: string;
  lab_booking_id?: string;
  visit_id?: string;
  category?: MRDDocumentCategory;
  document_type?: DocumentType;
  standalone_only?: boolean;
  search_query?: string;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
  tenant_id?: string;
}

export interface MRDDocumentsSearchResponse {
  items: MRDDocument[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

export const mrdApi = {
  async upload(
    data: CreateMRDDocumentRequest,
    tenantId?: string,
    onUploadProgress?: (progress: number) => void
  ): Promise<MRDDocument> {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("document_name", data.document_name);
    formData.append("category", data.category);
    formData.append("patient_id", data.patient_id);

    if (data.description) {
      formData.append("description", data.description);
    }

    if (data.tags && data.tags.length > 0) {
      formData.append("tags", JSON.stringify(data.tags));
    }

    if (data.admission_id) {
      formData.append("admission_id", data.admission_id);
    }

    if (data.lab_booking_id) {
      formData.append("lab_booking_id", data.lab_booking_id);
    }

    if (data.visit_id) {
      formData.append("visit_id", data.visit_id);
    }

    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};

    const response = await apiClient.post<MRDDocument>("/mrd/documents", formData, {
      params,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });

    return response.data;
  },

  async list(params?: MRDDocumentsSearchParams): Promise<MRDDocumentsSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.admission_id) queryParams.append("admission_id", params.admission_id);
    if (params?.lab_booking_id) queryParams.append("lab_booking_id", params.lab_booking_id);
    if (params?.visit_id) queryParams.append("visit_id", params.visit_id);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.document_type) queryParams.append("document_type", params.document_type);
    if (params?.standalone_only !== undefined)
      queryParams.append("standalone_only", params.standalone_only.toString());
    if (params?.search_query) queryParams.append("search_query", params.search_query);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/mrd/documents${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<MRDDocumentsSearchResponse>(url);
    return response.data;
  },

  async getById(documentId: string, tenantId?: string): Promise<MRDDocument> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<MRDDocument>(`/mrd/documents/${documentId}`, { params });
    return response.data;
  },

  async download(documentId: string, tenantId?: string): Promise<Blob> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get(`/mrd/documents/${documentId}/file`, {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  async update(
    documentId: string,
    updates: UpdateMRDDocumentRequest,
    tenantId?: string
  ): Promise<MRDDocument> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<MRDDocument>(`/mrd/documents/${documentId}`, updates, {
      params,
    });
    return response.data;
  },

  async delete(documentId: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/mrd/documents/${documentId}`, { params });
  },
};

