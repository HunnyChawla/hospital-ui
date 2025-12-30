"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useAppSelector } from "@/redux/hooks";
import { appointmentsApi, Appointment, AppointmentStatus } from "@/services/appointmentsApi";
import { opdVisitsApi, Visit, VisitStatus } from "@/services/opdVisitsApi";
import { prescriptionsApi, Prescription } from "@/services/prescriptionsApi";
import { patientsApi, PatientApiResponse } from "@/services/patientsApi";
import { doctorsApi, Doctor } from "@/services/doctorsApi";
import { formatDate } from "@/utils/format";
import {
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  List,
  Activity,
  Download,
  Loader2,
  Stethoscope,
  FileText,
  Eye,
} from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { PrescriptionFormModal } from "./PrescriptionFormModal";
import { PrescriptionPrint } from "./PrescriptionPrint";
import { getTenantIdForApi } from "@/utils/auth";

interface AppointmentWithPatient extends Appointment {
  patient_name?: string;
  patient_mobile?: string;
}

interface VisitWithPatient extends Visit {
  patient_name?: string;
  patient_mobile?: string;
}

export function DoctorPanel() {
  const doctors = useAppSelector((s) => s.doctors.list);
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [visits, setVisits] = useState<VisitWithPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateRangeError, setDateRangeError] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | VisitStatus | "all">("all");
  const [viewMode, setViewMode] = useState<"appointments" | "visits" | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedForPrescription, setSelectedForPrescription] = useState<{
    visitId?: string | null;
    appointmentId?: string | null;
    patientId: string;
  } | null>(null);
  const [prescriptions, setPrescriptions] = useState<Map<string, Prescription>>(new Map());
  const [printPrescriptionData, setPrintPrescriptionData] = useState<{
    prescription: Prescription;
    patientName: string;
    patientMobile?: string;
  } | null>(null);
  const [shouldPrintPrescription, setShouldPrintPrescription] = useState(false);
  const printPrescriptionRef = useRef<HTMLDivElement>(null);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => new Date().toISOString().split("T")[0];

  // Find current doctor by user_id
  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    if (userId && doctors.length > 0) {
      const doctor = doctors.find((d) => d.user_id === userId);
      if (doctor) {
        setCurrentDoctor(doctor);
        setDoctorId(doctor.id);
      }
    }
  }, [doctors]);

  // Validate date range (max 3 months)
  const validateDateRange = useCallback((start: string, end: string): string => {
    if (!start || !end) return "";

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);

    if (endDateObj < startDateObj) {
      return "End date must be after or equal to start date";
    }

    const monthsDiff =
      (endDateObj.getFullYear() - startDateObj.getFullYear()) * 12 +
      (endDateObj.getMonth() - startDateObj.getMonth());

    if (monthsDiff > 3) {
      return "Date range cannot exceed 3 months";
    }

    return "";
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      const error = validateDateRange(startDate, endDate);
      setDateRangeError(error);
    } else {
      setDateRangeError("");
    }
  }, [startDate, endDate, validateDateRange]);

  const getMaxEndDate = useCallback((): string => {
    if (!startDate) return getTodayDate();
    const startDateObj = new Date(startDate);
    const maxDate = new Date(startDateObj);
    maxDate.setMonth(maxDate.getMonth() + 3);
    maxDate.setDate(maxDate.getDate() - 1);
    const today = new Date(getTodayDate());
    return maxDate <= today ? maxDate.toISOString().split("T")[0] : getTodayDate();
  }, [startDate]);

  const getMinStartDate = useCallback((): string => {
    if (!endDate) return "";
    const endDateObj = new Date(endDate);
    const minDate = new Date(endDateObj);
    minDate.setMonth(minDate.getMonth() - 3);
    minDate.setDate(minDate.getDate() + 1);
    return minDate.toISOString().split("T")[0];
  }, [endDate]);

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    if (!doctorId || dateRangeError) return [];

    try {
      const response = await appointmentsApi.getByDoctor(doctorId, startDate || getTodayDate(), endDate || getTodayDate(), {
        page: currentPage,
        page_size: pageSize,
        appointmentsOnly: viewMode === "appointments",
      });

      const appointmentsWithPatients = await Promise.all(
        response.items.map(async (appointment) => {
          try {
            const patient = await patientsApi.getById(appointment.patient_id);
            return {
              ...appointment,
              patient_name: `${patient.first_name} ${patient.last_name || ""}`.trim(),
              patient_mobile: patient.mobile,
            };
          } catch {
            return {
              ...appointment,
              patient_name: "Unknown",
              patient_mobile: "",
            };
          }
        })
      );

      return appointmentsWithPatients;
    } catch (error: any) {
      console.error("Failed to fetch appointments:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch appointments");
      return [];
    }
  }, [doctorId, startDate, endDate, currentPage, pageSize, viewMode, dateRangeError]);

  // Fetch visits
  const fetchVisits = useCallback(async () => {
    if (!doctorId || dateRangeError) return { visits: [], total: 0, totalPages: 1 };

    try {
      const response = await opdVisitsApi.list({
        doctor_id: doctorId,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status: statusFilter !== "all" && statusFilter !== "scheduled" && statusFilter !== "confirmed" && statusFilter !== "checked_in" && statusFilter !== "completed" && statusFilter !== "cancelled" && statusFilter !== "no_show" ? (statusFilter as VisitStatus) : undefined,
        page: currentPage,
        page_size: pageSize,
      });

      const visitsWithPatients = await Promise.all(
        response.items.map(async (visit) => {
          try {
            const patient = await patientsApi.getById(visit.patient_id);
            return {
              ...visit,
              patient_name: `${patient.first_name} ${patient.last_name || ""}`.trim(),
              patient_mobile: patient.mobile,
            };
          } catch {
            return {
              ...visit,
              patient_name: "Unknown",
              patient_mobile: "",
            };
          }
        })
      );

      return { visits: visitsWithPatients, total: response.total, totalPages: response.total_pages };
    } catch (error: any) {
      console.error("Failed to fetch visits:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch visits");
      return { visits: [], total: 0, totalPages: 1 };
    }
  }, [doctorId, startDate, endDate, currentPage, pageSize, statusFilter, dateRangeError]);

  // Fetch prescriptions for visits/appointments
  const fetchPrescriptions = useCallback(async (visitIds: string[], appointmentIds: string[]) => {
    const prescriptionMap = new Map<string, Prescription>();

    try {
      const promises: Promise<void>[] = [];

      visitIds.forEach((visitId) => {
        promises.push(
          prescriptionsApi
            .list({ visit_id: visitId })
            .then((response) => {
              if (response.items.length > 0) {
                // Use visitId as key to match with visit.id
                prescriptionMap.set(visitId, response.items[0]);
              }
            })
            .catch(() => {
              // Silently fail
            })
        );
      });

      appointmentIds.forEach((appointmentId) => {
        promises.push(
          prescriptionsApi
            .list({ appointment_id: appointmentId })
            .then((response) => {
              if (response.items.length > 0) {
                // Use appointmentId as key to match with appointment.id
                prescriptionMap.set(appointmentId, response.items[0]);
              }
            })
            .catch(() => {
              // Silently fail
            })
        );
      });

      await Promise.all(promises);
      setPrescriptions(prescriptionMap);
    } catch (error) {
      console.error("Failed to fetch prescriptions:", error);
    }
  }, []);

  // Main fetch function
  const fetchData = useCallback(async () => {
    if (!doctorId || dateRangeError) return;

    setLoading(true);
    try {
      let visitIds: string[] = [];
      let appointmentIds: string[] = [];

      if (viewMode === "appointments" || viewMode === "all") {
        const appointmentsData = await fetchAppointments();
        setAppointments(appointmentsData);
        appointmentIds = appointmentsData.map((a) => a.id);
      } else {
        setAppointments([]);
      }

      if (viewMode === "visits" || viewMode === "all") {
        const visitsData = await fetchVisits();
        setVisits(visitsData.visits);
        setTotal(visitsData.total);
        setTotalPages(visitsData.totalPages);
        visitIds = visitsData.visits.map((v) => v.id);
      } else {
        setVisits([]);
      }

      // Fetch prescriptions
      await fetchPrescriptions(visitIds, appointmentIds);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [doctorId, viewMode, fetchAppointments, fetchVisits, fetchPrescriptions, dateRangeError]);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, statusFilter, viewMode]);

  useEffect(() => {
    if (!dateRangeError && doctorId) {
      fetchData();
    }
  }, [fetchData, dateRangeError, doctorId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
      case "checked_in":
        return "bg-sky-50 text-sky-700";
      case "confirmed":
      case "in_consultation":
        return "bg-blue-50 text-blue-700";
      case "completed":
        return "bg-emerald-50 text-emerald-700";
      case "cancelled":
        return "bg-rose-50 text-rose-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleStatusUpdate = async (itemId: string, newStatus: AppointmentStatus | VisitStatus, type: "appointment" | "visit") => {
    setUpdatingStatus(itemId);
    try {
      if (type === "appointment") {
        await appointmentsApi.updateStatus(itemId, newStatus as AppointmentStatus);
      } else {
        await opdVisitsApi.updateStatus(itemId, newStatus as VisitStatus);
      }
      toast.success(`Status updated to ${getStatusLabel(newStatus)}`);
      fetchData();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to update status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const toggleExpansion = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handlePrescribe = (visitId?: string | null, appointmentId?: string | null, patientId?: string) => {
    if (!patientId) {
      toast.error("Patient ID not found");
      return;
    }
    setSelectedForPrescription({ visitId, appointmentId, patientId });
  };

  const handlePrintPrescription = useReactToPrint({
    contentRef: printPrescriptionRef,
    documentTitle: printPrescriptionData ? `Prescription_${printPrescriptionData.prescription.id}` : "Prescription",
  });

  useEffect(() => {
    if (printPrescriptionData && shouldPrintPrescription && printPrescriptionRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintPrescription();
        setShouldPrintPrescription(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printPrescriptionData, shouldPrintPrescription, handlePrintPrescription]);

  const handleDownloadPrescription = async (prescription: Prescription, patientName: string, patientMobile?: string) => {
    setPrintPrescriptionData({ prescription, patientName, patientMobile });
    setShouldPrintPrescription(true);
  };

  if (!doctorId) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
        <Stethoscope className="mx-auto h-12 w-12 text-slate-400" />
        <p className="mt-4 text-slate-500">Doctor profile not found. Please contact administrator.</p>
      </div>
    );
  }

  const allItems = [
    ...appointments.map((a) => ({ ...a, type: "appointment" as const })),
    ...visits.map((v) => ({ ...v, type: "visit" as const })),
  ].sort((a, b) => {
    const dateA = a.type === "appointment" ? a.appointment_date : a.created_at;
    const dateB = b.type === "appointment" ? b.appointment_date : b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <div className="space-y-4">
      {/* Doctor Info */}
      {currentDoctor && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {currentDoctor.name || currentDoctor.user?.name || "Dr. Unknown"}
              </p>
              {currentDoctor.specialization && (
                <p className="text-sm text-slate-600">{currentDoctor.specialization}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-end gap-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 flex-1">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate ? (endDate < getTodayDate() ? endDate : getTodayDate()) : getTodayDate()}
                min={endDate ? getMinStartDate() : undefined}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                max={startDate ? getMaxEndDate() : getTodayDate()}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
            </div>
          </div>
        </div>

        {dateRangeError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-sm text-rose-700">{dateRangeError}</p>
          </div>
        )}

        {/* View Mode Tabs */}
        <div className="mb-4 border-b border-slate-200">
          <div className="flex flex-wrap gap-2 -mb-px">
            <button
              onClick={() => setViewMode("all")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                viewMode === "all"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <List className="h-4 w-4" />
              All
            </button>
            <button
              onClick={() => setViewMode("appointments")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                viewMode === "appointments"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Appointments
            </button>
            <button
              onClick={() => setViewMode("visits")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                viewMode === "visits"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              OPD Visits
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex flex-wrap gap-2 -mb-px">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "all"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <List className="h-4 w-4" />
              All
            </button>
            <button
              onClick={() => setStatusFilter("scheduled")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "scheduled"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Scheduled
            </button>
            <button
              onClick={() => setStatusFilter("checked_in")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "checked_in"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Clock className="h-4 w-4" />
              Checked In
            </button>
            <button
              onClick={() => setStatusFilter("in_consultation")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "in_consultation"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Activity className="h-4 w-4" />
              In Consultation
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "completed"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <SkeletonRow rows={5} />
      ) : allItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <Stethoscope className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-slate-500">No appointments or visits found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {allItems.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const isUpdating = updatingStatus === item.id;
            const prescription = prescriptions.get(item.id);
            const itemStatus = item.type === "appointment" ? item.status : item.status;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-100 bg-white shadow-sm transition hover:border-sky-200 hover:shadow-md"
              >
                {/* Item Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex min-w-[4rem] items-center justify-center rounded-lg bg-sky-100 px-3 py-2">
                          <p className="text-xs font-bold text-sky-700">
                            {item.type === "appointment" ? `#${item.token_number}` : item.visit_number}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {item.patient_name || `Patient ${item.patient_id.slice(0, 8)}...`}
                            </p>
                            <span className={`pill px-2 py-0.5 text-xs font-normal ${getStatusColor(itemStatus)}`}>
                              {getStatusLabel(itemStatus)}
                            </span>
                            <span className="pill bg-slate-50 text-slate-700 px-2 py-0.5 text-xs font-normal">
                              {item.type === "appointment" ? "Appointment" : "OPD Visit"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                            {item.patient_mobile && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.patient_mobile}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(item.type === "appointment" ? item.appointment_date : item.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-4 flex flex-col gap-2">
                      {itemStatus !== "completed" && itemStatus !== "cancelled" && (
                        <button
                          onClick={() => handlePrescribe(item.type === "visit" ? item.id : null, item.type === "appointment" ? item.id : null, item.patient_id)}
                          className="flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
                        >
                          <FileText className="h-3 w-3" />
                          Prescribe
                        </button>
                      )}
                      {prescription && (
                        <button
                          onClick={() => handleDownloadPrescription(prescription, item.patient_name || "Unknown", item.patient_mobile)}
                          className="flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                        >
                          <Download className="h-3 w-3" />
                          Prescription
                        </button>
                      )}
                      {itemStatus === "checked_in" && item.type === "visit" && (
                        <button
                          onClick={() => handleStatusUpdate(item.id, "in_consultation", "visit")}
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                        >
                          {isUpdating ? "Updating..." : "Start Consultation"}
                        </button>
                      )}
                      {itemStatus === "in_consultation" && item.type === "visit" && (
                        <button
                          onClick={() => handleStatusUpdate(item.id, "completed", "visit")}
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {isUpdating ? "Updating..." : "Complete"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Details */}
                {(item.type === "visit" ? (item as Visit).chief_complaint : (item as Appointment).notes) && (
                  <div className="border-t border-slate-100">
                    <button
                      onClick={() => toggleExpansion(item.id)}
                      className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span>Details</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 p-4">
                        {item.type === "visit" && (item as Visit).chief_complaint && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-slate-600">Chief Complaint</p>
                            <p className="text-sm text-slate-900">{(item as Visit).chief_complaint}</p>
                          </div>
                        )}
                        {item.type === "appointment" && (item as Appointment).notes && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-slate-600">Notes</p>
                            <p className="text-sm text-slate-900">{(item as Appointment).notes}</p>
                          </div>
                        )}
                        {prescription && (
                          <div className="mt-3">
                            <p className="mb-2 text-xs font-semibold text-slate-600">Prescription</p>
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              {prescription.diagnosis && (
                                <p className="mb-2 text-sm">
                                  <span className="font-semibold">Diagnosis:</span> {prescription.diagnosis}
                                </p>
                              )}
                              <div className="space-y-1">
                                {prescription.medicines.map((med, idx) => (
                                  <p key={idx} className="text-sm">
                                    {idx + 1}. {med.medicine_name} - {med.dosage}, {med.frequency}, {med.duration}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, total)}</span> of{" "}
            <span className="font-semibold text-slate-900">{total}</span> items
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[2.5rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      currentPage === pageNum
                        ? "bg-sky-500 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Prescription Form Modal */}
      {selectedForPrescription && (
        <PrescriptionFormModal
          isOpen={!!selectedForPrescription}
          onClose={() => setSelectedForPrescription(null)}
          visitId={selectedForPrescription.visitId}
          appointmentId={selectedForPrescription.appointmentId}
          patientId={selectedForPrescription.patientId}
          doctorId={doctorId!}
          onSuccess={() => {
            fetchData();
            setSelectedForPrescription(null);
          }}
        />
      )}

      {/* Hidden printable prescription */}
      {printPrescriptionData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printPrescriptionRef} className="print-content">
            <PrescriptionPrint
              prescription={printPrescriptionData.prescription}
              patientName={printPrescriptionData.patientName}
              patientMobile={printPrescriptionData.patientMobile}
            />
          </div>
        </div>
      )}
    </div>
  );
}

