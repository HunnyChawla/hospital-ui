"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { labBookingsApi, LabBooking, BookingStatus, LabBookingTest } from "@/services/labBookingsApi";
import { labTestsApi, LabTestResult } from "@/services/labTestsApi";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { patientsApi, formatPatientName } from "@/services/patientsApi";
import { formatDate, currency, formatCurrencyForPDF, getTodayDateLocal, getPastDateLocal } from "@/utils/format";
import { Beaker, Search, Calendar, User, Printer, ChevronLeft, ChevronRight, Download, List, Activity, CheckCircle2, XCircle, FlaskConical, Loader2, Eye, Receipt, RotateCw } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { InvoicePrint } from "../invoices/InvoicePrint";
import { TestReportPrint } from "../lab-technician/TestReportPrint";
import { InvoicePaymentReceiptPrint } from "../payments/InvoicePaymentReceiptPrint";
import { PreviousLabReportModal } from "../optometrist/prescriptions/PreviousLabReportModal";
import { Modal } from "../common/Modal";
import { useTenant } from "@/hooks/useTenant";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { getPatientById } from "@/redux/patientsSlice";

interface LabBookingWithPatient extends LabBooking {
  patient_name?: string;
  patient_mobile?: string;
  patient_uhid?: string;
}

interface LabBookingsListProps {
  patientId?: string;
}

export function LabBookingsList({ patientId }: LabBookingsListProps = {}) {
  const { tenant, hospitalName, logoDataUrl } = useTenant();
  const dispatch = useAppDispatch();
  const patientsCache = useAppSelector((s) => s.patients.list);
  const [bookings, setBookings] = useState<LabBookingWithPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchBookingId, setSearchBookingId] = useState("");
  const [searching, setSearching] = useState(false);
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "3days" | "custom">("3days");
  const [startDate, setStartDate] = useState<string>(getPastDateLocal(2));
  const [endDate, setEndDate] = useState<string>(getTodayDateLocal());
  const [dateRangeError, setDateRangeError] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string; tests?: LabBookingTest[]; bookingNumber?: string } | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);

  // Payment Receipt Print state
  const [printPaymentInvoiceId, setPrintPaymentInvoiceId] = useState<string | null>(null);
  const [shouldPrintPayment, setShouldPrintPayment] = useState(false);
  const printPaymentRef = useRef<HTMLDivElement>(null);

  // Cancellation Modal state
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<LabBookingWithPatient | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<LabBookingWithPatient | null>(null);
  const [selectedReportBooking, setSelectedReportBooking] = useState<LabBooking | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [printReportData, setPrintReportData] = useState<{
    booking: LabBookingWithPatient;
    patientName: string;
    patientMobile?: string;
    testResults: Array<{
      test: LabBookingTest;
      results: LabTestResult[];
    }>;
  } | null>(null);
  const [shouldPrintReport, setShouldPrintReport] = useState(false);
  const printReportRef = useRef<HTMLDivElement>(null);

  const handleDatePresetChange = (preset: "today" | "yesterday" | "3days" | "custom") => {
    setDatePreset(preset);
    if (preset === "today") {
      setStartDate(getTodayDateLocal());
      setEndDate(getTodayDateLocal());
    } else if (preset === "yesterday") {
      setStartDate(getPastDateLocal(1));
      setEndDate(getPastDateLocal(1));
    } else if (preset === "3days") {
      setStartDate(getPastDateLocal(2));
      setEndDate(getTodayDateLocal());
    }
  };
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const handlePrintReport = useReactToPrint({
    contentRef: printReportRef,
    documentTitle: printReportData ? `TestReport_${printReportData.booking.booking_number}` : "Test Report",
  });

  const handlePrintPaymentReceipt = useReactToPrint({
    contentRef: printPaymentRef,
    documentTitle: printPaymentInvoiceId ? `PaymentReceipt_Invoice_${printPaymentInvoiceId}` : "Payment Receipt",
  });

  const handlePaymentReceiptReady = useCallback(() => {
    if (printPaymentRef.current) {
      handlePrintPaymentReceipt();
    }
  }, [handlePrintPaymentReceipt]);

  const handlePrintPaymentReceiptClick = (invoiceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    toast.info("Preparing payment receipt for print...");
    setPrintPaymentInvoiceId(null);
    setTimeout(() => {
      setPrintPaymentInvoiceId(invoiceId);
    }, 10);
  };

  const handleCancelClick = (booking: LabBookingWithPatient, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCancellingBooking(booking);
    setShowCancellationModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!cancellingBooking) return;
    setIsCancelling(true);
    try {
      await labBookingsApi.updateStatus(cancellingBooking.id, "cancelled");
      toast.success(`Booking ${cancellingBooking.booking_number} cancelled successfully`);
      setShowCancellationModal(false);
      setCancellingBooking(null);
      if (selectedBooking?.id === cancellingBooking.id) {
        setSelectedBooking(null);
      }
      window.dispatchEvent(new CustomEvent("lab:booking:cancelled"));
      fetchBookings();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to cancel booking");
    } finally {
      setIsCancelling(false);
    }
  };

  // Helper function to batch fetch patients and enrich bookings
  const enrichBookingsWithPatients = async (bookingsList: LabBooking[]): Promise<LabBookingWithPatient[]> => {
    // Extract unique patient IDs
    const uniquePatientIds = Array.from(new Set(bookingsList.map((b) => b.patient_id)));

    // Fetch all unique patients using Redux (checks cache first, only fetches if not cached)
    const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
    const patientResults = await Promise.all(
      uniquePatientIds.map((patientId) =>
        dispatch(getPatientById({ patientId, tenantId: tenantId || undefined })).unwrap()
      )
    );

    // Create a map of patient ID to patient data
    const patientsMap = new Map(
      patientResults.map((p) => [p.id, p])
    );

    // Enrich bookings with patient data
    return bookingsList.map((booking) => {
      const patient = patientsMap.get(booking.patient_id);
      if (patient) {
        return {
          ...booking,
          patient_name: patient.name,
          patient_mobile: patient.mobile,
          patient_uhid: (patient as any).uhid || patient.healthId || undefined,
        };
      }
      return {
        ...booking,
        patient_name: "Unknown",
        patient_mobile: "",
      };
    });
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => new Date().toISOString().split("T")[0];

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

  const fetchBookings = useCallback(async () => {
    // Don't fetch if date range is invalid (only when both dates are provided)
    if (dateRangeError) return;
    
    setLoading(true);
    try {
      const response = await labBookingsApi.list({
        page: currentPage,
        page_size: pageSize,
        patient_id: patientId,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      // Batch fetch patient details using Redux cache
      const bookingsWithPatients = await enrichBookingsWithPatients(response.items);

      // Deduplicate bookings by ID to prevent duplicate key errors
      const uniqueBookings = Array.from(
        new Map(bookingsWithPatients.map((booking) => [booking.id, booking])).values()
      );

      setBookings(uniqueBookings);
      setTotalPages(response.total_pages);
      setTotal(response.total);
      // Clear any previous date range error if fetch succeeds
      if (dateRangeError) {
        setDateRangeError("");
      }
    } catch (error: any) {
      console.error("Failed to fetch lab bookings:", error);
      console.error("Error response:", error?.response?.data);
      
      // Extract error message
      const errorMessage = getErrorMessage(error);
      
      // Check if it's a date range validation error from API
      const isDateRangeError = 
        errorMessage.includes("Date range cannot exceed 3 months") || 
        errorMessage.includes("90 days") ||
        errorMessage.includes("Date range") ||
        error?.response?.data?.detail?.some?.((err: any) => 
          err.type === "business_logic_error" && 
          (err.msg?.includes("Date range") || err.msg?.includes("90 days"))
        );
      
      if (isDateRangeError) {
        // Set the date range error state to show validation message
        const apiErrorMessage = error?.response?.data?.detail?.find?.((err: any) => 
          err.type === "business_logic_error"
        )?.msg || "Date range cannot exceed 3 months";
        setDateRangeError(apiErrorMessage);
        toast.error(apiErrorMessage);
      } else {
        // Show other errors as toast with full details
        const fullErrorMessage = errorMessage || error?.response?.statusText || "Failed to fetch lab bookings";
        toast.error(fullErrorMessage);
        console.error("Full error details:", {
          status: error?.response?.status,
          data: error?.response?.data,
          message: errorMessage
        });
      }
      
      setBookings([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, patientId, startDate, endDate, statusFilter, dateRangeError]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [patientId, startDate, endDate, statusFilter]);

  useEffect(() => {
    if (!dateRangeError) {
      fetchBookings();
    }
  }, [fetchBookings, dateRangeError]);

  // Listen for booking creation events
  useEffect(() => {
    const handleBookingCreated = () => {
      fetchBookings();
    };

    window.addEventListener("lab:booking:created", handleBookingCreated);
    return () => {
      window.removeEventListener("lab:booking:created", handleBookingCreated);
    };
  }, [fetchBookings]);

  const handleSearchByBookingNumber = async () => {
    if (!searchBookingId.trim()) {
      toast.error("Please enter a booking number");
      return;
    }

    setSearching(true);
    try {
      // Search by booking_number using the list API
      const response = await labBookingsApi.list({
        page: 1,
        page_size: 10,
        booking_number: searchBookingId.trim(),
      });
      
      if (response.items.length === 0) {
        toast.error("Booking not found");
        setBookings([]);
      } else {
        // Batch fetch patient details using Redux cache
        const bookingsWithPatients = await enrichBookingsWithPatients(response.items);

        // Deduplicate bookings by ID to prevent duplicate key errors
        const uniqueBookings = Array.from(
          new Map(bookingsWithPatients.map((booking) => [booking.id, booking])).values()
        );
        setBookings(uniqueBookings);
        toast.success("Booking found");
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Booking not found");
      setBookings([]);
    } finally {
      setSearching(false);
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "scheduled":
        return "bg-sky-50 text-sky-700";
      case "sample_collected":
        return "bg-amber-50 text-amber-700";
      case "in_progress":
        return "bg-blue-50 text-blue-700";
      case "completed":
        return "bg-emerald-50 text-emerald-700";
      case "cancelled":
        return "bg-rose-50 text-rose-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-50 text-rose-700";
      case "stat":
        return "bg-red-50 text-red-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const handleExportPDF = useCallback(async () => {
    // Validate date range is selected
    if (!startDate || !endDate) {
      toast.error("Please select date range");
      return;
    }
    
    // Validate filters - only check date range error if dates are provided
    if (dateRangeError) {
      toast.error(dateRangeError);
      return;
    }

    setExporting(true);
    try {
      // Fetch all bookings without pagination
      const response = await labBookingsApi.list({
        patient_id: patientId,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        // Omit page and page_size to get all results
      });

      // Batch fetch patient details using Redux cache
      const bookingsWithPatients = await enrichBookingsWithPatients(response.items);

      // Deduplicate bookings by ID to prevent duplicate key errors
      const allBookings = Array.from(
        new Map(bookingsWithPatients.map((booking) => [booking.id, booking])).values()
      );
      
      if (allBookings.length === 0) {
        toast.error("No lab bookings found to export");
        setExporting(false);
        return;
      }

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
          // Continue without logo
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
        doc.setTextColor(55, 65, 81); // slate-700
        
        if (address) {
          doc.text(address, centerX, yPos, { align: "center" });
          yPos += 5;
        }
        
        // Contact info
        const contactParts: string[] = [];
        if (tenant?.phone_no) contactParts.push(`Phone: ${tenant.phone_no}`);
        if (tenant?.email) contactParts.push(`Email: ${tenant.email}`);
        if (tenant?.website) contactParts.push(`Website: ${tenant.website}`);
        
        if (contactParts.length > 0) {
          doc.text(contactParts.join(" | "), centerX, yPos, { align: "center" });
          yPos += 6;
        }
      }

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Document Type (centered) - matching PrintHeader style
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("Lab Bookings Report", centerX, yPos, { align: "center" });
      yPos += 8;

      // Filter Details (left-aligned, similar to invoice number/date in PrintHeader)
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      
      // Add border line similar to PrintHeader
      doc.setLineWidth(0.5);
      doc.setDrawColor(30, 41, 59); // slate-800
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 6;

      // Filter details
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // slate-600
      if (startDate && endDate) {
        doc.text("Date Range", 14, yPos);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        const dateRangeText = `${formatDate(startDate)} to ${formatDate(endDate)}`;
        doc.text(dateRangeText, 14, yPos + 4);
      }
      
      // Status filter on the right (if selected)
      if (statusFilter !== "all") {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Status", pageWidth - 14, yPos, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(formatStatus(statusFilter), pageWidth - 14, yPos + 4, { align: "right" });
      }
      
      yPos += 8;
      
      // Export date and total
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Export Date: ${new Date().toLocaleString()}`, 14, yPos);
      doc.text(`Total: ${allBookings.length} bookings`, pageWidth - 14, yPos, { align: "right" });
      yPos += 8;

      // Prepare table data
      const tableData = allBookings.map((booking) => {
        return [
          formatDate(booking.scheduled_date), // Date as first column
          booking.booking_number,
          booking.patient_name || `Patient ${booking.patient_id.slice(0, 8)}...`,
          booking.patient_mobile || "-",
          formatStatus(booking.status),
          booking.priority.charAt(0).toUpperCase() + booking.priority.slice(1),
          `${booking.tests.length} test${booking.tests.length !== 1 ? "s" : ""}`,
          formatCurrencyForPDF(booking.total_amount),
        ];
      });

      // Calculate available width (page width minus margins)
      const availableWidth = pageWidth - 28; // 14mm margin on each side

      // Add table
      autoTable(doc, {
        startY: yPos,
        head: [["Date", "Booking #", "Patient Name", "Mobile", "Status", "Priority", "Tests", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [59, 130, 246], // Sky blue
          textColor: 255,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.12 }, // Date - 12%
          1: { cellWidth: availableWidth * 0.15 }, // Booking # - 15%
          2: { cellWidth: availableWidth * 0.20 }, // Patient Name - 20%
          3: { cellWidth: availableWidth * 0.12 }, // Mobile - 12%
          4: { cellWidth: availableWidth * 0.12 }, // Status - 12%
          5: { cellWidth: availableWidth * 0.10 }, // Priority - 10%
          6: { cellWidth: availableWidth * 0.09 }, // Tests - 9%
          7: { cellWidth: availableWidth * 0.10 }, // Amount - 10%
        },
        margin: { left: 14, right: 14 },
      });

      // Generate filename
      const filename = startDate && endDate
        ? `lab_bookings_${startDate}_to_${endDate}.pdf`
        : `lab_bookings_all_${new Date().toISOString().split("T")[0]}.pdf`;

      // Save PDF
      doc.save(filename);
      
      toast.success(`Exported ${allBookings.length} lab bookings successfully`);
    } catch (error: any) {
      console.error("Failed to export lab bookings:", error);
      console.error("Error response:", error?.response?.data);
      
      // Extract error message
      const errorMessage = getErrorMessage(error);
      
      // Check if it's a date range validation error from API
      const isDateRangeError = 
        errorMessage.includes("Date range cannot exceed 3 months") || 
        errorMessage.includes("90 days") ||
        errorMessage.includes("Date range") ||
        error?.response?.data?.detail?.some?.((err: any) => 
          err.type === "business_logic_error" && 
          (err.msg?.includes("Date range") || err.msg?.includes("90 days"))
        );
      
      if (isDateRangeError) {
        // Set the date range error state to show validation message
        const apiErrorMessage = error?.response?.data?.detail?.find?.((err: any) => 
          err.type === "business_logic_error"
        )?.msg || "Date range cannot exceed 3 months";
        setDateRangeError(apiErrorMessage);
        toast.error(apiErrorMessage);
      } else {
        // Show other errors as toast with full details
        const fullErrorMessage = errorMessage || error?.response?.statusText || "Failed to export lab bookings";
        toast.error(fullErrorMessage);
        console.error("Full error details:", {
          status: error?.response?.status,
          data: error?.response?.data,
          message: errorMessage
        });
      }
    } finally {
      setExporting(false);
    }
  }, [startDate, endDate, dateRangeError, patientId, statusFilter, tenant, hospitalName, logoDataUrl]);

  const handlePrintInvoice = async (invoiceId: string, patientName: string, patientMobile?: string, tests?: LabBookingTest[], bookingNumber?: string) => {
    try {
      const invoice = await invoicesApi.getById(invoiceId);
      setPrintInvoiceData({ invoice, patientName, patientMobile, tests, bookingNumber });
      setShouldPrint(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoice");
    }
  };

  // Check if all tests have results
  const allTestsHaveResults = async (booking: LabBookingWithPatient): Promise<boolean> => {
    if (booking.tests.length === 0) return false;
    
    try {
      const resultsPromises = booking.tests.map(async (test) => {
        try {
          const results = await labTestsApi.getResults(booking.id, test.id);
          return Array.isArray(results) ? results.length > 0 : false;
        } catch {
          return false;
        }
      });
      
      const results = await Promise.all(resultsPromises);
      return results.every((hasResults) => hasResults);
    } catch {
      return false;
    }
  };

  const handleDownloadReport = (booking: LabBookingWithPatient) => {
    setSelectedReportBooking(booking);
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

  // Trigger print when printReportData is set and shouldPrintReport is true
  useEffect(() => {
    if (printReportData && shouldPrintReport && printReportRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        handlePrintReport();
        setShouldPrintReport(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printReportData, shouldPrintReport]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Search by Booking Number
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchBookingId}
                  onChange={(e) => setSearchBookingId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchByBookingNumber();
                    }
                  }}
                  placeholder="Enter booking number"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400"
                />
              </div>
              <button
                onClick={handleSearchByBookingNumber}
                disabled={searching}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50 whitespace-nowrap"
              >
                {searching ? "Searching..." : "Search"}
              </button>
              {searchBookingId && (
                <button
                  onClick={() => {
                    setSearchBookingId("");
                    fetchBookings();
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {/* Date Preset Selector */}
          <div className="space-y-1">
            <span className="text-slate-600 flex items-center gap-1 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-sky-500" />
              Date Preset
            </span>
            <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
              {(["today", "yesterday", "3days", "custom"] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleDatePresetChange(preset)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer ${
                    datePreset === preset
                      ? "bg-white text-slate-900 shadow-sm font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {preset === "3days" ? "Last 3 Days" : preset === "today" ? "Today" : preset === "yesterday" ? "Yesterday" : "Custom"}
                </button>
              ))}
            </div>
          </div>

          {datePreset === "custom" && (
            <>
              <label className="space-y-1">
                <span className="text-slate-600 flex items-center gap-1 text-sm">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate ? (endDate < getTodayDate() ? endDate : getTodayDate()) : getTodayDate()}
                  min={endDate ? getMinStartDate() : undefined}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-600 flex items-center gap-1 text-sm">
                  <Calendar className="h-4 w-4" />
                  End Date
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  max={startDate ? getMaxEndDate() : getTodayDate()}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => fetchBookings()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shadow-sm cursor-pointer"
              title="Refresh bookings list"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!!dateRangeError || exporting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-sky-500 disabled:hover:to-teal-500 whitespace-nowrap"
              title="Export all lab bookings to PDF"
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
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-sm text-rose-700">{dateRangeError}</p>
          </div>
        )}

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
              onClick={() => setStatusFilter("sample_collected")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "sample_collected"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <FlaskConical className="h-4 w-4" />
              Sample Collected
            </button>
            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "in_progress"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Activity className="h-4 w-4" />
              In Progress
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
            <button
              onClick={() => setStatusFilter("cancelled")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                statusFilter === "cancelled"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <XCircle className="h-4 w-4" />
              Cancelled
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <SkeletonRow rows={5} />
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <Beaker className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-slate-500">No lab test bookings found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className={`relative cursor-pointer rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md ${
                (booking.status === "completed" && booking.invoice_id) ? "pr-48" : 
                (booking.status === "completed" || booking.invoice_id) ? "pr-36" : 
                "pr-4"
              }`}
            >
              <div className="flex items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex min-w-[4rem] items-center justify-center rounded-lg bg-sky-100 px-3 py-2">
                      <p className="text-xs font-bold text-sky-700 break-all text-center">
                        {booking.booking_number.split("-").pop()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {booking.patient_name || `Patient ${booking.patient_id.slice(0, 8)}...`}
                        </p>
                        {booking.patient_uhid && (
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            UHID: {booking.patient_uhid}
                          </span>
                        )}
                        <span className="pill bg-sky-50 text-sky-700 px-2 py-0.5 text-xs font-mono">
                          {booking.booking_number}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        {booking.patient_mobile && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {booking.patient_mobile}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(booking.scheduled_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`pill px-2 py-0.5 text-xs font-normal ${getStatusColor(booking.status)}`}>
                        {booking.status.replace("_", " ")}
                      </span>
                      <span className={`pill px-2 py-0.5 text-xs font-normal ${getPriorityColor(booking.priority)}`}>
                        {booking.priority}
                      </span>
                      {booking.sample_id && (
                        <span className="pill bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 text-xs font-mono font-medium">
                          Sample ID: {booking.sample_id}
                        </span>
                      )}
                      <span className="pill bg-slate-50 text-slate-700 px-2 py-0.5 text-xs font-normal">
                        {booking.tests.length} test{booking.tests.length !== 1 ? "s" : ""}
                      </span>
                      <span className="pill bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-normal">
                        {currency(booking.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                  {booking.status === "completed" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadReport(booking);
                      }}
                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:from-sky-600 hover:to-teal-600"
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
                      title="View Report"
                    >
                      <Eye className="h-4 w-4 shrink-0" />
                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">View Report</span>
                    </button>
                  )}
                  {booking.invoice_id && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintInvoice(booking.invoice_id!, booking.patient_name || "Unknown", booking.patient_mobile, booking.tests, booking.booking_number);
                        }}
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
                      {booking.status !== "cancelled" && (
                        <button
                          onClick={(e) => handlePrintPaymentReceiptClick(booking.invoice_id!, e)}
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
                          title="Print Payment Receipt"
                        >
                          <Receipt className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Print Receipt</span>
                        </button>
                      )}
                    </>
                  )}
                  {booking.status !== "completed" && booking.status !== "cancelled" && (
                    <button
                      onClick={(e) => handleCancelClick(booking, e)}
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
                      title="Cancel Booking"
                    >
                      <XCircle className="h-4 w-4 shrink-0" />
                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Cancel Booking</span>
                    </button>
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
            of <span className="font-semibold text-slate-900">{total}</span> bookings
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

      {/* Hidden printable invoice */}
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

      {/* Hidden printable test report */}
      {printReportData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printReportRef} className="print-content">
            <TestReportPrint
              booking={printReportData.booking}
              patientName={printReportData.patientName}
              patientMobile={printReportData.patientMobile}
              testResults={printReportData.testResults}
            />
          </div>
        </div>
      )}

      {/* Hidden printable payment receipt */}
      {printPaymentInvoiceId && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printPaymentRef} className="print-content">
            <InvoicePaymentReceiptPrint invoiceId={printPaymentInvoiceId} onReady={handlePaymentReceiptReady} />
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={`Lab Test Booking - ${selectedBooking?.booking_number}`}
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Patient Information</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Patient Name</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {selectedBooking.patient_name || `Patient ${selectedBooking.patient_id.slice(0, 8)}...`}
                  </p>
                </div>
                {selectedBooking.patient_uhid && (
                  <div>
                    <p className="text-xs text-slate-500">UHID</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{selectedBooking.patient_uhid}</p>
                  </div>
                )}
                {selectedBooking.patient_mobile && (
                  <div>
                    <p className="text-xs text-slate-500">Mobile</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedBooking.patient_mobile}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Booking Number</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{selectedBooking.booking_number}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="mt-1">
                    <span className={`pill px-2 py-0.5 text-xs font-normal ${getStatusColor(selectedBooking.status)}`}>
                      {selectedBooking.status.replace("_", " ")}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Booking Details</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Scheduled Date</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatDate(selectedBooking.scheduled_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Priority</p>
                  <p className="mt-1">
                    <span className={`pill px-2 py-0.5 text-xs font-normal ${getPriorityColor(selectedBooking.priority)}`}>
                      {selectedBooking.priority}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Amount</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">{currency(selectedBooking.total_amount)}</p>
                </div>
              </div>
            </div>

            {/* Test Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Test Details</h3>
              <div className="space-y-2">
                {selectedBooking.tests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {test.test_name}
                          {test.prescription_metadata && Object.keys(test.prescription_metadata).length > 0 && (
                            <span className="font-normal text-slate-500 text-xs ml-1.5">
                              ({Object.entries(test.prescription_metadata).map(([k, v]) => `${k}: ${v}`).join(", ")})
                            </span>
                          )}
                        </p>
                        {test.is_price_overridden && (
                          <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 shrink-0">
                            Custom Price {test.original_price != null ? `(Orig: ${currency(test.original_price)})` : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">Code: {test.test_code}</p>
                    </div>
                    <p className="ml-4 font-semibold text-slate-900">{currency(test.price)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {selectedBooking.notes && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Notes</h3>
                <p className="text-sm text-slate-700">{selectedBooking.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
              {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && (
                <button
                  type="button"
                  onClick={() => handleCancelClick(selectedBooking)}
                  className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Booking
                </button>
              )}
              {selectedBooking.invoice_id && (
                <>
                  <button
                    onClick={() => {
                      handlePrintInvoice(
                        selectedBooking.invoice_id!,
                        selectedBooking.patient_name || "Unknown",
                        selectedBooking.patient_mobile,
                        selectedBooking.tests,
                        selectedBooking.booking_number
                      );
                    }}
                    className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    Print Invoice
                  </button>
                  {selectedBooking.status !== "cancelled" && (
                    <button
                      onClick={() => handlePrintPaymentReceiptClick(selectedBooking.invoice_id!)}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 cursor-pointer"
                    >
                      <Receipt className="h-4 w-4" />
                      Print Receipt
                    </button>
                  )}
                </>
              )}
              {selectedBooking.status === "completed" && (
                <button
                  onClick={() => handleDownloadReport(selectedBooking)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-sky-600 hover:to-teal-600 cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  View Report
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={showCancellationModal}
        onClose={() => {
          if (!isCancelling) {
            setShowCancellationModal(false);
            setCancellingBooking(null);
          }
        }}
        title="Confirm Booking Cancellation"
        size="md"
      >
        {cancellingBooking && (
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-900">
                Are you sure you want to cancel booking #{cancellingBooking.booking_number}?
              </p>
              {cancellingBooking.invoice_id && (
                <p className="mt-2 text-xs text-rose-700">
                  Note: Cancelling this booking will automatically issue refunds for any completed payments and cancel the associated invoice.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCancellationModal(false);
                  setCancellingBooking(null);
                }}
                disabled={isCancelling}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                No, Keep Booking
              </button>
              <button
                type="button"
                onClick={confirmCancelBooking}
                disabled={isCancelling}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Yes, Cancel Booking
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <PreviousLabReportModal
        isOpen={selectedReportBooking !== null}
        onClose={() => setSelectedReportBooking(null)}
        booking={selectedReportBooking}
      />
    </div>
  );
}

