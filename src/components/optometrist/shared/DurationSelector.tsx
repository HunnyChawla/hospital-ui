"use client";

import { useState } from "react";
import clsx from "clsx";
import { Clock, X } from "lucide-react";

interface DurationOption {
  label: string;
  value: string;
}

interface DurationSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  showCustomInput?: boolean;
  options?: DurationOption[];
  placeholder?: string;
  className?: string;
}

const defaultOptions: DurationOption[] = [
  { label: "Today", value: "today" },
  { label: "Few days", value: "few_days" },
  { label: "1 week", value: "1_week" },
  { label: "2 weeks", value: "2_weeks" },
  { label: "1 month", value: "1_month" },
  { label: "3 months", value: "3_months" },
  { label: "6 months", value: "6_months" },
  { label: "1 year", value: "1_year" },
  { label: "Years", value: "years" },
];

export function DurationSelector({
  value,
  onChange,
  label,
  disabled = false,
  required = false,
  showCustomInput = true,
  options = defaultOptions,
  placeholder = "Enter custom duration...",
  className,
}: DurationSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const isPresetSelected = options.some((opt) => opt.value === value);
  const isCustomSelected = value && !isPresetSelected;

  const handlePresetClick = (optionValue: string) => {
    if (disabled) return;
    setShowCustom(false);
    onChange(value === optionValue ? null : optionValue);
  };

  const handleCustomClick = () => {
    if (disabled) return;
    setShowCustom(true);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setShowCustom(false);
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomSubmit();
    } else if (e.key === "Escape") {
      setShowCustom(false);
      setCustomValue("");
    }
  };

  const handleClear = () => {
    onChange(null);
    setCustomValue("");
    setShowCustom(false);
  };

  // Get display value for selected option
  const getDisplayValue = () => {
    if (!value) return null;
    const preset = options.find((opt) => opt.value === value);
    return preset ? preset.label : value;
  };

  return (
    <div className={clsx("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {/* Selected Value Display */}
      {value && !showCustom && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-2 rounded-lg bg-sky-100 px-3 py-1.5 text-sm font-medium text-sky-700">
            <Clock className="h-4 w-4" />
            <span>{getDisplayValue()}</span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 rounded p-0.5 hover:bg-sky-200 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Custom Input */}
      {showCustom && showCustomInput && (
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            onBlur={handleCustomSubmit}
            placeholder={placeholder}
            autoFocus
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <button
            type="button"
            onClick={() => {
              setShowCustom(false);
              setCustomValue("");
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handlePresetClick(option.value)}
            disabled={disabled}
            className={clsx(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
              value === option.value
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {option.label}
          </button>
        ))}

        {/* Custom Option */}
        {showCustomInput && !showCustom && (
          <button
            type="button"
            onClick={handleCustomClick}
            disabled={disabled}
            className={clsx(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
              isCustomSelected
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            Custom...
          </button>
        )}
      </div>
    </div>
  );
}
