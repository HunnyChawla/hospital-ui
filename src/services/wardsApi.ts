import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface Ward {
  id: string;
  tenant_id: string;
  ward_name: string;
  ward_code: string;
  floor: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWardRequest {
  ward_name: string;
  ward_code: string;
  floor?: number | null;
}

export interface UpdateWardRequest {
  ward_name?: string;
  ward_code?: string;
  floor?: number | null;
  is_active?: boolean;
}

export interface WardsSearchParams {
  page?: number;
  page_size?: number;
  tenant_id?: string;
}

export interface WardsSearchResponse {
  items: Ward[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const wardsApi = {
  async create(ward: CreateWardRequest, tenantId?: string): Promise<Ward> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<Ward>("/wards", ward, { params });
    return response.data;
  },

  async list(params?: WardsSearchParams): Promise<WardsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/wards${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<WardsSearchResponse>(url);
    return response.data;
  },

  async getById(wardId: string, tenantId?: string): Promise<Ward> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<Ward>(`/wards/${wardId}`, { params });
    return response.data;
  },

  async update(wardId: string, updates: UpdateWardRequest, tenantId?: string): Promise<Ward> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<Ward>(`/wards/${wardId}`, updates, { params });
    return response.data;
  },

  async delete(wardId: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/wards/${wardId}`, { params });
  },
};
