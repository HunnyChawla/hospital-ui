"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/redux/hooks";
import { Eye, RefreshCw } from "lucide-react";
import { useOptometristPanel } from "@/hooks/useOptometristPanel";
import { useOptometryData } from "@/hooks/useOptometryData";
import { useOptometristPanelPreferences } from "@/hooks/useOptometristPanelPreferences";
import { OptometristPanelVerticalLayout } from "./dashboard/OptometristPanelVerticalLayout";
import { ExaminationTabs } from "./patient-examination/ExaminationTabs";
import { patientsApi } from "@/services/patientsApi";
import { opdVisitsApi } from "@/services/opdVisitsApi";
import { toast } from "sonner";
import { getTenantIdForApi } from "@/utils/auth";

type QueuePatient = {
  patient_id: string;
  patient_name: string;
  patient_uhid: string | null;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
  visit_id: string;
  item_id: string;
  time: string;
};

export function OptometristPanel() {
  // Use our custom hooks
  const {
    currentOptometrist,
    userId,
    todaySchedule,
    todayStats,
    selectedPatientId,
    activeTab,
    loading: panelLoading,
    error: panelError,
    selectPatient,
    setActiveTab,
    refreshSchedule,
  } = useOptometristPanel();

  // Local state (must be declared before hooks that depend on it)
  const [selectedPatientName, setSelectedPatientName] = useState<string>("");
  const [selectedPatientUhid, setSelectedPatientUhid] = useState<string>("");
  const [currentVisitId, setCurrentVisitId] = useState<string | undefined>(undefined);
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>([]);
  const [updatingVisitId, setUpdatingVisitId] = useState<string | null>(null);

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

  // Generate queue from schedule
  useEffect(() => {
    if (todaySchedule && todaySchedule.slots) {
      const queue: QueuePatient[] = todaySchedule.slots.map((slot: any) => {
        const visitType = (slot.type === "emergency" || slot.visit_type === "emergency")
          ? "emergency"
          : slot.type === "appointment" || slot.visit_type === "appointment"
          ? "appointment"
          : "walk_in";

        return {
          patient_id: slot.patient_id,
          patient_name: slot.patient_name,
          patient_uhid: slot.patient_uhid || null,
          token_number: slot.token_number || "",
          status: slot.status,
          visit_type: visitType,
          visit_id: slot.visit_id,
          item_id: slot.item_id,
          time: slot.time,
        };
      });

      setQueuePatients(queue);
    }
  }, [todaySchedule]);

  const fetchPatientDetails = useCallback(async (patientId: string) => {
    try {
      const patient = await patientsApi.getById(patientId);
      setSelectedPatientName(
        `${patient.first_name} ${patient.last_name || ""}`.trim()
      );
      setSelectedPatientUhid(patient.uhid);
    } catch (error) {
      console.error("Failed to fetch patient details:", error);
    }
  }, []);

  // Fetch patient details when selected
  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
    }
  }, [selectedPatientId, fetchPatientDetails]);

  const handleUpdateVisitStatus = useCallback(async (
    visitId: string,
    newStatus: "checked_in" | "in_consultation" | "completed"
  ) => {
    setUpdatingVisitId(visitId);
    try {
      await opdVisitsApi.updateStatus(visitId, newStatus);

      // Success notification
      const statusText = newStatus === "in_consultation" ? "Consultation started" : 
                        newStatus === "completed" ? "Consultation completed" : "Patient checked in";
      toast.success(statusText);

      // Refresh the schedule to get updated data
      refreshSchedule();
    } catch (error: any) {
      console.error("Failed to update visit status:", error);
      toast.error(error?.response?.data?.detail || error?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingVisitId(null);
    }
  }, [refreshSchedule]);

  // Find current visit ID when patient selected
  useEffect(() => {
    if (selectedPatientId && todaySchedule?.slots) {
      const patientSlots = todaySchedule.slots.filter(
        (slot: any) => slot.patient_id === selectedPatientId
      );

      // Prefer in_consultation, then checked_in
      const inConsultation = patientSlots.find((s: any) => s.status === "in_consultation");
      const checkedIn = patientSlots.find((s: any) => s.status === "checked_in");

      let chosen = inConsultation || checkedIn;

      // Fallback: latest by time for any status
      if (!chosen && patientSlots.length > 0) {
        chosen = [...patientSlots].sort((a: any, b: any) => {
          const ta = new Date(a.time || a.start_time || 0).getTime();
          const tb = new Date(b.time || b.start_time || 0).getTime();
          return tb - ta;
        })[0];
      }

      setCurrentVisitId(chosen?.visit_id);
    } else {
      setCurrentVisitId(undefined);
    }
  }, [selectedPatientId, todaySchedule]);

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

  if (!currentOptometrist) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Eye className="w-16 h-16 mx-auto mb-4 text-sky-500 animate-pulse" />
          <h2 className="text-2xl font-bold mb-2">Loading Optometrist Profile...</h2>
          <p className="text-gray-600">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden space-y-2 px-2 sm:px-4 py-2">
        {/* Header */}
        <div className="flex items-center justify-between py-1 flex-shrink-0">
          {currentOptometrist && (
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-600 truncate">
                <span className="font-semibold">Dr. {currentOptometrist.user_name || "Optometrist"}</span>
                {currentOptometrist.specialization && (
                  <span className="text-slate-400 hidden sm:inline"> • {currentOptometrist.specialization}</span>
                )}
              </p>
            </div>
          )}

          <button
            onClick={refreshSchedule}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 flex-shrink-0"
            title="Refresh schedule"
          >
            <RefreshCw className={`h-4 w-4 ${panelLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error message */}
        {panelError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 flex-shrink-0">
            <p className="text-sm text-rose-700">
              {typeof panelError === 'string' ? panelError : JSON.stringify(panelError)}
            </p>
          </div>
        )}

        {/* Dashboard Layout */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <OptometristPanelVerticalLayout
            stats={todayStats}
            statsLoading={panelLoading}
            statsVisible={preferences.statsVisible}
            onToggleStats={toggleStats}
            queuePatients={queuePatients}
            queueFilter={preferences.queueFilter}
            onQueueFilterChange={setQueueFilter}
            queueLoading={false}
            queueVisible={preferences.queueVisible}
            onToggleQueue={toggleQueue}
            selectedPatientId={selectedPatientId}
            selectedPatientName={selectedPatientName}
            selectedPatientUhid={selectedPatientUhid}
            activeTab={activeTab}
            onSelectPatient={selectPatient}
            onClearPatient={() => {
              selectPatient(null);
              setSelectedPatientName("");
              setSelectedPatientUhid("");
              setCurrentVisitId(undefined);
            }}
            onTabChange={setActiveTab}
            onUpdateVisitStatus={handleUpdateVisitStatus}
            updatingVisitId={updatingVisitId}
          >
            {/* Tab content will be rendered inside layout */}
            {selectedPatientId && (
              <ExaminationTabs
                patientId={selectedPatientId}
                visitId={currentVisitId || ""}
                optometristId={currentOptometrist?.id || ""}
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
