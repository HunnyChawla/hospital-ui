"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useDoctors } from "@/hooks/queries/useDoctors";
import { useOpdVisits, useUpdateOpdVisitStatus } from "@/hooks/queries/useOpdVisits";
import { patientsApi } from "@/services/patientsApi";
import { opdVisitsApi, VisitStatus, Visit } from "@/services/opdVisitsApi";
import { formatDate } from "@/utils/format";
import { Stethoscope, Calendar, CheckCircle2, XCircle, Clock as ClockIcon, User, Play, CheckCircle, X, Printer, ChevronLeft, ChevronRight, FileText, Receipt, Download, Loader2 } from "lucide-react";
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

export function OpdList({ doctorId }: OpdListProps) {
  // Use React Query hooks instead of Redux and manual fetching
  const { data: doctorsData } = useDoctors();
  const doctors = doctorsData ?? [];
  const { tenant, hospitalName, logoDataUrl } = useTenant();
  const [exporting, setExporting] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctorId || "");

  // Date range state - default to today
  const getTodayDate = () => new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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

  const [printVisitData, setPrintVisitData] = useState<{ visit: Visit; patient: any } | null>(null);
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
    // Set default doctor when doctors are loaded
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  // Set default dates on client side only to avoid hydration mismatch
  useEffect(() => {
    const today = getTodayDate();
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
    if (!startDate) return getTodayDate();
    const startDateObj = new Date(startDate);
    const maxDate = new Date(startDateObj);
    maxDate.setMonth(maxDate.getMonth() + 3);
    // Subtract 1 day to ensure the range is at most 3 months (not more than 3 months)
    maxDate.setDate(maxDate.getDate() - 1);
    const today = new Date(getTodayDate());
    // Return the earlier of: calculated max date or today
    return maxDate <= today ? maxDate.toISOString().split("T")[0] : getTodayDate();
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
      
      // Set print data - this will trigger the useEffect to print
      setPrintVisitData({ visit, patient });
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
      <div className="flex items-end gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 flex-1">
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
              max={endDate ? (endDate < getTodayDate() ? endDate : getTodayDate()) : getTodayDate()}
              min={endDate ? getMinStartDate() : undefined}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              End Date
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              max={startDate ? getMaxEndDate() : getTodayDate()}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </label>
        </div>
        
        <button
          onClick={handleExportPDF}
          disabled={!selectedDoctorId || !startDate || !endDate || !!dateRangeError || exporting}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-sky-500 disabled:hover:to-teal-500"
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
                      <span className={`flex items-center gap-1 ${visit.visit_type === "emergency" ? "pill px-2 py-0.5 bg-rose-50 text-rose-700 font-medium" : ""}`}>
                        <User className="h-3 w-3" />
                        {visit.visit_type === "walk_in" 
                          ? "Walk-in" 
                          : visit.visit_type === "appointment" 
                          ? "From Appointment" 
                          : visit.visit_type === "emergency"
                          ? "Emergency"
                          : String(visit.visit_type).replace("_", " ")}
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
                        onClick={() => handleUpdateStatus(visit.id, "cancelled", visit)}
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
                      <PrintButtonsGroup
                        visit={visit}
                        onPrintOpd={() => handlePrintOpd(visit.id)}
                        onPrintInvoice={() => handlePrintInvoiceClick(visit.id, visit.invoice_id!)}
                        onPrintPayment={() => handlePrintPaymentReceiptClick(visit.id, visit.payment_id!, visit.invoice_id)}
                      />
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
                        onClick={() => handleUpdateStatus(visit.id, "cancelled", visit)}
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
                      <PrintButtonsGroup
                        visit={visit}
                        onPrintOpd={() => handlePrintOpd(visit.id)}
                        onPrintInvoice={() => handlePrintInvoiceClick(visit.id, visit.invoice_id!)}
                        onPrintPayment={() => handlePrintPaymentReceiptClick(visit.id, visit.payment_id!, visit.invoice_id)}
                      />
                    </>
                  )}
                  {visit.status === "completed" && (
                    <PrintButtonsGroup
                      visit={visit}
                      onPrintOpd={() => handlePrintOpd(visit.id)}
                      onPrintInvoice={() => handlePrintInvoiceClick(visit.id, visit.invoice_id!)}
                      onPrintPayment={() => handlePrintPaymentReceiptClick(visit.id, visit.payment_id!, visit.invoice_id)}
                    />
                  )}
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

      {/* Hidden printable payment receipt */}
      {printPaymentInvoiceId && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printPaymentRef} className="print-content">
            <InvoicePaymentReceiptPrint invoiceId={printPaymentInvoiceId} />
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
    </div>
  );
}

