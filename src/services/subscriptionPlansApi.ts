import { apiClient } from "./api";

export interface ScreenSummary {
  id: string;
  path: string;
  label: string;
  icon: string | null;
  display_order: number;
  module_key: string | null;
}

export interface ModuleResponse {
  key: string;
  name: string;
  description: string | null;
  category: string;
  display_order: number;
  is_core: boolean;
  screens: ScreenSummary[];
}

export interface SubscriptionPlanResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_standard: boolean;
  is_active: boolean;
  modules: string[];
  screens: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateCustomPlanRequest {
  code: string;
  name: string;
  description?: string;
  modules: string[];
  screens: string[];
}

export interface UpdateCustomPlanRequest {
  name?: string;
  description?: string;
  modules?: string[];
  screens?: string[];
}

export interface TenantScreenItem {
  id: string;
  path: string;
  label: string;
  icon: string | null;
  display_order: number;
  module_key: string;
  is_enabled: boolean;
}

export interface TenantModuleItem {
  key: string;
  name: string;
  description: string | null;
  category: string;
  display_order: number;
  is_core: boolean;
  is_enabled: boolean;
  screens: TenantScreenItem[];
}

export interface TenantPlanConfigResponse {
  tenant_id: string;
  tenant_name: string;
  subdomain: string;
  plan_code: string | null;
  plan_name: string | null;
  is_custom: boolean;
  modules: TenantModuleItem[];
}

export interface UpdateTenantPlanConfigRequest {
  plan_code?: string;
  enabled_modules?: string[];
  enabled_screens?: string[];
}

export const subscriptionPlansApi = {
  /**
   * List all feature modules with child screens
   */
  async listModules(): Promise<ModuleResponse[]> {
    const res = await apiClient.get<ModuleResponse[]>("/modules");
    return res.data;
  },

  /**
   * List all subscription plans (standard and custom)
   */
  async listPlans(): Promise<SubscriptionPlanResponse[]> {
    const res = await apiClient.get<SubscriptionPlanResponse[]>("/plans");
    return res.data;
  },

  /**
   * Get single plan by ID or code
   */
  async getPlan(planId: string): Promise<SubscriptionPlanResponse> {
    const res = await apiClient.get<SubscriptionPlanResponse>(`/plans/${planId}`);
    return res.data;
  },

  /**
   * Create custom subscription plan
   */
  async createPlan(data: CreateCustomPlanRequest): Promise<SubscriptionPlanResponse> {
    const res = await apiClient.post<SubscriptionPlanResponse>("/plans", data);
    return res.data;
  },

  /**
   * Update custom subscription plan
   */
  async updatePlan(planId: string, data: UpdateCustomPlanRequest): Promise<SubscriptionPlanResponse> {
    const res = await apiClient.put<SubscriptionPlanResponse>(`/plans/${planId}`, data);
    return res.data;
  },

  /**
   * Delete custom subscription plan
   */
  async deletePlan(planId: string): Promise<void> {
    await apiClient.delete(`/plans/${planId}`);
  },

  /**
   * Get full plan and module/screen configuration for a tenant
   */
  async getTenantPlanConfig(tenantId: string): Promise<TenantPlanConfigResponse> {
    const res = await apiClient.get<TenantPlanConfigResponse>(`/tenants/${tenantId}/plan-config`);
    return res.data;
  },

  /**
   * Update tenant's plan or apply custom module/screen overrides
   */
  async updateTenantPlanConfig(
    tenantId: string,
    data: UpdateTenantPlanConfigRequest
  ): Promise<TenantPlanConfigResponse> {
    const res = await apiClient.put<TenantPlanConfigResponse>(`/tenants/${tenantId}/plan-config`, data);
    return res.data;
  },

  /**
   * Toggle a module for a tenant
   */
  async toggleTenantModule(
    tenantId: string,
    moduleKey: string,
    isEnabled: boolean
  ): Promise<TenantPlanConfigResponse> {
    const res = await apiClient.patch<TenantPlanConfigResponse>(
      `/tenants/${tenantId}/modules/${moduleKey}`,
      { is_enabled: isEnabled }
    );
    return res.data;
  },

  /**
   * Toggle a screen for a tenant
   */
  async toggleTenantScreen(
    tenantId: string,
    screenId: string,
    isEnabled: boolean
  ): Promise<TenantPlanConfigResponse> {
    const res = await apiClient.patch<TenantPlanConfigResponse>(
      `/tenants/${tenantId}/screens/${screenId}`,
      { is_enabled: isEnabled }
    );
    return res.data;
  },
};
