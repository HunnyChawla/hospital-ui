"use client";

import type { ComponentType } from "react";

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  size?: "sm" | "md";
}

/**
 * Generic underline tab bar. Consolidates the border-b-2 active/inactive
 * pattern duplicated across several pages in this codebase.
 */
export function Tabs<T extends string = string>({ tabs, activeKey, onChange, size = "md" }: TabsProps<T>) {
  const paddingClass = size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm";

  return (
    <div className="border-b border-slate-200">
      <nav className="-mb-px flex space-x-1" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 font-medium transition-colors ${paddingClass} ${
                isActive
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
