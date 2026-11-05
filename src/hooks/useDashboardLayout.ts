"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  dashboardConfigApi,
  DashboardWidgetConfigItem,
  DashboardConfigResponse,
} from "@/services/dashboardConfigApi";
import { WIDGET_REGISTRY } from "@/components/dashboard/widgets/WidgetRegistry";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

export function useDashboardLayout() {
  const { hasAccess, initialized: permissionsInitialized } = usePermissions();
  const [effectiveConfig, setEffectiveConfig] = useState<DashboardConfigResponse | null>(null);
  const [personalWidgets, setPersonalWidgets] = useState<DashboardWidgetConfigItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const getStorageKey = useCallback(() => {
    if (typeof window === "undefined") return "hms_dashboard_layout_v3_guest";
    const userId = localStorage.getItem("user_id") || "default";
    return `hms_dashboard_layout_v3_${userId}`;
  }, []);

  // Fetch effective configuration from backend
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dashboardConfigApi.getEffective();
      setEffectiveConfig(res);

      // Check for user's personal layout in localStorage
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(getStorageKey());
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Merge user personal layout with backend config:
              // For each widget in res.widgets, preserve the user's personal settings if present,
              // but DO NOT lose default widgets that the user never saw or that were added later.
              const userSavedMap = new Map<string, DashboardWidgetConfigItem>(
                parsed.map((item: DashboardWidgetConfigItem) => [item.widget_key, item])
              );

              const mergedWidgets: DashboardWidgetConfigItem[] = [];
              const visited = new Set<string>();

              for (const userItem of parsed) {
                const backendItem = res.widgets.find((b) => b.widget_key === userItem.widget_key);
                if (backendItem) {
                  mergedWidgets.push({
                    ...backendItem,
                    ...userItem,
                  });
                  visited.add(userItem.widget_key);
                }
              }

              // Append any backend widgets not yet in the user's saved list (default visible)
              for (const backendItem of res.widgets) {
                if (!visited.has(backendItem.widget_key)) {
                  mergedWidgets.push(backendItem);
                }
              }

              // Only use mergedWidgets if at least 3 non-header widgets are visible
              const visibleNonHeader = mergedWidgets.filter(
                (w) => w.is_visible && w.widget_key !== "welcome_header"
              ).length;

              if (visibleNonHeader >= 3) {
                setPersonalWidgets(mergedWidgets);
                return;
              }
            }
          } catch (e) {
            console.error("Failed to parse local dashboard layout:", e);
          }
        }
      }

      // Default to backend config if no local override
      setPersonalWidgets(res.widgets);
    } catch (err) {
      console.error("Failed to fetch effective dashboard configuration:", err);
      // Fallback: use all registered widgets with new defaults
      const hiddenByDefault = new Set([
        "today_appointments",
        "bed_occupancy_map",
        "upcoming_surgeries",
        "revenue_chart",
      ]);
      const defaultWidgets: DashboardWidgetConfigItem[] = Object.keys(WIDGET_REGISTRY).map(
        (key, i) => ({
          widget_key: key,
          is_visible: !hiddenByDefault.has(key),
          display_order: (i + 1) * 10,
          col_span: WIDGET_REGISTRY[key].defaultColSpan,
          row_span: WIDGET_REGISTRY[key].defaultRowSpan || 1,
        })
      );
      setPersonalWidgets(defaultWidgets);
    } finally {
      setLoading(false);
    }
  }, [getStorageKey]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update personal layout (saved to localStorage)
  const updateLayout = useCallback(
    (newWidgets: DashboardWidgetConfigItem[]) => {
      setPersonalWidgets(newWidgets);
      if (typeof window !== "undefined") {
        localStorage.setItem(getStorageKey(), JSON.stringify(newWidgets));
      }
      toast.success("Dashboard layout updated");
    },
    [getStorageKey]
  );

  // Reset to hospital defaults (clears localStorage override)
  const resetToHospitalDefaults = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(getStorageKey());
    }
    await fetchConfig();
    toast.success("Reset to hospital role defaults");
  }, [fetchConfig, getStorageKey]);

  // Filter widgets by tenant's allowed screens
  const activeWidgets = useMemo(() => {
    if (!personalWidgets || !permissionsInitialized) return [];

    return personalWidgets
      .filter((w) => w.is_visible)
      .filter((w) => {
        const def = WIDGET_REGISTRY[w.widget_key];
        if (!def) return false;
        // If widget requires screens, ensure user has access to at least one
        if (def.requiredScreens && def.requiredScreens.length > 0) {
          return def.requiredScreens.some((path) => hasAccess(path));
        }
        return true;
      })
      .sort((a, b) => a.display_order - b.display_order);
  }, [personalWidgets, permissionsInitialized, hasAccess]);

  return {
    activeWidgets,
    allConfiguredWidgets: personalWidgets || [],
    loading,
    isEditing,
    setIsEditing,
    updateLayout,
    resetToHospitalDefaults,
    scope: effectiveConfig?.scope || "default",
    hasTenantOverride: effectiveConfig?.has_tenant_override || false,
    role: effectiveConfig?.role || "staff",
  };
}
