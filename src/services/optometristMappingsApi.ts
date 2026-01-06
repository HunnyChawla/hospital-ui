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
};
