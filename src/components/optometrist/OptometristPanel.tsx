"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAppSelector } from "@/redux/hooks";
import { Eye, RefreshCw, Wifi, WifiOff, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { useOptometristPanel } from "@/hooks/useOptometristPanel";
import { useOptometryData } from "@/hooks/useOptometryData";
import { useOptometristPanelPreferences } from "@/hooks/useOptometristPanelPreferences";
import { useOptometristLiveQueue } from "@/hooks/useOptometristLiveQueue";
import { useDoctorLiveQueue } from "@/hooks/useDoctorLiveQueue";
import { OptometristPanelVerticalLayout } from "./dashboard/OptometristPanelVerticalLayout";
import { ExaminationTabs } from "./patient-examination/ExaminationTabs";
import { CreatePrescriptionButton } from "./prescriptions/CreatePrescriptionButton";
import { patientsApi } from "@/services/patientsApi";
import { optometristVisitsApi } from "@/services/optometristVisitsApi";
import { opdVisitsApi } from "@/services/opdVisitsApi";
import { usersApi } from "@/services/usersApi";
import { toast } from "sonner";
import { getTenantIdForApi } from "@/utils/auth";
import { handleError } from "@/utils/errorHandler";
import { OptometristStats } from "@/types";
import type { OptometristActionType } from "./dashboard/OptometristCollapsibleQueueSection";



export function OptometristPanel() {
  // Use our custom hooks
  const {
    userId,
    userRole,
    selectedDoctor,
    doctorMappings,
    mappingsLoading,
    mappingsError,
    todaySchedule,
    todayStats,
    selectedPatientId,
    activeTab,
    loading: panelLoading,
    error: panelError,
    selectPatient,
    setActiveTab,
    setSelectedDoctor,
    refreshSchedule,
  } = useOptometristPanel();

  // Local state (must be declared before hooks that depend on it)
  const [selectedPatientName, setSelectedPatientName] = useState<string>("");
  const [selectedPatientUhid, setSelectedPatientUhid] = useState<string>("");
  const [currentVisitId, setCurrentVisitId] = useState<string | undefined>(undefined);
  const [updatingVisitId, setUpdatingVisitId] = useState<string | null>(null);
  const [optometristUser, setOptometristUser] = useState<{ full_name: string } | null>(null);

  // Fetch optometrist user details
  useEffect(() => {
    if (userId) {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId);
      usersApi.getById(userId, apiTenantId)
        .then((user) => {
          setOptometristUser({ full_name: user.full_name });
        })
        .catch((error) => {
          handleError(error, {
            defaultMessage: "Failed to fetch optometrist user details",
            showToast: false, // Don't show toast for background fetch
            logError: true,
          });
        });
    }
  }, [userId]);

  // Determine if user is a doctor
  const isDoctor = userRole === "doctor";

  // State to store optometrist ID for the current visit (when viewed by doctor)
  const [optometristIdForVisit, setOptometristIdForVisit] = useState<string>("");

  // Fetch visit details to get optometrist_id when a visit is selected by a doctor
  useEffect(() => {
    if (currentVisitId && isDoctor) {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      optometristVisitsApi.getById(currentVisitId, tenantId || undefined)
        .then((visit) => {
          if (visit.optometrist_id) {
            setOptometristIdForVisit(visit.optometrist_id);
          } else {
            console.warn("Optometrist ID not found in visit details, setting to empty");
            setOptometristIdForVisit("");
          }
        })
        .catch((err) => {
          console.error("Failed to fetch visit details for optometrist ID", err);
          setOptometristIdForVisit("");
        });
    } else {
      setOptometristIdForVisit("");
    }
  }, [currentVisitId, isDoctor]);

  // Use live queue with SSE - calling both but only one connects based on role
  const { queuePatients: optometristQueue, connectionStatus: optStatus } = useOptometristLiveQueue({
    doctorId: !isDoctor ? selectedDoctor?.doctor_id || null : null,
    autoConnect: !isDoctor,
  });

  const { queuePatients: doctorQueue, connectionStatus: docStatus } = useDoctorLiveQueue({
    doctorId: isDoctor ? selectedDoctor?.doctor_id || null : null,
    autoConnect: isDoctor,
  });

  // Select appropriate queue data
  const queuePatients = isDoctor ? doctorQueue : optometristQueue;
  const connectionStatus = isDoctor ? docStatus : optStatus;

  // Use optometry data hook
  const {
    refractionRecords,
    iopRecords,
    iopTrends,
    arDataRecords,
    complaints,
    ophthalmicHistory,
    drugAllergies,
    patientOptometryHistory,
    loading: dataLoading,
    refreshHistory,
    refreshRefraction,
    refreshIOP,
    refreshARData,
    refreshComplaints,
    refreshOphthalmicHistory,
    refreshDrugAllergies,
  } = useOptometryData({
    patientId: selectedPatientId,
    visitId: currentVisitId || null,
    autoFetch: true,
  });

  // Loading for patient optometry history fetches (from optometristPanel slice)
  const historyLoading = useAppSelector((state) => state.optometristPanel.loading);

  // UI preferences hook
  const {
    preferences,
    toggleStats,
    toggleQueue,
    setQueueFilter,
  } = useOptometristPanelPreferences();

  // Calculate stats from live queue data using new status values
  const liveStats: OptometristStats = useMemo(() => {
    const stats = {
      todayTotal: queuePatients.length,
      todayPending: 0,
      todayInProgress: 0,
      todayCompleted: 0,
    };

    queuePatients.forEach((patient) => {
      if (isDoctor) {
        // Doctor Status Logic
        switch (patient.status) {
          case "awaiting_doctor":
          case "doctor_assigned":
          case "optometrist_investigation_completed": // Ready for doctor
            stats.todayPending++;
            break;

          case "consultation_in_progress":
          case "dilation_in_progress":
          case "dilation_completed": // Still in progress till final consultation done
            stats.todayInProgress++;
            break;

          case "consultation_completed":
          case "completed":
          case "no_show":
            stats.todayCompleted++;
            break;

          default:
            stats.todayPending++;
        }
      } else {
        // Optometrist Status Logic
        switch (patient.status) {
          // Pending statuses
          case "awaiting_optometrist":
          case "optometrist_assigned":
            stats.todayPending++;
            break;
          // In progress statuses
          case "optometrist_investigation_in_progress":
            stats.todayInProgress++;
            break;
          // Completed statuses
          case "optometrist_investigation_completed":
          case "awaiting_doctor":
          case "doctor_assigned":
          case "consultation_in_progress":
          case "dilation_in_progress":
          case "dilation_completed":
          case "consultation_completed":
            stats.todayCompleted++;
            break;
          // Legacy statuses (for backward compatibility)
          case "scheduled":
          case "waiting":
          case "checked_in":
            stats.todayPending++;
            break;
          case "in_consultation":
          case "start_consultation": // Doctor status
            stats.todayInProgress++;
            break;
          case "completed":
          case "consultation_completed": // Doctor status
            stats.todayCompleted++;
            break;
          case "no_show":
            stats.todayCompleted++;
            break;
          default:
            stats.todayPending++;
        }
      }
    });

    return stats;
  }, [queuePatients, isDoctor]);

  const fetchPatientDetails = useCallback(async (patientId: string) => {
    try {
      const patient = await patientsApi.getById(patientId);
      setSelectedPatientName(
        `${patient.first_name} ${patient.last_name || ""}`.trim()
      );
      setSelectedPatientUhid(patient.uhid);
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to fetch patient details",
        showToast: false, // Don't show toast for background fetch
        logError: true,
      });
    }
  }, []);

  // Fetch patient details when selected
  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
    }
  }, [selectedPatientId, fetchPatientDetails]);

  // Get current user ID for optometrist actions
  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  const handleOptometristAction = useCallback(async (
    visitId: string,
    action: OptometristActionType
  ) => {
    setUpdatingVisitId(visitId);
    try {
      const apiTenantId = getTenantIdForApi(tenantId);

      switch (action) {
        case "pick":
          if (!currentUserId) {
            throw new Error("User ID not found");
          }
          await optometristVisitsApi.pickOptometrist(visitId, currentUserId, apiTenantId);
          toast.success("Patient picked successfully");
          break;

        case "unpick":
          await optometristVisitsApi.unpickOptometrist(visitId, apiTenantId);
          toast.success("Patient unpicked successfully");
          break;

        case "start_investigation":
          await optometristVisitsApi.startInvestigation(visitId, apiTenantId);
          toast.success("Investigation started");
          break;

        case "complete_investigation":
          await optometristVisitsApi.completeInvestigation(visitId, apiTenantId);
          toast.success("Investigation completed");
          // Clear patient after satisfying the request
          selectPatient(null);
          setSelectedPatientName("");
          setSelectedPatientUhid("");
          setCurrentVisitId(undefined);
          break;

        // Doctor Actions
        case "mark_no_show":
          await optometristVisitsApi.markNoShow(visitId, apiTenantId);
          toast.success("Patient marked as No Show");
          break;

        case "start_consultation":
          // For doctor, we need doctorId. isDoctor check implies userId is doctorId
          if (!isDoctor) throw new Error("Only doctors can start consultation");
          const docId = selectedDoctor?.doctor_id;
          if (!docId) throw new Error("Doctor ID not resolved");
          await optometristVisitsApi.startConsultation(visitId, docId, apiTenantId);
          toast.success("Consultation started");
          break;

        case "complete_consultation":
          await optometristVisitsApi.completeConsultation(visitId, apiTenantId);
          toast.success("Consultation completed");
          // Clear patient after satisfying the request
          selectPatient(null);
          setSelectedPatientName("");
          setSelectedPatientUhid("");
          setCurrentVisitId(undefined);
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Refresh the schedule to get updated data
      refreshSchedule();
    } catch (error: any) {
      handleError(error, {
        defaultMessage: `Failed to ${action.replace(/_/g, " ")}`,
        logError: true,
      });
    } finally {
      setUpdatingVisitId(null);
    }
  }, [refreshSchedule, currentUserId, tenantId]);

  // Find current visit ID when patient selected from live queue
  useEffect(() => {
    if (selectedPatientId && queuePatients.length > 0) {
      const patientSlots = queuePatients.filter(
        (patient) => patient.patient_id === selectedPatientId
      );

      // Prefer in_consultation, then checked_in
      const inConsultation = patientSlots.find((p) => p.status === "in_consultation");
      const checkedIn = patientSlots.find((p) => p.status === "checked_in");

      let chosen = inConsultation || checkedIn;

      // Fallback: latest by time for any status
      if (!chosen && patientSlots.length > 0) {
        chosen = [...patientSlots].sort((a, b) => {
          const ta = new Date(a.time || 0).getTime();
          const tb = new Date(b.time || 0).getTime();
          return tb - ta;
        })[0];
      }

      setCurrentVisitId(chosen?.visit_id);
    } else {
      setCurrentVisitId(undefined);
    }
  }, [selectedPatientId, queuePatients]);

  // Refresh patient optometry history when switching to Previous History tab
  useEffect(() => {
    if (activeTab === "previous_history" && selectedPatientId) {
      refreshHistory();
    }
  }, [activeTab, selectedPatientId, refreshHistory]);

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Eye className="w-16 h-16 mx-auto mb-4 text-sky-500" />
          <h2 className="text-2xl font-bold mb-2">Optometry Panel</h2>
          <p className="text-gray-600">Please log in to continue</p>
        </div>
      </div>
    );
  }

  if (mappingsLoading || !selectedDoctor) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Eye className="w-16 h-16 mx-auto mb-4 text-sky-500 animate-pulse" />
          <h2 className="text-2xl font-bold mb-2">
            {mappingsLoading ? "Loading Optometrist Profile..." : "No Doctor Assignment Found"}
          </h2>
          <p className="text-gray-600">
            {mappingsLoading ? "Please wait" : "Please contact administrator to assign you to a doctor"}
          </p>
          {mappingsError && (
            <p className="text-red-600 mt-2 text-sm">{mappingsError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-50 overflow-hidden">
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden space-y-3 px-3 sm:px-6 py-3 sm:py-4">
        {/* Header */}
        <div className="flex items-center justify-between py-2 flex-shrink-0 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="min-w-0 flex-1 flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/30">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold text-slate-800 truncate">
                {optometristUser?.full_name || "Optometrist"}
              </p>
              {selectedDoctor && (
                <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1">
                  <span>Assigned to:</span>
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

            {/* Create Prescription Button for Doctors */}
            {isDoctor && selectedPatientId && (
              <div className="hidden sm:block animate-in fade-in zoom-in duration-300">
                <CreatePrescriptionButton
                  patientId={selectedPatientId}
                  patientName={selectedPatientName}
                  patientUhid={selectedPatientUhid}
                  visitId={currentVisitId || ""}
                  optometristId={optometristIdForVisit || ""} // Pass resolved optometrist ID
                  doctorId={selectedDoctor?.doctor_id || ""}
                  doctorName={optometristUser?.full_name}
                  onPrescriptionCreated={() => {
                    // Update any necessary state
                  }}
                />
              </div>
            )}

            {/* Live Queue Connection Status */}
            <div className="flex items-center gap-2">
              {connectionStatus === "connected" && (
                <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1.5 shadow-md shadow-emerald-500/30 animate-in fade-in zoom-in-95 duration-300">
                  <div className="relative">
                    <Wifi className="h-3.5 w-3.5 text-white" />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-white animate-pulse" />
                  </div>
                  <span className="text-xs font-semibold text-white hidden sm:inline">Live</span>
                </div>
              )}
              {(connectionStatus === "connecting" || connectionStatus === "reconnecting") && (
                <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1.5 shadow-md shadow-amber-400/30">
                  <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                  <span className="text-xs font-semibold text-white hidden sm:inline">
                    {connectionStatus === "reconnecting" ? "Reconnecting" : "Connecting"}
                  </span>
                </div>
              )}
              {(connectionStatus === "error" || connectionStatus === "disconnected") && (
                <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 px-3 py-1.5 shadow-md shadow-rose-500/30">
                  <WifiOff className="h-3.5 w-3.5 text-white" />
                  <span className="text-xs font-semibold text-white hidden sm:inline">Offline</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={refreshSchedule}
            className="group rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600 hover:shadow-md hover:scale-105 active:scale-95 flex-shrink-0"
            title="Refresh schedule"
          >
            <RefreshCw className={`h-4 w-4 transition-transform group-hover:rotate-180 ${panelLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error message */}
        {panelError && (
          <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-red-50 p-4 flex-shrink-0 shadow-sm animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <p className="text-sm text-rose-700 font-medium">
                {typeof panelError === 'string' ? panelError : JSON.stringify(panelError)}
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Layout */}
        <div className="flex-1 min-h-0 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-700">
          <OptometristPanelVerticalLayout
            stats={liveStats}
            statsLoading={connectionStatus === "connecting" || connectionStatus === "reconnecting"}
            statsVisible={preferences.statsVisible}
            onToggleStats={toggleStats}
            queuePatients={queuePatients}
            queueFilter={preferences.queueFilter}
            onQueueFilterChange={setQueueFilter}
            queueLoading={connectionStatus === "connecting" || connectionStatus === "reconnecting"}
            queueVisible={preferences.queueVisible}
            onToggleQueue={toggleQueue}
            selectedPatientId={selectedPatientId}
            selectedPatientName={selectedPatientName}
            selectedPatientUhid={selectedPatientUhid}
            visitId={currentVisitId}
            activeTab={activeTab}
            onSelectPatient={selectPatient}
            onClearPatient={() => {
              selectPatient(null);
              setSelectedPatientName("");
              setSelectedPatientUhid("");
              setCurrentVisitId(undefined);
            }}
            onTabChange={setActiveTab}
            onAction={handleOptometristAction}
            updatingVisitId={updatingVisitId}
            isDoctor={isDoctor}
          >
            {/* Tab content will be rendered inside layout */}
            {selectedPatientId && (
              <ExaminationTabs
                patientId={selectedPatientId}
                visitId={currentVisitId || ""}
                optometristId={userId || ""}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                complaints={complaints}
                ophthalmicHistory={ophthalmicHistory}
                drugAllergies={drugAllergies}
                arDataRecords={arDataRecords}
                refractionRecords={refractionRecords}
                iopRecords={iopRecords}
                iopTrends={iopTrends}
                patientOptometryHistory={patientOptometryHistory}
                historyLoading={historyLoading}
                refreshHistory={refreshHistory}
                loading={dataLoading}
                refreshComplaints={refreshComplaints}
                refreshOphthalmicHistory={refreshOphthalmicHistory}
                refreshDrugAllergies={refreshDrugAllergies}
                refreshARData={refreshARData}
                refreshRefraction={refreshRefraction}
                refreshIOP={refreshIOP}
              />
            )}
          </OptometristPanelVerticalLayout>
        </div>
      </div>
    </div>
  );
}
