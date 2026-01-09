"use client";

import { Eye, Calendar, User, Building2, AlertCircle, Trash2, Edit, Scissors, Clock, MoreVertical } from "lucide-react";
import clsx from "clsx";
import type { OphthalmicSurgeryRecord } from "@/types";

interface ConfirmedSurgeriesSummaryProps {
  surgeries: OphthalmicSurgeryRecord[];
  onEdit: (surgery: OphthalmicSurgeryRecord) => void;
  onDelete: (surgeryId: string) => void;
  loading: boolean;
}

export function ConfirmedSurgeriesSummary({
  surgeries,
  onEdit,
  onDelete,
  loading,
}: ConfirmedSurgeriesSummaryProps) {
  const getEyeColor = (eye: string) => {
    switch (eye) {
      case "RE":
        return {
          bg: "bg-gradient-to-r from-blue-500/10 to-blue-600/10",
          text: "text-blue-700",
          border: "border-blue-200/50",
          badge: "bg-blue-600 text-white border-blue-700 shadow-blue-100",
          icon: "text-blue-600",
          hover: "hover:bg-blue-50 hover:border-blue-300"
        };
      case "LE":
        return {
          bg: "bg-gradient-to-r from-green-500/10 to-green-600/10",
          text: "text-green-700",
          border: "border-green-200/50",
          badge: "bg-green-600 text-white border-green-700 shadow-green-100",
          icon: "text-green-600",
          hover: "hover:bg-green-50 hover:border-green-300"
        };
      case "BE":
        return {
          bg: "bg-gradient-to-r from-purple-500/10 to-purple-600/10",
          text: "text-purple-700",
          border: "border-purple-200/50",
          badge: "bg-purple-600 text-white border-purple-700 shadow-purple-100",
          icon: "text-purple-600",
          hover: "hover:bg-purple-50 hover:border-purple-300"
        };
      case "GE":
        return {
          bg: "bg-gradient-to-r from-slate-500/10 to-slate-600/10",
          text: "text-slate-700",
          border: "border-slate-200/50",
          badge: "bg-slate-600 text-white border-slate-700 shadow-slate-100",
          icon: "text-slate-600",
          hover: "hover:bg-slate-50 hover:border-slate-300"
        };
      // Legacy mappings for backward compatibility
      case "OD":
        return {
          bg: "bg-gradient-to-r from-blue-500/10 to-blue-600/10",
          text: "text-blue-700",
          border: "border-blue-200/50",
          badge: "bg-blue-600 text-white border-blue-700 shadow-blue-100",
          icon: "text-blue-600",
          hover: "hover:bg-blue-50 hover:border-blue-300"
        };
      case "OS":
        return {
          bg: "bg-gradient-to-r from-green-500/10 to-green-600/10",
          text: "text-green-700",
          border: "border-green-200/50",
          badge: "bg-green-600 text-white border-green-700 shadow-green-100",
          icon: "text-green-600",
          hover: "hover:bg-green-50 hover:border-green-300"
        };
      case "OU":
        return {
          bg: "bg-gradient-to-r from-purple-500/10 to-purple-600/10",
          text: "text-purple-700",
          border: "border-purple-200/50",
          badge: "bg-purple-600 text-white border-purple-700 shadow-purple-100",
          icon: "text-purple-600",
          hover: "hover:bg-purple-50 hover:border-purple-300"
        };
      default:
        return {
          bg: "bg-gradient-to-r from-slate-500/10 to-slate-600/10",
          text: "text-slate-700",
          border: "border-slate-200/50",
          badge: "bg-slate-600 text-white border-slate-700 shadow-slate-100",
          icon: "text-slate-600",
          hover: "hover:bg-slate-50 hover:border-slate-300"
        };
    }
  };

  const getEyeLabel = (eye: string) => {
    switch (eye) {
      case "OD":
        return "Right Eye";
      case "OS":
        return "Left Eye";
      case "OU":
        return "Both Eyes";
      default:
        return eye;
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

  const getYearsAgo = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const years = Math.floor(
      (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    if (years === 0) return "This year";
    if (years === 1) return "1 year ago";
    return `${years} years ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-lg overflow-hidden backdrop-blur-sm animate-in fade-in duration-300">
        <div className="border-b border-slate-200/60 bg-gradient-to-r from-sky-50 via-blue-50/30 to-slate-100 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 shadow-md shadow-sky-500/30">
                <Scissors className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Surgery History</h3>
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="mx-auto h-10 w-10 border-3 border-sky-600/30 border-t-sky-600 rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-600">Loading surgeries...</p>
        </div>
      </div>
    );
  }

  if (surgeries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-lg overflow-hidden backdrop-blur-sm animate-in fade-in duration-300">
        <div className="border-b border-slate-200/60 bg-gradient-to-r from-sky-50 via-blue-50/30 to-slate-100 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 shadow-md shadow-sky-500/30">
                <Scissors className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Surgery History</h3>
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4 shadow-lg">
            <Scissors className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-700 mb-1.5">No surgeries recorded</p>
          <p className="text-xs text-slate-500">Add surgeries using the form to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Modern Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-sky-50 via-blue-50/30 to-slate-100 border border-slate-200/60 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-2 shadow-lg shadow-sky-500/30">
            <Scissors className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Surgery History</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-sky-500/30">
            {surgeries.length} record{surgeries.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Modern Surgery Cards */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {surgeries.map((surgery) => {
          const eyeColors = getEyeColor(surgery.eye);
          return (
            <div
              key={surgery.id}
              className={clsx(
                "group relative rounded-xl border border-slate-200/60 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden backdrop-blur-sm animate-in fade-in slide-in-from-right-2",
                eyeColors.hover
              )}
              style={{ animationDelay: `${surgeries.indexOf(surgery) * 50}ms` }}
            >
              {/* Eye Color Gradient Strip */}
              <div className={clsx("h-1.5 w-full", eyeColors.bg)} />

              <div className="p-4">
                <div className="space-y-3">
                  {/* Modern Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={clsx("rounded-lg p-1.5 shadow-md backdrop-blur-sm border", eyeColors.border)}>
                          <Scissors className={clsx("h-4 w-4", eyeColors.icon)} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {surgery.surgery_name}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={clsx("rounded-full px-2.5 py-1 text-xs font-bold shadow-lg backdrop-blur-sm border", eyeColors.badge)}>
                          {surgery.eye}
                        </span>
                        {surgery.surgery_date && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/60 shadow-sm backdrop-blur-sm">
                            <Calendar className="h-3 w-3" />
                            <span className="font-medium">{formatDate(surgery.surgery_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Modern Action buttons */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(surgery);
                        }}
                        className={clsx(
                          "rounded-lg p-2 transition-all duration-200 shadow-md hover:shadow-lg backdrop-blur-sm",
                          "bg-white border border-slate-200/60 hover:bg-gradient-to-r hover:from-sky-50 hover:to-blue-50 hover:border-sky-400 hover:text-sky-600",
                          "text-slate-500 hover:scale-110 active:scale-95"
                        )}
                        title="Edit surgery"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(surgery.id);
                        }}
                        className={clsx(
                          "rounded-lg p-2 transition-all duration-200 shadow-md hover:shadow-lg backdrop-blur-sm",
                          "bg-white border border-slate-200/60 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:border-red-400 hover:text-red-600",
                          "text-slate-500 hover:scale-110 active:scale-95"
                        )}
                        title="Delete surgery"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Modern Details */}
                  <div className="flex flex-wrap gap-2">
                    {surgery.surgeon_name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60 backdrop-blur-sm shadow-sm">
                        <User className="h-3 w-3 text-slate-500" />
                        <span className="truncate max-w-24 font-semibold">{surgery.surgeon_name}</span>
                      </div>
                    )}
                    {surgery.hospital_name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60 backdrop-blur-sm shadow-sm">
                        <Building2 className="h-3 w-3 text-slate-500" />
                        <span className="truncate max-w-24 font-semibold">{surgery.hospital_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Modern Complications */}
                  {surgery.complications && surgery.complications.trim() !== "" && surgery.complications.toLowerCase() !== "no" && surgery.complications.toLowerCase() !== "none" && (
                    <div className="rounded-lg bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 p-3 shadow-md backdrop-blur-sm">
                      <div className="flex items-start gap-2">
                        <div className="rounded-lg bg-red-100 p-1 border border-red-200">
                          <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-red-700 mb-0.5">Complications</p>
                          <p className="text-xs font-medium text-red-600 break-words leading-relaxed">
                            {surgery.complications}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modern Notes */}
                  {surgery.notes && (
                    <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-3 backdrop-blur-sm shadow-sm">
                      <p className="text-xs text-slate-600 break-words leading-relaxed">
                        {surgery.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern Footer */}
      <div className="rounded-xl bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-100 border border-slate-200/60 p-4 shadow-md backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <div className="rounded-lg bg-slate-200 p-1">
                <Scissors className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <span>{surgeries.length} total</span>
            </div>
            {surgeries.filter(s => s.complications && s.complications.trim() !== "" && s.complications.toLowerCase() !== "no" && s.complications.toLowerCase() !== "none").length > 0 && (
              <div className="flex items-center gap-2 text-red-600 font-semibold">
                <div className="rounded-lg bg-red-100 p-1 border border-red-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <span>{surgeries.filter(s => s.complications && s.complications.trim() !== "" && s.complications.toLowerCase() !== "no" && s.complications.toLowerCase() !== "none").length} with complications</span>
              </div>
            )}
          </div>
          <div className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
            <span className="hidden sm:inline">Hover cards to edit</span>
            <span className="sm:hidden">Hover to edit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
