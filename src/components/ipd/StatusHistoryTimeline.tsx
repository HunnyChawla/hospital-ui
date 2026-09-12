"use client";

import React from "react";
import { useStatusHistory } from "@/hooks/queries/useAdmissions";
import { 
  History, 
  ArrowRight, 
  User, 
  Clock, 
  FileText, 
  Loader2, 
  Building2, 
  PlaneTakeoff, 
  Activity,
  BedDouble
} from "lucide-react";
import { 
  AdmissionStatusBadge, 
  PatientStatusBadge, 
  CareStatusBadge 
} from "./StatusBadges";

interface StatusHistoryTimelineProps {
  admissionId: string;
  className?: string;
}

export function StatusHistoryTimeline({
  admissionId,
  className = "",
}: StatusHistoryTimelineProps) {
  const { data: history, isLoading, error } = useStatusHistory(admissionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-slate-500 gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
        <span className="text-xs">Loading status transition logs...</span>
      </div>
    );
  }

  if (error || !history || history.length === 0) {
    return (
      <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <History className="w-6 h-6 mx-auto text-slate-400 mb-1.5" />
        <h4 className="text-xs font-semibold text-slate-700">No Status Changes Recorded</h4>
        <p className="text-[11px] text-slate-500 mt-0.5">Status changes and administrative events will appear here in chronological order.</p>
      </div>
    );
  }

  const getStatusIcon = (type: string) => {
    switch (type) {
      case "patient_status":
        return PlaneTakeoff;
      case "care_status":
        return Activity;
      case "bed_transfer":
        return BedDouble;
      default:
        return Building2;
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  const renderBadge = (statusType: string, val: string | null) => {
    if (!val) return <span className="text-xs text-slate-400 font-mono">None</span>;
    if (statusType === "patient_status") {
      return <PatientStatusBadge status={val} size="sm" />;
    }
    if (statusType === "care_status") {
      return <CareStatusBadge status={val} size="sm" />;
    }
    if (statusType === "bed_transfer") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-full shadow-2xs">
          <BedDouble className="w-3 h-3 text-amber-600 shrink-0" />
          <span>{val}</span>
        </span>
      );
    }
    return <AdmissionStatusBadge status={val} size="sm" />;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "patient_status":
        return "Patient Presence";
      case "care_status":
        return "Care Progress";
      case "bed_transfer":
        return "Bed Transfer";
      default:
        return "Admission Status";
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-sky-600" />
          <span>Status & Activity Audit Trail</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold font-mono">
            {history.length}
          </span>
        </h3>
      </div>

      <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {history.map((item) => {
          const Icon = getStatusIcon(item.status_type);

          return (
            <div key={item.id} className="relative">
              {/* Timeline marker icon */}
              <div className="absolute -left-5 top-1 w-4 h-4 rounded-full bg-white border-2 border-sky-500 flex items-center justify-center shadow-2xs">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              </div>

              {/* Card */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 hover:bg-slate-50 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md">
                      {getTypeLabel(item.status_type)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.from_status && (
                        <>
                          {renderBadge(item.status_type, item.from_status)}
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        </>
                      )}
                      {renderBadge(item.status_type, item.to_status)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatTimestamp(item.created_at)}</span>
                  </div>
                </div>

                {/* Reason & Notes */}
                {(item.reason || item.notes) && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 text-xs space-y-0.5">
                    {item.reason && (
                      <p className="text-slate-800 font-medium">
                        <span className="text-slate-500 font-normal">Reason: </span>
                        {item.reason}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-slate-600 italic">
                        <span className="text-slate-500 not-italic font-normal">Notes: </span>
                        {item.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Changed By Footer */}
                {item.created_by && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                    <User className="w-2.5 h-2.5" />
                    <span>Recorded by {item.created_by}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
