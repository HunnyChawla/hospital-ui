import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface Medicine {
  id: string;
  tenant_id?: string | null;
  name: string;
  generic_name: string | null;
  dosage_form: string | null; // e.g., "Tablet", "Capsule", "Syrup", "Injection"
  strength: string | null; // e.g., "500mg", "250mg"
  manufacturer: string | null;
  // Default values for prescription autofill
  default_dosage: string | null;
  default_frequency: string | null;
  default_duration: string | null;
  default_instructions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicineRequest {
  name: string;
  generic_name?: string | null;
  manufacturer?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  default_dosage?: string | null;
  default_frequency?: string | null;
  default_duration?: string | null;
  default_instructions?: string | null;
  is_active?: boolean;
}

export interface UpdateMedicineRequest {
  name?: string;
  generic_name?: string | null;
  manufacturer?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  default_dosage?: string | null;
  default_frequency?: string | null;
  default_duration?: string | null;
  default_instructions?: string | null;
  is_active?: boolean;
}

export interface MedicinesSearchParams {
  page?: number;
  page_size?: number;
  tenant_id?: string;
  is_active?: boolean;
  include_global?: boolean;
  q?: string;
}

export interface MedicinesSearchResponse {
  items: Medicine[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const medicinesApi = {
  async search(params?: MedicinesSearchParams): Promise<MedicinesSearchResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.q) queryParams.append("q", params.q);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.is_active !== undefined) queryParams.append("is_active", params.is_active.toString());
    if (params?.include_global !== undefined) queryParams.append("include_global", params.include_global.toString());
    
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);
    
    const queryString = queryParams.toString();
    const url = `/medicines/search${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<MedicinesSearchResponse>(url);
    return response.data;
  },

  async list(params?: MedicinesSearchParams): Promise<MedicinesSearchResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.is_active !== undefined) queryParams.append("is_active", params.is_active.toString());
    if (params?.include_global !== undefined) queryParams.append("include_global", params.include_global.toString());
    
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);
    
    const queryString = queryParams.toString();
    const url = `/medicines${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<MedicinesSearchResponse>(url);
    return response.data;
  },

  async getById(medicineId: string, tenantId?: string): Promise<Medicine> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<Medicine>(`/medicines/${medicineId}`, { params });
    return response.data;
  },

  async create(medicine: CreateMedicineRequest, tenantId?: string): Promise<Medicine> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params: Record<string, string> = {};
    if (apiTenantId) params.tenant_id = apiTenantId;

    const response = await apiClient.post<Medicine>("/medicines", medicine, { params });
    return response.data;
  },

  async update(medicineId: string, updates: UpdateMedicineRequest, tenantId?: string): Promise<Medicine> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<Medicine>(`/medicines/${medicineId}`, updates, { params });
    return response.data;
  },

  async delete(medicineId: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/medicines/${medicineId}`, { params });
  },

  async exportExcel(tenantId?: string): Promise<Blob> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<Blob>("/medicines/export", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  async importExcel(file: File, tenantId?: string): Promise<{ success: boolean; imported: number; failed: number; errors: string[] }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<{ success: boolean; imported: number; failed: number; errors: string[] }>(
      "/medicines/import",
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
