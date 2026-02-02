"use client";

import clsx from "clsx";
import { ArrowRight, Copy } from "lucide-react";
import { NumericStepper } from "./NumericStepper";

interface EyeValueInputProps {
  label: string;
  odValue: number | null;
  osValue: number | null;
  onODChange: (value: number | null) => void;
  onOSChange: (value: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  presets?: number[];
  showPresets?: boolean;
  showCopyButton?: boolean;
  allowNull?: boolean;
  disabled?: boolean;
  odError?: string;
  osError?: string;
  required?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EyeValueInput({
  label,
  odValue,
  osValue,
  onODChange,
  onOSChange,
  step = 0.25,
  min = -30,
  max = 30,
  unit,
  presets = [],
  showPresets = true,
  showCopyButton = true,
  allowNull = true,
  disabled = false,
  odError,
  osError,
  required = false,
  size = "md",
  className,
}: EyeValueInputProps) {
  const handleCopyODtoOS = () => {
    if (odValue !== null && !disabled) {
      onOSChange(odValue);
    }
  };

  return (
    <div className={clsx("space-y-3", className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-900">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        {showCopyButton && odValue !== null && (
          <button
            type="button"
            onClick={handleCopyODtoOS}
            disabled={disabled}
            className={clsx(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition",
              "bg-slate-100 text-slate-600 hover:bg-slate-200",
              disabled && "cursor-not-allowed opacity-50"
            )}
            title="Copy OD value to OS"
          >
            <Copy className="h-3 w-3" />
            Same as OD
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* OD/OS Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        {/* OD (Right Eye) */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-blue-700">
              OD (Right)
            </span>
          </div>
          <NumericStepper
            value={odValue}
            onChange={onODChange}
            step={step}
            min={min}
            max={max}
            unit={unit}
            presets={presets}
            showPresets={showPresets}
            allowNull={allowNull}
            colorScheme="blue"
            size={size}
            disabled={disabled}
            error={odError}
          />
        </div>

        {/* OS (Left Eye) */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-green-700">
              OS (Left)
            </span>
          </div>
          <NumericStepper
            value={osValue}
            onChange={onOSChange}
            step={step}
            min={min}
            max={max}
            unit={unit}
            presets={presets}
            showPresets={showPresets}
            allowNull={allowNull}
            colorScheme="green"
            size={size}
            disabled={disabled}
            error={osError}
          />
        </div>
      </div>
    </div>
  );
}
