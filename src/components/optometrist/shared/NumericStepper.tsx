"use client";

import { useState, useEffect, useCallback } from "react";
import { Minus, Plus, X } from "lucide-react";
import clsx from "clsx";

interface NumericStepperProps {
  value: number | null;
  onChange: (value: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  presets?: number[];
  allowNull?: boolean;
  colorScheme?: "blue" | "green" | "neutral";
  size?: "sm" | "md" | "lg";
  showPresets?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

const colorSchemes = {
  blue: {
    container: "border-blue-200 bg-blue-50",
    label: "text-blue-900",
    button: "bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200",
    buttonActive: "bg-blue-600 text-white",
    input: "focus:border-blue-500 focus:ring-blue-500/20",
    preset: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200",
    presetActive: "bg-blue-600 text-white border-blue-600",
  },
  green: {
    container: "border-green-200 bg-green-50",
    label: "text-green-900",
    button: "bg-green-100 hover:bg-green-200 text-green-700 border-green-200",
    buttonActive: "bg-green-600 text-white",
    input: "focus:border-green-500 focus:ring-green-500/20",
    preset: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
    presetActive: "bg-green-600 text-white border-green-600",
  },
  neutral: {
    container: "border-slate-200 bg-slate-50",
    label: "text-slate-900",
    button: "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200",
    buttonActive: "bg-slate-600 text-white",
    input: "focus:border-sky-500 focus:ring-sky-500/20",
    preset: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
    presetActive: "bg-sky-600 text-white border-sky-600",
  },
};

const sizes = {
  sm: {
    container: "p-2",
    button: "h-7 w-7 text-sm",
    input: "h-8 text-sm px-2",
    preset: "px-2 py-1 text-xs",
  },
  md: {
    container: "p-3",
    button: "h-9 w-9 text-base",
    input: "h-10 text-base px-3",
    preset: "px-3 py-1.5 text-sm",
  },
  lg: {
    container: "p-4",
    button: "h-11 w-11 text-lg",
    input: "h-12 text-lg px-4",
    preset: "px-4 py-2 text-sm",
  },
};

export function NumericStepper({
  value,
  onChange,
  step = 0.25,
  min = -30,
  max = 30,
  label,
  unit,
  presets = [],
  allowNull = true,
  colorScheme = "neutral",
  size = "md",
  showPresets = true,
  disabled = false,
  error,
  placeholder = "0.00",
}: NumericStepperProps) {
  const [inputValue, setInputValue] = useState<string>(
    value !== null ? formatValue(value) : ""
  );
  const [isFocused, setIsFocused] = useState(false);

  const colors = colorSchemes[colorScheme];
  const sizeClasses = sizes[size];

  function formatValue(val: number | string | null | undefined): string {
    if (val === null || val === undefined || val === "") return "";
    const num = typeof val === "number" ? val : Number(val);
    if (Number.isNaN(num)) return String(val);
    if (step >= 1) {
      return num.toString();
    }
    return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
  }

  function parseInputValue(val: string): number | null {
    const cleaned = val.replace(/[^0-9.\-+]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === "+") return null;
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  // Sync input with value prop
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value !== null ? formatValue(value) : "");
    }
  }, [value, isFocused]);

  const increment = useCallback(() => {
    if (disabled) return;
    const current = value ?? 0;
    const newValue = Math.min(max, current + step);
    // Round to avoid floating point issues
    const rounded = Math.round(newValue / step) * step;
    onChange(rounded);
  }, [value, step, max, disabled, onChange]);

  const decrement = useCallback(() => {
    if (disabled) return;
    const current = value ?? 0;
    const newValue = Math.max(min, current - step);
    // Round to avoid floating point issues
    const rounded = Math.round(newValue / step) * step;
    onChange(rounded);
  }, [value, step, min, disabled, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const parsed = parseInputValue(inputValue);
    if (parsed !== null) {
      const clamped = Math.max(min, Math.min(max, parsed));
      const rounded = Math.round(clamped / step) * step;
      onChange(rounded);
      setInputValue(formatValue(rounded));
    } else if (allowNull) {
      onChange(null);
      setInputValue("");
    } else {
      // Reset to previous value
      setInputValue(value !== null ? formatValue(value) : "");
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    // Show raw number for easier editing
    if (value !== null) {
      setInputValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      increment();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      decrement();
    } else if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handlePresetClick = (presetValue: number) => {
    if (disabled) return;
    onChange(presetValue);
  };

  const handleClear = () => {
    if (disabled || !allowNull) return;
    onChange(null);
    setInputValue("");
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className={clsx("block text-sm font-medium", colors.label)}>
          {label}
        </label>
      )}

      <div
        className={clsx(
          "rounded-lg border-2 transition",
          colors.container,
          sizeClasses.container,
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-red-300 bg-red-50"
        )}
      >
        {/* Main Stepper Controls */}
        <div className="flex items-center gap-2">
          {/* Decrement Button */}
          <button
            type="button"
            onClick={decrement}
            disabled={disabled || (value !== null && value <= min)}
            className={clsx(
              "flex items-center justify-center rounded-lg border transition",
              sizeClasses.button,
              colors.button,
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            aria-label="Decrease value"
          >
            <Minus className="h-4 w-4" />
          </button>

          {/* Input Field */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={placeholder}
              className={clsx(
                "w-full rounded-lg border border-slate-300 text-center font-semibold outline-none transition",
                sizeClasses.input,
                colors.input,
                "focus:ring-2",
                disabled && "cursor-not-allowed bg-slate-100"
              )}
            />
            {unit && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                {unit}
              </span>
            )}
          </div>

          {/* Increment Button */}
          <button
            type="button"
            onClick={increment}
            disabled={disabled || (value !== null && value >= max)}
            className={clsx(
              "flex items-center justify-center rounded-lg border transition",
              sizeClasses.button,
              colors.button,
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            aria-label="Increase value"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Clear Button */}
          {allowNull && value !== null && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className={clsx(
                "flex items-center justify-center rounded-lg border transition",
                sizeClasses.button,
                "bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
              aria-label="Clear value"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Preset Buttons */}
        {showPresets && presets.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetClick(preset)}
                disabled={disabled}
                className={clsx(
                  "rounded-md border font-medium transition",
                  sizeClasses.preset,
                  value === preset ? colors.presetActive : colors.preset,
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {step >= 1 ? preset : (preset >= 0 ? `+${preset}` : preset)}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
