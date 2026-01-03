"use client";

import clsx from "clsx";
import { Edit2, Trash2, Clock } from "lucide-react";
import type { ComplaintRecord } from "@/types";

interface ComplaintChipProps {
  complaint: ComplaintRecord;
  onEdit: (complaint: ComplaintRecord) => void;
  onDelete: (complaintId: string) => void;
}

const getEyeBadgeColor = (eye: string) => {
  const eyeUpper = eye.toUpperCase();
  if (eyeUpper.includes("RE")) return "bg-blue-500 text-white";
  if (eyeUpper.includes("LE")) return "bg-green-500 text-white";
  if (eyeUpper.includes("BE")) return "bg-purple-500 text-white";
  if (eyeUpper.includes("GE")) return "bg-slate-500 text-white";
  return "bg-slate-500 text-white";
};

const getEyeAbbreviation = (complaintText: string | undefined | null): string | null => {
  if (!complaintText) return null;
  const match = complaintText.match(/\((RE|LE|BE|GE)\)/);
  return match ? match[1] : null;
};

const getSeverityDotColor = (severity: string | null) => {
  switch (severity) {
    case "mild":
      return "bg-emerald-500";
    case "moderate":
      return "bg-amber-500";
    case "severe":
      return "bg-red-500";
    default:
      return "bg-slate-400";
  }
};

export function ComplaintChip({ complaint, onEdit, onDelete }: ComplaintChipProps) {
  const eyeAbbr = getEyeAbbreviation(complaint.complaint);
  const complaintTextOnly = complaint.complaint
    ? complaint.complaint.replace(/\s*\((RE|LE|BE|GE)\)\s*$/, "").trim()
    : "No complaint text";

  return (
    <div className="group relative flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-3 py-2.5 shadow-sm hover:shadow-md hover:border-slate-300 transition">
      {/* Left: Severity dot */}
      <div className="flex-shrink-0 pt-0.5">
        <span
          className={clsx("inline-block h-2.5 w-2.5 rounded-full", getSeverityDotColor(complaint.severity))}
          title={complaint.severity ? complaint.severity.charAt(0).toUpperCase() + complaint.severity.slice(1) : "Unknown"}
        />
      </div>

      {/* Center: Complaint text and metadata */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <p className="text-sm font-semibold text-slate-900">
            {complaintTextOnly}
          </p>
          {eyeAbbr && (
            <span
              className={clsx(
                "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-semibold flex-shrink-0",
                getEyeBadgeColor(eyeAbbr)
              )}
            >
              {eyeAbbr}
            </span>
          )}
        </div>
        {complaint.duration && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            <span>{complaint.duration}</span>
          </div>
        )}
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onEdit(complaint)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition"
          title="Edit complaint"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(complaint.id)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
          title="Delete complaint"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
