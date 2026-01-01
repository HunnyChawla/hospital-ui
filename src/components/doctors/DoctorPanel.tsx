"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, RefreshCw, FileText } from "lucide-react";
import { useDoctorPanel } from "@/hooks/useDoctorPanel";
import { usePatientDetails } from "@/hooks/usePatientDetails";
import { useDoctorPanelPreferences } from "@/hooks/useDoctorPanelPreferences";
import { DoctorPanelVerticalLayout } from "./dashboard/DoctorPanelVerticalLayout";
import { PatientHistoryTimeline } from "./patient-details/PatientHistoryTimeline";
import { VitalSignsPanel } from "./patient-details/VitalSignsPanel";
import { LabResultsPanel } from "./patient-details/LabResultsPanel";
import { QuickNotesPanel } from "./patient-details/QuickNotesPanel";
import { IpdInfoPanel } from "./patient-details/IpdInfoPanel";
import { PrescriptionFormModal } from "./PrescriptionFormModal";
import { useAppSelector } from "@/redux/hooks";
import { labBookingsApi } from "@/services/labBookingsApi";
import { admissionsApi } from "@/services/admissionsApi";
import { patientsApi } from "@/services/patientsApi";
import { opdVisitsApi } from "@/services/opdVisitsApi";
import { toast } from "sonner";

type QueuePatient = {
  patient_id: string;
  patient_name: string;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
  item_id: string;
  time: string;
};

export function DoctorPanel() {
  const router = useRouter();

  // Use our custom hook for doctor panel state
  const {
    currentDoctor,
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
  } = useDoctorPanel();

  // Use patient details hook
  const {
    patientHistory,
    vitalSigns,
    vitalsTrends,
    clinicalNotes,
    historyLoading,
    vitalsLoading,
    notesLoading,
    refreshHistory,
    refreshVitals,
    refreshNotes,
    refreshAll,
  } = usePatientDetails({
    patientId: selectedPatientId,
    autoFetch: true,
  });

  // UI preferences hook
  const {
    preferences,
    toggleStats,
    toggleQueue,
    setQueueFilter,
  } = useDoctorPanelPreferences();

  // Local state
  const [selectedPatientName, setSelectedPatientName] = useState<string>("");
  const [currentVisitId, setCurrentVisitId] = useState<string | undefined>(undefined);
  const [labBookings, setLabBookings] = useState<any[]>([]);
  const [currentAdmission, setCurrentAdmission] = useState<any>(null);
  const [labsLoading, setLabsLoading] = useState(false);
  const [ipdLoading, setIpdLoading] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [updatingVisitId, setUpdatingVisitId] = useState<string | null>(null);

  // Mock queue data (you can replace this with actual queue API)
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>([]);

  // Fetch patient details and find visit when selected
  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientName(selectedPatientId);
      fetchLabBookings(selectedPatientId);
      fetchCurrentAdmission(selectedPatientId);

      // Find the current visit ID from today's schedule
      if (todaySchedule && todaySchedule.slots) {
        const currentSlot = todaySchedule.slots.find(
          slot => slot.patient_id === selectedPatientId &&
          (slot.status === "checked_in" || slot.status === "in_consultation")
        );
        setCurrentVisitId(currentSlot?.item_id);
      }
    } else {
      setCurrentVisitId(undefined);
    }
  }, [selectedPatientId, todaySchedule]);

  // Generate queue from schedule (include ALL patients, filtering done in EnhancedQueueBoard)
  useEffect(() => {
    if (todaySchedule && todaySchedule.slots) {
      const queue: QueuePatient[] = todaySchedule.slots.map((slot: any) => {
        // Determine visit type with emergency check
        const visitType = (slot.type === "emergency" || slot.visit_type === "emergency" || slot.is_emergency)
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

  const fetchPatientName = async (patientId: string) => {
    try {
      const patient = await patientsApi.getById(patientId);
      setSelectedPatientName(
        `${patient.first_name} ${patient.last_name || ""}`.trim()
      );
    } catch (error) {
      console.error("Failed to fetch patient name:", error);
    }
  };

  const fetchLabBookings = async (patientId: string) => {
    setLabsLoading(true);
    try {
      const result = await labBookingsApi.list({ patient_id: patientId });
      setLabBookings(result.items || []);
    } catch (error) {
      console.error("Failed to fetch lab bookings:", error);
    } finally {
      setLabsLoading(false);
    }
  };

  const fetchCurrentAdmission = async (patientId: string) => {
    setIpdLoading(true);
    try {
      const result = await admissionsApi.list({
        patient_id: patientId,
        status: "admitted",
      });
      setCurrentAdmission(result.items && result.items.length > 0 ? result.items[0] : null);
    } catch (error) {
      console.error("Failed to fetch admission:", error);
    } finally {
      setIpdLoading(false);
    }
  };

  const handleGetLabResults = async (bookingId: string) => {
    return await labBookingsApi.getResults(bookingId);
  };

  const handleClearPatient = () => {
    selectPatient(null);
    setSelectedPatientName("");
    setCurrentVisitId(undefined);
    setLabBookings([]);
    setCurrentAdmission(null);
  };

  const handleViewAdmissionDetails = (admissionId: string) => {
    // Navigate to admissions page with the admission ID using Next.js router
    router.push(`/admissions?tab=admissions&admission_id=${admissionId}`);
  };

  const handleDischargePlanning = (admissionId: string) => {
    // Navigate to admissions page and trigger discharge flow
    router.push(`/admissions?tab=admissions&admission_id=${admissionId}&action=discharge`);
  };

  const handleUpdateVisitStatus = async (
    visitId: string,
    newStatus: "in_consultation" | "completed"
  ) => {
    setUpdatingVisitId(visitId);
    try {
      await opdVisitsApi.updateStatus(visitId, newStatus);

      // Success notification
      const statusText = newStatus === "in_consultation" ? "Consultation started" : "Consultation completed";
      toast.success(statusText);

      // Refresh the schedule to get updated data
      await refreshSchedule();
    } catch (error: any) {
      console.error("Failed to update visit status:", error);
      toast.error(error?.response?.data?.detail || error?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingVisitId(null);
    }
  };

  // Show loading state
  if (panelLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
          <p className="mt-4 text-sm text-slate-600">Loading doctor panel...</p>
        </div>
      </div>
    );
  }

  // If no doctor found
  if (!currentDoctor) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Stethoscope className="mx-auto h-16 w-16 text-slate-300" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Doctor Profile Not Found
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Unable to find doctor profile for user ID: {userId || "unknown"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    if (!selectedPatientId) {
      return null;
    }

    switch (activeTab) {
      case "history":
        return (
          <PatientHistoryTimeline
            history={patientHistory}
            loading={historyLoading}
            onRefresh={refreshHistory}
          />
        );

      case "vitals":
        return (
          <VitalSignsPanel
            patientId={selectedPatientId}
            vitalSigns={vitalSigns}
            trends={vitalsTrends}
            loading={vitalsLoading}
            onRefresh={refreshVitals}
          />
        );

      case "labs":
        return (
          <LabResultsPanel
            patientId={selectedPatientId}
            labBookings={labBookings}
            loading={labsLoading}
            onRefresh={() => fetchLabBookings(selectedPatientId)}
            onGetResults={handleGetLabResults}
          />
        );

      case "notes":
        return (
          <QuickNotesPanel
            patientId={selectedPatientId}
            doctorId={currentDoctor?.id || ""}
            visitId={currentVisitId}
            notes={clinicalNotes}
            loading={notesLoading}
            onRefresh={refreshNotes}
          />
        );

      case "ipd":
        return (
          <IpdInfoPanel
            patientId={selectedPatientId}
            admission={currentAdmission}
            loading={ipdLoading}
            onViewDetails={handleViewAdmissionDetails}
            onDischargePlanning={handleDischargePlanning}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2 px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between py-1">
        {currentDoctor && (
          <p className="text-sm text-slate-600">
            <span className="font-semibold">Dr. {currentDoctor.name || "Doctor"}</span>
            {currentDoctor.specialization && (
              <span className="text-slate-400"> • {currentDoctor.specialization}</span>
            )}
          </p>
        )}

        <button
          onClick={refreshSchedule}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
          title="Refresh schedule"
        >
          <RefreshCw className="h-4 w-4" />
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
      <DoctorPanelVerticalLayout
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
        activeTab={activeTab}
        onSelectPatient={selectPatient}
        onClearPatient={handleClearPatient}
        onTabChange={setActiveTab}
        onUpdateVisitStatus={handleUpdateVisitStatus}
        updatingVisitId={updatingVisitId}
        onCreatePrescription={() => setShowPrescriptionModal(true)}
      >
        {renderTabContent()}
      </DoctorPanelVerticalLayout>

      {/* Prescription Modal */}
      {selectedPatientId && currentVisitId && (
        <PrescriptionFormModal
          isOpen={showPrescriptionModal}
          onClose={() => setShowPrescriptionModal(false)}
          visitId={currentVisitId}
          patientId={selectedPatientId}
          doctorId={currentDoctor?.id || ""}
          onSuccess={() => {
            setShowPrescriptionModal(false);
            toast.success("Prescription created successfully");
            refreshHistory();
          }}
        />
      )}
    </div>
  );
}
