"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  RefreshCw,
  Settings,
  Stethoscope,
  Wifi,
  WifiOff,
  Loader2,
  ChevronDown,
  Maximize2,
  Minimize2,
  BarChart3,
  Users as UsersIcon,
  LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import { PanelConfigProvider } from "@/context/PanelConfigContext";
import { useClinicPanel } from "@/hooks/useClinicPanel";
import { useClinicLiveQueue } from "@/hooks/useClinicLiveQueue";
import { useClinicPanelPreferences } from "@/hooks/useClinicPanelPreferences";
import { useTenantLabels } from "@/hooks/useTenantLabels";
import { useQueueFlags } from "@/hooks/useFeatureFlags";
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
import { FullscreenContainerProvider } from "@/context/FullscreenContainerContext";
import { ExaminationViewProvider } from "@/context/ExaminationViewContext";
import { usersApi } from "@/services/usersApi";
import { getTenantIdForApi } from "@/utils/auth";
import { Footer } from "@/components/layout/Footer";

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
  const { allowDoctorPickAny, allowOptometristPickAny } = useQueueFlags();

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
  const [isQueueExpanded, setIsQueueExpanded] = useState(true);
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [panelUser, setPanelUser] = useState<{ full_name: string } | null>(null);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Fetch user details for panel header
  useEffect(() => {
    if (userId) {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId);
      usersApi.getById(userId, apiTenantId)
        .then((user) => {
          setPanelUser({ full_name: user.full_name });
        })
        .catch((error) => {
          console.error("Failed to fetch user details for clinic panel header:", error);
        });
    }
  }, [userId]);

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
    <FullscreenContainerProvider containerRef={containerRef as React.RefObject<HTMLDivElement>}>
      <div ref={containerRef} className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-50 overflow-hidden text-slate-900 scrollbar-hide">
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden space-y-1.5 sm:space-y-2 px-2 sm:px-3 py-1.5 sm:py-2 scrollbar-hide">
          {/* Header row */}
          <div className="flex items-center justify-between py-1 flex-shrink-0 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="min-w-0 flex-1 flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/30">
                <Stethoscope className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-bold text-slate-800 truncate">
                  {panelUser?.full_name || roleLabel(panelRole)}
                </p>
                {panelRole === "examiner" && doctorMappings.length > 0 && selectedDoctor && (
                  <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1">
                    <span>Working with:</span>
                    {doctorMappings.length > 1 ? (
                      <div className="relative">
                        <select
                          value={selectedDoctor.doctor_id}
                          onChange={(e) => setSelectedDoctor(e.target.value)}
                          className="appearance-none bg-white border border-slate-200 rounded-md px-2 py-0.5 pr-6 text-xs font-medium text-slate-700 hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 cursor-pointer transition-all"
                        >
                          {doctorMappings.map((mapping) => (
                            <option key={mapping.doctor_id} value={mapping.doctor_id}>
                              {mapping.doctor_name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                      </div>
                    ) : (
                      <span className="font-medium text-slate-700">{selectedDoctor.doctor_name}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Live Queue Connection Status */}
              <div className="flex items-center gap-2">
                {connectionStatus === "connected" && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 px-2.5 py-1 shadow-md shadow-emerald-500/30 animate-in fade-in zoom-in-95 duration-300">
                    <div className="relative">
                      <Wifi className="h-3 w-3 text-white" />
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-white animate-pulse" />
                    </div>
                    <span className="text-xs font-semibold text-white hidden sm:inline">Live</span>
                  </div>
                )}
                {connectionStatus === "connecting" && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-2.5 py-1 shadow-md shadow-amber-400/30">
                    <Loader2 className="h-3 w-3 text-white animate-spin" />
                    <span className="text-xs font-semibold text-white hidden sm:inline">Connecting</span>
                  </div>
                )}
                {connectionStatus === "error" && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 px-2.5 py-1 shadow-md shadow-rose-500/30">
                    <WifiOff className="h-3 w-3 text-white" />
                    <span className="text-xs font-semibold text-white hidden sm:inline">Offline</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={reconnect}
              className="group rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600 hover:shadow-md hover:scale-105 active:scale-95 flex-shrink-0"
              title="Reconnect schedule"
            >
              <RefreshCw className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            </button>

            {/* Settings Dropdown */}
            <div className="relative ml-1.5">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="group rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600 hover:shadow-md hover:scale-105 active:scale-95 flex-shrink-0"
                title="View Settings"
              >
                <Settings className={`h-3.5 w-3.5 transition-transform ${isSettingsOpen ? "rotate-90" : ""}`} />
              </button>

              {isSettingsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSettingsOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="mb-2 px-2 py-1.5 border-b border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-900">View Settings</h3>
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setShowTabSettings(true);
                          setIsSettingsOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <LayoutTemplate className="h-4 w-4" />
                          <span>Customize Tabs</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          toggleFullscreen();
                          setIsSettingsOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                          <span>Fullscreen</span>
                        </div>
                        <span className="text-xs text-slate-400">F11</span>
                      </button>

                      <button
                        onClick={() => toggleStats()}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          <span>Statistics</span>
                        </div>
                        <div className={`h-5 w-9 rounded-full p-1 transition-colors ${preferences.statsVisible ? 'bg-sky-500' : 'bg-slate-200'}`}>
                          <div className={`h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${preferences.statsVisible ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </button>

                      <button
                        onClick={() => toggleQueue()}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <UsersIcon className="h-4 w-4" />
                          <span>Patient Queue</span>
                        </div>
                        <div className={`h-5 w-9 rounded-full p-1 transition-colors ${preferences.queueVisible ? 'bg-sky-500' : 'bg-slate-200'}`}>
                          <div className={`h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${preferences.queueVisible ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {showExaminerNoMapping && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              You are not mapped to any doctor yet. Ask an administrator to add a mapping under
              Examiner Mapping.
            </div>
          )}

          <div className="min-h-0 flex-1 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <ClinicPanelVerticalLayout
              queueVisible={preferences.queueVisible}
              isQueueExpanded={isQueueExpanded}
              onToggleQueue={() => setIsQueueExpanded(!isQueueExpanded)}
              statsSection={
                <ClinicCollapsibleStatsSection stats={liveStats} visible={preferences.statsVisible} />
              }
              patientCard={
                <ClinicActivePatientCard
                  patientId={selectedPatientId}
                  patientName={selectedQueuePatient?.patient_name}
                  patientUhid={selectedQueuePatient?.patient_uhid}
                  abhaVerified={selectedQueuePatient?.abha_verified}
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
                  isVisible={isQueueExpanded}
                  onToggle={() => setIsQueueExpanded(!isQueueExpanded)}
                  allowPickAny={isDoctor ? allowDoctorPickAny : allowOptometristPickAny}
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

        {/* Branding Footer for Fullscreen Mode */}
        {isFullscreen && (
          <div className="flex-shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Footer noSidebar isFixed={false} />
          </div>
        )}
      </div>
    </FullscreenContainerProvider>
  );
}

export function ClinicPanel() {
  const rawRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const role = rawRole?.toLowerCase() === "examiner" ? "examiner" : "doctor";

  return (
    <ExaminationViewProvider>
      <PanelConfigProvider role={role}>
        <ClinicPanelInner />
      </PanelConfigProvider>
    </ExaminationViewProvider>
  );
}
