import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  panelConfigApi,
  type PanelKey,
  type PanelConfigResponse,
  type PanelComponentConfig,
  type LabelOverridesResponse,
  type LabelOverrideItem,
} from "@/services/panelConfigApi";

const configStorageKey = (panelKey: PanelKey, role: string) =>
  `panel_config_${panelKey}_${role}`;
const LABELS_STORAGE_KEY = "tenant_labels";

/**
 * Per-tenant, per-role panel component configuration.
 *
 * Mirrors useFeatureFlags's caching: React Query with staleTime Infinity,
 * hydrated from localStorage so the panel paints the tenant's layout on
 * first frame instead of flashing registry defaults, write-through on fetch.
 */
export function usePanelConfig(panelKey: PanelKey, role: string) {
  const queryClient = useQueryClient();
  const tenantId =
    typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "" : "";

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["panel-config", panelKey, role, tenantId],
    queryFn: () => panelConfigApi.get(panelKey, role),
    staleTime: Infinity,
    enabled: !!role,
    initialData: () => {
      if (typeof window === "undefined") return undefined;
      try {
        const stored = localStorage.getItem(configStorageKey(panelKey, role));
        return stored ? (JSON.parse(stored) as PanelConfigResponse) : undefined;
      } catch {
        return undefined;
      }
    },
  });

  useEffect(() => {
    if (data && typeof window !== "undefined") {
      const serialized = JSON.stringify(data);
      if (localStorage.getItem(configStorageKey(panelKey, role)) !== serialized) {
        localStorage.setItem(configStorageKey(panelKey, role), serialized);
      }
    }
  }, [data, panelKey, role]);

  const saveMutation = useMutation({
    mutationFn: ({
      targetRole,
      components,
    }: {
      targetRole: string;
      components: PanelComponentConfig[];
    }) => panelConfigApi.saveComponents(panelKey, targetRole, components),
    onSuccess: (updated, variables) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          configStorageKey(panelKey, variables.targetRole),
          JSON.stringify(updated)
        );
      }
      queryClient.setQueryData(
        ["panel-config", panelKey, variables.targetRole, tenantId],
        updated
      );
      queryClient.invalidateQueries({ queryKey: ["panel-config", panelKey] });
      toast.success("Panel configuration saved");
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to save panel configuration");
    },
  });

  const resetMutation = useMutation({
    mutationFn: (targetRole: string) => panelConfigApi.reset(panelKey, targetRole),
    onSuccess: (_void, targetRole) => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(configStorageKey(panelKey, targetRole));
      }
      queryClient.invalidateQueries({ queryKey: ["panel-config", panelKey] });
      toast.success("Panel configuration reset to defaults");
    },
    onError: () => toast.error("Failed to reset panel configuration"),
  });

  return {
    config: data ?? null,
    isLoading,
    error,
    refetch,
    saveComponents: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    resetConfig: resetMutation.mutate,
    isResetting: resetMutation.isPending,
  };
}

/**
 * Tenant-wide display labels (roles, visit statuses, panels), fetched once
 * per session and shared through the query cache — no provider needed.
 */
export function useTenantLabelsQuery() {
  const queryClient = useQueryClient();
  const tenantId =
    typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "" : "";

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tenant-labels", tenantId],
    queryFn: () => panelConfigApi.getLabels(),
    staleTime: Infinity,
    initialData: () => {
      if (typeof window === "undefined") return undefined;
      try {
        const stored = localStorage.getItem(LABELS_STORAGE_KEY);
        return stored ? (JSON.parse(stored) as LabelOverridesResponse) : undefined;
      } catch {
        return undefined;
      }
    },
  });

  useEffect(() => {
    if (data && typeof window !== "undefined") {
      const serialized = JSON.stringify(data);
      if (localStorage.getItem(LABELS_STORAGE_KEY) !== serialized) {
        localStorage.setItem(LABELS_STORAGE_KEY, serialized);
      }
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (overrides: LabelOverrideItem[]) => panelConfigApi.saveLabels(overrides),
    onSuccess: (updated) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(LABELS_STORAGE_KEY, JSON.stringify(updated));
      }
      queryClient.setQueryData(["tenant-labels", tenantId], updated);
      toast.success("Labels updated");
    },
    onError: () => toast.error("Failed to update labels"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ scope, key }: { scope: LabelOverrideItem["label_scope"]; key: string }) =>
      panelConfigApi.deleteLabel(scope, key),
    onSuccess: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(LABELS_STORAGE_KEY);
      }
      queryClient.invalidateQueries({ queryKey: ["tenant-labels"] });
      toast.success("Label reset to default");
    },
    onError: () => toast.error("Failed to reset label"),
  });

  return {
    labels: data ?? null,
    isLoading,
    refetch,
    saveLabels: saveMutation.mutate,
    isSavingLabels: saveMutation.isPending,
    deleteLabel: deleteMutation.mutate,
  };
}
