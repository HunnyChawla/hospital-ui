"use client";

import { Calendar, User, Building2, AlertCircle, Trash2, Edit2, Scissors, FileText } from "lucide-react";
import clsx from "clsx";
import type { OphthalmicSurgeryRecord } from "@/types";

interface ConfirmedSurgeriesSummaryProps {
  surgeries: OphthalmicSurgeryRecord[];
  onEdit: (surgery: OphthalmicSurgeryRecord) => void;
  onDelete: (surgeryId: string) => void;
  onClearAll?: () => void;
  loading: boolean;
}

// Get card styling based on eye (matching ComplaintChip and Medical History pattern)
const getEyeStyles = (eye: string) => {
  switch (eye) {
    case "OD":
    case "RE":
      return {
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        iconColor: "text-blue-600",
        badgeColor: "bg-blue-600 text-white border-blue-700",
      };
    case "OS":
    case "LE":
      return {
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        iconColor: "text-green-600",
        badgeColor: "bg-green-600 text-white border-green-700",
      };
    case "OU":
    case "BE":
      return {
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        iconColor: "text-purple-600",
        badgeColor: "bg-purple-600 text-white border-purple-700",
      };
    default:
      return {
        bgColor: "bg-slate-50",
        borderColor: "border-slate-200",
        iconColor: "text-slate-600",
        badgeColor: "bg-slate-600 text-white border-slate-700",
      };
  }
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return "Date unknown";
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  // If day is 1 and month is January, likely only year was recorded
  if (date.getDate() === 1 && month === 0) {
    return String(year);
  }
  // Otherwise show month/year
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

export function ConfirmedSurgeriesSummary({
  surgeries,
  onEdit,
  onDelete,
  onClearAll,
  loading,
}: ConfirmedSurgeriesSummaryProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full flex flex-col">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-semibold text-slate-700">Surgery History</h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 h-8 w-8 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-600">Loading surgeries...</p>
        </div>
      </div>
    );
  }

  if (surgeries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full flex flex-col">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-semibold text-slate-700">Surgery History</h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Scissors className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm text-slate-600 font-medium">No surgeries recorded</p>
          <p className="text-xs text-slate-500 mt-1">
            Add surgeries from the form
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header - matching other summary components */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-semibold text-slate-700">Surgery History</h3>
            {surgeries.length > 0 && (
              <span className="rounded-full bg-sky-600 px-2 py-0.5 text-xs font-medium text-white">
                {surgeries.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {surgeries.map((surgery) => {
          const styles = getEyeStyles(surgery.eye);
          const hasComplications = surgery.complications &&
            surgery.complications.trim() !== "" &&
            surgery.complications.toLowerCase() !== "no" &&
            surgery.complications.toLowerCase() !== "none";

          return (
            <div
              key={surgery.id}
              className={clsx(
                "group relative rounded-lg border p-3 transition-all duration-200 hover:shadow-md",
                styles.borderColor,
                styles.bgColor
              )}
            >
              <div className="flex items-start gap-2">
                <Scissors className={clsx("h-4 w-4 mt-0.5 flex-shrink-0", styles.iconColor)} />
                <div className="flex-1 min-w-0">
                  {/* Surgery name and eye badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">
                      {surgery.surgery_name}
                    </span>
                    <span
                      className={clsx(
                        "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold shadow-sm border",
                        styles.badgeColor
                      )}
                    >
                      {surgery.eye}
                    </span>
                  </div>

                  {/* Details section */}
                  <div className="mt-2 space-y-1">
                    {/* Date */}
                    {surgery.surgery_date && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(surgery.surgery_date)}</span>
                      </div>
                    )}

                    {/* Surgeon */}
                    {surgery.surgeon_name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <User className="h-3 w-3" />
                        <span>{surgery.surgeon_name}</span>
                      </div>
                    )}

                    {/* Hospital */}
                    {surgery.hospital_name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Building2 className="h-3 w-3" />
                        <span>{surgery.hospital_name}</span>
                      </div>
                    )}

                    {/* Complications */}
                    {hasComplications && (
                      <div className="flex items-start gap-1.5 text-xs text-rose-600 mt-1.5">
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="font-medium whitespace-pre-wrap">{surgery.complications}</span>
                      </div>
                    )}

                    {/* Notes - always visible if present */}
                    {surgery.notes && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-1.5">
                        <FileText className="h-3 w-3 mt-0.5 text-slate-500 flex-shrink-0" />
                        <span className="whitespace-pre-wrap">{surgery.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons - always visible */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(surgery)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-sky-600 transition shadow-sm border border-slate-200 hover:border-sky-200"
                    title="Edit surgery"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(surgery.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600 transition shadow-sm border border-slate-200 hover:border-red-200"
                    title="Delete surgery"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions - Clear All */}
      {surgeries.length > 0 && onClearAll && (
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onClearAll}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
