"use client";

import { AlertCircle } from "lucide-react";
import type { ComplaintRecord } from "@/types";
import { ComplaintChip } from "./ComplaintChip";

interface ConfirmedComplaintsSummaryProps {
  complaints: ComplaintRecord[];
  onEdit: (complaint: ComplaintRecord) => void;
  onDelete: (complaintId: string) => void;
  loading?: boolean;
}

export function ConfirmedComplaintsSummary({
  complaints,
  onEdit,
  onDelete,
  loading = false,
}: ConfirmedComplaintsSummaryProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-700">
            Confirmed Complaints
          </h3>
          {complaints.length > 0 && (
            <span className="rounded-full bg-sky-600 px-2 py-0.5 text-xs font-medium text-white">
              {complaints.length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 h-8 w-8 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-600">Loading complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-600 font-medium">No complaints yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Add complaints from the form
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {complaints.map((complaint, index) => (
              <ComplaintChip
                key={complaint.id || `complaint-${index}`}
                complaint={complaint}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
