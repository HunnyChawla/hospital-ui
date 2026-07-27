"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, RefreshCw, FileText } from "lucide-react";
import { useDoctorPanel } from "@/hooks/useDoctorPanel";
import { usePatientDetails } from "@/hooks/usePatientDetails";
import { useDoctorPanelPreferences } from "@/hooks/useDoctorPanelPreferences";
import { useDoctorLiveQueue } from "@/hooks/useDoctorLiveQueue";
import { DoctorStats } from "@/types";
import { DoctorPanelVerticalLayout } from "./dashboard/DoctorPanelVerticalLayout";
import { PatientHistoryTimeline } from "./patient-details/PatientHistoryTimeline";
import { VitalSignsPanel } from "./patient-details/VitalSignsPanel";
import { LabResultsPanel } from "./patient-details/LabResultsPanel";
import { QuickNotesPanel } from "./patient-details/QuickNotesPanel";
import { IpdInfoPanel } from "./patient-details/IpdInfoPanel";
import { PrescriptionFormModal } from "./PrescriptionFormModal";
import { OpdSlipPrint } from "@/components/opd/OpdSlipPrint";
import { useAppSelector } from "@/redux/hooks";
import { labBookingsApi } from "@/services/labBookingsApi";
import { admissionsApi } from "@/services/admissionsApi";
import { patientsApi, formatPatientName } from "@/services/patientsApi";
import { opdVisitsApi, Visit } from "@/services/opdVisitsApi";
import { optometristVisitsApi } from "@/services/optometristVisitsApi";
import { prescriptionsApi } from "@/services/prescriptionsApi";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { getErrorMessage } from "@/utils/errorHandler";

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
  const [selectedPatientUhid, setSelectedPatientUhid] = useState<string>("");
  const [currentVisitId, setCurrentVisitId] = useState<string | undefined>(undefined);
  const [labBookings, setLabBookings] = useState<any[]>([]);
  const [currentAdmission, setCurrentAdmission] = useState<any>(null);
  const [labsLoading, setLabsLoading] = useState(false);
  const [ipdLoading, setIpdLoading] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [updatingVisitId, setUpdatingVisitId] = useState<string | null>(null);

  // Print state
  const [printVisitData, setPrintVisitData] = useState<{
    visit: Visit;
    patient: any;
    prescription?: {
      prescription_number: string;
      diagnosis: string | null;
      items: Array<{
        medicine_name: string;
        generic_name?: string | null;
        dosage: string | null;
        frequency: string | null;
        duration: string | null;
        instructions: string | null;
      }>;
      doctor_name: string;
    };
  } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Doctor live queue SSE hook
  const { queuePatients: doctorLiveQueue } = useDoctorLiveQueue({
    doctorId: currentDoctor?.id || null,
    autoConnect: !!currentDoctor?.id,
  });

  // Calculate live stats from SSE queue with fallback to todayStats
  const liveDoctorStats: DoctorStats | null = useMemo(() => {
    if (!doctorLiveQueue || doctorLiveQueue.length === 0) {
      return todayStats;
    }

    const stats: DoctorStats = {
      todayTotal: doctorLiveQueue.length,
      pendingOptometrist: 0,
      inProgressOptometrist: 0,
      pendingDoctor: 0,
      inProgressDoctor: 0,
      todayCompleted: 0,
      todayNoShow: 0,
      todayPending: 0,
      todayInProgress: 0,
    };

    doctorLiveQueue.forEach((patient) => {
      switch (patient.status) {
        case "awaiting_optometrist":
        case "checked_in":
        case "checked_in_opd":
        case "waiting":
        case "scheduled":
          stats.pendingOptometrist++;
          break;

        case "optometrist_assigned":
        case "optometrist_investigation_in_progress":
        case "dilation_in_progress":
          stats.inProgressOptometrist++;
          break;

        case "optometrist_investigation_completed":
        case "awaiting_doctor":
        case "doctor_assigned":
        case "dilation_completed":
          stats.pendingDoctor++;
          break;

        case "in_consultation":
        case "consultation_in_progress":
        case "start_consultation":
          stats.inProgressDoctor++;
          break;

        case "consultation_completed":
        case "completed":
          stats.todayCompleted++;
          break;

        case "no_show":
        case "cancelled":
          stats.todayNoShow = (stats.todayNoShow || 0) + 1;
          break;

        default:
          stats.pendingOptometrist++;
      }
    });

    stats.todayPending = stats.pendingDoctor + stats.pendingOptometrist;
    stats.todayInProgress = stats.inProgressDoctor + stats.inProgressOptometrist;

    return stats;
  }, [doctorLiveQueue, todayStats]);

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
        formatPatientName(patient)
      );
      setSelectedPatientUhid(patient.uhid);
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
    setSelectedPatientUhid("");
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
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingVisitId(null);
    }
  };

  const handlePickPatient = async (visitId: string) => {
    if (!currentDoctor?.id) return;
    setUpdatingVisitId(visitId);
    try {
      await optometristVisitsApi.pickDoctor(visitId, currentDoctor.id);
      toast.success("Patient called successfully");
      await refreshSchedule();
    } catch (error: any) {
      console.error("Failed to pick patient:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingVisitId(null);
    }
  };

  const handleUnpickPatient = async (visitId: string) => {
    setUpdatingVisitId(visitId);
    try {
      await optometristVisitsApi.unpickDoctor(visitId);
      toast.success("Patient returned to queue");
      await refreshSchedule();
    } catch (error: any) {
      console.error("Failed to unpick patient:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingVisitId(null);
    }
  };

  const handlePrintOpd = async () => {
    if (!currentVisitId || !selectedPatientId) {
      toast.error("No active visit to print");
      return;
    }

    try {
      // Fetch full visit details
      const visit = await opdVisitsApi.getById(currentVisitId);

      // Fetch patient details
      const patient = await patientsApi.getById(selectedPatientId);

      // Fetch finalized prescription for this visit (if exists)
      let prescription = undefined;
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const prescriptions = await prescriptionsApi.list({
          visit_id: currentVisitId,
          status: "finalized",
          page_size: 1,
          tenant_id: tenantId || undefined,
        });

        if (prescriptions.items.length > 0) {
          const rxData = prescriptions.items[0];
          prescription = {
            prescription_number: rxData.prescription_number,
            diagnosis: rxData.diagnosis,
            items: rxData.items.map(item => ({
              medicine_name: item.medicine_name,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.instructions,
            })),
            doctor_name: rxData.doctor_name,
          };
        }
      } catch (error) {
        // Continue without prescription if fetch fails
        console.warn("Failed to fetch prescription for OPD slip:", error);
      }

      // Set print data - this will trigger the useEffect to print
      setPrintVisitData({ visit, patient, prescription });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printVisitData ? `OPD_Slip_${printVisitData.visit.visit_number}` : "OPD_Slip",
  });

  // Trigger print when printVisitData is set
  useEffect(() => {
    if (printVisitData && printRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrint();
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printVisitData, handlePrint]);

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
        stats={liveDoctorStats}
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
        onClearPatient={handleClearPatient}
        onTabChange={setActiveTab}
        onUpdateVisitStatus={handleUpdateVisitStatus}
        onPickPatient={handlePickPatient}
        onUnpickPatient={handleUnpickPatient}
        updatingVisitId={updatingVisitId}
        onCreatePrescription={() => setShowPrescriptionModal(true)}
        onPrintOpd={handlePrintOpd}
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

      {/* Hidden printable OPD slip */}
      {printVisitData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printRef} className="print-content">
            <OpdSlipPrint
              patient={{
                id: printVisitData.patient.id,
                name: formatPatientName(printVisitData.patient),
                mobile: printVisitData.patient.mobile,
                healthId: printVisitData.patient.abha_id || "",
                age: printVisitData.patient.date_of_birth
                  ? Math.floor((new Date().getTime() - new Date(printVisitData.patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))
                  : 0,
                gender: printVisitData.patient.gender as "Male" | "Female" | "Other",
                outstanding: 0,
                doctor: currentDoctor?.name || "",
                lastVisit: printVisitData.visit.created_at || "",
                status: "Active" as const,
              }}
              doctor={currentDoctor?.name || ""}
              symptoms={printVisitData.visit.chief_complaint || ""}
              opdNumber={printVisitData.visit.visit_number}
              tokenNumber={printVisitData.visit.token_number || 0}
              prescription={printVisitData.prescription}
            />
          </div>
        </div>
      )}
    </div>
  );
}
