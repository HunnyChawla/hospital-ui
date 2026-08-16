"use client";

import React from "react";
import clsx from "clsx";
import { getStatusColor } from "@/utils/clinicQueueFilters";
import { useTenantLabels } from "@/hooks/useTenantLabels";

/**
 * Status pill whose text resolves through the tenant's label overrides —
 * rename "awaiting_examiner" in /panel-config and every badge follows.
 */
export function ClinicStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const { statusLabel } = useTenantLabels();
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        getStatusColor(status),
        className
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
