"use client";

import React from "react";
import { ChevronRight, Users, CheckCircle, Play, X, RotateCcw, AlertTriangle, Clock } from "lucide-react";
import { OptometristQueueFilter } from "@/hooks/useOptometristPanelPreferences";
import {
  filterOptometristQueuePatients,
  getOptometristQueueCounts,
  getStatusColor,
  getStatusLabel,
  type OptometristQueuePatient
} from "@/utils/optometristQueueFilters";

export type OptometristActionType = "pick" | "unpick" | "start_investigation" | "complete_investigation" | "mark_no_show" | "start_consultation" | "complete_consultation";

interface OptometristCollapsibleQueueSectionProps {
  queuePatients: any[]; // Supports both OptometristQueuePatient and DoctorQueuePatient
  activeFilter: string; // Supports both filter types
  onFilterChange: (filter: any) => void;
  onSelectPatient: (patientId: string) => void;
  selectedPatientId: string | null;
  onAction?: (visitId: string, action: OptometristActionType) => void;
  updatingVisitId?: string | null;
  loading?: boolean;
  isVisible: boolean;
  onToggle: () => void;
  isDoctor?: boolean;
}

export const OptometristCollapsibleQueueSection: React.FC<OptometristCollapsibleQueueSectionProps> = ({
  queuePatients,
  activeFilter,
  onFilterChange,
  onSelectPatient,
  selectedPatientId,
  onAction,
  updatingVisitId,
  loading = false,
  isVisible,
  onToggle,
  isDoctor = false,
}) => {
  // Format date and time for display
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  // Filter and sort patients based on active filter
  const filteredPatients = React.useMemo(() => {
    let filtered = [...queuePatients];

    // Manual filtering if needed based on the filter type passed
    // Assuming the parent component passes pre-filtered or raw queuePatients,
    // but typically filter logic happens here or in parent. 
    // To support both, let's defer filtering to parent OR maintain existing logic if we import filters.
    // For now, let's assume the parent handles the filtering logic based on the queuePatients passed,
    // OR we use a generic filter function if we can.

    if (!isDoctor) {
      filtered = filterOptometristQueuePatients(queuePatients, activeFilter as any);
    } else {
      // For doctor, we can use the doctor filter function or assume parent filtered it.
      // Let's import the doctor filter function dynamically or just filter simple status match here
      // To avoid complex imports, let's rely on status mapping
      const DOCTOR_STATUS_MAP: Record<string, string[]> = {
        pending: ["awaiting_doctor", "doctor_assigned", "consultation_in_progress"],
        dilation: ["dilation_in_progress"],
        completed: ["dilation_completed", "consultation_completed"],
        no_show: ["no_show"]
      };

      if (DOCTOR_STATUS_MAP[activeFilter]) {
        filtered = queuePatients.filter(p => DOCTOR_STATUS_MAP[activeFilter].includes(p.status));
      }
    }

    return filtered;
  }, [queuePatients, activeFilter, isDoctor]);

  // Get counts for each filter
  const queueCounts = React.useMemo(() => {
    if (!isDoctor) {
      return getOptometristQueueCounts(queuePatients);
    } else {
      // Simple count for doctor
      const counts = { pending: 0, dilation: 0, completed: 0, no_show: 0 };
      queuePatients.forEach(p => {
        if (["awaiting_doctor", "doctor_assigned", "consultation_in_progress"].includes(p.status)) counts.pending++;
        else if (p.status === "dilation_in_progress") counts.dilation++;
        else if (["dilation_completed", "consultation_completed"].includes(p.status)) counts.completed++;
        else if (p.status === "no_show") counts.no_show++;
      });
      return counts;
    }
  }, [queuePatients, isDoctor]);

  const filters = isDoctor
    ? [
      { key: "pending", label: "Pending", count: (queueCounts as any).pending },
      // Only show Dilation tab if there are patients
      ...((queueCounts as any).dilation > 0 ? [{ key: "dilation", label: "Dilation", count: (queueCounts as any).dilation }] : []),
      { key: "completed", label: "Completed", count: (queueCounts as any).completed },
      // Only show NO SHOW tab if there are patients
      ...((queueCounts as any).no_show > 0 ? [{ key: "no_show", label: "No Show", count: (queueCounts as any).no_show }] : [])
    ]
    : [
      { key: "pending", label: "Pending", count: queueCounts.pending },
      { key: "completed", label: "Completed", count: queueCounts.completed },
      // Add optometrist NO SHOW support if needed
      ...((queueCounts as any).no_show > 0 ? [{ key: "no_show", label: "No Show", count: (queueCounts as any).no_show }] : [])
    ];

  const getStatusColorGeneric = (status: string) => {
    return getStatusColor(status); // It handles most statuses including doctor ones fallback
  };

  const getStatusLabelGeneric = (status: string) => {
    return getStatusLabel(status); // It handles generic formatting
  };

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm shadow-lg shadow-slate-200/50 flex flex-col h-full transition-all duration-300 hover:shadow-xl">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="group flex w-full items-center justify-between px-4 py-3.5 text-left transition-all hover:bg-gradient-to-r hover:from-slate-50 hover:to-sky-50/30 flex-shrink-0 rounded-t-xl"
        title={isVisible ? "Collapse queue" : "Expand queue"}
      >
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 shadow-md shadow-sky-500/30 transition-transform group-hover:scale-110">
            <Users className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-800">Patient Queue</span>
          <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-full shadow-sm">
            {filteredPatients.length}
          </span>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-slate-500 transition-all duration-300 group-hover:text-sky-600 ${isVisible ? "rotate-90" : ""
            }`}
        />
      </button>

      {/* Queue Content */}
      {isVisible && (
        <div className="border-t border-slate-200/60 flex flex-col flex-1 min-h-0">
          {/* Filter Tabs */}
          <div className="flex border-b border-slate-200/60 flex-shrink-0 bg-slate-50/50 overflow-x-auto scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => onFilterChange(filter.key)}
                className={`flex-shrink-0 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${activeFilter === filter.key
                  ? "text-sky-700 border-sky-600 bg-gradient-to-b from-sky-50 to-white shadow-sm"
                  : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/50"
                  }`}
              >
                {filter.label}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeFilter === filter.key ? "bg-sky-200/50" : "bg-slate-200/50"
                  }`}>({filter.count})</span>
              </button>
            ))}
          </div>

          {/* Patient List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loading ? (
              <div className="p-6 text-center text-slate-500">
                <div className="h-8 w-8 mx-auto mb-3 animate-spin rounded-full border-3 border-slate-200 border-t-sky-600" />
                <p className="text-sm font-medium">Loading queue...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <div className="rounded-xl bg-slate-100/50 p-6 inline-block">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No patients in this filter</p>
                </div>
              </div>
            ) : (
              filteredPatients.map((patient, index) => {
                const isEmergency = patient.visit_type === "emergency";
                const isSelected = selectedPatientId === patient.patient_id;

                return (
                  <div
                    key={patient.patient_id}
                    onClick={() => onSelectPatient(patient.patient_id)}
                    className={`p-4 cursor-pointer transition-all duration-200 border-b last:border-b-0 animate-in fade-in slide-in-from-right-2 ${isEmergency
                      ? isSelected
                        ? "bg-gradient-to-r from-red-50 via-rose-50 to-red-50/30 border-l-4 border-red-600 shadow-md border-b-red-200"
                        : "bg-gradient-to-r from-red-50/50 to-rose-50/30 border-l-4 border-red-500 hover:from-red-50 hover:to-rose-50 hover:shadow-md border-b-red-100"
                      : isSelected
                        ? "bg-gradient-to-r from-sky-50 to-blue-50/30 border-l-4 border-sky-600 shadow-sm border-b-slate-100"
                        : "hover:bg-slate-50/80 hover:shadow-sm border-b-slate-100"
                      }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`font-semibold truncate ${isEmergency ? "text-red-900" : "text-slate-900"}`}>
                            {patient.patient_name}
                          </div>
                        </div>
                        {patient.patient_uhid && (
                          <div className={`text-xs mt-1 font-medium ${isEmergency ? "text-red-700" : "text-slate-500"}`}>
                            {patient.patient_uhid}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${isEmergency
                            ? "bg-red-100 text-red-800 border border-red-300"
                            : "bg-slate-100 text-slate-700"
                            }`}>
                            Token: {patient.token_number}
                          </span>
                          {isEmergency && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-red-500 text-white shadow-sm animate-pulse">
                              <AlertTriangle className="h-3 w-3" />
                              Emergency
                            </span>
                          )}
                        </div>
                        <div className={`text-xs mt-1.5 flex items-center gap-1 whitespace-nowrap ${isEmergency ? "text-red-600" : "text-slate-500"}`}>
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDateTime(patient.checked_in_at || patient.time)}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${getStatusColorGeneric(patient.status)}`}>
                          {getStatusLabelGeneric(patient.status)}
                        </span>

                        {patient.status === 'dilation_in_progress' && patient.dilation_started_at && (
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border animate-in fade-in slide-in-from-top-1 ${new Date() > new Date(new Date(patient.dilation_started_at).getTime() + (patient.dilation_duration_minutes || 0) * 60000)
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date() > new Date(new Date(patient.dilation_started_at).getTime() + (patient.dilation_duration_minutes || 0) * 60000)
                                ? "Overdue"
                                : "Exp"}: {new Date(new Date(patient.dilation_started_at).getTime() + (patient.dilation_duration_minutes || 0) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {onAction && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {/* START: Optometrist Actions */}
                        {!isDoctor && (
                          <>
                            {patient.status === "awaiting_optometrist" && index === 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPatient(patient.patient_id);
                                  onAction(patient.visit_id, "pick");
                                }}
                                disabled={updatingVisitId === patient.visit_id}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                              >
                                {updatingVisitId === patient.visit_id ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <>
                                    <Users className="h-3.5 w-3.5" />
                                    Pick
                                  </>
                                )}
                              </button>
                            )}

                            {patient.status === "optometrist_assigned" && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectPatient(patient.patient_id);
                                    onAction(patient.visit_id, "start_investigation");
                                  }}
                                  disabled={updatingVisitId === patient.visit_id}
                                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                >
                                  {updatingVisitId === patient.visit_id ? (
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : (
                                    <>
                                      <Play className="h-3.5 w-3.5" />
                                      Start
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAction(patient.visit_id, "mark_no_show");
                                  }}
                                  disabled={updatingVisitId === patient.visit_id}
                                  className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-rose-500/30 transition-all hover:from-rose-600 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                >
                                  {updatingVisitId === patient.visit_id ? (
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : (
                                    <>
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      No Show
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAction(patient.visit_id, "unpick");
                                  }}
                                  disabled={updatingVisitId === patient.visit_id}
                                  className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-slate-400 to-slate-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-slate-400/30 transition-all hover:from-slate-500 hover:to-slate-600 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                >
                                  {updatingVisitId === patient.visit_id ? (
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : (
                                    <>
                                      <X className="h-3.5 w-3.5" />
                                      Unpick
                                    </>
                                  )}
                                </button>
                              </>
                            )}

                            {patient.status === "optometrist_investigation_in_progress" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAction(patient.visit_id, "complete_investigation");
                                }}
                                disabled={updatingVisitId === patient.visit_id}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition-all hover:from-emerald-600 hover:to-green-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                              >
                                {updatingVisitId === patient.visit_id ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Complete
                                  </>
                                )}
                              </button>
                            )}

                            {patient.status === "no_show" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPatient(patient.patient_id);
                                  onAction(patient.visit_id, "pick");
                                }}
                                disabled={updatingVisitId === patient.visit_id}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                              >
                                {updatingVisitId === patient.visit_id ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <>
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Recall Patient
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}

                        {/* END: Optometrist Actions */}

                        {/* START: Doctor Actions */}
                        {isDoctor && (
                          <>
                            {(patient.status === "doctor_assigned" || patient.status === "awaiting_doctor") && index === 0 && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectPatient(patient.patient_id);
                                    onAction(patient.visit_id, "start_consultation");
                                  }}
                                  disabled={updatingVisitId === patient.visit_id}
                                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                >
                                  {updatingVisitId === patient.visit_id ? (
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : (
                                    <>
                                      <Play className="h-3.5 w-3.5" />
                                      Start Consultation
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAction(patient.visit_id, "mark_no_show");
                                  }}
                                  disabled={updatingVisitId === patient.visit_id}
                                  className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-rose-500/30 transition-all hover:from-rose-600 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                >
                                  {updatingVisitId === patient.visit_id ? (
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : (
                                    <>
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      No Show
                                    </>
                                  )}
                                </button>
                              </>
                            )}

                            {patient.status === "consultation_in_progress" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAction(patient.visit_id, "complete_consultation");
                                }}
                                disabled={updatingVisitId === patient.visit_id}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                              >
                                {updatingVisitId === patient.visit_id ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Complete Consultation
                                  </>
                                )}
                              </button>
                            )}

                            {/* Allow starting consultation from NO SHOW tab */}
                            {patient.status === "no_show" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPatient(patient.patient_id);
                                  onAction(patient.visit_id, "start_consultation");
                                }}
                                disabled={updatingVisitId === patient.visit_id}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                              >
                                {updatingVisitId === patient.visit_id ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <>
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Recall Patient
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                        {/* END: Doctor Actions */}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
