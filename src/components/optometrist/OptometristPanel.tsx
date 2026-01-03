"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { useOptometristPanel } from "@/hooks/useOptometristPanel";
import { useOptometryData } from "@/hooks/useOptometryData";
import { ExaminationTabs } from "./patient-examination/ExaminationTabs";
import { PrescriptionButton } from "./prescriptions/PrescriptionButton";

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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-8 h-8 text-sky-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Optometry Panel</h1>
              <p className="text-sm text-gray-600">
                Dr. {currentOptometrist.user_name}
                {currentOptometrist.specialization && ` • ${currentOptometrist.specialization}`}
              </p>
            </div>
          </div>
          <button
            onClick={refreshSchedule}
            disabled={panelLoading}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${panelLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Section */}
      {todayStats && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{todayStats.todayTotal}</div>
              <div className="text-sm text-gray-600">Total Patients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{todayStats.todayPending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{todayStats.todayInProgress}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{todayStats.todayCompleted}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Patient Queue - Left Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-lg">Patient Queue</h2>
              <p className="text-sm text-gray-600">{queuePatients.length} patients</p>
            </div>
            <div className="divide-y divide-gray-200">
              {queuePatients.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No patients in queue</p>
                </div>
              ) : (
                queuePatients.map((patient) => (
                  <div
                    key={patient.patient_id}
                    onClick={() => selectPatient(patient.patient_id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedPatientId === patient.patient_id ? "bg-sky-50 border-l-4 border-sky-600" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{patient.patient_name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Token: {patient.token_number}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {patient.time}
                        </div>
                      </div>
                      <div>
                        {patient.visit_type === "emergency" && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            Emergency
                          </span>
                        )}
                        {patient.status === "in_consultation" && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            In Progress
                          </span>
                        )}
                        {patient.status === "completed" && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Patient Details - Main Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedPatientId ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Eye className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No Patient Selected
                  </h3>
                  <p className="text-gray-500">
                    Select a patient from the queue to begin examination
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {/* Patient Info Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedPatientName}
                      </h2>
                      <p className="text-gray-600">UHID: {selectedPatientUhid || selectedPatientId}</p>
                      {currentVisitId && (
                        <p className="text-sm text-gray-500 mt-1">Visit ID: {currentVisitId}</p>
                      )}
                    </div>
                    <div>
                      <PrescriptionButton
                        patientId={selectedPatientId}
                        patientName={selectedPatientName}
                        patientUhid={selectedPatientUhid}
                        visitId={currentVisitId || ""}
                        optometristId={currentOptometrist?.id || ""}
                        optometristName={currentOptometrist?.name || "Optometrist"}
                        latestRefractionOD={
                          refractionRecords
                            .filter((r) => r.eye === "OD")
                            .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0]
                        }
                        latestRefractionOS={
                          refractionRecords
                            .filter((r) => r.eye === "OS")
                            .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0]
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Examination Tabs */}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
