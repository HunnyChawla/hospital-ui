import { apiClient } from "./api";

export type LegalDocumentType =
  | "TERMS_AND_CONDITIONS"
  | "PRIVACY_POLICY"
  | "PATIENT_PRIVACY_NOTICE";
export type LegalDocumentStatus = "draft" | "published" | "archived";

export type GrievanceRequestType =
  | "ACCESS_SUMMARY"
  | "CORRECTION_COMPLETION"
  | "ERASURE_REQUEST"
  | "NOMINATION_UPDATE"
  | "CONSENT_WITHDRAWAL"
  | "PRIVACY_GRIEVANCE";

export type GrievanceRequestStatus = "open" | "in_review" | "resolved" | "rejected";

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
  patient_notice?: LegalDocumentDetailResponse | null;
  consent_hash: string;
}

export interface PendingConsentItem {
  document_id: string;
  document_type: LegalDocumentType;
  version: string;
  title: string;
  summary_of_changes?: string | null;
  is_mandatory: boolean;
  content_hash: string;
  published_at?: string | null;
}

export interface MyConsentItem {
  id: string;
  document_id: string;
  document_type: LegalDocumentType;
  version: string;
  status: string;
  accepted_at: string;
  title: string;
  summary_of_changes?: string | null;
  is_mandatory: boolean;
}

export interface WithdrawConsentRequest {
  document_id: string;
  reason?: string;
}

export interface WithdrawConsentResponse {
  success: boolean;
  message: string;
  document_id: string;
  document_type: LegalDocumentType;
  requires_account_offboarding: boolean;
  grievance_reference?: string | null;
}

export interface SubmitGrievanceRequest {
  request_type: GrievanceRequestType;
  subject: string;
  description: string;
  nominee_name?: string;
  nominee_contact?: string;
}

export interface LegalGrievanceResponse {
  id: string;
  reference_number: string;
  user_id: string;
  user_email?: string | null;
  user_full_name?: string | null;
  tenant_id: string;
  tenant_name?: string | null;
  request_type: GrievanceRequestType;
  subject: string;
  description: string;
  nominee_name?: string | null;
  nominee_contact?: string | null;
  status: GrievanceRequestStatus;
  resolution_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  due_at: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateGrievanceStatusRequest {
  status: GrievanceRequestStatus;
  resolution_notes?: string;
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

  getMyConsents: async (): Promise<MyConsentItem[]> => {
    const res = await apiClient.get<MyConsentItem[]>("/legal/my-consents");
    return res.data;
  },

  withdrawConsent: async (
    data: WithdrawConsentRequest
  ): Promise<WithdrawConsentResponse> => {
    const res = await apiClient.post<WithdrawConsentResponse>(
      "/legal/consent/withdraw",
      data
    );
    return res.data;
  },

  submitGrievance: async (
    data: SubmitGrievanceRequest
  ): Promise<LegalGrievanceResponse> => {
    const res = await apiClient.post<LegalGrievanceResponse>("/legal/grievances", data);
    return res.data;
  },

  getMyGrievances: async (): Promise<LegalGrievanceResponse[]> => {
    const res = await apiClient.get<LegalGrievanceResponse[]>("/legal/my-grievances");
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

  listAdminGrievances: async (params?: {
    tenant_id?: string;
    status?: GrievanceRequestStatus;
    limit?: number;
    offset?: number;
  }): Promise<LegalGrievanceResponse[]> => {
    const searchParams = new URLSearchParams();
    if (params?.tenant_id) searchParams.append("tenant_id", params.tenant_id);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const res = await apiClient.get<LegalGrievanceResponse[]>(
      `/legal/admin/grievances${query}`
    );
    return res.data;
  },

  updateGrievanceStatus: async (
    grievanceId: string,
    data: UpdateGrievanceStatusRequest
  ): Promise<LegalGrievanceResponse> => {
    const res = await apiClient.patch<LegalGrievanceResponse>(
      `/legal/admin/grievances/${grievanceId}`,
      data
    );
    return res.data;
  },
};
