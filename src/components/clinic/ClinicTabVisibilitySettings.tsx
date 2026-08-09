"use client";

import React from "react";
import { X } from "lucide-react";
import { useResolvedPanelComponents } from "@/context/PanelConfigContext";

interface ClinicTabVisibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  hiddenKeys: string[];
  onToggle: (key: string) => void;
}

/**
 * Per-USER tab hiding, layered UNDER the tenant configuration: the list only
 * shows components the tenant has enabled, so a user can hide but never
 * un-hide what the tenant turned off. Stored in localStorage.
 */
export function ClinicTabVisibilitySettings({
  isOpen,
  onClose,
  hiddenKeys,
  onToggle,
}: ClinicTabVisibilitySettingsProps) {
  const resolved = useResolvedPanelComponents();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Customize Tabs</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Hide tabs you don&apos;t use. This only affects your view.
        </p>
        <div className="space-y-2">
          {resolved.map((component) => {
            const Icon = component.icon;
            const hidden = hiddenKeys.includes(component.key);
            return (
              <label
                key={component.key}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-sm text-slate-700">
                  <Icon className="h-4 w-4 text-slate-400" />
                  {component.resolvedLabel}
                </span>
                <input
                  type="checkbox"
                  checked={!hidden}
                  onChange={() => onToggle(component.key)}
                  className="h-4 w-4 accent-sky-600"
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
