import { apiClient } from "./api";

export type TenantStatus = "active" | "inactive" | "suspended";
export type TenantPlan = "basic" | "standard" | "premium";

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: TenantStatus;
  plan: TenantPlan | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  email: string | null;
  website: string | null;
  phone_no: string | null;
  logo: string | null;
  license_valid_till: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantRequest {
  name: string;
  subdomain: string;
  plan?: TenantPlan;
  license_valid_till?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  subdomain?: string;
  status?: TenantStatus;
  plan?: TenantPlan;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  email?: string;
  website?: string;
  phone_no?: string;
  license_valid_till?: string;
}

export interface TenantsSearchParams {
  page?: number;
  page_size?: number;
  status?: TenantStatus;
}

export interface TenantsSearchResponse {
  items: Tenant[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ShiftConfiguration {
  id: string;
  tenant_id: string;
  morning_start_time: string;
  morning_end_time: string;
  evening_start_time: string;
  evening_end_time: string;
  night_start_time: string;
  night_end_time: string;
  created_at: string;
  updated_at: string;
}

export interface SetShiftConfigRequest {
  morning_start_time: string;
  morning_end_time: string;
  evening_start_time: string;
  evening_end_time: string;
  night_start_time: string;
  night_end_time: string;
}

export const tenantsApi = {
  async list(params?: TenantsSearchParams): Promise<TenantsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.status) queryParams.append("status", params.status);

    const queryString = queryParams.toString();
    const url = `/tenants${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get<TenantsSearchResponse>(url);
    return response.data;
  },

  async getById(tenantId: string): Promise<Tenant> {
    const response = await apiClient.get<Tenant>(`/tenants/${tenantId}`);
    return response.data;
  },

  async create(tenant: CreateTenantRequest): Promise<Tenant> {
    const response = await apiClient.post<Tenant>("/tenants", tenant);
    return response.data;
  },

  async update(tenantId: string, updates: UpdateTenantRequest): Promise<Tenant> {
    const response = await apiClient.put<Tenant>(`/tenants/${tenantId}`, updates);
    return response.data;
  },

  async updateWithLogo(tenantId: string, data: UpdateTenantRequest, logoFile?: File): Promise<Tenant> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    if (logoFile) {
      formData.append("logo_file", logoFile);
    }

    const response = await apiClient.put<Tenant>(`/tenants/${tenantId}/with-logo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async getLogo(tenantId: string): Promise<Blob> {
    const response = await apiClient.get(`/tenants/${tenantId}/logo`, {
      responseType: "blob",
    });
    return response.data;
  },

  async uploadLogo(tenantId: string, logoFile: File): Promise<Tenant> {
    const formData = new FormData();
    formData.append("logo_file", logoFile);

    const response = await apiClient.post<Tenant>(`/tenants/${tenantId}/logo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async getShiftConfiguration(tenantId: string): Promise<ShiftConfiguration> {
    const response = await apiClient.get<ShiftConfiguration>(`/tenants/${tenantId}/shift-configuration`);
    return response.data;
  },

  async setShiftConfiguration(tenantId: string, config: SetShiftConfigRequest): Promise<ShiftConfiguration> {
    const response = await apiClient.post<ShiftConfiguration>(`/tenants/${tenantId}/shift-configuration`, config);
    return response.data;
  },

  async deleteShiftConfiguration(tenantId: string): Promise<void> {
    await apiClient.delete(`/tenants/${tenantId}/shift-configuration`);
  },
};

