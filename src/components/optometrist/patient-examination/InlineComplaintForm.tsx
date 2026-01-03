"use client";

import { useState } from "react";
import clsx from "clsx";
import { X, Check, AlertCircle } from "lucide-react";
import { EyeSelector, SeveritySelector } from "../shared";

type EyeType = "LE" | "RE" | "BE" | "GE";
type Severity = "mild" | "moderate" | "severe";

interface FormData {
  text: string;
  eye: EyeType;
  severity: Severity;
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

export function InlineComplaintForm({
  complaintText,
  onSave,
  onCancel,
  defaultValues,
  isSubmitting = false,
}: InlineComplaintFormProps) {
  const [eye, setEye] = useState<EyeType>(defaultValues?.eye || "BE");
  const [severity, setSeverity] = useState<Severity>(defaultValues?.severity || "moderate");
  const [duration, setDuration] = useState<string>(defaultValues?.duration || "");
  const [notes, setNotes] = useState<string>(defaultValues?.notes || "");
  const [error, setError] = useState<string>("");

  const handleSubmit = async () => {
    // Validation
    if (!eye || !severity) {
      setError("Eye and Severity are required");
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
      setError(err instanceof Error ? err.message : "Failed to save complaint");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    } else if (e.key === "Enter" && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div
      className="mt-2 rounded-lg border border-sky-200 bg-white shadow-md animate-slideDown"
      onKeyDown={handleKeyDown}
    >
      <div className="p-4">
        {/* Error Message */}
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form content - stacked rows */}
        <div className="space-y-4">
          {/* Row 1: Eye and Severity selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Eye Selector */}
            <div>
              <EyeSelector
                value={eye}
                onChange={(value) => setEye(value)}
                label="Eye"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Duration Input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 2 weeks, 3 days..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {/* Notes Input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          {/* Row 3: Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed",
                isSubmitting
                  ? "bg-sky-600"
                  : "bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700"
              )}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Add
                </>
              )}
            </button>
          </div>
        </div>

        {/* Helper text */}
        <div className="mt-4 text-xs text-slate-500">
          Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">Esc</kbd> to cancel or{" "}
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">Ctrl+Enter</kbd> to save
        </div>
      </div>
    </div>
  );
}
