import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface DashboardWidgetConfigItem {
  widget_key: string;
  is_visible: boolean;
  display_order: number;
  col_span: number; // 1, 2, 3, or 4
  row_span?: number; // 1 (1x), 2 (2x), 3 (3x), or 4 (4x)
  label_override?: string | null;
}

export interface DashboardConfigResponse {
  tenant_id: string | null;
  role: string;
  scope: "tenant" | "global" | "default";
  widgets: DashboardWidgetConfigItem[];
  has_tenant_override: boolean;
  updated_at: string | null;
}

export interface SetDashboardConfigRequest {
  tenant_id?: string | null;
  role: string;
  widgets: DashboardWidgetConfigItem[];
}

export const dashboardConfigApi = {
  /**
   * Get the effective dashboard configuration for the current user's role and tenant.
   */
  async getEffective(tenantId?: string): Promise<DashboardConfigResponse> {
    const effectiveTenantId = getTenantIdForApi(tenantId);
    const params = effectiveTenantId ? { tenant_id: effectiveTenantId } : {};
    const response = await apiClient.get<DashboardConfigResponse>(
      "/dashboard-config/effective",
      { params }
    );
    return response.data;
  },

  /**
   * Admin inspection of configuration for a specific role and optional tenant.
   */
  async getAdminConfig(role: string, tenantId?: string | null): Promise<DashboardConfigResponse> {
    const params: Record<string, string> = { role };
    if (tenantId) {
      params.tenant_id = tenantId;
    }
    const response = await apiClient.get<DashboardConfigResponse>(
      "/dashboard-config/admin",
      { params }
    );
    return response.data;
  },

  /**
   * Save configuration for a role (globally or per tenant).
   */
  async setAdminConfig(payload: SetDashboardConfigRequest): Promise<DashboardConfigResponse> {
    const response = await apiClient.put<DashboardConfigResponse>(
      "/dashboard-config/admin",
      payload
    );
    return response.data;
  },

  /**
   * Reset configuration to higher-tier fallback (revert tenant override or reset global).
   */
  async resetAdminConfig(role: string, tenantId?: string | null): Promise<void> {
    const params: Record<string, string> = { role };
    if (tenantId) {
      params.tenant_id = tenantId;
    }
    await apiClient.delete("/dashboard-config/admin", { params });
  },
};
