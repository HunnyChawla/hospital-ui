import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface PatientCategoryResponse {
  id: string;
  tenant_id: string | null;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CreatePatientCategoryRequest {
  name: string;
}

export const patientCategoriesApi = {
  async list(tenantId?: string): Promise<PatientCategoryResponse[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const headers = apiTenantId ? { "X-Tenant-ID": apiTenantId } : {};
    const response = await apiClient.get<PatientCategoryResponse[]>("/patient-categories", {
      headers,
    });
    return response.data;
  },

  async create(category: CreatePatientCategoryRequest, tenantId?: string): Promise<PatientCategoryResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const headers = apiTenantId ? { "X-Tenant-ID": apiTenantId } : {};
    const response = await apiClient.post<PatientCategoryResponse>("/patient-categories", category, {
      headers,
    });
    return response.data;
  },

  async delete(categoryId: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const headers = apiTenantId ? { "X-Tenant-ID": apiTenantId } : {};
    await apiClient.delete(`/patient-categories/${categoryId}`, {
      headers,
    });
  },
};
