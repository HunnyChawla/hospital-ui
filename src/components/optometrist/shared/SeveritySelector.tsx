"use client";

import clsx from "clsx";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

type Severity = "mild" | "moderate" | "severe";

interface SeveritySelectorProps {
  value: Severity | null;
  onChange: (value: Severity) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  showIcons?: boolean;
  required?: boolean;
  className?: string;
}

const severityConfig = {
  mild: {
    label: "Mild",
    color: "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-emerald-200 hover:text-emerald-700 shadow-sm",
    activeColor: "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20",
    icon: Info,
  },
  moderate: {
    label: "Moderate",
    color: "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-amber-200 hover:text-amber-700 shadow-sm",
    activeColor: "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20",
    icon: AlertTriangle,
  },
  severe: {
    label: "Severe",
    color: "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-red-200 hover:text-red-700 shadow-sm",
    activeColor: "bg-red-600 text-white border-red-600 shadow-md shadow-red-500/20",
    icon: AlertCircle,
  },
};

const sizes = {
  sm: "px-3 py-1.5 text-xs gap-1",
  md: "px-4 py-2 text-sm gap-1.5",
  lg: "px-5 py-2.5 text-base gap-2",
};

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function SeveritySelector({
  value,
  onChange,
  label,
  disabled = false,
  size = "md",
  showIcons = true,
  required = false,
  className,
}: SeveritySelectorProps) {
  const severities: Severity[] = ["mild", "moderate", "severe"];

  return (
    <div className={clsx("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        {severities.map((severity) => {
          const config = severityConfig[severity];
          const Icon = config.icon;
          const isSelected = value === severity;

          return (
            <button
              key={severity}
              type="button"
              onClick={() => !disabled && onChange(severity)}
              disabled={disabled}
              className={clsx(
                "flex items-center justify-center rounded-lg border font-medium transition",
                sizes[size],
                isSelected ? config.activeColor : config.color,
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {showIcons && <Icon className={iconSizes[size]} />}
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
