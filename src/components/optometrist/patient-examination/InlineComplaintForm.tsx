"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { X, Check, AlertCircle, ChevronsUpDown } from "lucide-react";
import { EyeSelector, SeveritySelector } from "../shared";
import { getErrorMessage } from "@/utils/errorHandler";
import { useFullscreenContainer } from "@/context/FullscreenContainerContext";
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from "@headlessui/react";


type EyeType = "LE" | "RE" | "BE" | "GE";
type Severity = "mild" | "moderate" | "severe";

interface FormData {
  text: string;
  eye: EyeType;
  severity: Severity | null;
  duration: string;
  notes?: string;
}

interface InlineComplaintFormProps {
  complaintText: string;
  onSave: (data: FormData) => Promise<void>;
  onCancel: () => void;
  defaultValues?: Partial<FormData>;
  isSubmitting?: boolean;
}

const DURATION_OPTIONS = [
  "Today",
  "1-3 days",
  "4-7 days",
  "1-2 weeks",
  "2-4 weeks",
  "1-3 months",
  "> 6 months",
];

const QUICK_DURATIONS = ["Today", "1-3 days", "1 week", "2-4 weeks", "1 month", "> 6 mos"];

export function InlineComplaintForm({
  complaintText,
  onSave,
  onCancel,
  defaultValues,
  isSubmitting = false,
}: InlineComplaintFormProps) {
  const { containerRef } = useFullscreenContainer();
  // Default to BE (Both Eyes) for fastest clinical entry if not specified
  const [eye, setEye] = useState<EyeType>(defaultValues?.eye || "BE");
  const [severity, setSeverity] = useState<Severity | null>(
    defaultValues?.severity || null
  );
  const [duration, setDuration] = useState<string>(
    defaultValues?.duration || ""
  );
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<string>(defaultValues?.notes || "");

  const [error, setError] = useState<string>("");

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Hotkeys for rapid entry
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const submitBtn = document.getElementById("inline-complaint-submit-btn");
        if (submitBtn) submitBtn.click();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const submitBtn = document.getElementById("inline-complaint-submit-btn");
        if (submitBtn) submitBtn.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Single letter hotkeys for eye selection when not typing
        if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          setEye("RE");
        } else if (e.key === "l" || e.key === "L") {
          e.preventDefault();
          setEye("LE");
        } else if (e.key === "b" || e.key === "B") {
          e.preventDefault();
          setEye("BE");
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onCancel]);

  const handleSubmit = async () => {
    if (!eye) {
      setError("Eye is required");
      return;
    }

    setError("");

    try {
      await onSave({
        text: complaintText,
        eye,
        severity,
        duration: duration.trim(),
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const filteredDurations =
    query === ""
      ? DURATION_OPTIONS
      : DURATION_OPTIONS.filter((d) => {
        return d.toLowerCase().includes(query.toLowerCase());
      });

  return (
    <div className="mt-3 rounded-xl border border-sky-300/80 bg-gradient-to-b from-sky-50/50 to-white p-3.5 sm:p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Complaint Context Header */}
      <div className="mb-3.5 flex items-center justify-between border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-600 text-white shadow-xs text-xs font-bold">
            Rx
          </span>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {complaintText}
            </h4>
            <p className="text-[11px] text-slate-500">
              Configure eye, duration & severity
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          title="Dismiss (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3.5">
        {/* Row 1: Eye and Severity selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Eye Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Eye Affected <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Keys: R (RE) • L (LE) • B (BE)
              </span>
            </div>
            <EyeSelector
              value={eye}
              onChange={(value) => setEye(value)}
              label=""
              size="sm"
            />
          </div>

          {/* Severity Selector */}
          <div>
            <SeveritySelector
              value={severity}
              onChange={(value) => setSeverity(value)}
              label="Severity"
              size="sm"
            />
          </div>
        </div>

        {/* Row 2: Duration and Notes inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Duration with quick preset chips */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Duration
            </label>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_DURATIONS.map((preset) => {
                const isSelected = duration === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDuration(preset);
                      setQuery("");
                    }}
                    className={clsx(
                      "rounded-md px-2 py-0.5 text-[11px] font-semibold border transition shadow-2xs",
                      isSelected
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700 hover:bg-sky-50"
                    )}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>

            <Combobox
              value={duration}
              onChange={(val) => {
                setDuration(val || "");
              }}
              immediate
            >
              <div className="relative">
                <ComboboxInput
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  onChange={(event) => setQuery(event.target.value)}
                  onBlur={() => setQuery("")}
                  displayValue={(val: string) => val}
                  placeholder="Or type custom duration..."
                />
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronsUpDown
                    className="h-3.5 w-3.5 text-slate-400"
                    aria-hidden="true"
                  />
                </ComboboxButton>
                <ComboboxOptions
                  className="absolute left-0 top-full mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-50 empty:hidden focus:outline-none"
                >
                  {filteredDurations.map((option) => (
                    <ComboboxOption
                      key={option}
                      value={option}
                      className={({ focus }) =>
                        clsx(
                          "cursor-pointer select-none rounded-md px-3 py-1.5 text-xs",
                          focus ? "bg-sky-100 text-sky-900 font-medium" : "text-slate-900"
                        )
                      }
                    >
                      {({ selected }) => (
                        <div className="flex items-center justify-between">
                          <span>{option}</span>
                          {selected && <Check className="h-3.5 w-3.5 text-sky-600" />}
                        </div>
                      )}
                    </ComboboxOption>
                  ))}
                  {query.length > 0 && !filteredDurations.includes(query) && (
                    <ComboboxOption
                      value={query}
                      className={({ focus }) =>
                        clsx(
                          "cursor-pointer select-none rounded-md px-3 py-1.5 text-xs",
                          focus ? "bg-sky-100 text-sky-900 font-medium" : "text-slate-900"
                        )
                      }
                    >
                      Use &quot;{query}&quot;
                    </ComboboxOption>
                  )}
                </ComboboxOptions>
              </div>
            </Combobox>
          </div>

          {/* Notes Input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Worse at night, triggered by dust..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Row 3: Action Buttons & Shortcuts */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-600">Quick Save:</span>
            <kbd className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
              Ctrl+S
            </kbd>
            <span>or</span>
            <kbd className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
              Enter
            </kbd>
            <span className="hidden sm:inline">•</span>
            <kbd className="hidden sm:inline-block rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
              Esc
            </kbd>
            <span className="hidden sm:inline">to cancel</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              id="inline-complaint-submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50",
                isSubmitting ? "bg-sky-500" : "bg-sky-600 hover:bg-sky-700"
              )}
            >
              {isSubmitting ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save Complaint
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
