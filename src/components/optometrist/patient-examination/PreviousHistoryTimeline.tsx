"use client";

import { Clock, Eye, FileText, Activity, Pill } from "lucide-react";
import type { PatientOptometryTimeline } from "@/types";

interface PreviousHistoryTimelineProps {
  patientOptometryHistory: PatientOptometryTimeline | null;
  loading: boolean;
}

export function PreviousHistoryTimeline({
  patientOptometryHistory,
  loading,
}: PreviousHistoryTimelineProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">Loading patient history...</p>
      </div>
    );
  }

  if (!patientOptometryHistory || patientOptometryHistory.events.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <Clock className="mx-auto mb-3 h-12 w-12 text-slate-400" />
        <p className="text-slate-600">No previous optometry history found</p>
        <p className="text-sm text-slate-500">This is the patient's first optometry visit</p>
      </div>
    );
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "refraction":
        return <Eye className="h-5 w-5 text-blue-600" />;
      case "iop":
        return <Activity className="h-5 w-5 text-purple-600" />;
      case "prescription":
        return <Pill className="h-5 w-5 text-emerald-600" />;
      case "visit":
        return <FileText className="h-5 w-5 text-amber-600" />;
      default:
        return <Clock className="h-5 w-5 text-slate-600" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "refraction":
        return "border-blue-200 bg-blue-50";
      case "iop":
        return "border-purple-200 bg-purple-50";
      case "prescription":
        return "border-emerald-200 bg-emerald-50";
      case "visit":
        return "border-amber-200 bg-amber-50";
      default:
        return "border-slate-200 bg-slate-50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Patient Optometry History</h3>
        <p className="text-sm text-slate-600">
          Timeline of all previous optometry visits, tests, and prescriptions
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {patientOptometryHistory.total_visits}
          </p>
          <p className="text-sm text-slate-600">Total Visits</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {patientOptometryHistory.total_prescriptions}
          </p>
          <p className="text-sm text-slate-600">Prescriptions</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {patientOptometryHistory.total_refraction_tests}
          </p>
          <p className="text-sm text-slate-600">Refraction Tests</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {patientOptometryHistory.total_iop_tests}
          </p>
          <p className="text-sm text-slate-600">IOP Tests</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="mb-6 text-base font-semibold text-slate-900">Timeline</h4>

        <div className="relative space-y-6">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

          {/* Events */}
          {patientOptometryHistory.events.map((event, index) => (
            <div key={index} className="relative pl-12">
              {/* Timeline dot */}
              <div className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white shadow-md">
                {getEventIcon(event.event_type)}
              </div>

              {/* Event card */}
              <div className={`rounded-lg border p-4 ${getEventColor(event.event_type)}`}>
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h5 className="font-semibold text-slate-900">{event.title}</h5>
                    <p className="text-xs text-slate-600">
                      {new Date(event.date).toLocaleDateString()} -{" "}
                      {new Date(event.date).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                    {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                  </span>
                </div>

                {event.description && (
                  <p className="text-sm text-slate-700">{event.description}</p>
                )}

                {/* Event-specific details */}
                {event.event_type === "refraction" && event.details && (
                  <div className="mt-3 grid grid-cols-2 gap-4 rounded bg-white/50 p-3 text-xs">
                    {event.details.od && (
                      <div>
                        <p className="font-semibold text-blue-900">OD (Right)</p>
                        <p className="text-slate-700">
                          SPH: {event.details.od.sphere} / CYL: {event.details.od.cylinder || "N/A"}{" "}
                          / AXIS: {event.details.od.axis || "N/A"}
                        </p>
                        <p className="text-slate-600">VA: {event.details.od.va}</p>
                      </div>
                    )}
                    {event.details.os && (
                      <div>
                        <p className="font-semibold text-green-900">OS (Left)</p>
                        <p className="text-slate-700">
                          SPH: {event.details.os.sphere} / CYL: {event.details.os.cylinder || "N/A"}{" "}
                          / AXIS: {event.details.os.axis || "N/A"}
                        </p>
                        <p className="text-slate-600">VA: {event.details.os.va}</p>
                      </div>
                    )}
                  </div>
                )}

                {event.event_type === "iop" && event.details && (
                  <div className="mt-3 grid grid-cols-2 gap-4 rounded bg-white/50 p-3 text-xs">
                    <div>
                      <p className="font-semibold text-blue-900">OD Pressure</p>
                      <p className="text-lg font-bold text-slate-900">
                        {event.details.od_pressure} mmHg
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">OS Pressure</p>
                      <p className="text-lg font-bold text-slate-900">
                        {event.details.os_pressure} mmHg
                      </p>
                    </div>
                  </div>
                )}

                {event.event_type === "prescription" && event.details && (
                  <div className="mt-3 rounded bg-white/50 p-3 text-xs">
                    <p className="font-semibold text-slate-900">Prescription Details</p>
                    {event.details.diagnosis && (
                      <p className="mt-1 text-slate-700">
                        <span className="font-medium">Diagnosis:</span> {event.details.diagnosis}
                      </p>
                    )}
                    {event.details.prescription_number && (
                      <p className="mt-1 text-slate-600">
                        Rx #: {event.details.prescription_number}
                      </p>
                    )}
                  </div>
                )}

                {/* Optometrist name */}
                {event.optometrist_name && (
                  <p className="mt-3 text-xs text-slate-600">
                    By: <span className="font-medium">{event.optometrist_name}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Load more (if pagination needed) */}
        {patientOptometryHistory.has_more && (
          <div className="mt-6 text-center">
            <button className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Load More History
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm text-sky-900">
          This timeline shows all previous optometry examinations, tests, and prescriptions for this
          patient across all visits.
        </p>
      </div>
    </div>
  );
}
