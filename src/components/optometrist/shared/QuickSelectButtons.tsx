"use client";

import clsx from "clsx";
import { Check } from "lucide-react";

interface QuickSelectOption<T> {
  label: string;
  value: T;
  description?: string;
  icon?: React.ReactNode;
}

interface QuickSelectButtonsProps<T> {
  options: QuickSelectOption<T>[];
  value: T | T[] | null;
  onChange: (value: T | T[]) => void;
  multiSelect?: boolean;
  size?: "sm" | "md" | "lg";
  colorScheme?: "sky" | "blue" | "green" | "amber" | "neutral";
  layout?: "horizontal" | "vertical" | "grid";
  columns?: 2 | 3 | 4 | 5 | 6;
  label?: string;
  showCheckmarks?: boolean;
  disabled?: boolean;
  className?: string;
}

const colorSchemes = {
  sky: {
    inactive: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
    active: "bg-sky-600 text-white border-sky-600 shadow-sm",
  },
  blue: {
    inactive: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    active: "bg-blue-600 text-white border-blue-600 shadow-sm",
  },
  green: {
    inactive: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    active: "bg-green-600 text-white border-green-600 shadow-sm",
  },
  amber: {
    inactive: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200",
    active: "bg-amber-600 text-white border-amber-600 shadow-sm",
  },
  neutral: {
    inactive: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
    active: "bg-slate-700 text-white border-slate-700 shadow-sm",
  },
};

const sizes = {
  sm: "px-2 py-1 text-xs gap-1",
  md: "px-3 py-1.5 text-sm gap-1.5",
  lg: "px-4 py-2 text-base gap-2",
};

export function QuickSelectButtons<T extends string | number>({
  options,
  value,
  onChange,
  multiSelect = false,
  size = "md",
  colorScheme = "sky",
  layout = "horizontal",
  columns = 4,
  label,
  showCheckmarks = false,
  disabled = false,
  className,
}: QuickSelectButtonsProps<T>) {
  const colors = colorSchemes[colorScheme];
  const sizeClass = sizes[size];

  const isSelected = (optionValue: T): boolean => {
    if (multiSelect && Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  const handleClick = (optionValue: T) => {
    if (disabled) return;

    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(optionValue)) {
        // Remove if already selected
        onChange(currentValues.filter((v) => v !== optionValue) as T[]);
      } else {
        // Add to selection
        onChange([...currentValues, optionValue] as T[]);
      }
    } else {
      // Single select - toggle or set
      onChange(value === optionValue ? (null as unknown as T) : optionValue);
    }
  };

  const layoutClasses = {
    horizontal: "flex flex-wrap gap-2",
    vertical: "flex flex-col gap-2",
    grid: `grid gap-2 grid-cols-${columns}`,
  };

  // For grid layout, we need to use inline style for dynamic columns
  const gridStyle =
    layout === "grid"
      ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
      : undefined;

  return (
    <div className={clsx("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div
        className={clsx(
          layout === "grid" ? "grid gap-2" : layoutClasses[layout],
          disabled && "opacity-50"
        )}
        style={gridStyle}
      >
        {options.map((option) => {
          const selected = isSelected(option.value);
          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => handleClick(option.value)}
              disabled={disabled}
              className={clsx(
                "flex items-center justify-center rounded-lg border font-medium transition whitespace-nowrap",
                sizeClass,
                selected ? colors.active : colors.inactive,
                disabled && "cursor-not-allowed"
              )}
              title={option.description}
            >
              {showCheckmarks && selected && (
                <Check className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              {option.icon && (
                <span className="flex-shrink-0">{option.icon}</span>
              )}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
