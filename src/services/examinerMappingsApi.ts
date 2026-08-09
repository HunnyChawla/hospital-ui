import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface ExaminerDoctorMapping {
  id: string;
  tenant_id: string;
  doctor_id: string;
  doctor_name: string | null;
  examiner_id: string;
  examiner_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export const examinerMappingsApi = {
  /**
   * Get list of doctors associated with an examiner
   * GET /opd/examiner-mappings/examiner/{examiner_id}
   */
  async getExaminerDoctors(
    examinerId: string,
    tenantId?: string
  ): Promise<ExaminerDoctorMapping[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<ExaminerDoctorMapping[]>(
      `/opd/examiner-mappings/examiner/${examinerId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get list of examiners associated with a doctor
   * GET /opd/examiner-mappings/doctor/{doctor_id}
   */
  async getDoctorMappings(
    doctorId: string,
    tenantId?: string
  ): Promise<ExaminerDoctorMapping[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<ExaminerDoctorMapping[]>(
      `/opd/examiner-mappings/doctor/${doctorId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Create a new examiner-doctor mapping
   * POST /opd/examiner-mappings
   */
  async createMapping(
    mapping: { examiner_id: string; doctor_id: string },
    tenantId?: string
  ): Promise<ExaminerDoctorMapping> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<ExaminerDoctorMapping>(
      "/opd/examiner-mappings",
      mapping,
      { params }
    );
    return response.data;
  },

  /**
   * Delete an examiner-doctor mapping
   * DELETE /opd/examiner-mappings/{mapping_id}
   */
  async deleteMapping(mappingId: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/opd/examiner-mappings/${mappingId}`, { params });
  },
};
