"use client";

import React from "react";
import { Check, X } from "lucide-react";
import clsx from "clsx";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">Customize Tabs</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-500 mb-4">
            Select the sections you want to see in the examination panel.
          </p>

          <div className="space-y-2">
            {resolved.map((component) => {
              const isVisible = !hiddenKeys.includes(component.key);
              const Icon = component.icon;

              return (
                <button
                  key={component.key}
                  onClick={() => onToggle(component.key)}
                  className={clsx(
                    "w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left",
                    isVisible
                      ? "bg-white border-sky-200 shadow-sm"
                      : "bg-slate-50 border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "p-1.5 rounded-md transition-colors",
                      isVisible ? "bg-sky-50 text-sky-600" : "bg-slate-200 text-slate-500"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={clsx(
                      "text-sm font-medium",
                      isVisible ? "text-slate-900" : "text-slate-500"
                    )}>
                      {component.resolvedLabel}
                    </span>
                  </div>

                  <div className={clsx(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                    isVisible
                      ? "bg-sky-500 border-sky-500 text-white"
                      : "bg-white border-slate-300"
                  )}>
                    {isVisible && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
