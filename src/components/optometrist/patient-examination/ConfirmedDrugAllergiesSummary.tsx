"use client";

import { ShieldCheck, AlertCircle, AlertTriangle, Trash2, Pencil } from "lucide-react";
import type { DrugAllergyRecord } from "@/types";
import clsx from "clsx";

interface ConfirmedDrugAllergiesSummaryProps {
  drugAllergies: DrugAllergyRecord[];
  onEdit?: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll?: () => void;
  loading?: boolean;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "mild":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "moderate":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "severe":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
};

export function ConfirmedDrugAllergiesSummary({
  drugAllergies,
  onEdit,
  onDelete,
  onClearAll,
  loading = false,
}: ConfirmedDrugAllergiesSummaryProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-700">Confirmed Drug Allergies</h3>
          {drugAllergies.length > 0 && (
            <span className="rounded-full bg-sky-600 px-2 py-0.5 text-xs font-medium text-white">
              {drugAllergies.length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 h-8 w-8 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-600">Loading allergies...</p>
          </div>
        ) : drugAllergies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-6 text-center">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
            <p className="text-emerald-700 font-medium">No Known Drug Allergies (NKDA)</p>
            <p className="text-xs text-emerald-600 mt-1">Add an allergy from the form</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...drugAllergies]
              .sort((a, b) => {
                const order: Record<string, number> = { severe: 0, moderate: 1, mild: 2 };
                return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
              })
              .map((allergy) => (
                <div
                  key={allergy.id}
                  className={clsx(
                    "group rounded-lg border p-3 hover:shadow-sm transition",
                    allergy.severity === "severe"
                      ? "border-red-200 bg-red-50"
                      : allergy.severity === "moderate"
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-white"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {allergy.severity === "severe" && (
                          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-slate-900 truncate">
                          {allergy.drug_name}
                        </span>
                        <span
                          className={clsx(
                            "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            getSeverityColor(allergy.severity)
                          )}
                        >
                          {allergy.severity.charAt(0).toUpperCase() + allergy.severity.slice(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {allergy.reaction.split(",").map((reaction, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                          >
                            {reaction.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(allergy.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-sky-600 transition shadow-sm border border-slate-200 hover:border-sky-200"
                          title="Edit allergy record"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(allergy.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600 transition shadow-sm border border-slate-200 hover:border-red-200"
                        title="Delete allergy record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Footer Actions - Clear All */}
      {drugAllergies.length > 0 && onClearAll && (
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
