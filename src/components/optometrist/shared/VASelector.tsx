"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { ChevronDown, Check, Search } from "lucide-react";

interface VAOption {
  value: string;
  label: string;
  isCommon?: boolean;
}

interface VASelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  showQuickSelect?: boolean;
  colorScheme?: "blue" | "green" | "neutral";
  mode?: "standard" | "full";
  error?: string;
  className?: string;
}

// Standard visual acuity values (Snellen 6m notation)
const vaOptions: VAOption[] = [
  { value: "6/6", label: "6/6 (Normal)", isCommon: true },
  { value: "6/5", label: "6/5 (Better than normal)", isCommon: false },
  { value: "6/9", label: "6/9", isCommon: true },
  { value: "6/12", label: "6/12", isCommon: true },
  { value: "6/18", label: "6/18", isCommon: true },
  { value: "6/24", label: "6/24", isCommon: false },
  { value: "6/36", label: "6/36", isCommon: true },
  { value: "6/60", label: "6/60", isCommon: true },
  { value: "5/60", label: "5/60", isCommon: false },
  { value: "4/60", label: "4/60", isCommon: false },
  { value: "3/60", label: "3/60", isCommon: false },
  { value: "2/60", label: "2/60", isCommon: false },
  { value: "1/60", label: "1/60", isCommon: false },
  { value: "CF 6m", label: "Counting Finger 6m", isCommon: false },
  { value: "CF 5m", label: "Counting Finger 5m", isCommon: false },
  { value: "CF 4m", label: "Counting Finger 4m", isCommon: false },
  { value: "CF 3m", label: "Counting Finger 3m", isCommon: false },
  { value: "CF 2m", label: "Counting Finger 2m", isCommon: false },
  { value: "CF 1m", label: "Counting Finger 1m", isCommon: false },
  { value: "CF", label: "CF (Counting Fingers)", isCommon: false },
  { value: "HM", label: "HM (Hand Movements)", isCommon: false },
  { value: "PL", label: "PL (Perception of Light)", isCommon: false },
  { value: "NPL", label: "NPL (No Perception of Light)", isCommon: false },
];

const quickSelectValues = ["6/6", "6/9", "6/12", "6/18", "6/36", "6/60"];

const colorSchemes = {
  blue: {
    button: "border-blue-200 focus:border-blue-500 focus:ring-blue-500/20",
    quickSelect: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200",
    quickSelectActive: "bg-blue-600 text-white border-blue-600",
  },
  green: {
    button: "border-green-200 focus:border-green-500 focus:ring-green-500/20",
    quickSelect: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
    quickSelectActive: "bg-green-600 text-white border-green-600",
  },
  neutral: {
    button: "border-slate-300 focus:border-sky-500 focus:ring-sky-500/20",
    quickSelect: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
    quickSelectActive: "bg-sky-600 text-white border-sky-600",
  },
};

export function VASelector({
  value,
  onChange,
  label,
  disabled = false,
  required = false,
  placeholder = "Select visual acuity...",
  showQuickSelect = true,
  colorScheme = "neutral",
  mode = "standard",
  error,
  className,
}: VASelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const colors = colorSchemes[colorScheme];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = vaOptions.filter(
    (opt) =>
      opt.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optValue: string) => {
    const newValue = value === optValue ? "" : optValue;
    onChange(newValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleQuickSelect = (optValue: string) => {
    if (disabled) return;
    const newValue = value === optValue ? "" : optValue;
    onChange(newValue);
  };

  const selectedOption = vaOptions.find((opt) => opt.value === value);

  return (
    <div className={clsx("space-y-2", className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {/* Full Quick Select Mode */}
      {mode === "full" ? (
        <div className="flex flex-wrap gap-1 mb-2">
          {vaOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleQuickSelect(opt.value)}
              disabled={disabled}
              title={opt.label}
              className={clsx(
                "rounded-md border p-2 text-xs font-medium transition min-w-[3rem] text-center",
                value === opt.value ? colors.quickSelectActive : colors.quickSelect,
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {opt.value}
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Quick Select Buttons */}
          {showQuickSelect && (
            <div className="flex flex-wrap gap-1 mb-2">
              {quickSelectValues.map((qv) => (
                <button
                  key={qv}
                  type="button"
                  onClick={() => handleQuickSelect(qv)}
                  disabled={disabled}
                  className={clsx(
                    "rounded-md border px-2 py-1 text-xs font-medium transition",
                    value === qv ? colors.quickSelectActive : colors.quickSelect,
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  {qv}
                </button>
              ))}
            </div>
          )}

          {/* Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(!isOpen)}
              disabled={disabled}
              className={clsx(
                "flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left text-sm transition",
                colors.button,
                "focus:outline-none focus:ring-2",
                disabled && "cursor-not-allowed bg-slate-50 opacity-50",
                error && "border-red-300"
              )}
            >
              <span className={value ? "text-slate-900" : "text-slate-500"}>
                {selectedOption ? selectedOption.label : placeholder}
              </span>
              <ChevronDown
                className={clsx(
                  "h-4 w-4 text-slate-400 transition",
                  isOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                {/* Search Input */}
                <div className="border-b border-slate-200 p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search VA..."
                      className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Options List */}
                <div className="max-h-48 overflow-y-auto py-1">
                  {filteredOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">
                      No results found
                    </div>
                  ) : (
                    filteredOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={clsx(
                          "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition",
                          value === opt.value
                            ? "bg-sky-50 text-sky-700"
                            : "text-slate-700 hover:bg-slate-50",
                          opt.isCommon && "font-medium"
                        )}
                      >
                        <span>{opt.label}</span>
                        {value === opt.value && (
                          <Check className="h-4 w-4 text-sky-600" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
