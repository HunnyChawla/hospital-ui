import { apiClient } from "./api";
import { ClinicalNote } from "@/types";
import { getTenantIdForApi } from "@/utils/auth";

export interface CreateClinicalNoteRequest {
  patient_id: string;
  doctor_id: string;
  visit_id?: string | null;
  appointment_id?: string | null;
  note_type: "soap" | "quick" | "voice" | "follow_up";
  content: string;
  voice_recording_url?: string | null;
  is_private?: boolean;
}

export interface UpdateClinicalNoteRequest {
  note_type?: "soap" | "quick" | "voice" | "follow_up";
  content?: string;
  voice_recording_url?: string | null;
  is_private?: boolean;
}

export interface ClinicalNotesListParams {
  patient_id?: string;
  doctor_id?: string;
  visit_id?: string;
  appointment_id?: string;
  note_type?: "soap" | "quick" | "voice" | "follow_up";
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface ClinicalNotesListResponse {
  items: ClinicalNote[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const clinicalNotesApi = {
  /**
   * Create a new clinical note
   */
  async create(
    data: CreateClinicalNoteRequest,
    tenantId?: string
  ): Promise<ClinicalNote> {
    const params = getTenantIdForApi(tenantId)
      ? { tenant_id: getTenantIdForApi(tenantId) }
      : {};

    const response = await apiClient.post<ClinicalNote>(
      "/clinical-notes",
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Get clinical notes list
   */
  async list(
    params: ClinicalNotesListParams,
    tenantId?: string
  ): Promise<ClinicalNotesListResponse> {
    const apiParams = {
      ...params,
      ...(getTenantIdForApi(tenantId)
        ? { tenant_id: getTenantIdForApi(tenantId) }
        : {}),
    };

    const response = await apiClient.get<ClinicalNotesListResponse>(
      "/clinical-notes",
      { params: apiParams }
    );
    return response.data;
  },

  /**
   * Get a single clinical note by ID
   */
  async getById(id: string, tenantId?: string): Promise<ClinicalNote> {
    const params = getTenantIdForApi(tenantId)
      ? { tenant_id: getTenantIdForApi(tenantId) }
      : {};

    const response = await apiClient.get<ClinicalNote>(
      `/clinical-notes/${id}`,
      { params }
    );
    return response.data;
  },

  /**
   * Update a clinical note
   */
  async update(
    id: string,
    data: UpdateClinicalNoteRequest,
    tenantId?: string
  ): Promise<ClinicalNote> {
    const params = getTenantIdForApi(tenantId)
      ? { tenant_id: getTenantIdForApi(tenantId) }
      : {};

    const response = await apiClient.put<ClinicalNote>(
      `/clinical-notes/${id}`,
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Delete a clinical note
   */
  async delete(id: string, tenantId?: string): Promise<void> {
    const params = getTenantIdForApi(tenantId)
      ? { tenant_id: getTenantIdForApi(tenantId) }
      : {};

    await apiClient.delete(`/clinical-notes/${id}`, { params });
  },

  /**
   * Convert voice to text (if backend supports)
   */
  async voiceToText(
    audioBlob: Blob,
    tenantId?: string
  ): Promise<{ text: string }> {
    const params = getTenantIdForApi(tenantId)
      ? { tenant_id: getTenantIdForApi(tenantId) }
      : {};

    const formData = new FormData();
    formData.append("audio", audioBlob);

    const response = await apiClient.post<{ text: string }>(
      "/clinical-notes/voice-to-text",
      formData,
      {
        params,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
};
