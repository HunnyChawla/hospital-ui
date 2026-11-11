"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Eye, X, LayoutGrid, LayoutList, LayoutDashboard } from "lucide-react";
import { CreatePrescriptionButton } from "../prescriptions/CreatePrescriptionButton";
import { ShowSummaryButton } from "../summary/ShowSummaryButton";
import { DilationTimer } from "../prescriptions/DilationTimer";
import { optometristVisitsApi, type OptometristVisitResponse } from "@/services/optometristVisitsApi";
import { useExaminationViewPreference } from "@/hooks/useExaminationViewPreference";
import { PatientDetailView } from "../../patients/PatientDetailView";
import type { OptometristActionType } from "./OptometristCollapsibleQueueSection";

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
  patientCategory?: string;
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
  onAction?: (visitId: string, action: OptometristActionType, minutes?: number) => void;
  activeQueuePatient?: any;
}

export const OptometristActivePatientCard: React.FC<OptometristActivePatientCardProps> = ({
  patientId,
  patientName,
  patientUhid,
  patientCategory,
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
  onAction,
  activeQueuePatient,
}) => {

  const { viewMode, setViewMode } = useExaminationViewPreference();
  const [showPatientDetail, setShowPatientDetail] = useState(false);
  const [visitData, setVisitData] = useState<OptometristVisitResponse | null>(null);

  const loadVisitData = useCallback(async () => {
    if (!visitId) return;
    try {
      const data = await optometristVisitsApi.getById(visitId);
      setVisitData(data);
    } catch (error) {
      console.error("Failed to load visit data:", error);
    }
  }, [visitId]);

  useEffect(() => {
    if (visitId) {
      loadVisitData();
    } else {
      setVisitData(null);
    }
  }, [
    visitId,
    loadVisitData,
    activeQueuePatient?.status,
    activeQueuePatient?.dilation_started_at,
    activeQueuePatient?.dilation_completed_at,
  ]);

  // Instantly reflect dilation status changes from live queue patient updates
  useEffect(() => {
    if (
      activeQueuePatient &&
      (activeQueuePatient.visit_id === visitId || activeQueuePatient.patient_id === patientId)
    ) {
      setVisitData((prev) =>
        prev
          ? {
              ...prev,
              status: activeQueuePatient.status || prev.status,
              dilation_started_at: activeQueuePatient.dilation_started_at ?? prev.dilation_started_at,
              dilation_duration_minutes: activeQueuePatient.dilation_duration_minutes ?? prev.dilation_duration_minutes,
              dilation_completed_at: activeQueuePatient.dilation_completed_at ?? prev.dilation_completed_at,
            }
          : null
      );
    }
  }, [
    visitId,
    patientId,
    activeQueuePatient?.status,
    activeQueuePatient?.dilation_started_at,
    activeQueuePatient?.dilation_duration_minutes,
    activeQueuePatient?.dilation_completed_at,
  ]);

  const handleStartDilation = async (minutes: number) => {
    if (!visitId) return;
    try {
      if (onAction) {
        await onAction(visitId, "start_dilation", minutes);
      } else {
        await optometristVisitsApi.startDilation(visitId, minutes);
      }
      await loadVisitData();
    } catch (error) {
      console.error("Failed to start dilation:", error);
    }
  };

  const handleCompleteDilation = async () => {
    if (!visitId) return;
    try {
      if (onAction) {
        await onAction(visitId, "complete_dilation");
      } else {
        await optometristVisitsApi.completeDilation(visitId);
      }
      await loadVisitData();
    } catch (error) {
      console.error("Failed to complete dilation:", error);
    }
  };

  if (!showPatientCard) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
            <Eye className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Patient Selected</h3>
          <p className="mt-1 text-xs text-slate-500">
            Select an assigned patient from the queue to start or review the examination.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs scrollbar-hide">
      {/* Patient Header - Clean Clinical Context Strip */}
      <div className="relative z-20 border-b border-slate-200 bg-white px-3 py-1.5 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
              <Eye className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2
                  onClick={() => setShowPatientDetail(true)}
                  className="truncate text-sm font-bold text-slate-900 cursor-pointer hover:text-sky-600 transition"
                  title="View complete patient record"
                >
                  {patientName || "Patient Examination"}
                </h2>
                {activeQueuePatient?.token_number && (
                  <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold">TKN</span>
                    <span className="text-sky-700">
                      {typeof activeQueuePatient.token_number === "number" && activeQueuePatient.token_number < 10
                        ? `0${activeQueuePatient.token_number}`
                        : activeQueuePatient.token_number}
                    </span>
                  </span>
                )}
                {patientUhid && (
                  <span className="text-[11px] font-mono text-slate-500 font-medium">
                    ({patientUhid})
                  </span>
                )}
                {visitType && (
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                      visitType.toLowerCase().includes("emergency")
                        ? "bg-rose-50 text-rose-700 border-rose-200 uppercase tracking-wide"
                        : visitType.toLowerCase() === "walk_in"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {visitType.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {/* View Mode Segmented Control */}
            <div className="flex items-center rounded-md bg-slate-100 p-0.5 border border-slate-200/80">
              <button
                onClick={() => setViewMode("tabs")}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition ${
                  viewMode === "tabs"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Tabs View"
              >
                <LayoutGrid className="h-3 w-3" />
                <span className="hidden sm:inline">Tabs</span>
              </button>
              <button
                onClick={() => setViewMode("single")}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition ${
                  viewMode === "single"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Single View (All Accordions)"
              >
                <LayoutList className="h-3 w-3" />
                <span className="hidden sm:inline">Single</span>
              </button>
              <button
                onClick={() => setViewMode("compact")}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition ${
                  viewMode === "compact"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Compact Overview"
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
                patientCategory={patientCategory}
                visitId={visitId || ""}
                optometristId={optometristId || ""}
                doctorId={doctorId || ""}
                doctorName={doctorName}
                isCompleted={isCompleted}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                {visitId && visitData && !isCompleted && (
                  <DilationTimer
                    visitId={visitId}
                    visitData={visitData}
                    onStartDilation={handleStartDilation}
                    onCompleteDilation={handleCompleteDilation}
                  />
                )}
                <ShowSummaryButton
                  patientId={patientId || ""}
                  patientName={patientName || ""}
                  patientUhid={patientUhid || ""}
                  visitId={visitId}
                />
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
              title="Clear active patient"
            >
              <X className="h-4 w-4" />
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
