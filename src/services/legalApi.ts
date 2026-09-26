import { apiClient } from "./api";

export type LegalDocumentType = "TERMS_AND_CONDITIONS" | "PRIVACY_POLICY";
export type LegalDocumentStatus = "draft" | "published" | "archived";

export interface LegalDocumentResponse {
  id: string;
  document_type: LegalDocumentType;
  version: string;
  title: string;
  summary_of_changes?: string | null;
  status: LegalDocumentStatus;
  is_active: boolean;
  is_mandatory: boolean;
  content_hash: string;
  published_at?: string | null;
  published_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegalDocumentDetailResponse extends LegalDocumentResponse {
  content: string;
}

export interface ActiveDocumentsResponse {
  terms: LegalDocumentDetailResponse | null;
  privacy: LegalDocumentDetailResponse | null;
  consent_hash: string;
}

export interface PendingConsentItem {
  document_id: string;
  document_type: LegalDocumentType;
  version: string;
  title: string;
  is_mandatory: boolean;
  content_hash: string;
}

export interface PendingConsentsResponse {
  consent_required: boolean;
  pending_consents: PendingConsentItem[];
}

export interface SubmitConsentItem {
  document_id: string;
  document_type: LegalDocumentType;
  version: string;
}

export interface SubmitConsentRequest {
  consents: SubmitConsentItem[];
  metadata?: Record<string, any>;
}

export interface ConsentSubmissionResponse {
  message: string;
  success: boolean;
  token?: {
    access_token: string;
    token_type: string;
  } | null;
  consent_approved: boolean;
  consent_hash: string;
}

export interface CreateLegalDocumentRequest {
  document_type: LegalDocumentType;
  version: string;
  title: string;
  content: string;
  summary_of_changes?: string;
  is_mandatory: boolean;
}

export interface UpdateLegalDocumentRequest {
  title?: string;
  content?: string;
  summary_of_changes?: string;
  is_mandatory?: boolean;
}

export interface UserConsentAuditItem {
  id: string;
  user_id: string;
  user_email?: string | null;
  user_full_name?: string | null;
  tenant_id: string;
  tenant_name?: string | null;
  document_id: string;
  document_type: LegalDocumentType;
  version: string;
  status: string;
  accepted_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

export const legalApi = {
  // Public / User Endpoints
  getActiveDocuments: async (): Promise<ActiveDocumentsResponse> => {
    const res = await apiClient.get<ActiveDocumentsResponse>("/legal/active");
    return res.data;
  },

  getPendingConsents: async (): Promise<PendingConsentsResponse> => {
    const res = await apiClient.get<PendingConsentsResponse>("/legal/pending-consents");
    return res.data;
  },

  submitConsent: async (
    data: SubmitConsentRequest
  ): Promise<ConsentSubmissionResponse> => {
    const res = await apiClient.post<ConsentSubmissionResponse>("/legal/consent", data);
    return res.data;
  },

  getMyConsents: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>("/legal/my-consents");
    return res.data;
  },

  // Platform Owner Management Endpoints
  listDocuments: async (
    documentType?: LegalDocumentType,
    status?: LegalDocumentStatus
  ): Promise<LegalDocumentResponse[]> => {
    const params = new URLSearchParams();
    if (documentType) params.append("document_type", documentType);
    if (status) params.append("status", status);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient.get<LegalDocumentResponse[]>(`/legal/admin/documents${query}`);
    return res.data;
  },

  getDocument: async (documentId: string): Promise<LegalDocumentDetailResponse> => {
    const res = await apiClient.get<LegalDocumentDetailResponse>(
      `/legal/admin/documents/${documentId}`
    );
    return res.data;
  },

  createDocument: async (
    data: CreateLegalDocumentRequest
  ): Promise<LegalDocumentResponse> => {
    const res = await apiClient.post<LegalDocumentResponse>(
      "/legal/admin/documents",
      data
    );
    return res.data;
  },

  updateDocument: async (
    documentId: string,
    data: UpdateLegalDocumentRequest
  ): Promise<LegalDocumentResponse> => {
    const res = await apiClient.put<LegalDocumentResponse>(
      `/legal/admin/documents/${documentId}`,
      data
    );
    return res.data;
  },

  publishDocument: async (documentId: string): Promise<LegalDocumentResponse> => {
    const res = await apiClient.post<LegalDocumentResponse>(
      `/legal/admin/documents/${documentId}/publish`
    );
    return res.data;
  },

  listAuditConsents: async (params?: {
    tenant_id?: string;
    document_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserConsentAuditItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.tenant_id) searchParams.append("tenant_id", params.tenant_id);
    if (params?.document_id) searchParams.append("document_id", params.document_id);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const res = await apiClient.get<UserConsentAuditItem[]>(`/legal/admin/consents${query}`);
    return res.data;
  },
};
