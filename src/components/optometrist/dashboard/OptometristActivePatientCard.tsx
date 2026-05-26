"use client";

import React, { useState } from "react";
import { Eye, X, LayoutGrid, LayoutList, LayoutDashboard } from "lucide-react";
import { CreatePrescriptionButton } from "../prescriptions/CreatePrescriptionButton";
import { ShowSummaryButton } from "../summary/ShowSummaryButton";
import { useExaminationViewPreference } from "@/hooks/useExaminationViewPreference";
import { PatientDetailView } from "../../patients/PatientDetailView";

type ActiveTab =
  | "complaints"
  | "vision"
  | "current_specs"
  | "medical_history"
  | "ophthalmic_history"
  | "allergies"
  | "ar_data"
  | "refraction"
  | "iop"
  | "previous_history";

interface OptometristActivePatientCardProps {
  patientId: string | null;
  patientName?: string;
  patientUhid?: string;
  visitId?: string;
  visitType?: string;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onClose: () => void;
  showPatientCard: boolean;
  children: React.ReactNode;
  isDoctor?: boolean;
  optometristId?: string;
  doctorId?: string;
  doctorName?: string;
  isCompleted?: boolean;
}

export const OptometristActivePatientCard: React.FC<OptometristActivePatientCardProps> = ({
  patientId,
  patientName,
  patientUhid,
  visitId,
  visitType,
  onClose,
  showPatientCard,
  children,
  isDoctor = false,
  optometristId,
  doctorId,
  doctorName,
  isCompleted = false,
}) => {
  const { viewMode, setViewMode } = useExaminationViewPreference();
  const [showPatientDetail, setShowPatientDetail] = useState(false);

  if (!showPatientCard) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100/50 p-12 backdrop-blur-sm">
        <div className="text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 p-5 shadow-lg">
            <Eye className="h-full w-full text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-700">No Patient Selected</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
            Select a patient from the queue to begin examination
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-lg animate-in fade-in slide-in-from-bottom-3 duration-500 scrollbar-hide">
      <div className="border-b border-slate-200/60 bg-gradient-to-r from-sky-50 via-blue-50/50 to-teal-50 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30">
              <Eye className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2
                  onClick={() => setShowPatientDetail(true)}
                  className="truncate text-sm font-bold text-slate-900 sm:text-base cursor-pointer hover:text-sky-600 hover:underline transition-all"
                  title="View Patient Details"
                >
                  {patientName || "Patient Details"}
                </h2>
                {visitType && (
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${visitType.toLowerCase().includes('emergency')
                    ? "bg-red-100 text-red-700 uppercase tracking-wider"
                    : visitType.toLowerCase() === 'walk_in'
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                    }`}>
                    {visitType.toLowerCase().includes('emergency') ? visitType.replace(/_/g, " ") : visitType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                )}
              </div>
              <p className="truncate text-xs font-medium text-slate-600">
                {patientUhid || patientId}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                onClick={() => setViewMode("tabs")}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-all ${viewMode === "tabs"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
                title="Tabs View"
              >
                <LayoutGrid className="h-3 w-3" />
                <span className="hidden sm:inline">Tabs</span>
              </button>
              <button
                onClick={() => setViewMode("single")}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-all ${viewMode === "single"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
                title="Single View"
              >
                <LayoutList className="h-3 w-3" />
                <span className="hidden sm:inline">Single</span>
              </button>
              <button
                onClick={() => setViewMode("compact")}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-all ${viewMode === "compact"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
                title="Compact View"
              >
                <LayoutDashboard className="h-3 w-3" />
                <span className="hidden sm:inline">Compact</span>
              </button>
            </div>

            {isDoctor ? (
              <CreatePrescriptionButton
                patientId={patientId || ""}
                patientName={patientName || ""}
                patientUhid={patientUhid || ""}
                visitId={visitId || ""}
                optometristId={optometristId || ""}
                doctorId={doctorId || ""}
                doctorName={doctorName}
                isCompleted={isCompleted}
              />
            ) : (
              <ShowSummaryButton
                patientId={patientId || ""}
                patientName={patientName || ""}
                patientUhid={patientUhid || ""}
                visitId={visitId}
              />
            )}
            <button
              onClick={onClose}
              className="group rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 hover:scale-105 active:scale-95"
              title="Clear selection"
            >
              <X className="h-4 w-4 transition-transform group-hover:rotate-90" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        {children}
      </div>

      {showPatientDetail && patientId && (
        <PatientDetailView
          patientId={patientId}
          onClose={() => setShowPatientDetail(false)}
        />
      )}
    </div>
  );
};
