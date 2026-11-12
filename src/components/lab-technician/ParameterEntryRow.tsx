"use client";

import { useState, useId, useEffect } from "react";
import type { ParameterWithResult } from "@/services/labTestsApi";
import { MRDImage } from "./TestResultsForm";
import {
  evaluateParameterAbnormality,
  type DraftParameterEntry,
} from "./useLabDraftStorage";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ImagePlus,
  MessageSquarePlus,
  X,
} from "lucide-react";

interface ParameterEntryRowProps {
  parameter: ParameterWithResult;
  value: DraftParameterEntry;
  disabled?: boolean;
  onNumericChange: (parameterId: string, val: string) => void;
  onTextChange: (parameterId: string, val: string) => void;
  onImageChange: (parameterId: string, file: File | null) => void;
  onNotesChange: (parameterId: string, notes: string) => void;
}

export function ParameterEntryRow({
  parameter,
  value,
  disabled = false,
  onNumericChange,
  onTextChange,
  onImageChange,
  onNotesChange,
}: ParameterEntryRowProps) {
  const inputId = useId();
  const notesId = useId();
  const [notesOpen, setNotesOpen] = useState(Boolean(value.notes?.trim()));
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (value.notes?.trim()) {
      setNotesOpen(true);
    }
  }, [value.notes]);

  useEffect(() => {
    if (!value.image_file) {
      setLocalPreviewUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(value.image_file);
    setLocalPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [value.image_file]);

  const abnormality = evaluateParameterAbnormality({
    parameterType: parameter.parameter_type,
    resultNumeric: value.result_numeric,
    resultValue: value.result_value,
    normalMin: parameter.normal_min,
    normalMax: parameter.normal_max,
    normalText: parameter.normal_text,
  });

  const isFlagged = abnormality === "low" || abnormality === "high" || abnormality === "abnormal";

  const referenceDisplay = (() => {
    if (parameter.parameter_type === "number") {
      if (parameter.normal_min !== null && parameter.normal_max !== null) {
        return `${parameter.normal_min} – ${parameter.normal_max}${parameter.unit ? ` ${parameter.unit}` : ""}`;
      }
      if (parameter.normal_min !== null) {
        return `≥ ${parameter.normal_min}${parameter.unit ? ` ${parameter.unit}` : ""}`;
      }
      if (parameter.normal_max !== null) {
        return `≤ ${parameter.normal_max}${parameter.unit ? ` ${parameter.unit}` : ""}`;
      }
    }
    return parameter.normal_text || "—";
  })();

  const renderStatusPill = () => {
    if (abnormality === "none") {
      return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
          {parameter.parameter_type === "image" ? "Attachment" : "Awaiting"}
        </span>
      );
    }
    if (abnormality === "normal") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Normal
        </span>
      );
    }
    if (abnormality === "low") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800">
          <ArrowDown className="h-3 w-3 shrink-0" />
          Low
        </span>
      );
    }
    if (abnormality === "high") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800">
          <ArrowUp className="h-3 w-3 shrink-0" />
          High
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        Abnormal
      </span>
    );
  };

  return (
    <div
      className={`rounded-xl border px-3.5 py-3 transition-colors duration-150 ${
        isFlagged
          ? "border-rose-200 bg-rose-50/60"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
        {/* Parameter Identity */}
        <div className="md:col-span-4 min-w-0">
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-slate-900 leading-snug"
          >
            {parameter.parameter_name || parameter.parameter_code || "Parameter"}
          </label>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            {parameter.parameter_code && (
              <span className="font-mono text-[11px] text-slate-500">
                {parameter.parameter_code}
              </span>
            )}
            {parameter.method && (
              <span className="truncate text-[11px] text-slate-400">
                • {parameter.method}
              </span>
            )}
            {parameter.is_published && (
              <span className="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Result Input */}
        <div className="md:col-span-4">
          {parameter.parameter_type === "number" && (
            <div className="relative flex items-center">
              <input
                id={inputId}
                type="number"
                step="any"
                disabled={disabled}
                value={value.result_numeric}
                onChange={(e) => onNumericChange(parameter.parameter_id, e.target.value)}
                placeholder="Enter value"
                className={`min-h-[40px] w-full rounded-lg border px-3 py-2 text-sm font-medium tabular-nums outline-none transition focus-visible:ring-2 ${
                  parameter.unit ? "pr-16" : ""
                } ${
                  isFlagged
                    ? "border-rose-300 bg-white text-rose-900 focus:border-rose-500 focus-visible:ring-rose-200"
                    : "border-slate-300 bg-white text-slate-900 focus:border-sky-500 focus-visible:ring-sky-100"
                } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600`}
              />
              {parameter.unit && (
                <span className="pointer-events-none absolute right-2.5 text-xs font-medium text-slate-500">
                  {parameter.unit}
                </span>
              )}
            </div>
          )}

          {parameter.parameter_type === "dropdown" && (
            <select
              id={inputId}
              disabled={disabled}
              value={value.result_value}
              onChange={(e) => onTextChange(parameter.parameter_id, e.target.value)}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">Select result...</option>
              {parameter.dropdown_options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {parameter.parameter_type === "text" && (
            <div className="relative flex items-center">
              <input
                id={inputId}
                type="text"
                disabled={disabled}
                value={value.result_value}
                onChange={(e) => onTextChange(parameter.parameter_id, e.target.value)}
                placeholder="Enter text result"
                className={`min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                  parameter.unit ? "pr-16" : ""
                }`}
              />
              {parameter.unit && (
                <span className="pointer-events-none absolute right-2.5 text-xs font-medium text-slate-500">
                  {parameter.unit}
                </span>
              )}
            </div>
          )}

          {parameter.parameter_type === "image" && (
            <div className="space-y-2">
              {!disabled && (
                <label
                  htmlFor={inputId}
                  className="flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-sky-300 bg-sky-50/50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                >
                  <ImagePlus className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {value.image_file
                      ? value.image_file.name
                      : value.result_value
                        ? "Replace diagnostic image"
                        : "Upload diagnostic image"}
                  </span>
                  <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      onImageChange(parameter.parameter_id, file);
                    }}
                  />
                </label>
              )}

              {(localPreviewUrl || value.result_value) && (
                <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {localPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={localPreviewUrl}
                      alt={parameter.parameter_name || "Uploaded result preview"}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <MRDImage
                      documentId={value.result_value}
                      clickable
                      className="max-h-24 max-w-full object-contain"
                      alt={parameter.parameter_name || "Diagnostic image"}
                    />
                  )}
                  {!disabled && value.image_file && (
                    <button
                      type="button"
                      onClick={() => onImageChange(parameter.parameter_id, null)}
                      aria-label="Remove selected image"
                      className="absolute right-1.5 top-1.5 rounded-md bg-slate-900/75 p-1 text-white transition hover:bg-slate-900 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reference Range, Flag & Note Toggle */}
        <div className="md:col-span-4 flex items-center justify-between gap-2 md:justify-end">
          <div className="text-left md:text-right">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Reference
            </p>
            <p className="text-xs font-medium tabular-nums text-slate-700">
              {referenceDisplay}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {renderStatusPill()}
            {!disabled && (
              <button
                type="button"
                onClick={() => setNotesOpen((prev) => !prev)}
                aria-expanded={notesOpen}
                aria-label={notesOpen ? "Hide technician note" : "Add technician note"}
                title={notesOpen ? "Hide note" : "Add technician note"}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition cursor-pointer ${
                  value.notes?.trim()
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                }`}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Technician Note */}
      {notesOpen && (
        <div className="mt-2.5 border-t border-slate-100 pt-2.5">
          <label
            htmlFor={notesId}
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Technician Note (Optional)
          </label>
          <input
            id={notesId}
            type="text"
            disabled={disabled}
            value={value.notes}
            onChange={(e) => onNotesChange(parameter.parameter_id, e.target.value)}
            placeholder="Add clinical observation, sample note, or repeat-check remark..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white disabled:cursor-not-allowed"
          />
        </div>
      )}
    </div>
  );
}
