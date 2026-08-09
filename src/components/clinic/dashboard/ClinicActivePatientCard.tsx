"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { Stethoscope, X, ClipboardList, FileEdit } from "lucide-react";
import { PatientDetailView } from "@/components/patients/PatientDetailView";
import { LockedWhenFinalised } from "@/components/health-record/LockedWhenFinalised";
import { FinaliseVisitAction } from "@/components/health-record/FinaliseVisitAction";
import { ClinicStatusBadge } from "../shared/ClinicStatusBadge";
import type { ClinicPanelMode } from "@/redux/clinicPanelSlice";

interface ClinicActivePatientCardProps {
  patientId: string | null;
  patientName?: string;
  patientUhid?: string | null;
  visitId: string | null;
  visitType?: string;
  visitStatus?: string;
  isDoctor: boolean;
  mode: ClinicPanelMode;
  onModeChange: (mode: ClinicPanelMode) => void;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Patient header + (for doctors) the Examine | Prescribe mode toggle +
 * the body slot. The whole body is wrapped in LockedWhenFinalised: once
 * the visit's health-record episode is finalised the server refuses edits
 * anyway — this shows the lock instead of surfacing raw errors.
 */
export function ClinicActivePatientCard({
  patientId,
  patientName,
  patientUhid,
  visitId,
  visitType,
  visitStatus,
  isDoctor,
  mode,
  onModeChange,
  onClose,
  children,
}: ClinicActivePatientCardProps) {
  const [showPatientDetail, setShowPatientDetail] = useState(false);

  if (!patientId) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100/50 p-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 p-5 shadow-lg">
            <Stethoscope className="h-full w-full text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-700">No Patient Selected</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
            Select a patient from the queue to begin
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-lg">
      {/* Header */}
      <div className="relative z-20 border-b border-slate-200/60 bg-gradient-to-r from-sky-50 via-blue-50/50 to-teal-50 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30">
              <Stethoscope className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2
                  onClick={() => setShowPatientDetail(true)}
                  className="cursor-pointer truncate text-sm font-bold text-slate-900 transition-all hover:text-sky-600 hover:underline sm:text-base"
                  title="View Patient Details"
                >
                  {patientName || "Patient Details"}
                </h2>
                {visitType && (
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                      visitType.toLowerCase().includes("emergency")
                        ? "bg-red-100 uppercase tracking-wider text-red-700"
                        : visitType.toLowerCase() === "walk_in"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {visitType
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                )}
                {visitStatus && <ClinicStatusBadge status={visitStatus} />}
              </div>
              <p className="truncate text-xs font-medium text-slate-600">
                {patientUhid || patientId}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            {/* Examine | Prescribe toggle — doctors only */}
            {isDoctor && (
              <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                <button
                  onClick={() => onModeChange("examine")}
                  className={clsx(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all",
                    mode === "examine"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <ClipboardList className="h-3 w-3" />
                  <span className="hidden sm:inline">Examine</span>
                </button>
                <button
                  onClick={() => onModeChange("prescribe")}
                  className={clsx(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all",
                    mode === "prescribe"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <FileEdit className="h-3 w-3" />
                  <span className="hidden sm:inline">Prescribe</span>
                </button>
              </div>
            )}

            {isDoctor && visitId && (
              <FinaliseVisitAction episodeType="opd_visit" sourceId={visitId} compact />
            )}

            <button
              onClick={onClose}
              className="group rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
              title="Clear selection"
            >
              <X className="h-4 w-4 transition-transform group-hover:rotate-90" />
            </button>
          </div>
        </div>
      </div>

      {/* Body — frozen once the episode is finalised */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <LockedWhenFinalised episodeType="opd_visit" sourceId={visitId}>
          <div className="h-full min-h-0">{children}</div>
        </LockedWhenFinalised>
      </div>

      {showPatientDetail && patientId && (
        <PatientDetailView patientId={patientId} onClose={() => setShowPatientDetail(false)} />
      )}
    </div>
  );
}
