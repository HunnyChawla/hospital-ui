import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

// ============================================================
// Panel component configuration (/panel-config)
// ============================================================

export type PanelKey = "clinic_panel";

export interface PanelComponentConfig {
  component_key: string;
  is_visible: boolean;
  display_order: number;
  label_override: string | null;
}

export interface PanelConfigResponse {
  tenant_id: string;
  panel_key: PanelKey;
  role: string;
  components: PanelComponentConfig[];
  /** True when the tenant has no stored rows and built-in defaults are returned */
  is_default: boolean;
  updated_at: string | null;
}

// ============================================================
// Tenant label overrides (/label-overrides)
// ============================================================

export type LabelScope = "role" | "visit_status" | "panel";

export interface LabelOverrideItem {
  label_scope: LabelScope;
  label_key: string;
  label: string;
  short_label?: string | null;
}

export interface LabelOverridesResponse {
  tenant_id: string;
  /** scope -> key -> label, with tenant overrides merged over defaults */
  labels: Record<string, Record<string, string>>;
  /** scope -> keys the tenant has actually overridden */
  overridden: Record<string, string[]>;
}

function tenantParams(tenantId?: string): Record<string, string> {
  const effective = getTenantIdForApi(tenantId);
  return effective ? { tenant_id: effective } : {};
}

export const panelConfigApi = {
  /** Get the component configuration for a panel; role defaults to the caller's. */
  async get(panelKey: PanelKey, role?: string, tenantId?: string): Promise<PanelConfigResponse> {
    const params: Record<string, string> = { ...tenantParams(tenantId) };
    if (role) params.role = role;
    const response = await apiClient.get<PanelConfigResponse>(`/panel-config/${panelKey}`, {
      params,
    });
    return response.data;
  },

  /** Replace the component set for a (panel, role). Admin only. */
  async saveComponents(
    panelKey: PanelKey,
    role: string,
    components: PanelComponentConfig[],
    tenantId?: string
  ): Promise<PanelConfigResponse> {
    const response = await apiClient.put<PanelConfigResponse>(
      `/panel-config/${panelKey}/${role}`,
      { components },
      { params: tenantParams(tenantId) }
    );
    return response.data;
  },

  /** Reset a (panel, role) to built-in defaults. Admin only. */
  async reset(panelKey: PanelKey, role: string, tenantId?: string): Promise<void> {
    await apiClient.delete(`/panel-config/${panelKey}/${role}`, {
      params: tenantParams(tenantId),
    });
  },

  /** Effective labels for the tenant: overrides merged over defaults. */
  async getLabels(tenantId?: string): Promise<LabelOverridesResponse> {
    const response = await apiClient.get<LabelOverridesResponse>("/label-overrides", {
      params: tenantParams(tenantId),
    });
    return response.data;
  },

  /** Upsert a batch of label overrides. Admin only. */
  async saveLabels(
    overrides: LabelOverrideItem[],
    tenantId?: string
  ): Promise<LabelOverridesResponse> {
    const response = await apiClient.put<LabelOverridesResponse>(
      "/label-overrides",
      { overrides },
      { params: tenantParams(tenantId) }
    );
    return response.data;
  },

  /** Remove one override; the default label applies again. Admin only. */
  async deleteLabel(scope: LabelScope, key: string, tenantId?: string): Promise<void> {
    await apiClient.delete(`/label-overrides/${scope}/${encodeURIComponent(key)}`, {
      params: tenantParams(tenantId),
    });
  },
};
