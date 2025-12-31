"use client";

import React from "react";
import { ListOrdered, User, ChevronRight, AlertCircle } from "lucide-react";

interface QueuePatient {
  patient_id: string;
  patient_name: string;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
}

interface QueueStatusBoardProps {
  queuePatients: QueuePatient[];
  loading?: boolean;
  onSelectPatient: (patientId: string) => void;
  onViewFullQueue?: () => void;
}

export const QueueStatusBoard: React.FC<QueueStatusBoardProps> = ({
  queuePatients,
  loading = false,
  onSelectPatient,
  onViewFullQueue,
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "waiting":
      case "checked_in":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "in_consultation":
      case "in consultation":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-slate-400" />
          <h3 className="font-bold text-slate-900">Queue Status</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  // Show next 3 patients in queue
  const nextPatients = queuePatients.slice(0, 3);

  if (nextPatients.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-slate-400" />
          <h3 className="font-bold text-slate-900">Queue Status</h3>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
          <ListOrdered className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            No patients in queue
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-slate-400" />
          <h3 className="font-bold text-slate-900">Queue Status</h3>
        </div>
        {queuePatients.length > 3 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            +{queuePatients.length - 3} more
          </span>
        )}
      </div>

      <div className="space-y-2">
        {nextPatients.map((patient, index) => {
          const isNext = index === 0;
          const isEmergency = patient.visit_type === "emergency";

          return (
            <button
              key={patient.patient_id}
              onClick={() => onSelectPatient(patient.patient_id)}
              className={`group relative w-full overflow-hidden rounded-lg border-2 p-3 text-left transition ${
                isNext
                  ? "border-sky-500 bg-gradient-to-br from-sky-50 to-sky-50/50 shadow-md hover:shadow-lg"
                  : isEmergency
                  ? "border-rose-300 bg-gradient-to-br from-rose-50 to-rose-50/50 shadow-sm hover:shadow-md"
                  : "border-slate-200 bg-white shadow-sm hover:border-sky-200 hover:bg-sky-50/30 hover:shadow-md"
              }`}
            >
              {/* Next indicator */}
              {isNext && (
                <div className="absolute right-0 top-0">
                  <div className="rounded-bl-lg bg-sky-500 px-2 py-1 text-[10px] font-bold text-white">
                    NEXT
                  </div>
                </div>
              )}

              {/* Emergency indicator */}
              {isEmergency && (
                <div className="absolute left-0 top-0">
                  <div className="flex items-center gap-1 rounded-br-lg bg-rose-500 px-2 py-1 text-[10px] font-bold text-white">
                    <AlertCircle className="h-3 w-3" />
                    EMERGENCY
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                {/* Token number */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 font-bold ${
                    isNext
                      ? "border-sky-400 bg-sky-100 text-sky-700"
                      : isEmergency
                      ? "border-rose-400 bg-rose-100 text-rose-700"
                      : "border-slate-300 bg-slate-100 text-slate-700"
                  }`}
                >
                  <span className="text-lg">#{patient.token_number}</span>
                </div>

                {/* Patient info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <p className="font-semibold text-slate-900">
                      {patient.patient_name}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="mt-1">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusColor(
                        patient.status
                      )}`}
                    >
                      {patient.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Arrow indicator */}
                <ChevronRight
                  className={`h-5 w-5 transition group-hover:translate-x-1 ${
                    isNext ? "text-sky-500" : "text-slate-400"
                  }`}
                />
              </div>

              {/* Pulse animation for next patient */}
              {isNext && (
                <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
                  <div className="h-full w-full animate-pulse bg-gradient-to-r from-sky-400 to-teal-400" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* View full queue button */}
      {onViewFullQueue && queuePatients.length > 0 && (
        <button
          onClick={onViewFullQueue}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
        >
          View Full Queue ({queuePatients.length})
        </button>
      )}
    </div>
  );
};
