"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAppSelector } from "@/redux/hooks";
import { useOpdVisits, useUpdateOpdVisitStatus, useCompleteDilation } from "@/hooks/queries/useOpdVisits";
import { patientsApi } from "@/services/patientsApi";
import { opdVisitsApi, VisitStatus, Visit } from "@/services/opdVisitsApi";
import { prescriptionsApi } from "@/services/prescriptionsApi";
import { formatDate, getTodayDateLocal } from "@/utils/format";
import { Stethoscope, Calendar, CheckCircle2, XCircle, Clock as ClockIcon, User, Play, CheckCircle, X, Printer, ChevronLeft, ChevronRight, FileText, Receipt, Download, Loader2, RotateCcw, Droplets, LayoutGrid, List } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { useReactToPrint } from "react-to-print";
import { OpdSlipPrint } from "./OpdSlipPrint";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { InvoicePaymentReceiptPrint } from "@/components/payments/InvoicePaymentReceiptPrint";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi } from "@/services/paymentsApi";
import { getTenantIdForApi } from "@/utils/auth";
import { CancellationRefundAcknowledgmentModal } from "@/components/common/CancellationRefundAcknowledgmentModal";
import { useTenant } from "@/hooks/useTenant";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { usePermissions } from "@/hooks/usePermissions";
import { PrescribedLabBookingModal } from "../lab-bookings/PrescribedLabBookingModal";
import { Beaker } from "lucide-react";

interface OpdListProps {
  doctorId?: string;
}

// Print Buttons Group Component for OPD Visits
function PrintButtonsGroup({
  visit,
  onPrintOpd,
  onPrintInvoice,
  onPrintPayment
}: {
  visit: Visit;
  onPrintOpd: () => void;
  onPrintInvoice: () => void;
  onPrintPayment: () => void;
}) {
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position using fixed positioning to avoid overflow clipping
  useEffect(() => {
    if (!showPrintDropdown || !buttonRef.current) {
      setDropdownPosition(null);
      return;
    }

    const calculatePosition = () => {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 150; // Approximate height of dropdown menu
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Calculate position - open upward if not enough space below
      const top = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight
        ? rect.top - dropdownHeight - 4 // 4px margin
        : rect.bottom + 4; // 4px margin

      // Position from right edge of viewport
      const right = window.innerWidth - rect.right;

      setDropdownPosition({ top, right });
    };

    // Calculate position after a small delay to ensure DOM is updated
    const timeoutId = setTimeout(calculatePosition, 0);

    // Recalculate on scroll/resize
    window.addEventListener("scroll", calculatePosition, true);
    window.addEventListener("resize", calculatePosition);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", calculatePosition, true);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [showPrintDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showPrintDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPrintDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPrintDropdown]);

  const hasInvoice = !!visit.invoice_id;
  const hasPayment = !!visit.payment_id;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setShowPrintDropdown(!showPrintDropdown);
        }}
        className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
        style={{ width: "2rem" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.width = "auto";
          e.currentTarget.style.paddingLeft = "0.75rem";
          e.currentTarget.style.paddingRight = "0.75rem";
        }}
        onMouseLeave={(e) => {
          if (!showPrintDropdown) {
            e.currentTarget.style.width = "2rem";
            e.currentTarget.style.paddingLeft = "0.5rem";
            e.currentTarget.style.paddingRight = "0.5rem";
          }
        }}
        title="Print"
      >
        <Printer className="h-4 w-4 shrink-0" />
        <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Print</span>
      </button>

      {showPrintDropdown && dropdownPosition && (
        <div
          className="fixed z-50 w-48 rounded-lg border border-slate-200 bg-white shadow-lg"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrintOpd();
              setShowPrintDropdown(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Print OPD
          </button>
          {hasInvoice ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrintInvoice();
                setShowPrintDropdown(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" />
              Print Invoice
            </button>
          ) : null}
          {hasPayment ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrintPayment();
                setShowPrintDropdown(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Receipt className="h-4 w-4" />
              Print Payment Receipt
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Compact Action Button with Tooltip
function CompactActionButton({
  onClick,
  icon: Icon,
  title,
  color,
  disabled = false,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: "amber" | "emerald" | "rose" | "slate" | "sky" | "indigo" | "violet";
  disabled?: boolean;
}) {
  const colorClasses = {
    amber: "bg-amber-500 hover:bg-amber-600",
    emerald: "bg-emerald-500 hover:bg-emerald-600",
    rose: "bg-rose-500 hover:bg-rose-600",
    slate: "bg-slate-500 hover:bg-slate-600",
    sky: "bg-sky-500 hover:bg-sky-600",
    indigo: "bg-indigo-500 hover:bg-indigo-600",
    violet: "bg-violet-500 hover:bg-violet-600",
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-white transition-all ${colorClasses[color]} disabled:cursor-not-allowed disabled:opacity-50`}
      title={title}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// Visit List Row Component - compact horizontal display for list view
function VisitListRow({
  visit,
  actions,
  getStatusIcon,
  getStatusColor,
  onPrintOpd,
  onPrintInvoice,
  onPrintPayment,
}: {
  visit: Visit;
  actions: Array<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    color: "amber" | "emerald" | "rose" | "slate" | "sky" | "indigo" | "violet";
    onClick: () => void;
  }>;
  getStatusIcon: (status: string) => React.ReactElement;
  getStatusColor: (status: string) => string;
  onPrintOpd: () => void;
  onPrintInvoice: () => void;
  onPrintPayment: () => void;
}) {
  const isDilating = visit.status === "dilation_in_progress";
  const dilationOverdue = isDilating && visit.dilation_started_at &&
    new Date() > new Date(new Date(visit.dilation_started_at).getTime() + (visit.dilation_duration_minutes || 0) * 60000);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm hover:border-slate-200 hover:shadow transition">
      {/* Token */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold text-sm">
        #{visit.token_number}
      </div>

      {/* Patient Name */}
      <div className="min-w-0 flex-1 max-w-[180px]">
        <p className="font-semibold text-slate-900 text-sm truncate">
          {visit.patient_name || `Patient ${visit.patient_id.slice(0, 8)}...`}
        </p>
        {visit.patient_mobile && (
          <p className="text-xs text-slate-500 truncate sm:hidden">{visit.patient_mobile}</p>
        )}
      </div>

      {/* Mobile - hidden on small screens */}
      <div className="hidden sm:block min-w-[100px] text-xs text-slate-500">
        {visit.patient_mobile || "-"}
      </div>

      {/* Visit Type - hidden on small screens */}
      <div className="hidden md:block min-w-[80px]">
        <span className={`text-xs px-2 py-0.5 rounded ${visit.visit_type === "emergency" ? "bg-rose-50 text-rose-700 font-medium" : "text-slate-600"}`}>
          {visit.visit_type === "walk_in" ? "Walk-in" : visit.visit_type === "appointment" ? "Appt" : visit.visit_type === "emergency" ? "Emergency" : String(visit.visit_type || "").replace("_", " ")}
        </span>
      </div>

      {/* Status Badge */}
      <div className="min-w-[140px] flex flex-col gap-1">
        <div>
          {isDilating ? (
            <div className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${dilationOverdue ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-violet-50 text-violet-700 border-violet-200"
              }`}>
              <Droplets className="h-3 w-3" />
              <span>Dilating</span>
              {visit.dilation_started_at && (
                <>
                  <span className="text-slate-300">|</span>
                  <ClockIcon className="h-3 w-3" />
                  <span>
                    {dilationOverdue
                      ? "Overdue"
                      : new Date(new Date(visit.dilation_started_at).getTime() + (visit.dilation_duration_minutes || 0) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className={`pill inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium ${getStatusColor(visit.status)}`}>
              {getStatusIcon(visit.status)}
              <span className="capitalize">{visit.status.replace(/_/g, " ")}</span>
            </span>
          )}
        </div>
        {(visit.doctor_name || visit.optometrist_name) && (
          <div className="flex flex-col gap-0.5 text-[10px] text-slate-500">
            {visit.doctor_name && (
              <div className="flex items-center gap-1" title="Assigned Doctor">
                <Stethoscope className="h-2.5 w-2.5 text-sky-500 shrink-0" />
                <span className="truncate max-w-[120px] font-medium">{visit.doctor_name}</span>
              </div>
            )}
            {visit.optometrist_name && (
              <div className="flex items-center gap-1" title="Assigned Optometrist">
                <User className="h-2.5 w-2.5 text-purple-500 shrink-0" />
                <span className="truncate max-w-[120px] font-medium">{visit.optometrist_name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Optometrist indicator - hidden on small screens */}
      <div className="hidden lg:block w-6">
        {visit.optometrist_investigation_completed_at && (
          <span className="flex items-center justify-center rounded border border-emerald-200 bg-emerald-50 p-1" title={`Optometrist done at ${new Date(visit.optometrist_investigation_completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}>
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          </span>
        )}
      </div>

      {/* Time - hidden on small screens */}
      <div className="hidden lg:block min-w-[60px] text-xs text-slate-500">
        {visit.checked_in_at ? new Date(visit.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {actions.map((action, idx) => (
          <CompactActionButton
            key={idx}
            icon={action.icon}
            title={action.title}
            color={action.color}
            onClick={action.onClick}
          />
        ))}
        <PrintButtonsGroup
          visit={visit}
          onPrintOpd={onPrintOpd}
          onPrintInvoice={onPrintInvoice}
          onPrintPayment={onPrintPayment}
        />
      </div>
    </div>
  );
}

// Visit Card Component - unified compact card for grid view
function VisitCard({
  visit,
  actions,
  getStatusIcon,
  getStatusColor,
  onPrintOpd,
  onPrintInvoice,
  onPrintPayment,
}: {
  visit: Visit;
  actions: Array<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    color: "amber" | "emerald" | "rose" | "slate" | "sky" | "indigo" | "violet";
    onClick: () => void;
  }>;
  getStatusIcon: (status: string) => React.ReactElement;
  getStatusColor: (status: string) => string;
  onPrintOpd: () => void;
  onPrintInvoice: () => void;
  onPrintPayment: () => void;
}) {
  const isDilating = visit.status === "dilation_in_progress";
  const dilationOverdue = isDilating && visit.dilation_started_at &&
    new Date() > new Date(new Date(visit.dilation_started_at).getTime() + (visit.dilation_duration_minutes || 0) * 60000);

  return (
    <div className="relative flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm h-full hover:border-slate-200 hover:shadow transition">
      {/* Header: Token + Patient Info */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold">
          #{visit.token_number}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 truncate">
            {visit.patient_name || `Patient ${visit.patient_id.slice(0, 8)}...`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {visit.patient_mobile && <span>{visit.patient_mobile}</span>}
            <span className={`flex items-center gap-1 ${visit.visit_type === "emergency" ? "pill px-2 py-0.5 bg-rose-50 text-rose-700 font-medium" : ""}`}>
              <User className="h-3 w-3" />
              {visit.visit_type === "walk_in" ? "Walk-in" : visit.visit_type === "appointment" ? "Appt" : visit.visit_type === "emergency" ? "Emergency" : String(visit.visit_type || "").replace("_", " ")}
            </span>
            {visit.checked_in_at && (
              <span>{new Date(visit.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
        </div>
      </div>

      {/* Doctor & Optometrist Assignment Details */}
      {(visit.doctor_name || visit.optometrist_name) && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-slate-600">
          {visit.doctor_name && (
            <div className="flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5" title="Assigned Doctor">
              <Stethoscope className="h-3 w-3 text-sky-500 shrink-0" />
              <span>Doc: <span className="font-semibold text-slate-800">{visit.doctor_name}</span></span>
            </div>
          )}
          {visit.optometrist_name && (
            <div className="flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5" title="Assigned Optometrist">
              <User className="h-3 w-3 text-purple-500 shrink-0" />
              <span>Optom: <span className="font-semibold text-slate-800">{visit.optometrist_name}</span></span>
            </div>
          )}
        </div>
      )}

      {/* Footer: Status + Actions - Unified Compact Layout */}
      <div className="mt-4 border-t border-slate-50 pt-3">
        <div className="flex items-center justify-between gap-2">
          {/* Status Badges */}
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Main status badge */}
            {isDilating ? (
              <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold ${dilationOverdue ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-violet-50 text-violet-700 border-violet-200"
                }`}>
                <Droplets className="h-3 w-3" />
                <span>Dilating</span>
                {visit.dilation_started_at && (
                  <>
                    <span className="text-slate-300">|</span>
                    <ClockIcon className="h-3 w-3" />
                    <span className="font-medium">
                      {dilationOverdue
                        ? "Overdue"
                        : new Date(new Date(visit.dilation_started_at).getTime() + (visit.dilation_duration_minutes || 0) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className={`pill flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium ${getStatusColor(visit.status)}`}>
                {getStatusIcon(visit.status)}
                <span className="capitalize">{visit.status.replace(/_/g, " ")}</span>
              </span>
            )}

            {/* Optometrist completed indicator */}
            {visit.optometrist_investigation_completed_at && (
              <div className="group relative">
                <span className="flex cursor-help items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 p-1" title="Optometrist investigation completed">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </span>
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-0 mb-2 hidden w-max min-w-[160px] flex-col gap-1 rounded-lg bg-slate-800 p-2.5 text-xs text-white shadow-xl ring-1 ring-white/10 group-hover:flex z-50">
                  <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    Optometrist Done
                  </div>
                  <div className="text-slate-300 text-[10px]">
                    {new Date(visit.optometrist_investigation_completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {visit.optometrist_name && ` - ${visit.optometrist_name}`}
                  </div>
                  <div className="absolute top-full left-3 -mt-1 h-2 w-2 rotate-45 bg-slate-800"></div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons - always compact */}
          <div className="flex items-center gap-1.5 shrink-0">
            {actions.map((action, idx) => (
              <CompactActionButton
                key={idx}
                icon={action.icon}
                title={action.title}
                color={action.color}
                onClick={action.onClick}
              />
            ))}
            <PrintButtonsGroup
              visit={visit}
              onPrintOpd={onPrintOpd}
              onPrintInvoice={onPrintInvoice}
              onPrintPayment={onPrintPayment}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OpdList({ doctorId }: OpdListProps) {
  // Use Redux centralized doctors cache (fetched once in dashboard layout)
  const { list: doctors } = useAppSelector((s) => s.doctors);
  const { userRole } = usePermissions();
  const [bookingVisit, setBookingVisit] = useState<Visit | null>(null);
  const { tenant, hospitalName, logoDataUrl } = useTenant();
  const [exporting, setExporting] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(() => {
    if (typeof window !== "undefined") {
      return doctorId || localStorage.getItem("last_selected_doctor_id") || "";
    }
    return doctorId || "";
  });

  // Save selected doctor to local storage
  useEffect(() => {
    if (selectedDoctorId && typeof window !== "undefined") {
      localStorage.setItem("last_selected_doctor_id", selectedDoctorId);
    }
  }, [selectedDoctorId]);

  // Date range state - default to today
  const [startDate, setStartDate] = useState<string>(getTodayDateLocal());
  const [endDate, setEndDate] = useState<string>(getTodayDateLocal());
  const [dateRangeError, setDateRangeError] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // React Query hook to fetch OPD visits - automatic deduplication!
  const { data: visitsResponse, isLoading: loading, error } = useOpdVisits({
    page: currentPage,
    page_size: pageSize,
    doctor_id: selectedDoctorId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  });

  const visits = visitsResponse?.items ?? [];
  const totalPages = visitsResponse?.total_pages ?? 1;
  const total = visitsResponse?.total ?? 0;

  // React Query mutation for updating visit status
  const updateStatusMutation = useUpdateOpdVisitStatus();
  const completeDilationMutation = useCompleteDilation();

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
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string } | null>(null);
  const [printPaymentInvoiceId, setPrintPaymentInvoiceId] = useState<string | null>(null);
  const [shouldPrintInvoice, setShouldPrintInvoice] = useState(false);
  const [shouldPrintPayment, setShouldPrintPayment] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [pendingCancellation, setPendingCancellation] = useState<{ visitId: string; visitNumber?: string; paymentAmount?: number } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const printInvoiceRef = useRef<HTMLDivElement>(null);
  const printPaymentRef = useRef<HTMLDivElement>(null);

  // View mode state - persisted in localStorage
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('opd_visits_view') as 'list' | 'grid') || 'grid';
    }
    return 'grid';
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printVisitData ? `OPD_Slip_${printVisitData.visit.visit_number}` : "OPD_Slip",
  });

  const handlePrintInvoice = useReactToPrint({
    contentRef: printInvoiceRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const handlePrintPayment = useReactToPrint({
    contentRef: printPaymentRef,
    documentTitle: printPaymentInvoiceId ? `PaymentReceipt_Invoice_${printPaymentInvoiceId}` : "Payment Receipt",
  });

  useEffect(() => {
    // Set default doctor when doctors are loaded IF nothing is selected yet
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  // Set default dates on client side only to avoid hydration mismatch
  useEffect(() => {
    const today = getTodayDateLocal();
    if (!startDate) {
      setStartDate(today);
      setEndDate(today);
    }
  }, [startDate]);

  // Validate date range (max 3 months)
  const validateDateRange = useCallback((start: string, end: string): string => {
    if (!start || !end) return "";

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);

    if (endDateObj < startDateObj) {
      return "End date must be after or equal to start date";
    }

    // Calculate difference in months
    const monthsDiff = (endDateObj.getFullYear() - startDateObj.getFullYear()) * 12 +
      (endDateObj.getMonth() - startDateObj.getMonth());

    if (monthsDiff > 3) {
      return "Date range cannot exceed 3 months";
    }

    return "";
  }, []);

  // Update validation when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const error = validateDateRange(startDate, endDate);
      setDateRangeError(error);
    } else {
      setDateRangeError("");
    }
  }, [startDate, endDate, validateDateRange]);

  // Calculate max date for end date (3 months from start date, minus 1 day to ensure it's exactly 3 months, but not beyond today)
  const getMaxEndDate = useCallback((): string => {
    if (!startDate) return getTodayDateLocal();
    const startDateObj = new Date(startDate);
    const maxDate = new Date(startDateObj);
    maxDate.setMonth(maxDate.getMonth() + 3);
    // Subtract 1 day to ensure the range is at most 3 months (not more than 3 months)
    maxDate.setDate(maxDate.getDate() - 1);
    const today = new Date(getTodayDateLocal());
    // Return the earlier of: calculated max date or today
    return maxDate <= today ? maxDate.toISOString().split("T")[0] : getTodayDateLocal();
  }, [startDate]);

  // Calculate min date for start date (3 months before end date, plus 1 day to ensure it's exactly 3 months)
  const getMinStartDate = useCallback((): string => {
    if (!endDate) return "";
    const endDateObj = new Date(endDate);
    const minDate = new Date(endDateObj);
    minDate.setMonth(minDate.getMonth() - 3);
    // Add 1 day to ensure the range is at most 3 months (not more than 3 months)
    minDate.setDate(minDate.getDate() + 1);
    return minDate.toISOString().split("T")[0];
  }, [endDate]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [selectedDoctorId, startDate, endDate]);

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
        return <User className="h-3 w-3 text-slate-500" />;
      // Check-in statuses
      case "checked_in":
      case "checked_in_opd":
        return <CheckCircle2 className="h-3 w-3 text-sky-500" />;
      // Optometrist statuses
      case "awaiting_optometrist":
        return <ClockIcon className="h-3 w-3 text-purple-500" />;
      case "optometrist_assigned":
        return <User className="h-3 w-3 text-purple-500" />;
      case "optometrist_investigation_in_progress":
        return <Play className="h-3 w-3 text-purple-500" />;
      case "optometrist_investigation_completed":
        return <CheckCircle className="h-3 w-3 text-purple-500" />;
      // Doctor statuses
      case "awaiting_doctor":
        return <ClockIcon className="h-3 w-3 text-amber-500" />;
      case "doctor_assigned":
        return <Stethoscope className="h-3 w-3 text-amber-500" />;
      case "in_consultation":
      case "consultation_in_progress":
        return <Play className="h-3 w-3 text-amber-500" />;
      // Dilation statuses
      case "dilation_in_progress":
        return <ClockIcon className="h-3 w-3 text-indigo-500" />;
      case "dilation_completed":
        return <CheckCircle className="h-3 w-3 text-indigo-500" />;
      default:
        return <ClockIcon className="h-3 w-3 text-amber-500" />;
    }
  };

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

  // Get action buttons for each status - used by both list and card views
  const getStatusActions = (visit: Visit): Array<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    color: "amber" | "emerald" | "rose" | "slate" | "sky" | "indigo" | "violet";
    onClick: () => void;
  }> => {
    const actions: Array<{
      icon: React.ComponentType<{ className?: string }>;
      title: string;
      color: "amber" | "emerald" | "rose" | "slate" | "sky" | "indigo" | "violet";
      onClick: () => void;
    }> = [];

    switch (visit.status) {
      case "checked_in":
        actions.push(
          { icon: Play, title: "Start Consultation", color: "amber", onClick: () => handleUpdateStatus(visit.id, "in_consultation") },
          { icon: CheckCircle, title: "Complete", color: "emerald", onClick: () => handleUpdateStatus(visit.id, "completed") },
          { icon: X, title: "Cancel", color: "rose", onClick: () => handleUpdateStatus(visit.id, "cancelled", visit) },
          { icon: User, title: "No Show", color: "slate", onClick: () => handleUpdateStatus(visit.id, "no_show") }
        );
        break;
      case "in_consultation":
      case "consultation_in_progress":
        actions.push(
          { icon: CheckCircle, title: "Complete", color: "emerald", onClick: () => handleUpdateStatus(visit.id, "completed") },
          { icon: X, title: "Cancel", color: "rose", onClick: () => handleUpdateStatus(visit.id, "cancelled", visit) }
        );
        break;
      case "dilation_in_progress":
        actions.push(
          { icon: CheckCircle, title: "Complete Dilation", color: "emerald", onClick: () => handleCompleteDilation(visit.id) }
        );
        break;
      case "no_show":
        actions.push({
          icon: RotateCcw,
          title: "Recall Patient",
          color: "sky",
          onClick: () => {
            const newStatus = visit.optometrist_investigation_completed_at
              ? "awaiting_doctor"
              : "awaiting_optometrist";
            handleUpdateStatus(visit.id, newStatus as VisitStatus);
          },
        });
        break;
      // completed, cancelled, and other statuses: no action buttons (print only)
    }

    // Append "Prescribed Lab Tests" action for receptionists/admin/owners
    const isReceptionistOrAdmin = userRole === "receptionist" || userRole === "admin" || userRole === "platform_owner";
    if (isReceptionistOrAdmin && visit.status !== "cancelled" && visit.status !== "no_show") {
      actions.push({
        icon: Beaker,
        title: "Prescribed Lab Tests",
        color: "indigo",
        onClick: () => setBookingVisit(visit),
      });
    }

    return actions;
  };

  const handleUpdateStatus = async (visitId: string, newStatus: VisitStatus, visit?: Visit) => {
    // If cancelling, check if payment exists and show acknowledgment modal
    if (newStatus === "cancelled") {
      try {
        // Use visit from list if provided, otherwise fetch it
        let visitData = visit;
        if (!visitData) {
          visitData = await opdVisitsApi.getById(visitId);
        }

        console.log("Checking cancellation for visit:", visitData.id, "payment_id:", visitData.payment_id, "invoice_id:", visitData.invoice_id);

        // Check if visit has payment_id or invoice_id (payment might be linked via invoice)
        const hasPayment = visitData.payment_id || visitData.invoice_id;

        if (hasPayment) {
          // Fetch payment details to get amount
          let paymentAmount: number | undefined;

          // Try to get payment via payment_id first
          if (visitData.payment_id) {
            try {
              const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
              const apiTenantId = getTenantIdForApi(tenantId || undefined);
              const payment = await paymentsApi.getById(visitData.payment_id, apiTenantId);
              paymentAmount = Math.abs(payment.amount);
              console.log("Found payment via payment_id:", paymentAmount);
            } catch (error) {
              console.error("Failed to fetch payment details:", error);
            }
          }
          // If no payment_id but has invoice_id, try to get payment from invoice
          if (!paymentAmount && visitData.invoice_id) {
            try {
              const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
              const apiTenantId = getTenantIdForApi(tenantId || undefined);
              const payments = await paymentsApi.getByInvoiceId(visitData.invoice_id, apiTenantId);
              // Sum all positive payments (excluding refunds)
              if (payments.length > 0) {
                paymentAmount = payments
                  .filter(p => p.amount > 0)
                  .reduce((sum, p) => sum + p.amount, 0);
                console.log("Found payments via invoice_id:", paymentAmount, "from", payments.length, "payments");
              }
            } catch (error) {
              console.error("Failed to fetch payments from invoice:", error);
            }
          }

          // Show acknowledgment modal even if we couldn't fetch amount
          console.log("Showing cancellation modal for visit:", visitData.visit_number, "with payment amount:", paymentAmount);
          setPendingCancellation({
            visitId,
            visitNumber: visitData.visit_number,
            paymentAmount,
          });
          setShowCancellationModal(true);
          return;
        } else {
          console.log("No payment found for visit:", visitData.id, "- proceeding with cancellation");
        }
      } catch (error: any) {
        console.error("Error checking payment for cancellation:", error);
        const errorMessage = getErrorMessage(error);
        toast.error(errorMessage || "Failed to fetch visit details");
        return;
      }
    }

    // Proceed with status update (non-cancellation or cancellation without payment)
    await performStatusUpdate(visitId, newStatus);
  };

  const performStatusUpdate = async (visitId: string, newStatus: VisitStatus) => {
    setCancelling(newStatus === "cancelled");
    try {
      await updateStatusMutation.mutateAsync({
        visitId,
        newStatus,
      });
      // React Query mutation already shows toast and invalidates cache!
    } catch (error: any) {
      // Error handling is done in the mutation onError callback
    } finally {
      setCancelling(false);
      setShowCancellationModal(false);
      setPendingCancellation(null);
    }
  };

  const handleCompleteDilation = async (visitId: string) => {
    try {
      await completeDilationMutation.mutateAsync(visitId);
    } catch (error) {
      // Error handling is in the mutation
    }
  };

  const handleConfirmCancellation = async () => {
    if (!pendingCancellation) return;
    await performStatusUpdate(pendingCancellation.visitId, "cancelled");
  };

  const handlePrintOpd = async (visitId: string) => {
    try {
      // Fetch full visit details
      const visit = await opdVisitsApi.getById(visitId);

      // Fetch patient details
      const patient = await patientsApi.getById(visit.patient_id);

      // Fetch finalized prescription for this visit (if exists)
      let prescription = undefined;
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const prescriptions = await prescriptionsApi.list({
          visit_id: visitId,
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
              generic_name: item.generic_name,
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

  const handlePrintInvoiceClick = async (visitId: string, invoiceId: string) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId || undefined);

      // Fetch invoice details
      const invoice = await invoicesApi.getById(invoiceId, apiTenantId);

      // Fetch patient details
      const patient = await patientsApi.getById(invoice.patient_id);
      const patientName = `${patient.first_name} ${patient.last_name || ""}`.trim();
      const patientMobile = patient.mobile;

      // Set print data
      setPrintInvoiceData({
        invoice,
        patientName,
        patientMobile,
      });
      setShouldPrintInvoice(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare invoice for printing");
    }
  };

  const handlePrintPaymentReceiptClick = async (visitId: string, paymentId: string, invoiceId?: string | null) => {
    if (!invoiceId) {
      toast.error("Invoice ID not available for this visit");
      return;
    }

    try {
      setPrintPaymentInvoiceId(invoiceId);
      setShouldPrintPayment(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare payment receipt for printing");
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

  // Trigger print when invoice print data is ready
  useEffect(() => {
    if (shouldPrintInvoice && printInvoiceData && printInvoiceRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintInvoice();
        setShouldPrintInvoice(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintInvoice, printInvoiceData, handlePrintInvoice]);

  // Trigger print when payment receipt print data is ready
  useEffect(() => {
    if (shouldPrintPayment && printPaymentInvoiceId && printPaymentRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintPayment();
        setShouldPrintPayment(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintPayment, printPaymentInvoiceId, handlePrintPayment]);

  const handleExportPDF = useCallback(async () => {
    // Validate filters
    if (!selectedDoctorId) {
      toast.error("Please select a doctor");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select date range");
      return;
    }

    if (dateRangeError) {
      toast.error(dateRangeError);
      return;
    }

    setExporting(true);
    try {
      // Fetch all visits without pagination
      const response = await opdVisitsApi.list({
        doctor_id: selectedDoctorId,
        start_date: startDate,
        end_date: endDate,
        // Omit page and page_size to get all results
      });

      // Get all visits from response
      const allVisits = response.items || [];

      if (allVisits.length === 0) {
        toast.error("No visits found to export");
        setExporting(false);
        return;
      }

      // Get selected doctor name
      const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
      const doctorName = selectedDoctor?.name || selectedDoctor?.specialization || "Unknown Doctor";

      // Format address similar to PrintHeader
      const formatAddress = () => {
        if (!tenant) return null;
        const parts = [
          tenant.address,
          tenant.city,
          tenant.state,
          tenant.pincode,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : null;
      };
      const address = formatAddress();

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const centerX = pageWidth / 2;
      let yPos = 15;

      // Add logo if available (similar to PrintHeader)
      if (logoDataUrl) {
        try {
          // Load image to get dimensions
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = logoDataUrl;
          });

          // Calculate logo size (max 24mm height, maintain aspect ratio)
          // Convert pixels to mm (assuming 96 DPI: 1px ≈ 0.264583mm)
          const pxToMm = 0.264583;
          const maxHeightMm = 24; // 24mm (similar to max-h-24 which is 96px ≈ 25.4mm)

          let logoWidthMm = img.width * pxToMm;
          let logoHeightMm = img.height * pxToMm;

          // Scale down if too large
          if (logoHeightMm > maxHeightMm) {
            const scale = maxHeightMm / logoHeightMm;
            logoWidthMm = logoWidthMm * scale;
            logoHeightMm = maxHeightMm;
          }

          // Center the logo horizontally
          const logoX = centerX - (logoWidthMm / 2);

          // Detect image format from data URL
          let imageFormat: string = 'PNG';
          if (logoDataUrl.startsWith('data:image/jpeg') || logoDataUrl.startsWith('data:image/jpg')) {
            imageFormat = 'JPEG';
          } else if (logoDataUrl.startsWith('data:image/png')) {
            imageFormat = 'PNG';
          }

          // Add logo to PDF
          doc.addImage(logoDataUrl, imageFormat, logoX, yPos, logoWidthMm, logoHeightMm);
          yPos += logoHeightMm + 5; // Add space after logo
        } catch (error) {
          console.warn("Could not add logo to PDF:", error);
        }
      }

      // Hospital Name (centered, bold, large) - matching PrintHeader style
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const hospitalNameText = (tenant?.name || hospitalName || "HOSPITAL").toUpperCase();
      doc.text(hospitalNameText, centerX, yPos, { align: "center" });
      yPos += 8;

      // Address and Contact Information (centered, smaller text)
      if (address || tenant?.phone_no || tenant?.email || tenant?.website) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);

        if (address) {
          doc.text(address, centerX, yPos, { align: "center" });
          yPos += 5;
        }

        const contactParts: string[] = [];
        if (tenant?.phone_no) contactParts.push(`Phone: ${tenant.phone_no}`);
        if (tenant?.email) contactParts.push(`Email: ${tenant.email}`);
        if (tenant?.website) contactParts.push(`Website: ${tenant.website}`);

        if (contactParts.length > 0) {
          doc.text(contactParts.join(" | "), centerX, yPos, { align: "center" });
          yPos += 6;
        }
      }

      doc.setTextColor(0, 0, 0);

      // Document Type (centered) - matching PrintHeader style
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("OPD Visits Report", centerX, yPos, { align: "center" });
      yPos += 8;

      // Filter Details
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);

      doc.setLineWidth(0.5);
      doc.setDrawColor(30, 41, 59);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 6;

      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Doctor", 14, yPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(doctorName, 14, yPos + 4);

      const dateRangeText = `${formatDate(startDate)} to ${formatDate(endDate)}`;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Date Range", pageWidth - 14, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(dateRangeText, pageWidth - 14, yPos + 4, { align: "right" });

      yPos += 8;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Export Date: ${new Date().toLocaleString()}`, 14, yPos);
      doc.text(`Total: ${allVisits.length} visits`, pageWidth - 14, yPos, { align: "right" });
      yPos += 8;

      // Prepare table data
      const tableData = allVisits.map((visit) => {
        // Format status
        const statusStr = visit.status || "";
        const formattedStatus = statusStr.charAt(0).toUpperCase() + statusStr.slice(1).replace(/_/g, " ");

        // Format visit type
        const visitTypeStr = visit.visit_type || "";
        const formattedVisitType = visitTypeStr.charAt(0).toUpperCase() + visitTypeStr.slice(1).replace(/_/g, " ");

        // Get visit date from created_at
        const visitDate = visit.created_at ? formatDate(visit.created_at.split("T")[0]) : "-";

        return [
          visitDate,
          visit.visit_number || "-",
          visit.patient_name || `Patient ${visit.patient_id.slice(0, 8)}...`,
          visit.patient_mobile || "-",
          formattedStatus,
          formattedVisitType,
        ];
      });

      // Calculate available width
      const availableWidth = pageWidth - 28;

      // Add table
      autoTable(doc, {
        startY: yPos,
        head: [["Date", "Visit #", "Patient Name", "Mobile", "Status", "Visit Type"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.18 }, // Date - 18%
          1: { cellWidth: availableWidth * 0.18 }, // Visit # - 18% (increased from 15%)
          2: { cellWidth: availableWidth * 0.26 }, // Patient Name - 26% (reduced from 30%)
          3: { cellWidth: availableWidth * 0.15 }, // Mobile - 15%
          4: { cellWidth: availableWidth * 0.10 }, // Status - 10%
          5: { cellWidth: availableWidth * 0.13 }, // Visit Type - 13% (increased from 10%)
        },
        margin: { left: 14, right: 14 },
      });

      // Generate filename
      const filename = `opd_visits_${startDate}_to_${endDate}.pdf`;

      // Save PDF
      doc.save(filename);

      toast.success(`Exported ${allVisits.length} visits successfully`);
    } catch (error: any) {
      console.error("Failed to export visits:", error);

      // Extract error message
      const errorMessage = getErrorMessage(error);

      // Check if it's a date range validation error from API
      if (errorMessage.includes("Date range cannot exceed 3 months") ||
        errorMessage.includes("90 days") ||
        error?.response?.data?.detail?.some?.((err: any) =>
          err.type === "business_logic_error" && err.msg?.includes("Date range")
        )) {
        setDateRangeError("Date range cannot exceed 3 months");
        toast.error("Date range cannot exceed 3 months");
      } else {
        toast.error(errorMessage || "Failed to export visits");
      }
    } finally {
      setExporting(false);
    }
  }, [selectedDoctorId, startDate, endDate, dateRangeError, doctors, tenant, hospitalName, logoDataUrl]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 flex-1">
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
              Start Date
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate ? (endDate < getTodayDateLocal() ? endDate : getTodayDateLocal()) : getTodayDateLocal()}
              min={endDate ? getMinStartDate() : undefined}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </label>
          <label className="space-y-1 sm:col-span-2 lg:col-span-1">
            <span className="text-slate-600 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              End Date
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              max={startDate ? getMaxEndDate() : getTodayDateLocal()}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => {
                setViewMode("list");
                localStorage.setItem("opd_visits_view", "list");
              }}
              className={`flex items-center justify-center rounded-lg p-2 transition ${viewMode === "list" ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-50"
                }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setViewMode("grid");
                localStorage.setItem("opd_visits_view", "grid");
              }}
              className={`flex items-center justify-center rounded-lg p-2 transition ${viewMode === "grid" ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-50"
                }`}
              title="Card View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={!selectedDoctorId || !startDate || !endDate || !!dateRangeError || exporting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-sky-500 disabled:hover:to-teal-500 lg:w-auto"
            title="Export all visits to PDF"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Export PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {dateRangeError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm text-rose-700">{dateRangeError}</p>
        </div>
      )}

      {loading ? (
        <SkeletonRow rows={3} />
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
          <p className="text-sm text-rose-800">
            Failed to load visits. Please try again.
          </p>
        </div>
      ) : visits.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <p className="text-slate-500">No OPD visits found for selected doctor and date range</p>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-2">
          {/* Header row for list view */}
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
            <div className="w-9">Token</div>
            <div className="flex-1 max-w-[180px]">Patient</div>
            <div className="min-w-[100px] hidden sm:block">Mobile</div>
            <div className="min-w-[80px] hidden md:block">Type</div>
            <div className="min-w-[140px]">Status</div>
            <div className="w-6 hidden lg:block"></div>
            <div className="min-w-[60px] hidden lg:block">Time</div>
            <div className="shrink-0 w-[140px] text-right">Actions</div>
          </div>
          {visits.map((visit) => (
            <VisitListRow
              key={visit.id}
              visit={visit}
              actions={getStatusActions(visit)}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
              onPrintOpd={() => handlePrintOpd(visit.id)}
              onPrintInvoice={() => handlePrintInvoiceClick(visit.id, visit.invoice_id!)}
              onPrintPayment={() => handlePrintPaymentReceiptClick(visit.id, visit.payment_id!, visit.invoice_id)}
            />
          ))}
        </div>
      ) : (
        /* Grid/Card View */
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visits.map((visit) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              actions={getStatusActions(visit)}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
              onPrintOpd={() => handlePrintOpd(visit.id)}
              onPrintInvoice={() => handlePrintInvoiceClick(visit.id, visit.invoice_id!)}
              onPrintPayment={() => handlePrintPaymentReceiptClick(visit.id, visit.payment_id!, visit.invoice_id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {
        totalPages > 1 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:justify-between">
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
                <span className="hidden sm:inline">Previous</span>
              </button>
              <div className="hidden items-center gap-1 sm:flex">
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
                      className={`min-w-[2.5rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${currentPage === pageNum
                        ? "bg-sky-500 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <span className="text-sm text-slate-500 sm:hidden">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      }

      {/* Hidden printable slip */}
      {
        printVisitData && (
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
                  gender: printVisitData.patient.gender as "Male" | "Female" | "Other",
                  outstanding: 0,
                  doctor: (() => {
                    const doc = printVisitData.visit.doctor_id ? doctors.find((d) => d.id === printVisitData.visit.doctor_id) : null;
                    return doc ? (doc.name || `Dr. ${doc.specialization}`) : "";
                  })(),
                  lastVisit: printVisitData.visit.created_at || "",
                  status: "Active" as const,
                }}
                doctor={(() => {
                  const doc = printVisitData.visit.doctor_id ? doctors.find((d) => d.id === printVisitData.visit.doctor_id) : null;
                  return doc ? (doc.name || `Dr. ${doc.specialization}`) : "";
                })()}
                symptoms={printVisitData.visit.chief_complaint || ""}
                opdNumber={printVisitData.visit.visit_number}
                tokenNumber={printVisitData.visit.token_number || 0}
                prescription={printVisitData.prescription}
              />
            </div>
          </div>
        )
      }

      {/* Hidden printable invoice */}
      {
        printInvoiceData && (
          <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
            <div ref={printInvoiceRef} className="print-content">
              <InvoicePrint
                invoice={printInvoiceData.invoice}
                patientName={printInvoiceData.patientName}
                patientMobile={printInvoiceData.patientMobile}
              />
            </div>
          </div>
        )
      }

      {/* Hidden printable payment receipt */}
      {
        printPaymentInvoiceId && (
          <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
            <div ref={printPaymentRef} className="print-content">
              <InvoicePaymentReceiptPrint invoiceId={printPaymentInvoiceId} />
            </div>
          </div>
        )
      }

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

      {bookingVisit && (
        <PrescribedLabBookingModal
          isOpen={!!bookingVisit}
          onClose={() => setBookingVisit(null)}
          visitId={bookingVisit.id}
          patientId={bookingVisit.patient_id}
          patientName={bookingVisit.patient_name || undefined}
        />
      )}
    </div >
  );
}

