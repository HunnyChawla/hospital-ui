"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppSelector } from "@/redux/hooks";
import { patientsApi } from "@/services/patientsApi";
import { opdVisitsApi, VisitStatus, Visit } from "@/services/opdVisitsApi";
import { formatDate } from "@/utils/format";
import { Stethoscope, Calendar, CheckCircle2, XCircle, Clock as ClockIcon, User, Play, CheckCircle, X, Printer, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { useReactToPrint } from "react-to-print";
import { OpdSlipPrint } from "./OpdSlipPrint";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { invoicesApi, Invoice } from "@/services/invoicesApi";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [printVisitData, setPrintVisitData] = useState<{ visit: Visit; patient: any } | null>(null);
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string } | null>(null);
  const [shouldPrintInvoice, setShouldPrintInvoice] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const [openPrintDropdown, setOpenPrintDropdown] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const printInvoiceRef = useRef<HTMLDivElement>(null);
  const statusDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const printDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
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
        page: currentPage,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
        doctor_id: selectedDoctorId,
        visit_date: selectedDate,
      });
      
      setVisits(response.items);
      setTotalPages(response.total_pages);
      setTotal(response.total);
    } catch (error: any) {
      console.error("Failed to fetch OPD visits:", error);
      setVisits([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, selectedDoctorId, selectedDate, sortBy, sortOrder]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
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

  const handlePrintInvoice = useReactToPrint({
    contentRef: printInvoiceRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  // Trigger print when printInvoiceData is set and shouldPrintInvoice is true
  useEffect(() => {
    if (printInvoiceData && shouldPrintInvoice && printInvoiceRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintInvoice();
        setShouldPrintInvoice(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printInvoiceData, shouldPrintInvoice, handlePrintInvoice]);

  // Handle print invoice from visit
  const handlePrintInvoiceFromVisit = async (visit: Visit) => {
    try {
      if (!visit.invoice_id) {
        toast.error("No invoice found for this visit");
        return;
      }
      // Fetch invoice details
      const invoice = await invoicesApi.getById(visit.invoice_id);
      
      // Fetch patient details if not available in visit
      let patientName = visit.patient_name || "Patient";
      let patientMobile = visit.patient_mobile;
      
      if (!visit.patient_name) {
        try {
          const patient = await patientsApi.getById(visit.patient_id);
          patientName = `${patient.first_name} ${patient.last_name || ""}`.trim() || "Patient";
          patientMobile = patient.mobile;
        } catch (error) {
          // Use defaults if patient fetch fails
        }
      }
      
      setPrintInvoiceData({ invoice, patientName, patientMobile });
      setShouldPrintInvoice(true);
      setOpenPrintDropdown(null);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoice");
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check status dropdowns
      Object.entries(statusDropdownRefs.current).forEach(([visitId, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          if (openStatusDropdown === visitId) {
            setOpenStatusDropdown(null);
          }
        }
      });
      // Check print dropdowns
      Object.entries(printDropdownRefs.current).forEach(([visitId, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          if (openPrintDropdown === visitId) {
            setOpenPrintDropdown(null);
          }
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openStatusDropdown, openPrintDropdown]);

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
                  {/* Status Update Dropdown */}
                  {(visit.status === "checked_in" || visit.status === "in_consultation") && (
                    <div 
                      ref={(el) => { statusDropdownRefs.current[visit.id] = el; }}
                      className="relative"
                    >
                      <button
                        onClick={() => setOpenStatusDropdown(openStatusDropdown === visit.id ? null : visit.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-sky-600"
                      >
                        <span>Update Status</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openStatusDropdown === visit.id ? 'rotate-180' : ''}`} />
                      </button>
                      {openStatusDropdown === visit.id && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-slate-200 bg-white shadow-xl">
                          {visit.status === "checked_in" && (
                            <button
                              onClick={() => {
                                handleUpdateStatus(visit.id, "in_consultation");
                                setOpenStatusDropdown(null);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-amber-50 hover:text-amber-700 first:rounded-t-lg"
                            >
                              <Play className="h-4 w-4 text-amber-500" />
                              Start Consultation
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleUpdateStatus(visit.id, "completed");
                              setOpenStatusDropdown(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            Complete
                          </button>
                          <button
                            onClick={() => {
                              handleUpdateStatus(visit.id, "cancelled");
                              setOpenStatusDropdown(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-rose-50 hover:text-rose-700 last:rounded-b-lg"
                          >
                            <X className="h-4 w-4 text-rose-500" />
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Print Dropdown */}
                  <div 
                    ref={(el) => { printDropdownRefs.current[visit.id] = el; }}
                    className="relative"
                  >
                    <button
                      onClick={() => setOpenPrintDropdown(openPrintDropdown === visit.id ? null : visit.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-sky-600"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openPrintDropdown === visit.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openPrintDropdown === visit.id && (
                      <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-slate-200 bg-white shadow-xl">
                        <button
                          onClick={() => {
                            handlePrintOpd(visit.id);
                            setOpenPrintDropdown(null);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-sky-50 hover:text-sky-700 first:rounded-t-lg"
                        >
                          <Printer className="h-4 w-4 text-sky-500" />
                          Print OPD
                        </button>
                        {visit.invoice_id && (
                          <button
                            onClick={() => handlePrintInvoiceFromVisit(visit)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-sky-50 hover:text-sky-700 last:rounded-b-lg"
                          >
                            <Printer className="h-4 w-4 text-sky-500" />
                            Print Invoice
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, total)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{total}</span> visits
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
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
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
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

      {/* Hidden printable invoice */}
      {printInvoiceData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printInvoiceRef} className="print-content">
            <InvoicePrint
              invoice={printInvoiceData.invoice}
              patientName={printInvoiceData.patientName}
              patientMobile={printInvoiceData.patientMobile}
            />
          </div>
        </div>
      )}
    </div>
  );
}

