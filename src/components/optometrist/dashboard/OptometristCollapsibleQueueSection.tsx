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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-full">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 flex-shrink-0"
        title={isVisible ? "Collapse queue" : "Expand queue"}
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">Patient Queue</span>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {filteredPatients.length}
          </span>
        </div>
        <ChevronRight 
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isVisible ? "rotate-90" : ""
          }`} 
        />
      </button>

      {/* Queue Content */}
      {isVisible && (
        <div className="border-t border-slate-200 flex flex-col flex-1 min-h-0">
          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 flex-shrink-0">
            {[
              { key: "pending" as const, label: "Pending", count: queueCounts.pending },
              { key: "completed" as const, label: "Completed", count: queueCounts.completed },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => onFilterChange(filter.key)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                  activeFilter === filter.key
                    ? "text-sky-600 border-sky-600 bg-sky-50"
                    : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {filter.label}
                <span className="ml-1 text-xs">({filter.count})</span>
              </button>
            ))}
          </div>

          {/* Patient List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500">
                <div className="h-6 w-6 mx-auto mb-2 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600" />
                <p className="text-sm">Loading queue...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No patients in this filter</p>
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div
                  key={patient.patient_id}
                  onClick={() => onSelectPatient(patient.patient_id)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                    selectedPatientId === patient.patient_id ? "bg-sky-50 border-l-4 border-sky-600" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{patient.patient_name}</div>
                      {patient.patient_uhid && (
                        <div className="text-xs text-slate-500 mt-1">{patient.patient_uhid}</div>
                      )}
                      <div className="text-sm text-slate-600 mt-1">
                        Token: {patient.token_number}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatDateTime(patient.time)}
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(patient.status)}`}>
                        {patient.status === "in_consultation" && "In Progress"}
                        {patient.status === "completed" && "Completed"}
                        {patient.status === "checked_in" && "Checked In"}
                        {patient.status === "scheduled" && "Scheduled"}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {onUpdateStatus && (
                    <div className="mt-2 flex gap-2">
                      {patient.status === "checked_in" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(patient.visit_id, "in_consultation");
                          }}
                          disabled={updatingVisitId === patient.visit_id}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingVisitId === patient.visit_id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                          ) : (
                            <>
                              <Users className="h-3 w-3" />
                              Start Consultation
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
                          className="flex flex-1 items-center justify-center gap-1.5 rounded bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingVisitId === patient.visit_id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3" />
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
