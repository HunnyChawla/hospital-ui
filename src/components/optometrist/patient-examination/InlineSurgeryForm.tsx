"use client";

import { useState, useEffect } from "react";
import { EyeSelector } from "../shared";
import { Eye, Calendar, User, Building2, AlertCircle, FileText, Clock, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import clsx from "clsx";

interface InlineSurgeryFormProps {
  surgeryText: string;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  defaultValues?: any;
}

// Generate year options (current year back to 1960)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1959 }, (_, i) =>
  String(currentYear - i)
);

const QUICK_YEARS = [
  String(currentYear),
  String(currentYear - 1),
  String(currentYear - 2),
  String(currentYear - 5),
  String(currentYear - 10),
];

const monthOptions = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// Helper to normalize between EyeSelector (RE, LE, BE) and backend (RE, LE, BE, GE)
function normalizeEyeToRE(eye: string | undefined): "RE" | "LE" | "BE" | "GE" {
  if (!eye) return "RE";
  if (eye === "OD") return "RE";
  if (eye === "OS") return "LE";
  if (eye === "OU") return "BE";
  if (eye === "RE" || eye === "LE" || eye === "BE" || eye === "GE") return eye;
  return "RE";
}

function normalizeEyeToBackend(eye: string): "RE" | "LE" | "BE" | "GE" {
  if (eye === "OD" || eye === "RE") return "RE";
  if (eye === "OS" || eye === "LE") return "LE";
  if (eye === "OU" || eye === "BE") return "BE";
  if (eye === "GE") return "GE";
  return "RE";
}

export function InlineSurgeryForm({
  surgeryText,
  onSave,
  onCancel,
  isSubmitting,
  defaultValues,
}: InlineSurgeryFormProps) {
  const [formData, setFormData] = useState({
    eye: normalizeEyeToRE(defaultValues?.eye),
    surgery_year: defaultValues?.surgery_year || "",
    surgery_month: defaultValues?.surgery_month || "",
    surgeon_name: defaultValues?.surgeon_name || "",
    hospital_name: defaultValues?.hospital_name || "",
    complications: defaultValues?.complications || "",
    notes: defaultValues?.notes || "",
  });

  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      defaultValues?.surgeon_name ||
      defaultValues?.hospital_name ||
      defaultValues?.complications ||
      defaultValues?.notes
    )
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      await onSave({
        ...formData,
        // Provide both OD/OS/OU and RE/LE/BE formats for total compatibility
        eye: normalizeEyeToBackend(formData.eye),
      });
    } catch (error) {
      // Error handled by parent
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid = Boolean(formData.eye);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;

      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const submitBtn = document.getElementById("inline-surgery-submit-btn");
        if (submitBtn) submitBtn.click();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const submitBtn = document.getElementById("inline-surgery-submit-btn");
        if (submitBtn) submitBtn.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          handleChange("eye", "RE");
        } else if (e.key === "l" || e.key === "L") {
          e.preventDefault();
          handleChange("eye", "LE");
        } else if (e.key === "b" || e.key === "B") {
          e.preventDefault();
          handleChange("eye", "BE");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-xl border border-sky-300/80 bg-gradient-to-b from-sky-50/50 to-white p-3.5 sm:p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* Surgery Context Header */}
      <div className="mb-3.5 flex items-center justify-between border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-600 text-white shadow-xs text-xs font-bold">
            <Eye className="h-3.5 w-3.5" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {surgeryText}
            </h4>
            <p className="text-[11px] text-slate-500">
              Record operated eye & approximate date
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

      <div className="space-y-3.5">
        {/* Primary Row: Eye + Surgery Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Eye Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Eye Operated <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Keys: R (RE/OD) • L (LE/OS) • B (Both)
              </span>
            </div>
            <EyeSelector
              value={formData.eye as any}
              onChange={(eye) => handleChange("eye", eye)}
              label=""
              size="sm"
            />
          </div>

          {/* Year & Month Selection */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Year of Surgery
            </label>

            {/* Quick Year Chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_YEARS.map((yr) => {
                const isSelected = formData.surgery_year === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleChange("surgery_year", yr)}
                    className={clsx(
                      "rounded-md px-2 py-0.5 text-[11px] font-semibold border transition shadow-2xs",
                      isSelected
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700 hover:bg-sky-50"
                    )}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={formData.surgery_year}
                onChange={(e) => handleChange("surgery_year", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Year (optional)...</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={formData.surgery_month}
                onChange={(e) => handleChange("surgery_month", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Month (optional)...</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Expandable Advanced / Additional Details Section */}
        <div className="border-t border-slate-200/80 pt-2.5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-sky-600 transition"
          >
            {showAdvanced ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>
              {showAdvanced
                ? "Hide Surgeon & Complication Details"
                : "Add Surgeon, Clinic or Complications (Optional)"}
            </span>
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Surgeon Name
                  </label>
                  <input
                    type="text"
                    value={formData.surgeon_name}
                    onChange={(e) => handleChange("surgeon_name", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    placeholder="e.g. Dr. A. Sharma"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Hospital / Clinic
                  </label>
                  <input
                    type="text"
                    value={formData.hospital_name}
                    onChange={(e) => handleChange("hospital_name", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    placeholder="e.g. City Eye Center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Complications (if any)
                  </label>
                  <textarea
                    value={formData.complications}
                    onChange={(e) => handleChange("complications", e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                    placeholder="e.g. Posterior capsular tear..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                    placeholder="e.g. Monofocal IOL implanted..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons & Shortcuts */}
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
              type="submit"
              id="inline-surgery-submit-btn"
              disabled={isSubmitting || !isFormValid}
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
                  Save Surgery
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
