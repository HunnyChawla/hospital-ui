"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppSelector } from "@/redux/hooks";
import { patientsApi } from "@/services/patientsApi";
import { opdVisitsApi, VisitStatus, Visit } from "@/services/opdVisitsApi";
import { formatDate } from "@/utils/format";
import { Stethoscope, Calendar, CheckCircle2, XCircle, Clock as ClockIcon, User, Play, CheckCircle, X, Printer } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { useReactToPrint } from "react-to-print";
import { OpdSlipPrint } from "./OpdSlipPrint";

interface OpdListProps {
  doctorId?: string;
}

export function OpdList({ doctorId }: OpdListProps) {
  const doctors = useAppSelector((s) => s.doctors.list);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctorId || "");
  const [selectedDate, setSelectedDate] = useState("");
  const [sortBy, setSortBy] = useState<"token_number" | "visit_date" | "created_at" | "checked_in_at" | "visit_number" | "status" | "visit_type">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [printVisitData, setPrintVisitData] = useState<{ visit: Visit; patient: any } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printVisitData ? `OPD_Slip_${printVisitData.visit.visit_number}` : "OPD_Slip",
  });

  useEffect(() => {
    // Set default doctor when doctors are loaded
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  // Set default date on client side only to avoid hydration mismatch
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date().toISOString().split("T")[0]);
    }
  }, [selectedDate]);

  const fetchVisits = useCallback(async () => {
    if (!selectedDoctorId || !selectedDate) return; // Don't fetch if date is not set yet
    
    setLoading(true);
    try {
      // Fetch visits using the new list API (patient_name and patient_mobile are included in response)
      const response = await opdVisitsApi.list({
        page: 1,
        page_size: 100,
        sort_by: sortBy,
        sort_order: sortOrder,
        doctor_id: selectedDoctorId,
        visit_date: selectedDate,
      });
      
      setVisits(response.items);
    } catch (error: any) {
      console.error("Failed to fetch OPD visits:", error);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDoctorId, selectedDate, sortBy, sortOrder]);

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      fetchVisits();
    }
  }, [selectedDoctorId, selectedDate, sortBy, sortOrder, fetchVisits]);

  // Listen for OPD visit creation events to refresh the list
  useEffect(() => {
    const handleOpdVisitCreated = () => {
      if (selectedDoctorId) {
        fetchVisits();
      }
    };

    window.addEventListener("opd:visit:created", handleOpdVisitCreated);
    return () => {
      window.removeEventListener("opd:visit:created", handleOpdVisitCreated);
    };
  }, [selectedDoctorId, fetchVisits]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      case "cancelled":
        return <XCircle className="h-3 w-3 text-rose-500" />;
      case "checked_in":
        return <CheckCircle2 className="h-3 w-3 text-sky-500" />;
      case "in_consultation":
        return <ClockIcon className="h-3 w-3 text-amber-500" />;
      default:
        return <ClockIcon className="h-3 w-3 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-700";
      case "cancelled":
        return "bg-rose-50 text-rose-700";
      case "checked_in":
        return "bg-sky-50 text-sky-700";
      case "in_consultation":
        return "bg-amber-50 text-amber-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  };

  const handleUpdateStatus = async (visitId: string, newStatus: VisitStatus) => {
    try {
      await opdVisitsApi.updateStatus(visitId, newStatus);
      toast.success(`Visit status updated to ${newStatus.replace("_", " ")}`);
      
      // Refresh visits list
      if (selectedDoctorId) {
        fetchVisits();
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  const handlePrintOpd = async (visitId: string) => {
    try {
      // Fetch full visit details
      const visit = await opdVisitsApi.getById(visitId);
      
      // Fetch patient details
      const patient = await patientsApi.getById(visit.patient_id);
      
      // Set print data - this will trigger the useEffect to print
      setPrintVisitData({ visit, patient });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  // Trigger print when printVisitData is set
  useEffect(() => {
    if (printVisitData && printRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrint();
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printVisitData, handlePrint]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="space-y-1">
          <span className="text-slate-600 flex items-center gap-1">
            <Stethoscope className="h-4 w-4" />
            Doctor
          </span>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          >
            <option value="">Select doctor</option>
            {doctors.map((doc) => {
              const doctorName = doc.name || `Dr. ${doc.specialization}`;
              return (
                <option key={doc.id} value={doc.id}>
                  {doctorName} - {doc.specialization}
                </option>
              );
            })}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-slate-600 flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Date
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-slate-600">Sort By</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          >
            <option value="created_at">Created At</option>
            <option value="token_number">Token Number</option>
            <option value="visit_date">Visit Date</option>
            <option value="checked_in_at">Checked In At</option>
            <option value="visit_number">Visit Number</option>
            <option value="status">Status</option>
            <option value="visit_type">Visit Type</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-slate-600">Order</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonRow rows={3} />
      ) : visits.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <p className="text-slate-500">No OPD visits found for selected doctor</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {visits.map((visit) => (
            <div
              key={visit.id}
              className="relative rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold">
                    #{visit.token_number}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {visit.patient_name || `Patient ${visit.patient_id.slice(0, 8)}...`}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      {visit.patient_mobile && (
                        <span>{visit.patient_mobile}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {visit.visit_type === "walk_in" ? "Walk-in" : "From Appointment"}
                      </span>
                      {visit.checked_in_at && (
                        <span>
                          {formatDate(visit.checked_in_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2">
                  <span className={`pill flex items-center gap-1 px-2 py-0.5 text-xs font-normal ${getStatusColor(visit.status)}`}>
                    {getStatusIcon(visit.status)}
                    <span className="capitalize">{visit.status.replace("_", " ")}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {visit.status === "checked_in" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(visit.id, "in_consultation")}
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
                        onClick={() => handleUpdateStatus(visit.id, "completed")}
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
                        onClick={() => handleUpdateStatus(visit.id, "cancelled")}
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
                        onClick={() => handlePrintOpd(visit.id)}
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
                        onClick={() => handleUpdateStatus(visit.id, "completed")}
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
                        onClick={() => handleUpdateStatus(visit.id, "cancelled")}
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
                        onClick={() => handlePrintOpd(visit.id)}
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden printable slip */}
      {printVisitData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printRef} className="print-content">
            <OpdSlipPrint
              patient={{
                id: printVisitData.patient.id,
                name: `${printVisitData.patient.first_name} ${printVisitData.patient.last_name || ""}`.trim(),
                mobile: printVisitData.patient.mobile,
                healthId: printVisitData.patient.abha_id || "",
                age: printVisitData.patient.date_of_birth 
                  ? Math.floor((new Date().getTime() - new Date(printVisitData.patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))
                  : 0,
                gender: printVisitData.patient.gender,
                outstanding: 0,
              }}
              doctor={(() => {
                const doc = printVisitData.visit.doctor_id ? doctors.find((d) => d.id === printVisitData.visit.doctor_id) : null;
                return doc ? (doc.name || `Dr. ${doc.specialization}`) : "";
              })()}
              symptoms={printVisitData.visit.chief_complaint || ""}
              opdNumber={printVisitData.visit.visit_number}
              tokenNumber={printVisitData.visit.token_number || 0}
            />
          </div>
        </div>
      )}
    </div>
  );
}

