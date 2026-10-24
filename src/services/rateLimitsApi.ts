import { apiClient } from "./api";

export interface RateLimitDefaults {
  tenant_limit?: number;
  user_limit?: number;
  login_limit?: number;
  staff_otp_limit?: number;
}

export interface TenantRateLimitItem {
  tenant_id: string;
  tenant_name?: string;
  subdomain: string;
  status: string;
  plan?: string | null;
  tenant_limit?: number;
  user_limit?: number;
  effective_tenant_limit?: number;
  effective_user_limit?: number;
  custom_tenant_limit?: number | null;
  custom_user_limit?: number | null;
  is_custom: boolean;
  reason?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface TenantRateLimitListResponse {
  defaults?: RateLimitDefaults;
  default_tenant_limit?: number;
  default_user_limit?: number;
  default_login_limit?: number;
  default_staff_otp_limit?: number;
  items?: TenantRateLimitItem[];
  tenants?: TenantRateLimitItem[];
  total?: number;
}

export interface TenantRateLimitUpdateRequest {
  tenant_limit?: number | null;
  user_limit?: number | null;
  tenant_limit_per_minute?: number | null;
  user_limit_per_minute?: number | null;
  reason?: string | null;
}

export const rateLimitsApi = {
  /**
   * List all tenants with effective rate limits and system defaults
   */
  async list(): Promise<TenantRateLimitListResponse> {
    const response = await apiClient.get<TenantRateLimitListResponse>("/rate-limits/tenants");
    return response.data;
  },

  /**
   * Get custom rate limit details for a specific tenant
   */
  async getById(tenantId: string): Promise<TenantRateLimitItem> {
    const response = await apiClient.get<TenantRateLimitItem>(`/rate-limits/tenants/${tenantId}`);
    return response.data;
  },

  /**
   * Upsert custom rate limit overrides for a tenant
   */
  async update(
    tenantId: string,
    payload: TenantRateLimitUpdateRequest
  ): Promise<TenantRateLimitItem> {
    const response = await apiClient.put<TenantRateLimitItem>(
      `/rate-limits/tenants/${tenantId}`,
      payload
    );
    return response.data;
  },

  /**
   * Delete custom overrides and restore tenant to global system defaults
   */
  async reset(tenantId: string): Promise<void> {
    await apiClient.delete(`/rate-limits/tenants/${tenantId}`);
  },
};
