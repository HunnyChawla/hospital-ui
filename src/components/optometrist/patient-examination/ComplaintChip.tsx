"use client";

import clsx from "clsx";
import { Edit2, Trash2, Clock, FileText, AlertCircle } from "lucide-react";
import type { ComplaintRecord } from "@/types";

interface ComplaintChipProps {
  complaint: ComplaintRecord;
  onEdit: (complaint: ComplaintRecord) => void;
  onDelete: (complaintId: string) => void;
}

const getEyeBadgeColor = (eye: string) => {
  const eyeUpper = eye.toUpperCase();
  if (eyeUpper.includes("RE")) return "bg-blue-600 text-white border-blue-700";
  if (eyeUpper.includes("LE")) return "bg-green-600 text-white border-green-700";
  if (eyeUpper.includes("BE")) return "bg-purple-600 text-white border-purple-700";
  if (eyeUpper.includes("GE")) return "bg-slate-600 text-white border-slate-700";
  return "bg-slate-600 text-white border-slate-700";
};

const getEyeAbbreviation = (complaintText: string | undefined | null): string | null => {
  if (!complaintText) return null;
  const match = complaintText.match(/\((RE|LE|BE|GE)\)/);
  return match ? match[1] : null;
};

// Get card styling based on severity (matching Medical History pattern)
const getSeverityStyles = (severity: string | null) => {
  switch (severity) {
    case "mild":
      return {
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
        iconColor: "text-emerald-600",
        textColor: "text-emerald-700",
      };
    case "moderate":
      return {
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        iconColor: "text-amber-600",
        textColor: "text-amber-700",
      };
    case "severe":
      return {
        bgColor: "bg-rose-50",
        borderColor: "border-rose-200",
        iconColor: "text-rose-600",
        textColor: "text-rose-700",
      };
    default:
      return {
        bgColor: "bg-slate-50",
        borderColor: "border-slate-200",
        iconColor: "text-slate-600",
        textColor: "text-slate-700",
      };
  }
};

export function ComplaintChip({ complaint, onEdit, onDelete }: ComplaintChipProps) {
  const eyeAbbr = getEyeAbbreviation(complaint.complaint);
  const complaintTextOnly = complaint.complaint
    ? complaint.complaint.replace(/\s*\((RE|LE|BE|GE)\)\s*$/, "").trim()
    : "No complaint text";
  const styles = getSeverityStyles(complaint.severity);

  return (
    <div
      className={clsx(
        "group relative rounded-lg border p-3 transition-all duration-200 hover:shadow-md",
        styles.borderColor,
        styles.bgColor
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className={clsx("h-4 w-4 mt-0.5 flex-shrink-0", styles.iconColor)} />
        <div className="flex-1 min-w-0">
          {/* Complaint name and eye badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">
              {complaintTextOnly}
            </span>
            {eyeAbbr && (
              <span
                className={clsx(
                  "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold shadow-sm border",
                  getEyeBadgeColor(eyeAbbr)
                )}
              >
                {eyeAbbr}
              </span>
            )}
          </div>

          {/* Details section */}
          <div className="mt-2 space-y-1">
            {/* Duration */}
            {complaint.duration && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Clock className="h-3 w-3" />
                <span>{complaint.duration}</span>
              </div>
            )}

            {/* Severity indicator */}
            {complaint.severity && (
              <div className={clsx("flex items-center gap-1.5 text-xs font-medium", styles.textColor)}>
                <span className="capitalize">{complaint.severity} Severity</span>
              </div>
            )}

            {/* Notes - always visible if present */}
            {complaint.notes && (
              <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-1.5">
                <FileText className="h-3 w-3 mt-0.5 text-slate-500 flex-shrink-0" />
                <span className="whitespace-pre-wrap">{complaint.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons - always visible */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(complaint)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-sky-600 transition shadow-sm border border-slate-200 hover:border-sky-200"
            title="Edit complaint"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(complaint.id)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600 transition shadow-sm border border-slate-200 hover:border-red-200"
            title="Delete complaint"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
