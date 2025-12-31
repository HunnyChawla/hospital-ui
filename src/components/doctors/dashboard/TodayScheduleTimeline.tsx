"use client";

import React from "react";
import { Calendar, Clock, User, Badge, Play, CheckCircle } from "lucide-react";
import { DoctorSchedule } from "@/types";

interface TodayScheduleTimelineProps {
  schedule: DoctorSchedule | null;
  loading?: boolean;
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string) => void;
  onUpdateStatus?: (visitId: string, newStatus: "in_consultation" | "completed") => void;
  updatingVisitId?: string | null;
}

export const TodayScheduleTimeline: React.FC<TodayScheduleTimelineProps> = ({
  schedule,
  loading = false,
  selectedPatientId,
  onSelectPatient,
  onUpdateStatus,
  updatingVisitId,
}) => {
  // Get current time for highlighting
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "checked_in":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "in_consultation":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getTimeColor = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const slotMinutes = hours * 60 + minutes;
    const diff = Math.abs(slotMinutes - currentTimeMinutes);

    if (diff < 15) return "border-sky-400 bg-sky-50";
    return "border-slate-200 bg-white";
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-400" />
          <h3 className="font-bold text-slate-900">Today's Schedule</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!schedule || schedule.slots.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-400" />
          <h3 className="font-bold text-slate-900">Today's Schedule</h3>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            No appointments scheduled for today
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-400" />
          <h3 className="font-bold text-slate-900">Today's Schedule</h3>
        </div>
        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
          {schedule.slots.length} patients
        </span>
      </div>

      <div className="space-y-2">
        {schedule.slots.map((slot) => {
          const isSelected = slot.patient_id === selectedPatientId;
          const [hours, minutes] = slot.time.split(":").map(Number);
          const slotMinutes = hours * 60 + minutes;
          const isCurrent = Math.abs(slotMinutes - currentTimeMinutes) < 15;

          const isUpdating = updatingVisitId === slot.item_id;

          return (
            <div
              key={slot.item_id}
              className={`rounded-lg border-2 p-3 transition ${
                isSelected
                  ? "border-sky-500 bg-sky-50 shadow-md"
                  : isCurrent
                  ? "border-sky-300 bg-sky-50/50 shadow-sm"
                  : "border-slate-200 bg-white"
              }`}
            >
              <button
                onClick={() => onSelectPatient(slot.patient_id)}
                className="flex w-full items-start gap-3 text-left"
              >
                {/* Time */}
                <div
                  className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border ${
                    isCurrent
                      ? "border-sky-400 bg-sky-100 text-sky-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="text-xs font-medium">
                    {hours > 12 ? hours - 12 : hours}:{minutes.toString().padStart(2, "0")}
                  </span>
                  <span className="text-[10px] font-semibold">
                    {hours >= 12 ? "PM" : "AM"}
                  </span>
                </div>

                {/* Patient info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <p className="font-semibold text-slate-900">
                      {slot.patient_name}
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* Status badge */}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusColor(
                        slot.status
                      )}`}
                    >
                      {slot.status.replace(/_/g, " ")}
                    </span>

                    {/* Type badge */}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        slot.type === "appointment"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-teal-100 text-teal-700"
                      }`}
                    >
                      {slot.type === "appointment" ? "Scheduled" : "Walk-in"}
                    </span>

                    {/* Token number */}
                    {slot.token_number && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Badge className="h-3 w-3" />
                        <span>#{slot.token_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  {slot.duration_minutes > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{slot.duration_minutes} min</span>
                    </div>
                  )}
                </div>

                {/* Current indicator */}
                {isCurrent && (
                  <div className="flex items-center">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-500"></span>
                    </span>
                  </div>
                )}
              </button>

              {/* Status Action Buttons */}
              {onUpdateStatus && (slot.status === "checked_in" || slot.status === "in_consultation") && (
                <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3">
                  {slot.status === "checked_in" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(slot.item_id, "in_consultation");
                      }}
                      disabled={isUpdating}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      <span>{isUpdating ? "Starting..." : "Start Consultation"}</span>
                    </button>
                  )}

                  {slot.status === "in_consultation" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(slot.item_id, "completed");
                      }}
                      disabled={isUpdating}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      <span>{isUpdating ? "Completing..." : "Mark Complete"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
