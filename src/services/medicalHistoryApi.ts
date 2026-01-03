import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { MedicalHistoryRecord } from "@/types";

// Request types
export interface UpsertMedicalHistoryRequest {
  patient_id: string;
  diabetes?: boolean;
  hypertension?: boolean;
  thyroid_disorder?: boolean;
  heart_disease?: boolean;
  asthma?: boolean;
  tuberculosis?: boolean;
  kidney_disease?: boolean;
  liver_disease?: boolean;
  cancer?: boolean;
  hiv_aids?: boolean;
  other_conditions?: string | null;
  current_medications?: string | null;
  family_history?: string | null;
  lifestyle_notes?: string | null;
}

export interface UpdateMedicalHistoryRequest {
  diabetes?: boolean;
  hypertension?: boolean;
  thyroid_disorder?: boolean;
  heart_disease?: boolean;
  asthma?: boolean;
  tuberculosis?: boolean;
  kidney_disease?: boolean;
  liver_disease?: boolean;
  cancer?: boolean;
  hiv_aids?: boolean;
  other_conditions?: string | null;
  current_medications?: string | null;
  family_history?: string | null;
  lifestyle_notes?: string | null;
}

export const medicalHistoryApi = {
  /**
   * Get medical history for a patient
   */
  async get(patientId: string, tenantId?: string): Promise<MedicalHistoryRecord | null> {
    try {
      const apiTenantId = getTenantIdForApi(tenantId);
      const params = apiTenantId ? { tenant_id: apiTenantId } : {};
      const response = await apiClient.get<MedicalHistoryRecord>(
        `/medical-history/${patientId}`,
        { params }
      );
      return response.data;
    } catch (error: any) {
      // If 404, return null (no medical history exists yet)
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create or update medical history (upsert)
   */
  async upsert(
    data: UpsertMedicalHistoryRequest,
    tenantId?: string
  ): Promise<MedicalHistoryRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<MedicalHistoryRecord>(
      "/medical-history",
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Update existing medical history
   */
  async update(
    patientId: string,
    data: UpdateMedicalHistoryRequest,
    tenantId?: string
  ): Promise<MedicalHistoryRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<MedicalHistoryRecord>(
      `/medical-history/${patientId}`,
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Delete medical history for a patient
   */
  async delete(patientId: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/medical-history/${patientId}`, { params });
  },
};
