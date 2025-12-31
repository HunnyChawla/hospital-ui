"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/redux/hooks";
import { useAdmissions, admissionKeys, useDischargeAdmission } from "@/hooks/queries/useAdmissions";
import { admissionsApi, Admission, DischargeRequest, TransferBedRequest } from "@/services/admissionsApi";
import { formatDate } from "@/utils/format";
import { BedDouble, User, Calendar, Stethoscope, X, ArrowRightLeft, ChevronLeft, ChevronRight, Eye, MinusCircle, CreditCard, FileText, Printer, ChevronDown, Download, Loader2 } from "lucide-react";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { useTenant } from "@/hooks/useTenant";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DischargeFormModal } from "./DischargeFormModal";
import { AdmissionDetailModal } from "./AdmissionDetailModal";
import { TransferBedFormModal } from "./TransferBedFormModal";
import { ServiceChargesModal } from "./ServiceChargesModal";
import { InitiateDischargeFormModal } from "./InitiateDischargeFormModal";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi } from "@/services/paymentsApi";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { InvoicePaymentReceiptPrint } from "@/components/payments/InvoicePaymentReceiptPrint";
import { useReactToPrint } from "react-to-print";
import { getTenantIdForApi } from "@/utils/auth";

interface AdmissionTableProps {
  patientId?: string;
  onEditClick?: (admission: Admission) => void;
  selectedAdmissionId?: string | null;
  action?: string | null;
}

export function AdmissionTable({ patientId, onEditClick, selectedAdmissionId: externalAdmissionId, action }: AdmissionTableProps) {
  const queryClient = useQueryClient();
  const dischargeAdmission = useDischargeAdmission();
  const { tenant, hospitalName, logoDataUrl } = useTenant();
  // Use Redux centralized caches (fetched once in dashboard layout)
  const doctors = useAppSelector((s) => s.doctors.list);
  const wards = useAppSelector((s) => s.wards.list);
  const beds = useAppSelector((s) => s.beds.list);
  const [selectedWardId, setSelectedWardId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargingAdmissionId, setDischargingAdmissionId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringAdmissionId, setTransferringAdmissionId] = useState<string | null>(null);
  const [transferringBedId, setTransferringBedId] = useState<string | null>(null);
  const [showServiceChargesModal, setShowServiceChargesModal] = useState(false);
  const [selectedAdmissionIdForCharges, setSelectedAdmissionIdForCharges] = useState<string | null>(null);
  const [showInitiateDischargeModal, setShowInitiateDischargeModal] = useState(false);
  const [initiatingAdmissionId, setInitiatingAdmissionId] = useState<string | null>(null);
  const [dischargingAdmissionStatus, setDischargingAdmissionStatus] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Date range state - optional
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateRangeError, setDateRangeError] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  // React Query hook to fetch admissions - automatic deduplication!
  const { data: admissionsResponse, isLoading: loading, error } = useAdmissions({
    page: currentPage,
    page_size: pageSize,
    patient_id: patientId || undefined,
    ward_id: selectedWardId || undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  });

  const admissions = admissionsResponse?.items ?? [];
  const totalPages = admissionsResponse?.total_pages ?? 1;
  const total = admissionsResponse?.total ?? 0;

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

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [patientId, selectedWardId, statusFilter, startDate, endDate]);

  // Handle external admission ID and action from URL parameters (Doctor Panel navigation)
  useEffect(() => {
    if (externalAdmissionId) {
      // Set the selected admission ID for the detail modal
      setSelectedAdmissionId(externalAdmissionId);

      if (action === "discharge") {
        // If action is discharge, open the discharge flow
        setInitiatingAdmissionId(externalAdmissionId);
        setShowInitiateDischargeModal(true);
      } else {
        // Otherwise, just open the detail view modal
        setShowDetailModal(true);
      }
    }
  }, [externalAdmissionId, action]);

  // Note: fetchWards, fetchBeds, and fetchDoctors removed - all are now fetched once in dashboard layout and cached in Redux

  useEffect(() => {
    const handleAdmissionCreated = () => {
      queryClient.invalidateQueries({ queryKey: admissionKeys.lists() });
    };

    window.addEventListener("admission:created", handleAdmissionCreated);
    return () => {
      window.removeEventListener("admission:created", handleAdmissionCreated);
    };
  }, [queryClient]);

  const handleDischargeClick = (e: React.MouseEvent, admissionId: string, admissionStatus?: string) => {
    e.stopPropagation(); // Prevent row click
    setDischargingAdmissionId(admissionId);
    setDischargingAdmissionStatus(admissionStatus);
    setShowDischargeModal(true);
  };

  const handleTransferClick = (e: React.MouseEvent, admission: Admission) => {
    e.stopPropagation(); // Prevent row click
    setTransferringAdmissionId(admission.id);
    setTransferringBedId(admission.bed_id);
    setShowTransferModal(true);
  };

  const handleRowClick = (admissionId: string) => {
    setSelectedAdmissionId(admissionId);
    setShowDetailModal(true);
  };

  const handleViewClick = (e: React.MouseEvent, admission: Admission) => {
    e.stopPropagation(); // Prevent row click
    if (onEditClick) {
      onEditClick(admission);
    } else {
      handleRowClick(admission.id);
    }
  };

  const handleServiceChargesClick = (e: React.MouseEvent, admissionId: string) => {
    e.stopPropagation(); // Prevent row click
    setSelectedAdmissionIdForCharges(admissionId);
    setShowServiceChargesModal(true);
  };

  const handleInitiateDischargeClick = (e: React.MouseEvent, admissionId: string) => {
    e.stopPropagation(); // Prevent row click
    setInitiatingAdmissionId(admissionId);
    setShowInitiateDischargeModal(true);
  };

  const handleInitiateDischargeSuccess = async (updatedAdmission: Admission) => {
    // Refresh the admissions list to show updated status
    await queryClient.invalidateQueries({ queryKey: admissionKeys.lists() });
    setShowInitiateDischargeModal(false);
    setInitiatingAdmissionId(null);
  };

  const handleDischargeSubmit = async (admissionId: string, dischargeData: DischargeRequest) => {
    try {
      await dischargeAdmission.mutateAsync({
        admissionId,
        dischargeData,
      });

      setShowDischargeModal(false);
      setDischargingAdmissionId(null);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      throw error; // Re-throw to prevent modal from closing on error
    }
  };

  const handleTransferSubmit = async (admissionId: string, transferData: TransferBedRequest) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await admissionsApi.transferBed(admissionId, transferData, tenantId || undefined);

      toast.success("Bed transferred successfully!");
      queryClient.invalidateQueries({ queryKey: admissionKeys.lists() });
      setShowTransferModal(false);
      setTransferringAdmissionId(null);
      setTransferringBedId(null);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      throw error; // Re-throw to prevent modal from closing on error
    }
  };

  const getWardName = (admission: Admission) => {
    return admission.ward_name || (admission.bed_id ? wards.find((w) => w.id === admission.bed_id)?.ward_name : null) || "N/A";
  };

  const getBedNumber = (admission: Admission) => {
    return admission.bed_number || beds.find((b) => b.id === admission.bed_id)?.bed_number || (admission.bed_id ? admission.bed_id.slice(0, 8) : "N/A");
  };

  const getDoctorName = (admission: Admission) => {
    return admission.doctor_name || doctors.find((d) => d.id === admission.doctor_id)?.name || (admission.doctor_id ? admission.doctor_id.slice(0, 8) : "N/A");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "admitted":
        return "bg-emerald-50 text-emerald-700";
      case "discharge_initiated":
        return "bg-purple-50 text-purple-700";
      case "discharged":
        return "bg-slate-50 text-slate-700";
      case "transferred":
        return "bg-amber-50 text-amber-700";
      case "deceased":
        return "bg-rose-50 text-rose-700";
      case "cancelled":
        return "bg-slate-50 text-slate-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const formatAdmissionType = (type: string) => {
    return type.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
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
      // Fetch all admissions without pagination
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await admissionsApi.list({
        patient_id: patientId,
        ward_id: selectedWardId || undefined,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        tenant_id: getTenantIdForApi(tenantId),
        // Omit page and page_size to get all results
      });

      // Get all admissions from response
      const allAdmissions = response.items || [];
      
      if (allAdmissions.length === 0) {
        toast.error("No admissions found to export");
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
      doc.text("Admissions Report", centerX, yPos, { align: "center" });
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
      doc.text("Date Range", 14, yPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      const dateRangeText = startDate && endDate 
        ? `${formatDate(startDate)} to ${formatDate(endDate)}`
        : "All Dates";
      doc.text(dateRangeText, 14, yPos + 4);
      
      // Ward filter on the right (if selected)
      if (selectedWardId) {
        const selectedWard = wards.find((w) => w.id === selectedWardId);
        const wardName = selectedWard ? `${selectedWard.ward_name} (${selectedWard.ward_code})` : "Selected Ward";
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Ward", pageWidth - 14, yPos, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(wardName, pageWidth - 14, yPos + 4, { align: "right" });
      }
      
      yPos += 8;
      
      // Status filter and total
      if (statusFilter !== "all") {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Status", 14, yPos);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(formatStatus(statusFilter), 14, yPos + 4);
      }
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Export Date: ${new Date().toLocaleString()}`, 14, yPos + (statusFilter !== "all" ? 8 : 0));
      doc.text(`Total: ${allAdmissions.length} admissions`, pageWidth - 14, yPos + (statusFilter !== "all" ? 8 : 0), { align: "right" });
      yPos += (statusFilter !== "all" ? 16 : 8);

      // Prepare table data
      const tableData = allAdmissions.map((adm) => {
        return [
          formatDate(adm.admission_date), // Date as first column
          adm.admission_number || "-",
          adm.patient_name || `Patient ${adm.patient_id.slice(0, 8)}...`,
          getWardName(adm),
          getBedNumber(adm),
          getDoctorName(adm),
          formatStatus(adm.status),
          formatAdmissionType(adm.admission_type),
        ];
      });

      // Calculate available width (page width minus margins)
      const availableWidth = pageWidth - 28; // 14mm margin on each side

      // Add table
      autoTable(doc, {
        startY: yPos,
        head: [["Date", "Admission #", "Patient Name", "Ward", "Bed", "Doctor", "Status", "Type"]],
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
          1: { cellWidth: availableWidth * 0.12 }, // Admission # - 12%
          2: { cellWidth: availableWidth * 0.20 }, // Patient Name - 20%
          3: { cellWidth: availableWidth * 0.12 }, // Ward - 12%
          4: { cellWidth: availableWidth * 0.08 }, // Bed - 8%
          5: { cellWidth: availableWidth * 0.15 }, // Doctor - 15%
          6: { cellWidth: availableWidth * 0.11 }, // Status - 11%
          7: { cellWidth: availableWidth * 0.10 }, // Type - 10%
        },
        margin: { left: 14, right: 14 },
      });

      // Generate filename
      const filename = startDate && endDate
        ? `admissions_${startDate}_to_${endDate}.pdf`
        : `admissions_all_${new Date().toISOString().split("T")[0]}.pdf`;

      // Save PDF
      doc.save(filename);
      
      toast.success(`Exported ${allAdmissions.length} admissions successfully`);
    } catch (error: any) {
      console.error("Failed to export admissions:", error);
      
      // Handle API-returned date range validation errors
      const errorMessage = getErrorMessage(error);
      if (
        error?.response?.data?.detail &&
        Array.isArray(error.response.data.detail)
      ) {
        const dateRangeErrorDetail = error.response.data.detail.find(
          (detail: any) =>
            detail.type === "business_logic_error" ||
            (detail.msg && (
              detail.msg.includes("Date range cannot exceed 3 months") ||
              detail.msg.includes("90 days")
            ))
        );
        if (dateRangeErrorDetail) {
          toast.error(dateRangeErrorDetail.msg || "Date range cannot exceed 3 months");
        } else {
          toast.error(errorMessage || "Failed to export admissions");
        }
      } else {
        toast.error(errorMessage || "Failed to export admissions");
      }
    } finally {
      setExporting(false);
    }
  }, [startDate, endDate, dateRangeError, patientId, selectedWardId, statusFilter, wards, tenant, hospitalName, logoDataUrl]);

  if (loading && admissions.length === 0) {
    return <SkeletonRow rows={5} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 flex-1">
          <label className="space-y-1">
            <span className="text-slate-600 text-sm flex items-center gap-1">
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
            <span className="text-slate-600 text-sm flex items-center gap-1">
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

          <label className="space-y-1">
            <span className="text-slate-600 text-sm">Filter by Ward</span>
            <select
              value={selectedWardId}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            >
              <option value="">All Wards</option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.ward_name} ({ward.ward_code})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-slate-600 text-sm">Filter by Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            >
              <option value="all">All Status</option>
              <option value="admitted">Admitted</option>
              <option value="discharged">Discharged</option>
              <option value="transferred">Transferred</option>
              <option value="deceased">Deceased</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
        
        <button
          onClick={handleExportPDF}
          disabled={!!dateRangeError || exporting}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-sky-500 disabled:hover:to-teal-500"
          title="Export all admissions to PDF"
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

      <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left uppercase tracking-wide text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Ward / Bed</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Admission Date</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right min-w-[200px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {admissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No admissions found
                </td>
              </tr>
            ) : (
              admissions.map((admission) => (
                <tr 
                  key={admission.id} 
                  className="hover:bg-sky-50/50 transition cursor-pointer"
                  onClick={() => handleRowClick(admission.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">
                        {admission.patient_name || `Patient ${admission.patient_id.slice(0, 8)}...`}
                      </span>
                      {admission.admission_number && (
                        <span className="text-xs text-slate-500">{admission.admission_number}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-sky-600" />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{getWardName(admission)}</span>
                        <span className="text-xs text-slate-500">{getBedNumber(admission)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-700">{getDoctorName(admission)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(admission.admission_date)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`pill px-2 py-0.5 text-xs font-normal ${getStatusColor(admission.status)}`}>
                      {formatStatus(admission.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="flex justify-end gap-2">
                      {admission.status === "admitted" && (
                        <button
                          onClick={(e) => handleServiceChargesClick(e, admission.id)}
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
                          title="Service Charges"
                        >
                          <CreditCard className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Service Charges</span>
                        </button>
                      )}
                      {admission.status === "admitted" && (
                        <button
                          onClick={(e) => handleInitiateDischargeClick(e, admission.id)}
                          className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-purple-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-purple-600"
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
                          title="Initiate Discharge"
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Initiate Discharge</span>
                        </button>
                      )}
                      {admission.status === "admitted" && (
                        <button
                          onClick={(e) => handleTransferClick(e, admission)}
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
                          title="Transfer Bed"
                        >
                          <ArrowRightLeft className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Transfer Bed</span>
                        </button>
                      )}
                      {admission.status === "discharge_initiated" && (
                        <button
                          onClick={(e) => handleDischargeClick(e, admission.id, admission.status)}
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
                          title="Discharge"
                        >
                          <div className="relative flex items-center justify-center shrink-0">
                            <BedDouble className="h-4 w-4" />
                            <MinusCircle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 bg-rose-500 rounded-full" />
                          </div>
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Discharge</span>
                        </button>
                      )}
                      {admission.status === "discharged" && (
                        <PrintButtonsGroup admission={admission} />
                      )}
                      {onEditClick && (
                        <button
                          onClick={(e) => handleViewClick(e, admission)}
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
                          title="View"
                        >
                          <Eye className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">View</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, total)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{total}</span> admissions
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

      {dischargingAdmissionId && (
        <DischargeFormModal
          isOpen={showDischargeModal}
          onClose={() => {
            setShowDischargeModal(false);
            setDischargingAdmissionId(null);
            setDischargingAdmissionStatus(undefined);
          }}
          admissionId={dischargingAdmissionId}
          admissionStatus={dischargingAdmissionStatus}
          onSubmit={handleDischargeSubmit}
        />
      )}

      {selectedAdmissionId && (
        <AdmissionDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAdmissionId(null);
          }}
          admissionId={selectedAdmissionId}
        />
      )}

      {transferringAdmissionId && transferringBedId && (
        <TransferBedFormModal
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setTransferringAdmissionId(null);
            setTransferringBedId(null);
          }}
          admissionId={transferringAdmissionId}
          currentBedId={transferringBedId}
          onSubmit={handleTransferSubmit}
        />
      )}

      {selectedAdmissionIdForCharges && (
        <ServiceChargesModal
          isOpen={showServiceChargesModal}
          onClose={() => {
            setShowServiceChargesModal(false);
            setSelectedAdmissionIdForCharges(null);
          }}
          admissionId={selectedAdmissionIdForCharges}
        />
      )}

      {initiatingAdmissionId && (
        <InitiateDischargeFormModal
          isOpen={showInitiateDischargeModal}
          onClose={() => {
            setShowInitiateDischargeModal(false);
            setInitiatingAdmissionId(null);
          }}
          admissionId={initiatingAdmissionId}
          onSuccess={handleInitiateDischargeSuccess}
        />
      )}
    </div>
  );
}

// Print Buttons Group Component for Discharged Admissions
function PrintButtonsGroup({ admission }: { admission: Admission }) {
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string } | null>(null);
  const [printPaymentInvoiceId, setPrintPaymentInvoiceId] = useState<string | null>(null);
  const [shouldPrintInvoice, setShouldPrintInvoice] = useState(false);
  const [shouldPrintPayment, setShouldPrintPayment] = useState(false);
  const printInvoiceRef = useRef<HTMLDivElement>(null);
  const printPaymentRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePrintInvoiceAction = useReactToPrint({
    contentRef: printInvoiceRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const handlePrintPaymentAction = useReactToPrint({
    contentRef: printPaymentRef,
    documentTitle: printPaymentInvoiceId ? `PaymentReceipt_Invoice_${printPaymentInvoiceId}` : "Payment Receipt",
  });

  useEffect(() => {
    if (shouldPrintInvoice && printInvoiceRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintInvoiceAction();
        setShouldPrintInvoice(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintInvoice, handlePrintInvoiceAction]);

  useEffect(() => {
    if (shouldPrintPayment && printPaymentRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintPaymentAction();
        setShouldPrintPayment(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintPayment, handlePrintPaymentAction]);

  // Calculate dropdown position using fixed positioning to avoid overflow clipping
  useEffect(() => {
    if (!showPrintDropdown || !buttonRef.current) {
      setDropdownPosition(null);
      return;
    }

    const calculatePosition = () => {
      if (!buttonRef.current) return;
      
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 120; // Approximate height of dropdown menu
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

  const handlePrintInvoice = async () => {
    if (!admission.invoice_id) {
      toast.error("Invoice ID not available for this admission");
      return;
    }
    
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const invoice = await invoicesApi.getById(admission.invoice_id, getTenantIdForApi(tenantId || undefined));
      
      const patientName = invoice.patient_name || admission.patient_name || "Unknown";
      const patientMobile = invoice.patient_mobile;
      
      setPrintInvoiceData({
        invoice,
        patientName,
        patientMobile,
      });
      setShouldPrintInvoice(true);
      setShowPrintDropdown(false);
    } catch (error) {
      console.error("Failed to fetch invoice:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoice details");
    }
  };

  const handlePrintPaymentReceipt = async () => {
    if (!admission.invoice_id) {
      toast.error("Invoice ID not available for this admission");
      return;
    }
    
    try {
      setPrintPaymentInvoiceId(admission.invoice_id);
      setShouldPrintPayment(true);
      setShowPrintDropdown(false);
    } catch (error) {
      console.error("Failed to prepare payment receipt:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare payment receipt for printing");
    }
  };

  const hasInvoice = !!admission.invoice_id;
  
  // Always show print button for discharged admissions
  // Show options in dropdown based on available IDs

  return (
    <>
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
            {hasInvoice ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintInvoice();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
            ) : (
              <div className="px-4 py-2 text-xs text-slate-500">No invoice available</div>
            )}
            {admission.invoice_id ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintPaymentReceipt();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Print Payment Receipt
              </button>
            ) : (
              <div className="px-4 py-2 text-xs text-slate-500">No payment receipt available</div>
            )}
          </div>
        )}
      </div>

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
    </>
  );
}

