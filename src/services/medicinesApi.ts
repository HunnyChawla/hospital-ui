import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface Medicine {
  id: string;
  tenant_id: string;
  name: string;
  generic_name: string | null;
  dosage_form: string | null; // e.g., "Tablet", "Capsule", "Syrup", "Injection"
  strength: string | null; // e.g., "500mg", "250mg"
  unit: string | null; // e.g., "tablets", "ml", "bottles"
  manufacturer: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicinesSearchParams {
  q?: string;
  page?: number;
  page_size?: number;
  tenant_id?: string;
  is_active?: boolean;
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
};

