"use client";

import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDoctors } from "@/hooks/queries/useDoctors";
import { useAppointmentsByDoctor } from "@/hooks/queries/useAppointments";
import { opdVisitKeys } from "@/hooks/queries/useOpdVisits";
import { appointmentsApi, Appointment } from "@/services/appointmentsApi";
import { CreateOpdFromAppointmentModal } from "./CreateOpdFromAppointmentModal";
import { formatDate } from "@/utils/format";
import { Calendar, User, Stethoscope, CheckCircle2, XCircle, Clock as ClockIcon, Plus, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { useTenant } from "@/hooks/useTenant";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AppointmentsListProps {
  doctorId?: string;
  appointmentDate?: string;
}

export function AppointmentsList({ doctorId, appointmentDate }: AppointmentsListProps) {
  // Use React Query hooks instead of Redux and manual fetching
  const queryClient = useQueryClient();
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

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // React Query hook to fetch appointments - automatic deduplication!
  const { data: appointmentsResponse, isLoading: loading, error } = useAppointmentsByDoctor(
    selectedDoctorId,
    startDate,
    endDate,
    {
      page,
      page_size: pageSize,
      appointmentsOnly: false,
    }
  );

  const appointments = appointmentsResponse?.items ?? [];
  const totalPages = appointmentsResponse?.total_pages ?? 1;
  const total = appointmentsResponse?.total ?? 0;

  // Set default dates on client side only to avoid hydration mismatch
  useEffect(() => {
    const today = getTodayDate();
    if (!startDate && !appointmentDate) {
      setStartDate(today);
      setEndDate(today);
    } else if (appointmentDate) {
      // Legacy support: if appointmentDate is provided, use it for both dates
      setStartDate(appointmentDate);
      setEndDate(appointmentDate);
    }
  }, [appointmentDate, startDate]);

  useEffect(() => {
    // Set default doctor when doctors are loaded
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

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

  // Reset to page 1 when doctor or date range changes
  useEffect(() => {
    setPage(1);
  }, [selectedDoctorId, startDate, endDate]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      case "cancelled":
      case "no_show":
        return <XCircle className="h-3 w-3 text-rose-500" />;
      case "checked_in":
        return <CheckCircle2 className="h-3 w-3 text-sky-500" />;
      default:
        return <ClockIcon className="h-3 w-3 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-700";
      case "cancelled":
      case "no_show":
        return "bg-rose-50 text-rose-700";
      case "checked_in":
        return "bg-sky-50 text-sky-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  };

  const handleCreateOpdFromAppointment = async (appointment: Appointment) => {
    // This function is now handled by modal flow.
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [appointmentForModal, setAppointmentForModal] = useState<Appointment | null>(null);

  const openCreateModal = (appt: Appointment) => {
    setAppointmentForModal(appt);
    setShowCreateModal(true);
  };

  const handleAfterCreated = (visitId: string) => {
    // Invalidate OPD visits query to refresh the OPD tab
    queryClient.invalidateQueries({ queryKey: opdVisitKeys.lists() });
  };

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
      // Fetch all appointments without pagination
      const response = await appointmentsApi.getByDoctor(
        selectedDoctorId,
        startDate,
        endDate,
        {
          appointmentsOnly: false,
          // Omit page and page_size to get all results
        }
      );

      // Get all appointments from response
      const allAppointments = response.items || [];
      
      if (allAppointments.length === 0) {
        toast.error("No appointments found to export");
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
      doc.text("Appointments Report", centerX, yPos, { align: "center" });
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
      doc.text("Doctor", 14, yPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(doctorName, 14, yPos + 4);
      
      // Date Range on the right
      const dateRangeText = `${formatDate(startDate)} to ${formatDate(endDate)}`;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Date Range", pageWidth - 14, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(dateRangeText, pageWidth - 14, yPos + 4, { align: "right" });
      
      yPos += 8;
      
      // Export date and total
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Export Date: ${new Date().toLocaleString()}`, 14, yPos);
      doc.text(`Total: ${allAppointments.length} appointments`, pageWidth - 14, yPos, { align: "right" });
      yPos += 8;

      // Prepare table data
      const tableData = allAppointments.map((apt) => {
        // Format status
        const statusStr = apt.status || "";
        const formattedStatus = statusStr.charAt(0).toUpperCase() + statusStr.slice(1).replace(/_/g, " ");
        
        return [
          formatDate(apt.appointment_date), // Date as first column
          apt.token_number.toString(),
          apt.patient_name || `Patient ${apt.patient_id.slice(0, 8)}...`,
          apt.patient_mobile || "-",
          formattedStatus,
        ];
      });

      // Calculate available width (page width minus margins)
      const availableWidth = pageWidth - 28; // 14mm margin on each side

      // Add table
      autoTable(doc, {
        startY: yPos,
        head: [["Date", "Token #", "Patient Name", "Mobile", "Status"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [59, 130, 246], // Sky blue
          textColor: 255,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.20 }, // Date - 20%
          1: { cellWidth: availableWidth * 0.15 }, // Token # - 15%
          2: { cellWidth: availableWidth * 0.35 }, // Patient Name - 35%
          3: { cellWidth: availableWidth * 0.15 }, // Mobile - 15%
          4: { cellWidth: availableWidth * 0.15 }, // Status - 15%
        },
        margin: { left: 14, right: 14 },
      });

      // Generate filename
      const filename = `appointments_${startDate}_to_${endDate}.pdf`;

      // Save PDF
      doc.save(filename);
      
      toast.success(`Exported ${allAppointments.length} appointments successfully`);
    } catch (error: any) {
      console.error("Failed to export appointments:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to export appointments");
    } finally {
      setExporting(false);
    }
  }, [selectedDoctorId, startDate, endDate, dateRangeError, doctors, hospitalName]);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="grid grid-cols-3 gap-3 flex-1">
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
          title="Export all appointments to PDF"
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
            Failed to load appointments. Please try again.
          </p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <p className="text-slate-500">No appointments found for selected doctor and date range</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
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
                        {appointment.visit_id && (
                          <span className="text-emerald-600">Visit Created</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2">
                    <span className={`pill flex items-center gap-1 px-2 py-0.5 text-xs font-normal ${getStatusColor(appointment.status)}`}>
                      {getStatusIcon(appointment.status)}
                      <span className="capitalize">{appointment.status.replace("_", " ")}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!appointment.visit_id && appointment.status !== "cancelled" && appointment.status !== "no_show" && (
                      <button
                        onClick={() => openCreateModal(appointment)}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="text-sm text-slate-500">
                Page {page} of {totalPages} {total > 0 && `(${total} total)`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
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

      <CreateOpdFromAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        appointment={appointmentForModal}
        doctor={appointmentForModal ? doctors.find((d) => d.id === appointmentForModal.doctor_id) : null}
        onCreated={handleAfterCreated}
      />
    </div>
  );
}

