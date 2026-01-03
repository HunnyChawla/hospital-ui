"use client";

import clsx from "clsx";
import { Eye } from "lucide-react";

type EyeValue = "LE" | "RE" | "BE" | "GE";

interface EyeSelectorProps {
  value: EyeValue | null;
  onChange: (value: EyeValue) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  showBoth?: boolean; // Show OU (both eyes) option
  required?: boolean;
  className?: string;
}

const eyeConfig = {
  RE: {
    label: "RE",
    fullLabel: "Right Eye",
    color: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
    activeColor: "bg-blue-600 text-white border-blue-600",
  },
  LE: {
    label: "LE",
    fullLabel: "Left Eye",
    color: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
    activeColor: "bg-green-600 text-white border-green-600",
  },
  BE: {
    label: "BE",
    fullLabel: "Both Eyes",
    color: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200",
    activeColor: "bg-purple-600 text-white border-purple-600",
  },
  GE: {
    label: "GE",
    fullLabel: "General/Either",
    color: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    activeColor: "bg-slate-600 text-white border-slate-600",
  },
};

const sizes = {
  sm: {
    button: "px-3 py-1.5 text-xs gap-1",
    icon: "h-3 w-3",
  },
  md: {
    button: "px-4 py-2 text-sm gap-1.5",
    icon: "h-4 w-4",
  },
  lg: {
    button: "px-5 py-2.5 text-base gap-2",
    icon: "h-5 w-5",
  },
};

export function EyeSelector({
  value,
  onChange,
  label,
  disabled = false,
  size = "md",
  showBoth = true,
  required = false,
  className,
}: EyeSelectorProps) {
  const eyes: EyeValue[] = showBoth ? ["RE", "LE", "BE", "GE"] : ["RE", "LE", "BE", "GE"];
  const sizeClasses = sizes[size];

  return (
    <div className={clsx("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div className="flex gap-2">
        {eyes.map((eye) => {
          const config = eyeConfig[eye];
          const isSelected = value === eye;

          return (
            <button
              key={eye}
              type="button"
              onClick={() => !disabled && onChange(eye)}
              disabled={disabled}
              className={clsx(
                "flex items-center justify-center rounded-lg border font-semibold transition",
                sizeClasses.button,
                isSelected ? config.activeColor : config.color,
                disabled && "cursor-not-allowed opacity-50"
              )}
              title={config.fullLabel}
            >
              <Eye className={sizeClasses.icon} />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
