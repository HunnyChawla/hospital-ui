"use client";

import React, { useMemo } from "react";
import { User, AlertCircle, Loader2 } from "lucide-react";
import type { QueueFilter } from "@/hooks/useDoctorPanelPreferences";
import {
  QUEUE_FILTERS,
  filterQueuePatients,
  getQueueCounts,
  getStatusColor,
  type QueuePatient,
} from "@/utils/queueFilters";

interface EnhancedQueueBoardProps {
  queuePatients: QueuePatient[];
  activeFilter: QueueFilter;
  onFilterChange: (filter: QueueFilter) => void;
  onSelectPatient: (patientId: string) => void;
  selectedPatientId: string | null;
  onUpdateStatus?: (visitId: string, newStatus: "in_consultation" | "completed") => void;
  updatingVisitId?: string | null;
  loading?: boolean;
}

export const EnhancedQueueBoard: React.FC<EnhancedQueueBoardProps> = ({
  queuePatients,
  activeFilter,
  onFilterChange,
  onSelectPatient,
  selectedPatientId,
  onUpdateStatus,
  updatingVisitId,
  loading = false,
}) => {
  // Filter patients based on active filter
  const filteredPatients = useMemo(
    () => filterQueuePatients(queuePatients, activeFilter),
    [queuePatients, activeFilter]
  );

  // Get counts for each filter
  const counts = useMemo(() => getQueueCounts(queuePatients), [queuePatients]);

  // Empty state messages
  const getEmptyMessage = (filter: QueueFilter): string => {
    switch (filter) {
      case "all":
        return "No patients scheduled for today";
      case "pending":
        return "No patients waiting";
      default:
        return "No patients found";
    }
  };

  const getEmptySubMessage = (filter: QueueFilter): string => {
    switch (filter) {
      case "pending":
        return "Patients who check in will appear here";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Filter Tabs */}
      <div className="border-b border-slate-200 bg-white px-3 pt-3">
        <div className="flex gap-1">
          {(Object.keys(QUEUE_FILTERS) as QueueFilter[]).map((filter) => {
            const config = QUEUE_FILTERS[filter];
            const Icon = config.icon;
            const isActive = activeFilter === filter;
            const count = counts[filter];

            return (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className={`filter-tab-transition flex min-w-0 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? `border-${config.color}-500 bg-${config.color}-50 text-${config.color}-700`
                    : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{config.label}</span>
                <span
                  className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                    isActive
                      ? `bg-${config.color}-200 text-${config.color}-800`
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
        {filteredPatients.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <AlertCircle className="mb-2 h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">
              {getEmptyMessage(activeFilter)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {getEmptySubMessage(activeFilter)}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPatients.map((patient, index) => {
              const isSelected = patient.patient_id === selectedPatientId;
              const isUpdating = patient.item_id === updatingVisitId;
              const isEmergency = patient.visit_type === "emergency";
              const canStart = patient.status === "checked_in";
              const canComplete = patient.status === "in_consultation";

              return (
                <div
                  key={`${patient.patient_id}-${patient.item_id}`}
                  className={`group cursor-pointer rounded-lg border p-3 transition ${
                    isSelected
                      ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200 shadow-md"
                      : isEmergency
                      ? "border-red-500 bg-red-50 ring-2 ring-red-300 shadow-lg hover:border-red-600 hover:shadow-xl"
                      : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md"
                  }`}
                  onClick={() => onSelectPatient(patient.patient_id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Patient Info */}
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      {/* Token Number */}
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg font-bold ${
                          isEmergency
                            ? "bg-red-600 text-white ring-2 ring-red-300"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span className="text-sm">{patient.token_number}</span>
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {patient.patient_name}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${getStatusColor(
                              patient.status
                            )}`}
                          >
                            {patient.status.replace("_", " ")}
                          </span>
                          {patient.visit_type === "emergency" && (
                            <span className="inline-block rounded border-2 border-red-500 bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow-md">
                              🚨 EMERGENCY
                            </span>
                          )}
                        </div>
                        {patient.time && (
                          <p className="mt-1 text-xs text-slate-500">
                            Time: {patient.time}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {onUpdateStatus && (canStart || canComplete) && (
                    <div className="mt-2 flex gap-2">
                      {canStart && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(patient.item_id, "in_consultation");
                          }}
                          disabled={isUpdating}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Start Consultation"
                          )}
                        </button>
                      )}
                      {canComplete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(patient.item_id, "completed");
                          }}
                          disabled={isUpdating}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Mark Complete"
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
