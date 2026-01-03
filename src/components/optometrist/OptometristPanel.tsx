"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { useOptometristPanel } from "@/hooks/useOptometristPanel";
import { useOptometryData } from "@/hooks/useOptometryData";
import { useOptometristPanelPreferences } from "@/hooks/useOptometristPanelPreferences";
import { OptometristPanelVerticalLayout } from "./dashboard/OptometristPanelVerticalLayout";
import { ExaminationTabs } from "./patient-examination/ExaminationTabs";

type QueuePatient = {
  patient_id: string;
  patient_name: string;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
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
    reset,
  } = useOptometristPanel();

  // Use optometry data hook
  const {
    refractionRecords,
    iopRecords,
    iopTrends,
    arDataRecords,
    complaints,
    medicalHistory,
    ophthalmicHistory,
    drugAllergies,
    patientOptometryHistory,
    loading: dataLoading,
    error: dataError,
    refreshHistory,
    refreshRefraction,
    refreshIOP,
    refreshARData,
    refreshComplaints,
    refreshMedicalHistory,
    refreshOphthalmicHistory,
    refreshDrugAllergies,
  } = useOptometryData({
    patientId: selectedPatientId,
    autoFetch: true,
  });

  // UI preferences hook
  const {
    preferences,
    toggleStats,
    toggleQueue,
    setQueueFilter,
  } = useOptometristPanelPreferences();

  // Local state
  const [selectedPatientName, setSelectedPatientName] = useState<string>("");
  const [selectedPatientUhid, setSelectedPatientUhid] = useState<string>("");
  const [currentVisitId, setCurrentVisitId] = useState<string | undefined>(undefined);
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>([]);

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
          token_number: slot.token_number || "",
          status: slot.status,
          visit_type: visitType,
          item_id: slot.item_id,
          time: slot.time,
        };
      });

      setQueuePatients(queue);
    }
  }, [todaySchedule]);

  // Find current visit ID when patient selected
  useEffect(() => {
    console.log("Selected Patient ID changed:", selectedPatientId);
    console.log("Today's Schedule:", todaySchedule);
    if (selectedPatientId && todaySchedule?.slots) {
      const currentSlot = todaySchedule.slots.find(
        slot => slot.patient_id === selectedPatientId &&
        (slot.status === "checked_in" || slot.status === "in_consultation")
      );
      setCurrentVisitId(currentSlot?.visit_id);
      setSelectedPatientName(currentSlot?.patient_name || "");
    } else {
      setCurrentVisitId(undefined);
      setSelectedPatientName("");
      setSelectedPatientUhid("");
    }
  }, [selectedPatientId, todaySchedule]);

  // Check authentication
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role");
      if (!userId || (role !== "optometrist" && role !== "admin")) {
        // Not authorized - could redirect or show message
        console.warn("User is not authorized as optometrist");
      }
    }
  }, [userId]);

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
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-hidden space-y-2 px-2 sm:px-4 py-2">
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
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-700">
              {typeof panelError === 'string' ? panelError : JSON.stringify(panelError)}
            </p>
          </div>
        )}

        {/* Dashboard Layout */}
        <div className="flex-1 overflow-hidden">
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
                medicalHistory={medicalHistory}
                ophthalmicHistory={ophthalmicHistory}
                drugAllergies={drugAllergies}
                arDataRecords={arDataRecords}
                refractionRecords={refractionRecords}
                iopRecords={iopRecords}
                iopTrends={iopTrends}
                patientOptometryHistory={patientOptometryHistory}
                loading={dataLoading}
                refreshComplaints={refreshComplaints}
                refreshMedicalHistory={refreshMedicalHistory}
                refreshOphthalmicHistory={refreshOphthalmicHistory}
                refreshDrugAllergies={refreshDrugAllergies}
                refreshARData={refreshARData}
                refreshRefraction={refreshRefraction}
                refreshIOP={refreshIOP}
                refreshHistory={refreshHistory}
              />
            )}
          </OptometristPanelVerticalLayout>
        </div>
      </div>
    </div>
  );
}
