import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface OptometristDoctorMapping {
  id: string;
  tenant_id: string;
  doctor_id: string;
  doctor_name: string;
  optometrist_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export const optometristMappingsApi = {
  /**
   * Get list of doctors associated with an optometrist
   * GET /opd/mappings/optometrist/{optometrist_id}
   */
  async getOptometristDoctors(
    optometristId: string,
    tenantId?: string
  ): Promise<OptometristDoctorMapping[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<OptometristDoctorMapping[]>(
      `/opd/mappings/optometrist/${optometristId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get list of optometrists associated with a doctor
   * GET /opd/mappings/doctor/{doctor_id}
   */
  async getDoctorMappings(
    doctorId: string,
    tenantId?: string
  ): Promise<OptometristDoctorMapping[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<OptometristDoctorMapping[]>(
      `/opd/mappings/doctor/${doctorId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Create a new optometrist-doctor mapping
   * POST /opd/mappings
   */
  async createMapping(
    mapping: { optometrist_id: string; doctor_id: string },
    tenantId?: string
  ): Promise<OptometristDoctorMapping> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<OptometristDoctorMapping>(
      "/opd/mappings",
      mapping,
      { params }
    );
    return response.data;
  },

  /**
   * Delete an optometrist-doctor mapping
   * DELETE /opd/mappings/{mapping_id}
   */
  async deleteMapping(
    mappingId: string,
    tenantId?: string
  ): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/opd/mappings/${mappingId}`, { params });
  },
};
