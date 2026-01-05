"use client";

import React from "react";
import { ChevronRight, Users, CheckCircle } from "lucide-react";
import { OptometristQueueFilter } from "@/hooks/useOptometristPanelPreferences";
import { 
  filterOptometristQueuePatients, 
  getOptometristQueueCounts, 
  getStatusColor,
  type OptometristQueuePatient 
} from "@/utils/optometristQueueFilters";

interface OptometristCollapsibleQueueSectionProps {
  queuePatients: OptometristQueuePatient[];
  activeFilter: OptometristQueueFilter;
  onFilterChange: (filter: OptometristQueueFilter) => void;
  onSelectPatient: (patientId: string) => void;
  selectedPatientId: string | null;
  onUpdateStatus?: (visitId: string, newStatus: "checked_in" | "in_consultation" | "completed") => void;
  updatingVisitId?: string | null;
  loading?: boolean;
  isVisible: boolean;
  onToggle: () => void;
}

export const OptometristCollapsibleQueueSection: React.FC<OptometristCollapsibleQueueSectionProps> = ({
  queuePatients,
  activeFilter,
  onFilterChange,
  onSelectPatient,
  selectedPatientId,
  onUpdateStatus,
  updatingVisitId,
  loading = false,
  isVisible,
  onToggle,
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

  // Filter patients based on active filter
  const filteredPatients = React.useMemo(() => {
    return filterOptometristQueuePatients(queuePatients, activeFilter);
  }, [queuePatients, activeFilter]);

  // Get counts for each filter
  const queueCounts = React.useMemo(() => {
    return getOptometristQueueCounts(queuePatients);
  }, [queuePatients]);

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
          className={`h-4 w-4 text-slate-500 transition-all duration-300 group-hover:text-sky-600 ${
            isVisible ? "rotate-90" : ""
          }`} 
        />
      </button>

      {/* Queue Content */}
      {isVisible && (
        <div className="border-t border-slate-200/60 flex flex-col flex-1 min-h-0">
          {/* Filter Tabs */}
          <div className="flex border-b border-slate-200/60 flex-shrink-0 bg-slate-50/50">
            {[
              { key: "pending" as const, label: "Pending", count: queueCounts.pending },
              { key: "completed" as const, label: "Completed", count: queueCounts.completed },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => onFilterChange(filter.key)}
                className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-all border-b-2 ${
                  activeFilter === filter.key
                    ? "text-sky-700 border-sky-600 bg-gradient-to-b from-sky-50 to-white shadow-sm"
                    : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                {filter.label}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeFilter === filter.key ? "bg-sky-200/50" : "bg-slate-200/50"
                }`}>({filter.count})</span>
              </button>
            ))}
          </div>

          {/* Patient List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
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
              filteredPatients.map((patient, index) => (
                <div
                  key={patient.patient_id}
                  onClick={() => onSelectPatient(patient.patient_id)}
                  className={`p-4 cursor-pointer transition-all duration-200 border-b border-slate-100 last:border-b-0 animate-in fade-in slide-in-from-right-2 ${
                    selectedPatientId === patient.patient_id 
                      ? "bg-gradient-to-r from-sky-50 to-blue-50/30 border-l-4 border-sky-600 shadow-sm" 
                      : "hover:bg-slate-50/80 hover:shadow-sm"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{patient.patient_name}</div>
                      {patient.patient_uhid && (
                        <div className="text-xs text-slate-500 mt-1 font-medium">{patient.patient_uhid}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          Token: {patient.token_number}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDateTime(patient.checked_in_at || patient.time)}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${getStatusColor(patient.status)}`}>
                        {patient.status === "in_consultation" && "In Progress"}
                        {patient.status === "completed" && "Completed"}
                        {patient.status === "checked_in" && "Checked In"}
                        {patient.status === "scheduled" && "Scheduled"}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {onUpdateStatus && (
                    <div className="mt-3 flex gap-2">
                      {patient.status === "checked_in" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(patient.visit_id, "in_consultation");
                          }}
                          disabled={updatingVisitId === patient.visit_id}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                        >
                          {updatingVisitId === patient.visit_id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <Users className="h-3.5 w-3.5" />
                              Start
                            </>
                          )}
                        </button>
                      )}
                      {patient.status === "in_consultation" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(patient.visit_id, "completed");
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
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
