"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectPatient, fetchPatients, getPatientById } from "@/redux/patientsSlice";
import { PatientFormModal } from "./PatientFormModal";
import { AdmissionTable } from "@/components/ipd/AdmissionTable";
import { AdmissionFormModal } from "@/components/ipd/AdmissionFormModal";
import { LabBookingFormModal } from "@/components/lab-bookings/LabBookingFormModal";
import { OpdFormModal } from "@/components/opd/OpdFormModal";
import { AppointmentFormModal } from "@/components/opd/AppointmentFormModal";
import { opdVisitsApi, Visit, CreateVisitRequest } from "@/services/opdVisitsApi";
import { labBookingsApi, LabBooking, LabBookingTest } from "@/services/labBookingsApi";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { appointmentsApi, Appointment } from "@/services/appointmentsApi";
import { patientsApi, formatPatientName } from "@/services/patientsApi";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { OpdSlipPrint } from "@/components/opd/OpdSlipPrint";
import { Modal } from "@/components/common/Modal";
import { CancellationRefundAcknowledgmentModal } from "@/components/common/CancellationRefundAcknowledgmentModal";
import { PreviousLabReportModal } from "@/components/optometrist/prescriptions/PreviousLabReportModal";
import { PrescribedLabBookingModal } from "@/components/lab-bookings/PrescribedLabBookingModal";
import { HistoryPrescriptionModal } from "@/components/optometrist/prescriptions/HistoryPrescriptionModal";
import { currency, formatDate } from "@/utils/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTenantIdForApi } from "@/utils/auth";
import { paymentsApi } from "@/services/paymentsApi";
import { PlannedSurgery } from "@/types";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { PlannedSurgeryFormModal } from "@/components/planned-surgeries/PlannedSurgeryFormModal";
import { SurgeryAdviceDrawer } from "@/components/counsellor/SurgeryAdviceDrawer";
import {
  ArrowLeft,
  CreditCard,
  BedDouble,
  Stethoscope,
  TestTube,
  Calendar,
  PlusCircle,
  Plus,
  Beaker,
  ChevronLeft,
  ChevronRight,
  Printer,
  Eye,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Play,
  CheckCircle,
  Edit2,
  MapPin,
  FileText,
  Sparkles,
  Loader2,
  Pencil,
  Syringe,
} from "lucide-react";

interface PatientDetailViewProps {
  patientId: string;
  onClose: () => void;
}

export function PatientDetailView({ patientId, onClose }: PatientDetailViewProps) {
  const dispatch = useAppDispatch();
  const patientsList = useAppSelector((s) => s.patients.list);
  const selectedPatient = useAppSelector((s) => s.patients.selected);
  const patient = patientsList.find((p) => p.id === patientId) || (selectedPatient?.id === patientId ? selectedPatient : null);
  const doctors = useAppSelector((s) => s.doctors.list);

  const [activeTab, setActiveTab] = useState<
    "opd" | "appointment" | "admit" | "billing" | "tests" | "surgeries"
  >("appointment");

  // Surgeries tab state
  const [surgeries, setSurgeries] = useState<PlannedSurgery[]>([]);
  const [surgeriesLoading, setSurgeriesLoading] = useState(false);
  const [surgeriesPage, setSurgeriesPage] = useState(1);
  const [surgeriesTotalPages, setSurgeriesTotalPages] = useState(1);
  const [surgeriesPageSize] = useState(5);
  const [showPlannedSurgeryModal, setShowPlannedSurgeryModal] = useState(false);
  const [selectedPlannedSurgeryForModal, setSelectedPlannedSurgeryForModal] = useState<PlannedSurgery | null>(null);
  const [drawerSurgery, setDrawerSurgery] = useState<PlannedSurgery | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchPatientSurgeries = useCallback(async () => {
    if (!patientId) return;
    setSurgeriesLoading(true);
    try {
      const res = await plannedSurgeriesApi.list({
        patient_id: patientId,
        page: surgeriesPage,
        page_size: surgeriesPageSize,
        sort_by: "advised_date",
      });
      setSurgeries(res.items);
      setSurgeriesTotalPages(res.total_pages);
    } catch (error) {
      console.error("Failed to fetch patient planned surgeries:", error);
      setSurgeries([]);
    } finally {
      setSurgeriesLoading(false);
    }
  }, [patientId, surgeriesPage, surgeriesPageSize]);

  useEffect(() => {
    if (activeTab === "surgeries") {
      fetchPatientSurgeries();
    }
  }, [activeTab, fetchPatientSurgeries]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [showLabBookingModal, setShowLabBookingModal] = useState(false);
  const [labBookings, setLabBookings] = useState<LabBooking[]>([]);
  const [labBookingsLoading, setLabBookingsLoading] = useState(false);
  const [labBookingsPage, setLabBookingsPage] = useState(1);
  const [labBookingsTotalPages, setLabBookingsTotalPages] = useState(1);
  const [labBookingsPageSize] = useState(5);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsTotalPages, setAppointmentsTotalPages] = useState(1);
  const [appointmentsPageSize] = useState(5);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [opdTabVisits, setOpdTabVisits] = useState<Visit[]>([]);
  const [opdTabVisitsLoading, setOpdTabVisitsLoading] = useState(false);
  const [opdTabVisitsPage, setOpdTabVisitsPage] = useState(1);
  const [opdTabVisitsTotalPages, setOpdTabVisitsTotalPages] = useState(1);
  const [opdTabVisitsPageSize] = useState(5);
  const [showOpdModal, setShowOpdModal] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesTotalPages, setInvoicesTotalPages] = useState(1);
  const [invoicesPageSize] = useState(5);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<"paid" | "pending">("pending");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string; tests?: LabBookingTest[]; bookingNumber?: string } | null>(null);
  const [printOpdSlipData, setPrintOpdSlipData] = useState<{ visit: Visit; patient: any } | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [shouldPrintOpd, setShouldPrintOpd] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const printOpdRef = useRef<HTMLDivElement>(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [pendingCancellation, setPendingCancellation] = useState<{ visitId: string; visitNumber?: string; paymentAmount?: number } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [selectedReportBooking, setSelectedReportBooking] = useState<LabBooking | null>(null);
  const [showPrescribedBookingModal, setShowPrescribedBookingModal] = useState(false);
  const [selectedPrescribedVisitId, setSelectedPrescribedVisitId] = useState<string>("");
  const [patientPrescribedVisits, setPatientPrescribedVisits] = useState<any[]>([]);
  const [showOnlyPendingPrescribed, setShowOnlyPendingPrescribed] = useState(true);
  const [loadingPrescribedVisits, setLoadingPrescribedVisits] = useState(false);

  // State for the read-only prescription view modal
  const [prescriptionModalVisitId, setPrescriptionModalVisitId] = useState<string | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const handlePrintOpd = useReactToPrint({
    contentRef: printOpdRef,
    documentTitle: printOpdSlipData ? `OPD_Slip_${printOpdSlipData.visit.visit_number}` : "OPD_Slip",
  });

  useEffect(() => {
    if (patientId) {
      // Check if patient is in store, if not fetch it
      const patientInStore = patientsList.find((p) => p.id === patientId);
      if (!patientInStore) {
        dispatch(getPatientById({ patientId }));
      } else {
        dispatch(selectPatient(patientId));
      }
    }
  }, [patientId, dispatch, patientsList]);

  // Fetch lab bookings for the patient
  const fetchLabBookings = useCallback(async () => {
    if (!patientId) return;

    setLabBookingsLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await labBookingsApi.list({
        page: labBookingsPage,
        page_size: labBookingsPageSize,
        patient_id: patientId,
        tenant_id: getTenantIdForApi(tenantId),
      });
      setLabBookings(response.items);
      setLabBookingsTotalPages(response.total_pages);
    } catch (error) {
      console.error("Failed to fetch lab bookings:", error);
      setLabBookings([]);
    } finally {
      setLabBookingsLoading(false);
    }
  }, [patientId, labBookingsPage, labBookingsPageSize]);

  // Fetch prescribed visits for the patient
  const fetchPatientPrescribedVisits = useCallback(async () => {
    if (!patientId) return;
    setLoadingPrescribedVisits(true);
    try {
      const today = new Date();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(today.getDate() - 90);

      const start_date = ninetyDaysAgo.toISOString().split("T")[0];
      const end_date = today.toISOString().split("T")[0];

      const res = await labBookingsApi.getPatientsWithPendingTests({
        start_date,
        end_date,
      });
      const patientVisits = (res.items || []).filter((item) => item.patient_id === patientId);
      setPatientPrescribedVisits(patientVisits);
    } catch (error) {
      console.error("Failed to fetch patient prescribed visits:", error);
    } finally {
      setLoadingPrescribedVisits(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (activeTab === "tests") {
      fetchLabBookings();
      fetchPatientPrescribedVisits();
    }
  }, [activeTab, fetchLabBookings, fetchPatientPrescribedVisits]);

  const renderPrescribedVisitsSection = () => {
    const pendingVisits = patientPrescribedVisits.filter((v) => (v.pending_test_count || 0) > 0);
    const visitsToRender = showOnlyPendingPrescribed ? pendingVisits : patientPrescribedVisits;

    if (patientPrescribedVisits.length === 0) return null;

    if (showOnlyPendingPrescribed && pendingVisits.length === 0) {
      return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                All Prescribed Tests Booked
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ✓ 0 Pending
                </span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                All doctor-prescribed lab tests for this patient have been booked. View status & reports below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOnlyPendingPrescribed(false)}
            className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-emerald-700 text-xs font-bold hover:bg-emerald-50 transition cursor-pointer shrink-0 shadow-2xs"
          >
            Show All Prescribed Tests
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-amber-600 animate-pulse" />
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                Prescribed Lab Tests ({visitsToRender.reduce((acc, v) => acc + (v.pending_test_count || 0), 0)} Pending)
              </h4>
              <p className="text-xs text-slate-500">
                Doctor-prescribed lab tests for this patient
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOnlyPendingPrescribed(!showOnlyPendingPrescribed)}
            className="px-3 py-1 rounded-xl border border-amber-300 bg-white text-slate-700 text-xs font-bold hover:bg-amber-100/50 transition cursor-pointer"
          >
            {showOnlyPendingPrescribed ? "Show All Prescribed Tests" : "Pending Only"}
          </button>
        </div>

        <div className="space-y-2">
          {visitsToRender.map((visitItem) => {
            const isFullyBooked = (visitItem.pending_test_count || 0) === 0;

            return (
              <div
                key={visitItem.visit_id}
                className="bg-white rounded-xl p-3 border border-amber-200/80 flex items-center justify-between text-left hover:border-amber-300 transition shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Visit #{visitItem.visit_number}</span>
                    <span className="text-xs text-slate-500 font-medium">({visitItem.visit_date})</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Prescribed by: <span className="font-semibold">{visitItem.doctor_name || "OPD Doctor"}</span>
                  </p>
                  {isFullyBooked ? (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ All Booked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      {visitItem.pending_test_count} Pending Test{visitItem.pending_test_count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPrescribedVisitId(visitItem.visit_id);
                    setShowPrescribedBookingModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-bold shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Beaker className="h-4 w-4" /> {isFullyBooked ? "View or Re-book Tests" : "Book Prescribed Tests"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Fetch appointments for the patient (for appointment tab)
  const fetchAppointments = useCallback(async () => {
    if (!patientId) return;

    setAppointmentsLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await appointmentsApi.getByPatient(patientId, {
        page: appointmentsPage,
        page_size: appointmentsPageSize,
        tenantId: getTenantIdForApi(tenantId),
      });
      setAppointments(response.items);
      setAppointmentsTotalPages(response.total_pages);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [patientId, appointmentsPage, appointmentsPageSize]);

  useEffect(() => {
    if (activeTab === "appointment") {
      fetchAppointments();
    }
  }, [activeTab, fetchAppointments]);

  // Reset to first page when switching to appointment tab
  useEffect(() => {
    if (activeTab === "appointment") {
      setAppointmentsPage(1);
    }
  }, [activeTab]);

  // Listen for appointment and OPD visit creation to refresh appointments list
  useEffect(() => {
    const handleAppointmentCreated = () => {
      if (activeTab === "appointment") {
        fetchAppointments();
      }
    };
    const handleOpdVisitCreated = () => {
      if (activeTab === "appointment") {
        fetchAppointments();
      }
    };

    window.addEventListener("appointment:created", handleAppointmentCreated);
    window.addEventListener("opd:visit:created", handleOpdVisitCreated);
    return () => {
      window.removeEventListener("appointment:created", handleAppointmentCreated);
      window.removeEventListener("opd:visit:created", handleOpdVisitCreated);
    };
  }, [activeTab, fetchAppointments]);

  // Fetch OPD visits for the patient (for OPD tab)
  const fetchOpdTabVisits = useCallback(async () => {
    if (!patientId) return;

    setOpdTabVisitsLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await opdVisitsApi.list({
        page: opdTabVisitsPage,
        page_size: opdTabVisitsPageSize,
        sort_by: "created_at",
        sort_order: "desc",
        patient_id: patientId,
        tenant_id: getTenantIdForApi(tenantId),
      });
      setOpdTabVisits(response.items);
      setOpdTabVisitsTotalPages(response.total_pages);
    } catch (error) {
      console.error("Failed to fetch OPD visits:", error);
      setOpdTabVisits([]);
    } finally {
      setOpdTabVisitsLoading(false);
    }
  }, [patientId, opdTabVisitsPage, opdTabVisitsPageSize]);

  useEffect(() => {
    if (activeTab === "opd") {
      fetchOpdTabVisits();
    }
  }, [activeTab, fetchOpdTabVisits]);

  // Reset to first page when switching to OPD tab
  useEffect(() => {
    if (activeTab === "opd") {
      setOpdTabVisitsPage(1);
    }
  }, [activeTab]);

  // Listen for OPD visit creation to refresh visits list (OPD tab)
  useEffect(() => {
    const handleOpdVisitCreated = () => {
      if (activeTab === "opd") {
        fetchOpdTabVisits();
      }
    };

    window.addEventListener("opd:visit:created", handleOpdVisitCreated);
    return () => {
      window.removeEventListener("opd:visit:created", handleOpdVisitCreated);
    };
  }, [activeTab, fetchOpdTabVisits]);

  const getStatusColor = (status: string) => {
    switch (status) {
      // Completion statuses - green
      case "completed":
      case "consultation_completed":
        return "bg-emerald-50 text-emerald-700";
      // Cancelled - red
      case "cancelled":
        return "bg-rose-50 text-rose-700";
      // No show - gray
      case "no_show":
        return "bg-slate-50 text-slate-700";
      // Check-in statuses - sky blue
      case "checked_in":
      case "checked_in_opd":
        return "bg-sky-50 text-sky-700";
      // Optometrist statuses - purple
      case "awaiting_optometrist":
      case "optometrist_assigned":
      case "optometrist_investigation_in_progress":
      case "optometrist_investigation_completed":
        return "bg-purple-50 text-purple-700";
      // Doctor waiting/assigned - amber/orange
      case "awaiting_doctor":
      case "doctor_assigned":
        return "bg-amber-50 text-amber-700";
      // In consultation - orange
      case "in_consultation":
      case "consultation_in_progress":
        return "bg-orange-50 text-orange-700";
      // Dilation statuses - indigo
      case "dilation_in_progress":
      case "dilation_completed":
        return "bg-indigo-50 text-indigo-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      // Completion statuses
      case "completed":
      case "consultation_completed":
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      // Cancelled/no-show
      case "cancelled":
        return <XCircle className="h-3 w-3 text-rose-500" />;
      case "no_show":
        return <XCircle className="h-3 w-3 text-slate-500" />;
      // Check-in statuses
      case "checked_in":
      case "checked_in_opd":
        return <CheckCircle2 className="h-3 w-3 text-sky-500" />;
      // Optometrist statuses
      case "awaiting_optometrist":
        return <Clock className="h-3 w-3 text-purple-500" />;
      case "optometrist_assigned":
        return <Eye className="h-3 w-3 text-purple-500" />;
      case "optometrist_investigation_in_progress":
        return <Play className="h-3 w-3 text-purple-500" />;
      case "optometrist_investigation_completed":
        return <CheckCircle className="h-3 w-3 text-purple-500" />;
      // Doctor statuses
      case "awaiting_doctor":
        return <Clock className="h-3 w-3 text-amber-500" />;
      case "doctor_assigned":
        return <Stethoscope className="h-3 w-3 text-amber-500" />;
      case "in_consultation":
      case "consultation_in_progress":
        return <Play className="h-3 w-3 text-orange-500" />;
      // Dilation statuses
      case "dilation_in_progress":
        return <Clock className="h-3 w-3 text-indigo-500" />;
      case "dilation_completed":
        return <CheckCircle className="h-3 w-3 text-indigo-500" />;
      default:
        return <Clock className="h-3 w-3 text-amber-500" />;
    }
  };

  const getAppointmentStatusIcon = (status: string) => {
    switch (status) {
      // Completion statuses
      case "completed":
      case "consultation_completed":
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      // Cancelled/no-show
      case "cancelled":
        return <XCircle className="h-3 w-3 text-rose-500" />;
      case "no_show":
        return <XCircle className="h-3 w-3 text-slate-500" />;
      // Check-in statuses
      case "checked_in":
      case "checked_in_opd":
        return <CheckCircle2 className="h-3 w-3 text-sky-500" />;
      // Optometrist statuses
      case "awaiting_optometrist":
        return <Clock className="h-3 w-3 text-purple-500" />;
      case "optometrist_assigned":
        return <Eye className="h-3 w-3 text-purple-500" />;
      case "optometrist_investigation_in_progress":
        return <Play className="h-3 w-3 text-purple-500" />;
      case "optometrist_investigation_completed":
        return <CheckCircle className="h-3 w-3 text-purple-500" />;
      // Doctor statuses
      case "awaiting_doctor":
        return <Clock className="h-3 w-3 text-amber-500" />;
      case "doctor_assigned":
        return <Stethoscope className="h-3 w-3 text-amber-500" />;
      case "in_consultation":
      case "consultation_in_progress":
        return <Play className="h-3 w-3 text-orange-500" />;
      // Dilation statuses
      case "dilation_in_progress":
        return <Clock className="h-3 w-3 text-indigo-500" />;
      case "dilation_completed":
        return <CheckCircle className="h-3 w-3 text-indigo-500" />;
      default:
        return <Clock className="h-3 w-3 text-amber-500" />;
    }
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      // Completion statuses - green
      case "completed":
      case "consultation_completed":
        return "bg-emerald-50 text-emerald-700";
      // Cancelled - red
      case "cancelled":
        return "bg-rose-50 text-rose-700";
      // No show - gray
      case "no_show":
        return "bg-slate-50 text-slate-700";
      // Check-in statuses - sky blue
      case "checked_in":
      case "checked_in_opd":
        return "bg-sky-50 text-sky-700";
      // Optometrist statuses - purple
      case "awaiting_optometrist":
      case "optometrist_assigned":
      case "optometrist_investigation_in_progress":
      case "optometrist_investigation_completed":
        return "bg-purple-50 text-purple-700";
      // Doctor waiting/assigned - amber/orange
      case "awaiting_doctor":
      case "doctor_assigned":
        return "bg-amber-50 text-amber-700";
      // In consultation - orange
      case "in_consultation":
      case "consultation_in_progress":
        return "bg-orange-50 text-orange-700";
      // Dilation statuses - indigo
      case "dilation_in_progress":
      case "dilation_completed":
        return "bg-indigo-50 text-indigo-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  };

  // Reset to first page when switching to tests tab
  useEffect(() => {
    if (activeTab === "tests") {
      setLabBookingsPage(1);
    }
  }, [activeTab]);

  // Listen for lab booking creation to refresh bookings list
  useEffect(() => {
    const handleLabBookingCreated = () => {
      if (activeTab === "tests") {
        fetchLabBookings();
      }
    };

    window.addEventListener("lab:booking:created", handleLabBookingCreated);
    return () => {
      window.removeEventListener("lab:booking:created", handleLabBookingCreated);
    };
  }, [activeTab, fetchLabBookings]);

  // Fetch invoices for the patient
  const fetchInvoices = useCallback(async () => {
    if (!patientId) return;

    setInvoicesLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await invoicesApi.list({
        page: invoicesPage,
        page_size: invoicesPageSize,
        patient_id: patientId,
        status: invoiceStatusFilter,
        tenant_id: getTenantIdForApi(tenantId),
      });

      setInvoices(response.items);
      setInvoicesTotalPages(response.total_pages);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, [patientId, invoicesPage, invoicesPageSize, invoiceStatusFilter]);

  useEffect(() => {
    if (activeTab === "billing") {
      fetchInvoices();
    }
  }, [activeTab, fetchInvoices]);

  // Reset to first page when switching to billing tab or changing status filter
  useEffect(() => {
    if (activeTab === "billing") {
      setInvoicesPage(1);
    }
  }, [activeTab, invoiceStatusFilter]);

  // Handle print invoice (for lab bookings)
  const handlePrintInvoiceFromBooking = async (invoiceId: string, booking: LabBooking) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const invoice = await invoicesApi.getById(invoiceId, getTenantIdForApi(tenantId));
      setPrintInvoiceData({
        invoice,
        patientName: patient?.name || "Unknown",
        patientMobile: patient?.mobile,
        tests: booking.tests,
        bookingNumber: booking.booking_number
      });
      setShouldPrint(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoice");
    }
  };

  // Handle print invoice (for regular invoices)
  const handlePrintInvoice = async (invoice: Invoice) => {
    try {
      setPrintInvoiceData({
        invoice,
        patientName: patient?.name || "Unknown",
        patientMobile: patient?.mobile
      });
      setShouldPrint(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare invoice for printing");
    }
  };

  // Handle invoice click to show details
  const handleInvoiceClick = async (invoiceId: string) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const invoice = await invoicesApi.getById(invoiceId, getTenantIdForApi(tenantId));
      setSelectedInvoice(invoice);
      setShowInvoiceDetail(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoice details");
    }
  };

  // Trigger print when printInvoiceData is set and shouldPrint is true
  useEffect(() => {
    if (printInvoiceData && shouldPrint && printRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        handlePrint();
        setShouldPrint(false); // Reset flag after printing
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printInvoiceData, shouldPrint, handlePrint]);

  // Trigger print when printOpdSlipData is set and shouldPrintOpd is true
  useEffect(() => {
    if (printOpdSlipData && shouldPrintOpd && printOpdRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        handlePrintOpd();
        setShouldPrintOpd(false); // Reset flag after printing
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printOpdSlipData, shouldPrintOpd, handlePrintOpd]);

  // Handle print OPD slip
  const handlePrintOpdSlip = async (visitId: string) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      // Fetch full visit details
      const visit = await opdVisitsApi.getById(visitId, getTenantIdForApi(tenantId));

      // Fetch patient details
      const patientData = await patientsApi.getById(visit.patient_id, getTenantIdForApi(tenantId));

      // Set print data - this will trigger the useEffect to print
      setPrintOpdSlipData({
        visit,
        patient: {
          id: patientData.id,
          name: formatPatientName(patientData),
          mobile: patientData.mobile,
          healthId: patientData.abha_id || "",
          age: patientData.date_of_birth
            ? Math.floor((new Date().getTime() - new Date(patientData.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))
            : 0,
          gender: patientData.gender,
          outstanding: 0,
        }
      });
      setShouldPrintOpd(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch OPD visit details");
    }
  };

  // Handle print invoice for OPD visit
  const handlePrintInvoiceFromOpd = async (invoiceId: string) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const invoice = await invoicesApi.getById(invoiceId, getTenantIdForApi(tenantId));
      setPrintInvoiceData({
        invoice,
        patientName: patient?.name || "Unknown",
        patientMobile: patient?.mobile
      });
      setShouldPrint(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoice");
    }
  };

  // Handle update OPD visit status
  const handleUpdateOpdStatus = async (visitId: string, newStatus: "checked_in" | "in_consultation" | "completed" | "cancelled") => {
    // If cancelling, check if payment exists and show acknowledgment modal
    if (newStatus === "cancelled") {
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const apiTenantId = getTenantIdForApi(tenantId);

        // Fetch visit details to check for payment
        const visit = await opdVisitsApi.getById(visitId, apiTenantId);

        if (visit.payment_id) {
          // Fetch payment details to get amount
          let paymentAmount: number | undefined;
          try {
            const payment = await paymentsApi.getById(visit.payment_id, apiTenantId);
            paymentAmount = payment.amount;
          } catch (error) {
            console.error("Failed to fetch payment details:", error);
          }

          // Show acknowledgment modal
          setPendingCancellation({
            visitId,
            visitNumber: visit.visit_number,
            paymentAmount,
          });
          setShowCancellationModal(true);
          return;
        }
      } catch (error: any) {
        const errorMessage = getErrorMessage(error);
        toast.error(errorMessage || "Failed to fetch visit details");
        return;
      }
    }

    // Proceed with status update (non-cancellation or cancellation without payment)
    await performOpdStatusUpdate(visitId, newStatus);
  };

  const performOpdStatusUpdate = async (visitId: string, newStatus: "checked_in" | "in_consultation" | "completed" | "cancelled") => {
    try {
      setCancelling(newStatus === "cancelled");
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await opdVisitsApi.updateStatus(visitId, newStatus, getTenantIdForApi(tenantId));
      toast.success(`Visit status updated to ${newStatus.replace("_", " ")}`);

      // Refresh visits list
      if (activeTab === "opd") {
        fetchOpdTabVisits();
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to update visit status");
    } finally {
      setCancelling(false);
      setShowCancellationModal(false);
      setPendingCancellation(null);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!pendingCancellation) return;
    await performOpdStatusUpdate(pendingCancellation.visitId, "cancelled");
  };

  // Handle create OPD from appointment
  const handleCreateOpdFromAppointment = async (appointment: Appointment) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const visitRequest: CreateVisitRequest = {
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        visit_type: "appointment",
        appointment_id: appointment.id,
        chief_complaint: appointment.notes || null,
        notes: `Created from appointment #${appointment.token_number}`,
        payment_method: "cash", // Default payment method
        payment_reference: null,
        consultation_fee: null,
      };

      await opdVisitsApi.create(visitRequest, getTenantIdForApi(tenantId));
      toast.success(`OPD visit created from appointment!`);

      // Refresh appointments list
      if (activeTab === "appointment") {
        fetchAppointments();
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to create OPD visit");
    }
  };

  // Listen for patient updates to refresh data
  useEffect(() => {
    const handlePatientUpdated = () => {
      if (patientId) {
        dispatch(getPatientById({ patientId }));
        dispatch(fetchPatients({}));
      }
    };

    window.addEventListener("patient:created", handlePatientUpdated);
    return () => {
      window.removeEventListener("patient:created", handlePatientUpdated);
    };
  }, [patientId, dispatch]);

  if (!patient) {
    return (
      <div className="card p-6 text-center">
        <p className="text-slate-500">Patient not found</p>
        <button
          onClick={onClose}
          className="mt-4 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Go back
        </button>
      </div>
    );
  }



  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/20 backdrop-blur-sm scrollbar-hide">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-6xl rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex flex-1 items-center justify-between ml-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{patient.name}</h2>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>{patient.age} years</span>
                  <span>•</span>
                  <span>{patient.gender}</span>
                  <span>•</span>
                  <span>{patient.mobile}</span>
                  <span>•</span>
                  <span className="capitalize">{patient.status}</span>
                  {patient.category && (
                    <>
                      <span>•</span>
                      <span className="bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-medium border border-sky-200 uppercase text-[10px] tracking-wider">
                        {patient.category}
                      </span>
                    </>
                  )}
                </div>

                {(patient.address || patient.city || patient.state || patient.pincode) && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span className="truncate max-w-[500px]" title={[patient.address, patient.city, patient.state, patient.pincode].filter(Boolean).join(", ")}>
                      {[patient.address, patient.city, patient.state, patient.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="group relative flex items-center justify-center overflow-hidden rounded-xl bg-sky-50 p-2 text-sm font-semibold text-sky-700 transition-all duration-300 hover:bg-sky-100"
                style={{ width: "2rem" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.width = "auto";
                  e.currentTarget.style.paddingLeft = "0.75rem";
                  e.currentTarget.style.paddingRight = "0.75rem";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.width = "2rem";
                  e.currentTarget.style.paddingLeft = "0.5rem";
                  e.currentTarget.style.paddingRight = "0.5rem";
                }}
                title="Edit Patient"
              >
                <Edit2 className="h-4 w-4 shrink-0" />
                <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Edit Patient</span>
              </button>
            </div>
          </div>

          <div className="h-[calc(100vh-200px)] min-h-[600px] overflow-y-auto p-6 scrollbar-hide">
            {/* Action Tabs */}
            <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
              {[
                { id: "appointment", label: "Appointment", icon: Calendar },
                { id: "opd", label: "OPD Slip", icon: Stethoscope },
                { id: "admit", label: "Admit/Discharge", icon: BedDouble },
                { id: "billing", label: "Billing", icon: CreditCard },
                { id: "tests", label: "Tests", icon: TestTube },
                { id: "surgeries", label: "Surgeries", icon: Sparkles },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id
                    ? "border-sky-500 text-sky-700"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === "appointment" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Appointments</p>
                      <p className="text-xs text-slate-500">View appointments for this patient</p>
                    </div>
                    <button
                      onClick={() => setShowAppointmentModal(true)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                    >
                      <div className="relative flex items-center justify-center">
                        <Calendar className="h-4 w-4" />
                        <PlusCircle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 bg-sky-500 rounded-full" />
                      </div>
                      Create Appointment
                    </button>
                  </div>

                  {appointmentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-slate-500">Loading appointments...</div>
                    </div>
                  ) : appointments.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                      <p className="text-sm text-slate-500">No appointments found</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {appointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            className="relative rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold">
                                  #{appointment.token_number}
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-slate-900">
                                    {appointment.patient_name || `Patient ${appointment.patient_id.slice(0, 8)}...`}
                                  </p>
                                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                    {appointment.patient_mobile && (
                                      <span>{appointment.patient_mobile}</span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {formatDate(appointment.appointment_date)}
                                    </span>
                                    {(() => {
                                      const doctor = doctors.find((d) => d.id === appointment.doctor_id);
                                      if (doctor) {
                                        return (
                                          <span className="flex items-center gap-1 text-sky-600">
                                            <Stethoscope className="h-3 w-3" />
                                            {doctor.name || `Dr. ${doctor.specialization}`}
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                    {appointment.visit_id && (
                                      <span className="text-emerald-600">Visit Created</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="absolute left-1/2 -translate-x-1/2">
                                <span className={`pill flex items-center gap-1 px-2 py-0.5 text-xs font-normal ${getAppointmentStatusColor(appointment.status)}`}>
                                  {getAppointmentStatusIcon(appointment.status)}
                                  <span className="capitalize">{appointment.status.replace("_", " ")}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {!appointment.visit_id && appointment.status !== "cancelled" && appointment.status !== "no_show" && (
                                  <button
                                    onClick={() => handleCreateOpdFromAppointment(appointment)}
                                    className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                                    style={{ width: "2rem" }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.width = "auto";
                                      e.currentTarget.style.paddingLeft = "0.75rem";
                                      e.currentTarget.style.paddingRight = "0.75rem";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.width = "2rem";
                                      e.currentTarget.style.paddingLeft = "0.5rem";
                                      e.currentTarget.style.paddingRight = "0.5rem";
                                    }}
                                    title="Create OPD"
                                  >
                                    <Plus className="h-4 w-4 shrink-0" />
                                    <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Create OPD</span>
                                  </button>
                                )}
                                {appointment.visit_id && (
                                  <button
                                    onClick={() => setPrescriptionModalVisitId(appointment.visit_id!)}
                                    className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-violet-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-violet-600"
                                    style={{ width: "2rem" }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.width = "auto";
                                      e.currentTarget.style.paddingLeft = "0.75rem";
                                      e.currentTarget.style.paddingRight = "0.75rem";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.width = "2rem";
                                      e.currentTarget.style.paddingLeft = "0.5rem";
                                      e.currentTarget.style.paddingRight = "0.5rem";
                                    }}
                                    title="View Prescription"
                                  >
                                    <FileText className="h-4 w-4 shrink-0" />
                                    <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Prescription</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            {appointment.notes && (
                              <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                                {appointment.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {appointmentsTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                          <div className="text-sm text-slate-500">
                            Page {appointmentsPage} of {appointmentsTotalPages}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setAppointmentsPage((p) => Math.max(1, p - 1))}
                              disabled={appointmentsPage === 1}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </button>
                            <button
                              onClick={() => setAppointmentsPage((p) => Math.min(appointmentsTotalPages, p + 1))}
                              disabled={appointmentsPage === appointmentsTotalPages}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "opd" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">OPD Visits</p>
                      <p className="text-xs text-slate-500">View OPD visits for this patient</p>
                    </div>
                    <button
                      onClick={() => setShowOpdModal(true)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                    >
                      <div className="relative flex items-center justify-center">
                        <Stethoscope className="h-4 w-4" />
                        <PlusCircle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 bg-sky-500 rounded-full" />
                      </div>
                      Create OPD
                    </button>
                  </div>

                  {opdTabVisitsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-slate-500">Loading visits...</div>
                    </div>
                  ) : opdTabVisits.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                      <p className="text-sm text-slate-500">No OPD visits found</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {opdTabVisits.map((visit) => (
                          <div
                            key={visit.id}
                            className="relative rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {visit.token_number && (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold">
                                    #{visit.token_number}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {visit.visit_number}
                                  </p>
                                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                    <span>{formatDate(visit.created_at)}</span>
                                    {visit.checked_in_at && (
                                      <>
                                        <span>•</span>
                                        <span>Checked in: {formatDate(visit.checked_in_at)}</span>
                                      </>
                                    )}
                                    <span className="pill px-2 py-0.5 text-xs font-normal capitalize">
                                      {visit.visit_type.replace("_", " ")}
                                    </span>
                                  </div>
                                  {(() => {
                                    const doctor = doctors.find((d) => d.id === visit.doctor_id);
                                    if (doctor) {
                                      return (
                                        <div className="mt-1 flex items-center gap-1 text-xs text-sky-600">
                                          <Stethoscope className="h-3 w-3" />
                                          {doctor.name || `Dr. ${doctor.specialization}`}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {visit.chief_complaint && (
                                    <p className="mt-1 text-xs text-slate-700">{visit.chief_complaint}</p>
                                  )}
                                  {visit.notes && (
                                    <p className="mt-1 text-xs text-slate-500">{visit.notes}</p>
                                  )}
                                </div>
                              </div>
                              <div className="absolute left-1/2 -translate-x-1/2">
                                <span
                                  className={`pill flex items-center gap-1 px-2 py-0.5 text-xs font-normal ${getStatusColor(visit.status)}`}
                                >
                                  {getStatusIcon(visit.status)}
                                  <span className="capitalize">{visit.status.replace("_", " ")}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {visit.status === "checked_in" && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateOpdStatus(visit.id, "in_consultation")}
                                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-amber-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-amber-600"
                                      style={{ width: "2rem" }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.width = "auto";
                                        e.currentTarget.style.paddingLeft = "0.75rem";
                                        e.currentTarget.style.paddingRight = "0.75rem";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.width = "2rem";
                                        e.currentTarget.style.paddingLeft = "0.5rem";
                                        e.currentTarget.style.paddingRight = "0.5rem";
                                      }}
                                      title="Start Consultation"
                                    >
                                      <Play className="h-4 w-4 shrink-0" />
                                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Start Consultation</span>
                                    </button>
                                    <button
                                      onClick={() => handleUpdateOpdStatus(visit.id, "completed")}
                                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-emerald-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-emerald-600"
                                      style={{ width: "2rem" }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.width = "auto";
                                        e.currentTarget.style.paddingLeft = "0.75rem";
                                        e.currentTarget.style.paddingRight = "0.75rem";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.width = "2rem";
                                        e.currentTarget.style.paddingLeft = "0.5rem";
                                        e.currentTarget.style.paddingRight = "0.5rem";
                                      }}
                                      title="Complete"
                                    >
                                      <CheckCircle className="h-4 w-4 shrink-0" />
                                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Complete</span>
                                    </button>
                                    <button
                                      onClick={() => handleUpdateOpdStatus(visit.id, "cancelled")}
                                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-rose-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-rose-600"
                                      style={{ width: "2rem" }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.width = "auto";
                                        e.currentTarget.style.paddingLeft = "0.75rem";
                                        e.currentTarget.style.paddingRight = "0.75rem";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.width = "2rem";
                                        e.currentTarget.style.paddingLeft = "0.5rem";
                                        e.currentTarget.style.paddingRight = "0.5rem";
                                      }}
                                      title="Cancel"
                                    >
                                      <X className="h-4 w-4 shrink-0" />
                                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Cancel</span>
                                    </button>
                                    <button
                                      onClick={() => handlePrintOpdSlip(visit.id)}
                                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                                      style={{ width: "2rem" }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.width = "auto";
                                        e.currentTarget.style.paddingLeft = "0.75rem";
                                        e.currentTarget.style.paddingRight = "0.75rem";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.width = "2rem";
                                        e.currentTarget.style.paddingLeft = "0.5rem";
                                        e.currentTarget.style.paddingRight = "0.5rem";
                                      }}
                                      title="Print OPD"
                                    >
                                      <Printer className="h-4 w-4 shrink-0" />
                                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Print OPD</span>
                                    </button>
                                  </>
                                )}
                                {visit.status === "in_consultation" && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateOpdStatus(visit.id, "completed")}
                                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-emerald-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-emerald-600"
                                      style={{ width: "2rem" }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.width = "auto";
                                        e.currentTarget.style.paddingLeft = "0.75rem";
                                        e.currentTarget.style.paddingRight = "0.75rem";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.width = "2rem";
                                        e.currentTarget.style.paddingLeft = "0.5rem";
                                        e.currentTarget.style.paddingRight = "0.5rem";
                                      }}
                                      title="Complete"
                                    >
                                      <CheckCircle className="h-4 w-4 shrink-0" />
                                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Complete</span>
                                    </button>
                                    <button
                                      onClick={() => handleUpdateOpdStatus(visit.id, "cancelled")}
                                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-rose-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-rose-600"
                                      style={{ width: "2rem" }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.width = "auto";
                                        e.currentTarget.style.paddingLeft = "0.75rem";
                                        e.currentTarget.style.paddingRight = "0.75rem";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.width = "2rem";
                                        e.currentTarget.style.paddingLeft = "0.5rem";
                                        e.currentTarget.style.paddingRight = "0.5rem";
                                      }}
                                      title="Cancel"
                                    >
                                      <X className="h-4 w-4 shrink-0" />
                                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Cancel</span>
                                    </button>
                                    <button
                                      onClick={() => handlePrintOpdSlip(visit.id)}
                                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                                      style={{ width: "2rem" }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.width = "auto";
                                        e.currentTarget.style.paddingLeft = "0.75rem";
                                        e.currentTarget.style.paddingRight = "0.75rem";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.width = "2rem";
                                        e.currentTarget.style.paddingLeft = "0.5rem";
                                        e.currentTarget.style.paddingRight = "0.5rem";
                                      }}
                                      title="Print OPD"
                                    >
                                      <Printer className="h-4 w-4 shrink-0" />
                                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Print OPD</span>
                                    </button>
                                  </>
                                )}
                                {visit.status === "completed" && visit.invoice_id && (
                                  <button
                                    onClick={() => handlePrintInvoiceFromOpd(visit.invoice_id!)}
                                    className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                                    style={{ width: "2rem" }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.width = "auto";
                                      e.currentTarget.style.paddingLeft = "0.75rem";
                                      e.currentTarget.style.paddingRight = "0.75rem";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.width = "2rem";
                                      e.currentTarget.style.paddingLeft = "0.5rem";
                                      e.currentTarget.style.paddingRight = "0.5rem";
                                    }}
                                    title="Print Invoice"
                                  >
                                    <Printer className="h-4 w-4 shrink-0" />
                                    <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Print Invoice</span>
                                  </button>
                                )}
                                {/* View Prescription button - always visible for any visit */}
                                <button
                                  onClick={() => setPrescriptionModalVisitId(visit.id)}
                                  className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-violet-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-violet-600"
                                  style={{ width: "2rem" }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.width = "auto";
                                    e.currentTarget.style.paddingLeft = "0.75rem";
                                    e.currentTarget.style.paddingRight = "0.75rem";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.width = "2rem";
                                    e.currentTarget.style.paddingLeft = "0.5rem";
                                    e.currentTarget.style.paddingRight = "0.5rem";
                                  }}
                                  title="View Prescription"
                                >
                                  <FileText className="h-4 w-4 shrink-0" />
                                  <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Prescription</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {opdTabVisitsTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                          <div className="text-sm text-slate-500">
                            Page {opdTabVisitsPage} of {opdTabVisitsTotalPages}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setOpdTabVisitsPage((p) => Math.max(1, p - 1))}
                              disabled={opdTabVisitsPage === 1}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </button>
                            <button
                              onClick={() => setOpdTabVisitsPage((p) => Math.min(opdTabVisitsTotalPages, p + 1))}
                              disabled={opdTabVisitsPage === opdTabVisitsTotalPages}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "admit" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Admissions</p>
                      <p className="text-xs text-slate-500">View and manage patient admissions</p>
                    </div>
                    <button
                      onClick={() => setShowAdmissionModal(true)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                    >
                      <div className="relative flex items-center justify-center">
                        <BedDouble className="h-4 w-4" />
                        <PlusCircle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 bg-sky-500 rounded-full" />
                      </div>
                      Admit Patient
                    </button>
                  </div>
                  <AdmissionTable patientId={patientId} />
                </div>
              )}

              {activeTab === "billing" && (
                <div className="space-y-4">
                  {/* Status Toggle Buttons */}
                  <div className="flex justify-end -mt-4">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                      <button
                        onClick={() => setInvoiceStatusFilter("pending")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${invoiceStatusFilter === "pending"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => setInvoiceStatusFilter("paid")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${invoiceStatusFilter === "paid"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                      >
                        Paid
                      </button>
                    </div>
                  </div>

                  {invoicesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-slate-500">Loading invoices...</div>
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                      <p className="text-sm text-slate-500">No {invoiceStatusFilter} invoices found</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {invoices.map((invoice) => (
                          <div
                            key={invoice.id}
                            className="relative rounded-xl border border-slate-200 bg-white p-4 pr-32 hover:border-sky-200 transition cursor-pointer"
                            onClick={() => handleInvoiceClick(invoice.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`pill px-3 py-1 text-xs font-normal capitalize ${invoice.status === "paid"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : invoice.status === "partial"
                                        ? "bg-amber-50 text-amber-700"
                                        : invoice.status === "cancelled"
                                          ? "bg-slate-50 text-slate-700"
                                          : "bg-rose-50 text-rose-700"
                                      }`}
                                  >
                                    {invoice.status}
                                  </span>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {invoice.invoice_number}
                                  </p>
                                  <span className="pill px-2 py-0.5 text-xs font-normal">
                                    {formatDate(invoice.invoice_date)}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                                  <span className="font-semibold text-slate-700">{currency(invoice.total_amount || 0)}</span>
                                  {invoice.paid_amount > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>Paid: {currency(invoice.paid_amount)}</span>
                                    </>
                                  )}
                                  {(invoice.balance_amount ?? 0) > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-600">Balance: {currency(invoice.balance_amount ?? 0)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="absolute right-4 top-4" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handlePrintInvoice(invoice)}
                                  className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                                  style={{ width: "2rem" }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.width = "auto";
                                    e.currentTarget.style.paddingLeft = "0.75rem";
                                    e.currentTarget.style.paddingRight = "0.75rem";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.width = "2rem";
                                    e.currentTarget.style.paddingLeft = "0.5rem";
                                    e.currentTarget.style.paddingRight = "0.5rem";
                                  }}
                                  title="Print Invoice"
                                >
                                  <Printer className="h-4 w-4 shrink-0" />
                                  <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Print</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {invoicesTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                          <div className="text-sm text-slate-500">
                            Page {invoicesPage} of {invoicesTotalPages}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setInvoicesPage((p) => Math.max(1, p - 1))}
                              disabled={invoicesPage === 1}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </button>
                            <button
                              onClick={() => setInvoicesPage((p) => Math.min(invoicesTotalPages, p + 1))}
                              disabled={invoicesPage === invoicesTotalPages}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "tests" && (
                <div className="space-y-6">
                  {/* Prescribed Lab Tests Section */}
                  {renderPrescribedVisitsSection()}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Lab Test Bookings</p>
                      <p className="text-xs text-slate-500">View test bookings for this patient</p>
                    </div>
                    <button
                      onClick={() => setShowLabBookingModal(true)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                    >
                      <div className="relative flex items-center justify-center">
                        <Beaker className="h-4 w-4" />
                        <PlusCircle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 bg-sky-500 rounded-full" />
                      </div>
                      Create Booking
                    </button>
                  </div>

                  {labBookingsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-slate-500">Loading bookings...</div>
                    </div>
                  ) : labBookings.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                      <p className="text-sm text-slate-500">No test bookings found</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {labBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className="relative rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex items-start justify-between pr-20">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {booking.booking_number}
                                  </p>
                                  <span className="pill px-2 py-0.5 text-xs font-normal capitalize">
                                    {booking.priority}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                                  <span>{formatDate(booking.scheduled_date)}</span>
                                  <span>•</span>
                                  <span>{booking.tests.length} test{booking.tests.length !== 1 ? 's' : ''}</span>
                                  <span>•</span>
                                  <span className="font-semibold text-slate-700">{currency(booking.total_amount)}</span>
                                </div>
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-slate-700">Tests:</p>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    {booking.tests.map((test) => (
                                      <span
                                        key={test.id}
                                        className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                                      >
                                        {test.test_name}
                                        {test.prescription_metadata && Object.keys(test.prescription_metadata).length > 0 && (
                                          <span className="font-normal text-slate-500 text-[10px] ml-1">
                                            ({Object.entries(test.prescription_metadata).map(([k, v]) => `${k}: ${v}`).join(", ")})
                                          </span>
                                        )}
                                        {" "}({test.test_code})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {booking.notes && (
                                  <p className="mt-2 text-xs text-slate-500">{booking.notes}</p>
                                )}
                              </div>
                              <div className="absolute right-4 top-4 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedReportBooking(booking);
                                  }}
                                  className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-emerald-600 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-emerald-700 cursor-pointer shadow-xs"
                                  style={{ width: "2rem" }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.width = "auto";
                                    e.currentTarget.style.paddingLeft = "0.75rem";
                                    e.currentTarget.style.paddingRight = "0.75rem";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.width = "2rem";
                                    e.currentTarget.style.paddingLeft = "0.5rem";
                                    e.currentTarget.style.paddingRight = "0.5rem";
                                  }}
                                  title="View Lab Report"
                                >
                                  <Eye className="h-4 w-4 shrink-0" />
                                  <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">View Report</span>
                                </button>
                                {booking.invoice_id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintInvoiceFromBooking(booking.invoice_id!, booking);
                                    }}
                                    className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600 cursor-pointer"
                                    style={{ width: "2rem" }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.width = "auto";
                                      e.currentTarget.style.paddingLeft = "0.75rem";
                                      e.currentTarget.style.paddingRight = "0.75rem";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.width = "2rem";
                                      e.currentTarget.style.paddingLeft = "0.5rem";
                                      e.currentTarget.style.paddingRight = "0.5rem";
                                    }}
                                    title="Print Invoice"
                                  >
                                    <Printer className="h-4 w-4 shrink-0" />
                                    <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Print Invoice</span>
                                  </button>
                                )}
                                <span
                                  className={`pill px-3 py-1 text-xs font-normal capitalize ${booking.status === "completed"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : booking.status === "in_progress" || booking.status === "sample_collected"
                                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                                      : booking.status === "scheduled"
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-slate-50 text-slate-700 border"
                                    }`}
                                >
                                  {booking.status.replace("_", " ")}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {labBookingsTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                          <div className="text-sm text-slate-500">
                            Page {labBookingsPage} of {labBookingsTotalPages}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setLabBookingsPage((p) => Math.max(1, p - 1))}
                              disabled={labBookingsPage === 1}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </button>
                            <button
                              onClick={() => setLabBookingsPage((p) => Math.min(labBookingsTotalPages, p + 1))}
                              disabled={labBookingsPage === labBookingsTotalPages}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "surgeries" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-sky-600" /> Planned & Advised Surgeries
                      </p>
                      <p className="text-xs text-slate-500">
                        View surgical advice, package pricing, advance deposits, and receipts
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPlannedSurgeryForModal(null);
                        setShowPlannedSurgeryModal(true);
                      }}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow cursor-pointer"
                    >
                      <Plus className="h-4 w-4" /> Plan New Surgery
                    </button>
                  </div>

                  {surgeriesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <Loader2 className="h-5 w-5 animate-spin text-sky-600" /> Loading surgery records...
                      </div>
                    </div>
                  ) : surgeries.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
                      <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-900">No Surgeries Planned</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        No surgical procedures have been advised or planned for this patient yet.
                      </p>
                      <button
                        onClick={() => {
                          setSelectedPlannedSurgeryForModal(null);
                          setShowPlannedSurgeryModal(true);
                        }}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-200 px-4 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition shadow-2xs cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Plan First Surgery
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {surgeries.map((surg) => {
                          const statusStyle = (() => {
                            switch (surg.status) {
                              case "confirmed":
                              case "scheduled":
                                return { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" };
                              case "completed":
                              case "surgery_completed":
                                return { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200" };
                              case "counselling_in_progress":
                                return { bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200" };
                              case "postponed":
                                return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" };
                              case "cancelled":
                              case "cancelled_by_patient":
                              case "cancelled_by_hospital":
                                return { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" };
                              default:
                                return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
                            }
                          })();

                          const eyeLabel = surg.eye === "OD" ? "Right Eye (OD)" : surg.eye === "OS" ? "Left Eye (OS)" : surg.eye === "OU" ? "Both Eyes (OU)" : surg.eye || "General";
                          const eyeBadgeColor = surg.eye === "OD" ? "bg-blue-50 text-blue-800 border-blue-200" : surg.eye === "OS" ? "bg-purple-50 text-purple-800 border-purple-200" : surg.eye === "OU" ? "bg-amber-50 text-amber-900 border-amber-300" : "bg-slate-50 text-slate-700 border-slate-200";

                          return (
                            <div
                              key={surg.id}
                              className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm hover:border-sky-200 transition-colors"
                            >
                              {/* Header */}
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-9 w-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 font-bold shrink-0">
                                    <Sparkles className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                      {surg.surgery_name}
                                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-extrabold ${eyeBadgeColor}`}>
                                        {eyeLabel}
                                      </span>
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                      <span>Advised: {formatDate(surg.advised_date || surg.created_at)}</span>
                                      {surg.planned_date && (
                                        <>
                                          <span>•</span>
                                          <span className="font-semibold text-sky-700">Planned OT: {formatDate(surg.planned_date)} {surg.planned_time ? `at ${surg.planned_time.slice(0, 5)}` : ""}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-full border text-xs font-bold capitalize ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                    {surg.status.replace(/_/g, " ")}
                                  </span>
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/60 rounded-xl p-3 border border-slate-100">
                                <div>
                                  <span className="text-slate-400 font-medium block">Surgeon & Counsellor</span>
                                  <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                                    <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                                    {surg.surgeon_name || "Assigned Doctor"}
                                  </span>
                                  {surg.counsellor_name && (
                                    <span className="text-[11px] text-slate-500 block mt-0.5">
                                      Counsellor: {surg.counsellor_name}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <span className="text-slate-400 font-medium block">Package Selected</span>
                                  <span className="font-semibold text-slate-900 block mt-0.5">
                                    {surg.package_name || "Standard Procedure"}
                                  </span>
                                  <span className="text-[11px] text-slate-500 block">
                                    Urgency: <span className="capitalize font-medium">{surg.urgency}</span>
                                  </span>
                                </div>

                                <div>
                                  <span className="text-slate-400 font-medium block">Financial & Agreed Rate</span>
                                  <span className="font-bold text-emerald-700 text-sm block mt-0.5">
                                    {surg.agreed_price ? currency(surg.agreed_price) : "Package Rate Pending"}
                                  </span>
                                  {surg.confirmed_at && (
                                    <span className="text-[10px] text-emerald-600 font-medium block">
                                      ✓ Confirmed on {formatDate(surg.confirmed_at)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-2">
                                  {surg.notes && (
                                    <p className="text-xs text-slate-500 italic max-w-md truncate" title={surg.notes}>
                                      Notes: &quot;{surg.notes}&quot;
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPlannedSurgeryForModal(surg);
                                      setShowPlannedSurgeryModal(true);
                                    }}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-slate-500" /> Edit Advice
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDrawerSurgery(surg);
                                      setIsDrawerOpen(true);
                                    }}
                                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-bold shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" /> View Details, Invoice & Advance
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {surgeriesTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                          <div className="text-sm text-slate-500">
                            Page {surgeriesPage} of {surgeriesTotalPages}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSurgeriesPage((p) => Math.max(1, p - 1))}
                              disabled={surgeriesPage === 1}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4" /> Previous
                            </button>
                            <button
                              onClick={() => setSurgeriesPage((p) => Math.min(surgeriesTotalPages, p + 1))}
                              disabled={surgeriesPage === surgeriesTotalPages}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Next <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Patient Modal */}
      <PatientFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          // Refresh patient data after edit
          if (patientId) {
            dispatch(getPatientById({ patientId }));
          }
        }}
        defaultValues={patient}
      />

      {/* Admission Form Modal */}
      <AdmissionFormModal
        isOpen={showAdmissionModal}
        onClose={() => setShowAdmissionModal(false)}
        defaultPatientId={patientId}
      />

      {/* Lab Booking Form Modal */}
      <LabBookingFormModal
        isOpen={showLabBookingModal}
        onClose={() => setShowLabBookingModal(false)}
        defaultPatientId={patientId}
      />

      {/* OPD Form Modal */}
      <OpdFormModal
        isOpen={showOpdModal}
        onClose={() => setShowOpdModal(false)}
        defaultPatientId={patientId}
      />

      <AppointmentFormModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        defaultPatientId={patientId}
      />

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={showInvoiceDetail}
        onClose={() => {
          setShowInvoiceDetail(false);
          setSelectedInvoice(null);
        }}
        title="Invoice Details"
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs text-slate-500">Invoice Number</p>
                <p className="text-sm font-semibold text-slate-900">{selectedInvoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Invoice Date</p>
                <p className="text-sm font-semibold text-slate-900">{formatDate(selectedInvoice.invoice_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <span
                  className={`pill px-2 py-0.5 text-xs font-normal capitalize inline-block mt-1 ${selectedInvoice.status === "paid"
                    ? "bg-emerald-50 text-emerald-700"
                    : selectedInvoice.status === "partial"
                      ? "bg-amber-50 text-amber-700"
                      : selectedInvoice.status === "cancelled"
                        ? "bg-slate-50 text-slate-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                >
                  {selectedInvoice.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Amount</p>
                <p className="text-sm font-semibold text-slate-900">{currency(selectedInvoice.total_amount)}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Line Items</h3>
              <div className="space-y-2">
                {(selectedInvoice.line_items || []).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{item.description}</p>
                      <p className="text-xs text-slate-500">
                        Qty: {item.quantity} × {currency(typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price.toString()) || 0)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{currency(item.total ?? 0)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    {currency(
                      // Calculate subtotal from line items (after line-item discounts)
                      selectedInvoice.line_items?.reduce((sum, item) => {
                        const total = item.total_price !== undefined
                          ? (typeof item.total_price === "string" ? parseFloat(item.total_price) : item.total_price)
                          : (item.total || 0);
                        return sum + total;
                      }, 0) || selectedInvoice.subtotal
                    )}
                  </span>
                </div>
                {selectedInvoice.tax_amount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Tax ({selectedInvoice.tax_rate}%)</span>
                    <span className="font-semibold text-slate-900">{currency(selectedInvoice.tax_amount)}</span>
                  </div>
                )}
                {selectedInvoice.discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Discount</span>
                    <span className="font-semibold text-slate-900">-{currency(selectedInvoice.discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-900">Total Amount</span>
                  <span className="text-lg font-bold text-slate-900">{currency(selectedInvoice.total_amount)}</span>
                </div>
                {selectedInvoice.paid_amount > 0 && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-600">Paid Amount</span>
                    <span className="font-semibold text-emerald-700">{currency(selectedInvoice.paid_amount)}</span>
                  </div>
                )}
                {(selectedInvoice.balance_amount ?? 0) > 0 && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-600">Balance Amount</span>
                    <span className="font-semibold text-amber-700">{currency(selectedInvoice.balance_amount ?? 0)}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-500">Notes</p>
                <p className="mt-1 text-sm text-slate-700">{selectedInvoice.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => handlePrintInvoice(selectedInvoice)}
                className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Print Invoice (Hidden) */}
      {printInvoiceData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printRef} className="print-content">
            <InvoicePrint
              invoice={printInvoiceData.invoice}
              patientName={printInvoiceData.patientName}
              patientMobile={printInvoiceData.patientMobile}
              tests={printInvoiceData.tests}
              bookingNumber={printInvoiceData.bookingNumber}
            />
          </div>
        </div>
      )}

      {/* Print OPD Slip (Hidden) */}
      {printOpdSlipData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printOpdRef} className="print-content">
            <OpdSlipPrint
              patient={printOpdSlipData.patient}
              doctor={(() => {
                const doc = printOpdSlipData.visit.doctor_id ? doctors.find((d) => d.id === printOpdSlipData.visit.doctor_id) : null;
                return doc ? (doc.name || `Dr. ${doc.specialization}`) : "";
              })()}
              symptoms={printOpdSlipData.visit.chief_complaint || ""}
              opdNumber={printOpdSlipData.visit.visit_number}
              tokenNumber={printOpdSlipData.visit.token_number || 0}
            />
          </div>
        </div>
      )}

      {/* Cancellation Refund Acknowledgment Modal */}
      <CancellationRefundAcknowledgmentModal
        isOpen={showCancellationModal}
        onClose={() => {
          setShowCancellationModal(false);
          setPendingCancellation(null);
        }}
        onConfirm={handleConfirmCancellation}
        type="opd"
        itemNumber={pendingCancellation?.visitNumber}
        amount={pendingCancellation?.paymentAmount}
        loading={cancelling}
      />

      {/* Lab Report Viewer Modal */}
      <PreviousLabReportModal
        isOpen={selectedReportBooking !== null}
        onClose={() => setSelectedReportBooking(null)}
        booking={selectedReportBooking}
      />

      {/* Prescribed Lab Tests Booking Modal */}
      {selectedPrescribedVisitId && (
        <PrescribedLabBookingModal
          isOpen={showPrescribedBookingModal}
          onClose={() => setShowPrescribedBookingModal(false)}
          visitId={selectedPrescribedVisitId}
          patientId={patientId}
          patientName={patient ? formatPatientName(patient) : undefined}
          onBookingCreated={() => {
            fetchLabBookings();
            fetchPatientPrescribedVisits();
          }}
        />
      )}

      {/* Read-only Prescription Preview Modal */}
      {prescriptionModalVisitId && (
        <HistoryPrescriptionModal
          isOpen={true}
          onClose={() => setPrescriptionModalVisitId(null)}
          visitId={prescriptionModalVisitId}
          patientId={patientId}
        />
      )}

      {/* Surgery Advice Drawer */}
      <SurgeryAdviceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        plannedSurgery={drawerSurgery}
        onRefresh={fetchPatientSurgeries}
      />

      {/* Planned Surgery Form Modal */}
      <PlannedSurgeryFormModal
        isOpen={showPlannedSurgeryModal}
        onClose={() => setShowPlannedSurgeryModal(false)}
        onSuccess={fetchPatientSurgeries}
        initialData={selectedPlannedSurgeryForModal}
        preSelectedPatientId={patientId}
        preSelectedPatientName={patient ? formatPatientName(patient) : undefined}
      />
    </div>
  );
}

