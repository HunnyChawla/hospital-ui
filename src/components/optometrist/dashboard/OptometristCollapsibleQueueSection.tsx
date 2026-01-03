"use client";

import React from "react";
import { ChevronRight, Users } from "lucide-react";
import { OptometristQueueFilter } from "@/hooks/useOptometristPanelPreferences";

type QueuePatient = {
  patient_id: string;
  patient_name: string;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
  item_id: string;
  time: string;
};

interface OptometristCollapsibleQueueSectionProps {
  queuePatients: QueuePatient[];
  activeFilter: OptometristQueueFilter;
  onFilterChange: (filter: OptometristQueueFilter) => void;
  onSelectPatient: (patientId: string) => void;
  selectedPatientId: string | null;
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
  loading = false,
  isVisible,
  onToggle,
}) => {
  // Filter patients based on active filter
  const filteredPatients = React.useMemo(() => {
    switch (activeFilter) {
      case "pending":
        return queuePatients.filter(p => p.status === "scheduled" || p.status === "checked_in");
      case "in_progress":
        return queuePatients.filter(p => p.status === "in_consultation");
      case "completed":
        return queuePatients.filter(p => p.status === "completed");
      default:
        return queuePatients;
    }
  }, [queuePatients, activeFilter]);

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
              { key: "all", label: "All", count: queuePatients.length },
              { key: "pending", label: "Pending", count: queuePatients.filter(p => p.status === "scheduled" || p.status === "checked_in").length },
              { key: "in_progress", label: "In Progress", count: queuePatients.filter(p => p.status === "in_consultation").length },
              { key: "completed", label: "Completed", count: queuePatients.filter(p => p.status === "completed").length },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => onFilterChange(filter.key as OptometristQueueFilter)}
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
                      <div className="text-sm text-slate-600 mt-1">
                        Token: {patient.token_number}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {patient.time}
                      </div>
                    </div>
                    <div>
                      {patient.visit_type === "emergency" && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          Emergency
                        </span>
                      )}
                      {patient.status === "in_consultation" && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          In Progress
                        </span>
                      )}
                      {patient.status === "completed" && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
