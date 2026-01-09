"use client";

import { useState, useEffect } from "react";
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
  const [eye, setEye] = useState<EyeType | null>(defaultValues?.eye || null);
  const [severity, setSeverity] = useState<Severity | null>(defaultValues?.severity || null);
  const [duration, setDuration] = useState<string>(defaultValues?.duration || "");
  const [notes, setNotes] = useState<string>(defaultValues?.notes || "");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check if any modal is open - if so, we might not want to interfere, 
      // but here this IS the 'active' interaction for the complaint tab.
      // We should avoid triggering if the user is in an unrelated input, 
      // but 'Esc' usually means Cancel whatever is active.

      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter" && e.ctrlKey) {
        // We need to call handleSubmit, but it depends on state (eye, severity, etc.)
        // Since those are state variables, we should normally include them in dependency array
        // or use a ref/wrapper. 
        // However, handleSubmit uses current state closure.
        // We can just call the button click or duplicate logic 
        // But better is to just let this effect depend on the values needed or the submit function.
        // Let's rely on the fact that we can call a function that accesses the latest state reference 
        // if we use the function reference in the dependency.

        // Actually, the cleanest way without stale closures is to just trigger the form submit button click
        // or invoke a function that validation checks.

        // Let's use a ref for the submit handler or just include dependencies.
        // Simplified:
        const submitBtn = document.getElementById("inline-complaint-submit-btn");
        if (submitBtn) {
          submitBtn.click();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onCancel]);

  // NOTE: The submit logic inside useEffect via clicking button avoids closure staleness 
  // without adding all form fields to dependency array which would re-bind listener on every keystroke.

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

  return (
    <div
      className="mt-2 rounded-lg border border-sky-200 bg-white shadow-md animate-slideDown"
    >
      <div className="p-4">
        {/* Complaint Text Header */}
        <div className="mb-4 border-b border-slate-100 pb-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            {complaintText}
          </h4>
        </div>
        {/* Error Message */}
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form content - stacked rows */}
        <div className="space-y-3">
          {/* Row 1: Eye and Severity selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Duration Input */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 2 weeks"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {/* Notes Input */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
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
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              id="inline-complaint-submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed",
                isSubmitting
                  ? "bg-sky-600"
                  : "bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700"
              )}
            >
              {isSubmitting ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Add
                </>
              )}
            </button>
          </div>
        </div>

        {/* Helper text */}
        <div className="mt-3 text-xs text-slate-500">
          Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">Esc</kbd> to cancel or{" "}
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">Ctrl+Enter</kbd> to save
        </div>
      </div>
    </div>
  );
}
