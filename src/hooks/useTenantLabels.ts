import { useCallback } from "react";
import { ROLE_LABELS } from "@/constants/screens";
import type { UserRole } from "@/types";
import { useTenantLabelsQuery } from "@/hooks/usePanelConfig";
import { DEFAULT_STATUS_LABELS } from "@/utils/clinicQueueFilters";

function titleCase(value: string): string {
  return value
    .split("_")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Resolve display text for roles and visit statuses through the tenant's
 * label overrides. Every status string the clinic panel renders — queue
 * cards, stat tiles, badges, filter tabs, toasts — goes through this, so a
 * tenant renaming "awaiting_examiner" to "Waiting for Vitals" takes effect
 * everywhere at once. Provider-free: reads the shared query cache.
 */
export function useTenantLabels() {
  const { labels, isLoading } = useTenantLabelsQuery();

  const statusLabel = useCallback(
    (status: string): string =>
      labels?.labels?.visit_status?.[status] ??
      DEFAULT_STATUS_LABELS[status] ??
      titleCase(status),
    [labels]
  );

  const roleLabel = useCallback(
    (role: string): string =>
      labels?.labels?.role?.[role] ?? ROLE_LABELS[role as UserRole] ?? titleCase(role),
    [labels]
  );

  const panelLabel = useCallback(
    (panelKey: string): string => labels?.labels?.panel?.[panelKey] ?? titleCase(panelKey),
    [labels]
  );

  return { statusLabel, roleLabel, panelLabel, isLoading };
}

export const useLabel = useTenantLabels;
