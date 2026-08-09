"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Settings, Stethoscope, Wifi, WifiOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PanelConfigProvider } from "@/context/PanelConfigContext";
import { useClinicPanel } from "@/hooks/useClinicPanel";
import { useClinicLiveQueue } from "@/hooks/useClinicLiveQueue";
import { useClinicPanelPreferences } from "@/hooks/useClinicPanelPreferences";
import { useTenantLabels } from "@/hooks/useTenantLabels";
import { clinicVisitsApi } from "@/services/clinicVisitsApi";
import { getErrorMessage } from "@/utils/errorHandler";
import type { ClinicQueuePatient } from "@/utils/clinicQueueFilters";
import { ClinicPanelVerticalLayout } from "./dashboard/ClinicPanelVerticalLayout";
import { ClinicActivePatientCard } from "./dashboard/ClinicActivePatientCard";
import {
  ClinicCollapsibleQueueSection,
  type ClinicActionType,
} from "./dashboard/ClinicCollapsibleQueueSection";
import {
  ClinicCollapsibleStatsSection,
  type ClinicStats,
} from "./dashboard/ClinicCollapsibleStatsSection";
import { ClinicExaminationTabs } from "./examination/ClinicExaminationTabs";
import { ClinicPrescriptionWorkspace } from "./prescription/ClinicPrescriptionWorkspace";
import { ClinicTabVisibilitySettings } from "./ClinicTabVisibilitySettings";

const USER_HIDDEN_KEYS_STORAGE = "clinic_panel_hidden_tabs";

function ClinicPanelInner() {
  const {
    userId,
    panelRole,
    isDoctor,
    doctorMappings,
    selectedDoctor,
    mappingsError,
    selectedPatientId,
    selectedVisitId,
    activeComponentKey,
    mode,
    selectPatient,
    setActiveComponentKey,
    setMode,
    setSelectedDoctor,
    notifyOnQueueChange,
  } = useClinicPanel();

  const { preferences, toggleQueue, toggleStats, setQueueFilter } =
    useClinicPanelPreferences();
  const { roleLabel } = useTenantLabels();

  const { queuePatients, connectionStatus, reconnect } = useClinicLiveQueue({
    doctorId: selectedDoctor?.doctor_id || null,
    as: panelRole,
    autoConnect: !!selectedDoctor?.doctor_id,
  });

  // Assigned-to-me chime
  useEffect(() => {
    notifyOnQueueChange(queuePatients);
  }, [queuePatients, notifyOnQueueChange]);

  const [actionInProgressVisitId, setActionInProgressVisitId] = useState<string | null>(null);
  const [showTabSettings, setShowTabSettings] = useState(false);
  const [userHiddenKeys, setUserHiddenKeys] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem(USER_HIDDEN_KEYS_STORAGE) || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });

  const toggleHiddenKey = useCallback((key: string) => {
    setUserHiddenKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_HIDDEN_KEYS_STORAGE, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  // Live stats from the SSE queue
  const liveStats: ClinicStats = useMemo(() => {
    const stats: ClinicStats = {
      todayTotal: queuePatients.length,
      pending: 0,
      inProgress: 0,
      sentToDoctor: 0,
      completed: 0,
      noShow: 0,
    };
    queuePatients.forEach((patient) => {
      switch (patient.status) {
        case "awaiting_examiner":
        case "examiner_assigned":
          stats.pending++;
          break;
        case "examination_in_progress":
          stats.inProgress++;
          break;
        case "examination_completed":
        case "awaiting_doctor":
        case "doctor_assigned":
        case "consultation_in_progress":
          stats.sentToDoctor++;
          break;
        case "consultation_completed":
        case "completed":
          stats.completed++;
          break;
        case "no_show":
          stats.noShow++;
          break;
      }
    });
    return stats;
  }, [queuePatients]);

  const selectedQueuePatient = useMemo(
    () => queuePatients.find((p) => p.visit_id === selectedVisitId) || null,
    [queuePatients, selectedVisitId]
  );

  // Default the doctor's mode by visit status: prescribing once the patient
  // is theirs, examining otherwise
  useEffect(() => {
    if (!isDoctor || !selectedQueuePatient) return;
    if (
      ["doctor_assigned", "consultation_in_progress"].includes(selectedQueuePatient.status) &&
      mode !== "prescribe"
    ) {
      setMode("prescribe");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQueuePatient?.status, isDoctor]);

  const handleSelectPatient = useCallback(
    (patient: ClinicQueuePatient) => {
      selectPatient(patient.patient_id, patient.visit_id);
    },
    [selectPatient]
  );

  const handleAction = useCallback(
    async (visitId: string, action: ClinicActionType) => {
      if (!userId) return;
      setActionInProgressVisitId(visitId);
      try {
        switch (action) {
          case "pick":
            await clinicVisitsApi.pickExaminer(visitId, userId);
            break;
          case "unpick":
            await clinicVisitsApi.unpickExaminer(visitId);
            break;
          case "start_examination":
            await clinicVisitsApi.startExamination(visitId);
            break;
          case "complete_examination":
            await clinicVisitsApi.completeExamination(visitId);
            toast.success("Examination completed — sent to doctor");
            break;
          case "start_consultation":
            await clinicVisitsApi.startConsultation(visitId);
            break;
          case "complete_consultation":
            await clinicVisitsApi.completeConsultation(visitId);
            toast.success("Consultation completed");
            break;
          case "pick_doctor":
            if (selectedDoctor?.doctor_id) {
              await clinicVisitsApi.pickDoctor(visitId, selectedDoctor.doctor_id);
            }
            break;
          case "unpick_doctor":
            await clinicVisitsApi.unpickDoctor(visitId);
            break;
          case "mark_no_show":
            await clinicVisitsApi.markNoShow(visitId);
            break;
        }
      } catch (error: unknown) {
        toast.error(getErrorMessage(error) || "Action failed");
      } finally {
        setActionInProgressVisitId(null);
      }
    },
    [userId, selectedDoctor?.doctor_id]
  );

  if (mappingsError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Stethoscope className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">{mappingsError}</p>
        </div>
      </div>
    );
  }

  const showExaminerNoMapping = panelRole === "examiner" && doctorMappings.length === 0;

  const cardBody =
    selectedPatientId && selectedVisitId ? (
      isDoctor && mode === "prescribe" && selectedDoctor?.doctor_id ? (
        <ClinicPrescriptionWorkspace
          patientId={selectedPatientId}
          visitId={selectedVisitId}
          doctorId={selectedDoctor.doctor_id}
          onEditSection={(key) => {
            setMode("examine");
            setActiveComponentKey(key);
          }}
        />
      ) : (
        <ClinicExaminationTabs
          activeKey={activeComponentKey}
          onTabChange={setActiveComponentKey}
          userHiddenKeys={userHiddenKeys}
          patientId={selectedPatientId}
          visitId={selectedVisitId}
          recordedByUserId={userId || ""}
        />
      )
    ) : null;

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-lg font-bold text-slate-800">
            {roleLabel(panelRole)} Panel
          </h1>
          {/* Examiner mapped to several doctors picks whose queue to work */}
          {panelRole === "examiner" && doctorMappings.length > 1 && (
            <select
              value={selectedDoctor?.doctor_id || ""}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              {doctorMappings.map((mapping) => (
                <option key={mapping.doctor_id} value={mapping.doctor_id}>
                  Dr. {mapping.doctor_name || "Unknown"}
                </option>
              ))}
            </select>
          )}
          {panelRole === "examiner" && doctorMappings.length === 1 && selectedDoctor && (
            <span className="truncate text-xs text-slate-500">
              Working with Dr. {selectedDoctor.doctor_name}
            </span>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {/* Connection pill */}
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              connectionStatus === "connected"
                ? "bg-emerald-50 text-emerald-700"
                : connectionStatus === "connecting"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-rose-50 text-rose-700"
            }`}
          >
            {connectionStatus === "connected" ? (
              <Wifi className="h-3 w-3" />
            ) : connectionStatus === "connecting" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {connectionStatus === "connected"
              ? "Live"
              : connectionStatus === "connecting"
                ? "Connecting"
                : "Offline"}
          </span>
          <button
            onClick={reconnect}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            title="Reconnect"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowTabSettings(true)}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
              title="Customize tabs"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showExaminerNoMapping && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You are not mapped to any doctor yet. Ask an administrator to add a mapping under
          Examiner Mapping.
        </div>
      )}

      <div className="min-h-0 flex-1">
        <ClinicPanelVerticalLayout
          queueVisible={preferences.queueVisible}
          statsSection={
            <ClinicCollapsibleStatsSection stats={liveStats} visible={preferences.statsVisible} />
          }
          patientCard={
            <ClinicActivePatientCard
              patientId={selectedPatientId}
              patientName={selectedQueuePatient?.patient_name}
              patientUhid={selectedQueuePatient?.patient_uhid}
              visitId={selectedVisitId}
              visitType={selectedQueuePatient?.visit_type}
              visitStatus={selectedQueuePatient?.status}
              isDoctor={isDoctor}
              mode={mode}
              onModeChange={setMode}
              onClose={() => selectPatient(null, null)}
            >
              {cardBody}
            </ClinicActivePatientCard>
          }
          queueSection={
            <ClinicCollapsibleQueueSection
              patients={queuePatients}
              visible={preferences.queueVisible}
              activeFilter={preferences.queueFilter}
              onFilterChange={setQueueFilter}
              onSelectPatient={handleSelectPatient}
              onAction={handleAction}
              selectedVisitId={selectedVisitId}
              isDoctor={isDoctor}
              examinerId={panelRole === "examiner" ? userId : null}
              actionInProgressVisitId={actionInProgressVisitId}
            />
          }
        />
      </div>

      <ClinicTabVisibilitySettings
        isOpen={showTabSettings}
        onClose={() => setShowTabSettings(false)}
        hiddenKeys={userHiddenKeys}
        onToggle={toggleHiddenKey}
      />
    </div>
  );
}

export function ClinicPanel() {
  const rawRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const role = rawRole?.toLowerCase() === "examiner" ? "examiner" : "doctor";

  return (
    <PanelConfigProvider role={role}>
      <ClinicPanelInner />
    </PanelConfigProvider>
  );
}
