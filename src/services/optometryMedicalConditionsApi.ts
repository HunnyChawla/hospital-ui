import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { MedicalConditionRecord } from "@/types";

export interface CreateMedicalConditionRequest {
  patient_id: string;
  optometrist_id: string;
  visit_id: string | null;
  condition_name: string;
  status: boolean;
  duration?: string | null;
  medication?: string | null;
  controlled?: boolean | null;
  notes?: string | null;
}

export interface UpdateMedicalConditionRequest {
  status?: boolean;
  duration?: string | null;
  medication?: string | null;
  controlled?: boolean | null;
  notes?: string | null;
}

export interface MedicalConditionSearchParams {
  patient_id?: string;
  optometrist_id?: string;
  visit_id?: string;
  condition_name?: string;
  status?: boolean;
}

export const optometryMedicalConditionsApi = {
  /**
   * List/search medical conditions
   */
  async list(params?: MedicalConditionSearchParams, tenantId?: string): Promise<MedicalConditionRecord[]> {
    const queryParams = new URLSearchParams();

    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.optometrist_id) queryParams.append("optometrist_id", params.optometrist_id);
    if (params?.visit_id) queryParams.append("visit_id", params.visit_id);
    if (params?.condition_name) queryParams.append("condition_name", params.condition_name);
    if (params?.status !== undefined) queryParams.append("status", params.status.toString());

    const apiTenantId = getTenantIdForApi(tenantId);
    if (apiTenantId) {
      queryParams.append("tenant_id", apiTenantId);
    }

    const response = await apiClient.get<MedicalConditionRecord[]>(
      `/medical-conditions?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Create a new medical condition record
   */
  async create(data: CreateMedicalConditionRequest, tenantId?: string): Promise<MedicalConditionRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<MedicalConditionRecord>(
      "/medical-conditions",
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Update an existing medical condition record
   */
  async update(id: string, data: UpdateMedicalConditionRequest, tenantId?: string): Promise<MedicalConditionRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<MedicalConditionRecord>(
      `/medical-conditions/${id}`,
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Delete a medical condition record
   */
  async delete(id: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/medical-conditions/${id}`, { params });
  },

  /**
   * Get all medical conditions for a patient
   */
  async getByPatientId(patientId: string, tenantId?: string): Promise<MedicalConditionRecord[]> {
    return this.list({ patient_id: patientId }, tenantId);
  },
};
