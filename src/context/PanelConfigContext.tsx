"use client";

import React, { createContext, useContext, useMemo } from "react";
import { usePanelConfig } from "@/hooks/usePanelConfig";
import type { PanelConfigResponse } from "@/services/panelConfigApi";
import {
  CLINIC_PANEL_COMPONENTS,
  type ClinicPanelComponentDef,
  type ClinicPanelRole,
} from "@/components/clinic/panelRegistry";

interface PanelConfigContextType {
  config: PanelConfigResponse | null;
  isLoading: boolean;
  role: ClinicPanelRole;
}

const PanelConfigContext = createContext<PanelConfigContextType | undefined>(undefined);

export function PanelConfigProvider({
  role,
  children,
}: {
  role: ClinicPanelRole;
  children: React.ReactNode;
}) {
  const { config, isLoading } = usePanelConfig("clinic_panel", role);

  const value = useMemo(() => ({ config, isLoading, role }), [config, isLoading, role]);

  return <PanelConfigContext.Provider value={value}>{children}</PanelConfigContext.Provider>;
}

export function usePanelConfigContext(): PanelConfigContextType {
  const context = useContext(PanelConfigContext);
  if (context === undefined) {
    throw new Error("usePanelConfigContext must be used within a PanelConfigProvider");
  }
  return context;
}

export interface ResolvedPanelComponent extends ClinicPanelComponentDef {
  resolvedLabel: string;
  visible: boolean;
  order: number;
}

/**
 * The tenant's view of the component registry for a role.
 *
 * Precedence: tenant config -> registry default. A tenant row may GRANT a
 * component to a role that isn't in its defaultRoles; a per-user localStorage
 * hide list (ClinicTabVisibilitySettings) is applied by the consumer on top,
 * so a user can hide but never un-hide what the tenant turned off.
 */
export function useResolvedPanelComponents(): ResolvedPanelComponent[] {
  const { config, role } = usePanelConfigContext();

  return useMemo(() => {
    const overrides = new Map(
      (config?.components ?? []).map((c) => [c.component_key, c])
    );

    return CLINIC_PANEL_COMPONENTS.filter(
      (def) => def.defaultRoles.includes(role) || overrides.has(def.key)
    )
      .map((def) => {
        const override = overrides.get(def.key);
        return {
          ...def,
          resolvedLabel: override?.label_override?.trim() || def.label,
          visible: override?.is_visible ?? def.defaultVisible,
          order: override?.display_order ?? def.defaultOrder,
        };
      })
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
  }, [config, role]);
}

/** Gate for non-registry chrome (header buttons etc.). */
export function PanelComponentGate({
  componentKey,
  children,
  fallback = null,
}: {
  componentKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const resolved = useResolvedPanelComponents();
  return resolved.some((c) => c.key === componentKey) ? <>{children}</> : <>{fallback}</>;
}
