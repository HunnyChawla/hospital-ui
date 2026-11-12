"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import {
  labBookingsApi,
  type BookingStatus,
  type LabBooking,
} from "@/services/labBookingsApi";
import { paymentsApi } from "@/services/paymentsApi";
import { useTenant } from "@/hooks/useTenant";
import { useAppDispatch } from "@/redux/hooks";
import { getPatientById } from "@/redux/patientsSlice";
import { getTenantIdForApi } from "@/utils/auth";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  formatCurrencyForPDF,
  formatDate,
  getPastDateLocal,
  getTodayDateLocal,
} from "@/utils/format";
import { CancellationRefundAcknowledgmentModal } from "@/components/common/CancellationRefundAcknowledgmentModal";
import { LabReportPdfModal, printServerLabReportPdf } from "./LabReportPdfModal";
import {
  LabWorklistSidebar,
  type DatePreset,
  type EnrichedLabBooking,
  type PendingSubFilter,
  type WorklistTab,
} from "./LabWorklistSidebar";
import { LabReportWorkspace } from "./LabReportWorkspace";
import {
  formatBookingSubStatus,
  useLabDraftStorage,
} from "./useLabDraftStorage";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileEdit,
  FlaskConical,
  Loader2,
  RefreshCw,
} from "lucide-react";

const PAGE_SIZE = 15;

export function LabTechnicianPanel() {
  const { tenant, hospitalName, logoDataUrl } = useTenant();
  const dispatch = useAppDispatch();
  const {
    draftBookingIds,
    loadBookingDraft,
    saveBookingDraft,
    clearBookingDraft,
  } = useLabDraftStorage(tenant?.id);

  const [draftBookingIdsRefCurrent, setDraftBookingIdsSnapshot] = useState<Set<string>>(new Set());
  const draftBookingIdsRef = useRef<Set<string>>(draftBookingIds);
  useEffect(() => {
    draftBookingIdsRef.current = draftBookingIds;
    setDraftBookingIdsSnapshot(draftBookingIds);
  }, [draftBookingIds]);

  // Queue & Filter State
  const [bookings, setBookings] = useState<EnrichedLabBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpiCounts, setKpiCounts] = useState<{
    pending: number;
    draft: number;
    published: number;
  }>({ pending: 0, draft: 0, published: 0 });
  const [activeTab, setActiveTab] = useState<WorklistTab>("all");
  const [pendingSubFilter, setPendingSubFilter] = useState<PendingSubFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateRangeError, setDateRangeError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Selection & Mobile Drawer State
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [mobileShowWorkspace, setMobileShowWorkspace] = useState(false);

  // Per-booking result progress cache (updated by workspace & bulk checks)
  const [bookingResultProgress, setBookingResultProgress] = useState<
    Record<string, { testsWithResults: number; totalTests: number }>
  >({});

  // Export, Preview & Cancellation State
  const [exporting, setExporting] = useState(false);
  const [selectedReportBooking, setSelectedReportBooking] = useState<LabBooking | null>(null);

  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [pendingCancellation, setPendingCancellation] = useState<{
    bookingId: string;
    bookingNumber?: string;
    paymentAmount?: number;
  } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Date range validation (max 3 months / 90 days)
  const validateDateRange = useCallback((start: string, end: string): string => {
    if (!start || !end) return "";
    const startObj = new Date(start);
    const endObj = new Date(end);
    if (endObj < startObj) {
      return "End date must be after or equal to start date";
    }
    const diffDays = Math.round(
      (endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 90) {
      return "Date range cannot exceed 3 months (90 days)";
    }
    return "";
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      setDateRangeError(validateDateRange(startDate, endDate));
    } else {
      setDateRangeError("");
    }
  }, [startDate, endDate, validateDateRange]);

  const getMaxEndDate = useCallback((): string => {
    if (!startDate) return getTodayDateLocal();
    const maxDate = new Date(startDate);
    maxDate.setDate(maxDate.getDate() + 90);
    const today = new Date(getTodayDateLocal());
    return maxDate <= today ? maxDate.toISOString().split("T")[0] : getTodayDateLocal();
  }, [startDate]);

  const getMinStartDate = useCallback((): string => {
    if (!endDate) return "";
    const minDate = new Date(endDate);
    minDate.setDate(minDate.getDate() - 90);
    return minDate.toISOString().split("T")[0];
  }, [endDate]);

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === "today") {
      const today = getTodayDateLocal();
      setStartDate(today);
      setEndDate(today);
    } else if (preset === "yesterday") {
      const yesterday = getPastDateLocal(1);
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (preset === "3days") {
      setStartDate(getPastDateLocal(2));
      setEndDate(getTodayDateLocal());
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Enrich bookings with patient details using Redux cache (non-blocking per patient)
  const enrichBookingsWithPatients = useCallback(
    async (bookingsList: LabBooking[]): Promise<EnrichedLabBooking[]> => {
      if (bookingsList.length === 0) return [];
      const uniquePatientIds = Array.from(
        new Set(bookingsList.map((b) => b.patient_id))
      );
      const tenantId =
        typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

      const settled = await Promise.allSettled(
        uniquePatientIds.map((patientId) =>
          dispatch(
            getPatientById({ patientId, tenantId: tenantId || undefined })
          ).unwrap()
        )
      );

      const patientsMap = new Map<
        string,
        {
          name: string;
          mobile: string;
          gender: string;
          age: number;
          healthId: string;
        }
      >();
      settled.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          patientsMap.set(result.value.id, result.value);
        }
      });

      return bookingsList.map((booking) => {
        const patient = patientsMap.get(booking.patient_id);
        if (!patient) {
          return {
            ...booking,
            patient_name: "Unknown Patient",
          };
        }
        const genderLower = (patient.gender || "").toLowerCase();
        const apiGender =
          genderLower === "female" ? "F" : genderLower === "male" ? "M" : "M";
        return {
          ...booking,
          patient_name: patient.name,
          patient_mobile: patient.mobile,
          patient_gender: apiGender,
          patient_gender_label: patient.gender,
          patient_age: patient.age,
          patient_uhid: patient.healthId || undefined,
        };
      });
    },
    [dispatch]
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, pendingSubFilter, startDate, endDate, debouncedSearch]);

  // Fetch accurate hospital-wide queue counts for the active date filter
  const fetchKpiCounts = useCallback(async () => {
    if (dateRangeError) return;
    try {
      const dateParams = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page: 1,
        page_size: 1,
      };
      const [scheduledRes, collectedRes, inProgressRes, completedRes] =
        await Promise.all([
          labBookingsApi.list({ ...dateParams, status: "scheduled" }),
          labBookingsApi.list({ ...dateParams, status: "sample_collected" }),
          labBookingsApi.list({ ...dateParams, status: "in_progress" }),
          labBookingsApi.list({ ...dateParams, status: "completed" }),
        ]);
      setKpiCounts({
        pending: scheduledRes.total + collectedRes.total,
        draft: inProgressRes.total,
        published: completedRes.total,
      });
    } catch {
      // Non-fatal: keep previous counts if background count check fails
    }
  }, [startDate, endDate, dateRangeError]);

  useEffect(() => {
    fetchKpiCounts();
  }, [fetchKpiCounts]);

  const fetchBookings = useCallback(async () => {
    if (dateRangeError) return;
    setLoading(true);
    try {
      const serverBookingNum =
        debouncedSearch.toUpperCase().startsWith("LAB-") ? debouncedSearch : undefined;

      const baseParams = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        booking_number: serverBookingNum,
      };

      let rawItems: LabBooking[] = [];
      let nextTotal = 0;
      let nextTotalPages = 1;
      const activeDraftIds = draftBookingIdsRef.current;

      if (activeTab === "pending" && pendingSubFilter === "all") {
        // Combine scheduled and sample_collected cleanly so pending items are never buried under completed items
        const [scheduledRes, collectedRes] = await Promise.all([
          labBookingsApi.list({
            ...baseParams,
            status: "scheduled",
            page: 1,
            page_size: 50,
          }),
          labBookingsApi.list({
            ...baseParams,
            status: "sample_collected",
            page: 1,
            page_size: 50,
          }),
        ]);
        const merged = [...scheduledRes.items, ...collectedRes.items];
        merged.sort((a, b) => {
          const dateCmp = b.scheduled_date.localeCompare(a.scheduled_date);
          if (dateCmp !== 0) return dateCmp;
          return b.created_at.localeCompare(a.created_at);
        });
        nextTotal = merged.length;
        nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
        const safePage = Math.min(currentPage, nextTotalPages);
        rawItems = merged.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
      } else if (activeTab === "draft") {
        const [inProgressRes, collectedRes] = await Promise.all([
          labBookingsApi.list({
            ...baseParams,
            status: "in_progress",
            page: 1,
            page_size: 50,
          }),
          activeDraftIds.size > 0
            ? labBookingsApi.list({
                ...baseParams,
                status: "sample_collected",
                page: 1,
                page_size: 50,
              })
            : Promise.resolve({ items: [], total: 0, page: 1, page_size: 50, total_pages: 1 }),
        ]);

        const localDraftCollected = collectedRes.items.filter((b) =>
          activeDraftIds.has(b.id)
        );
        const mergedMap = new Map<string, LabBooking>();
        [...inProgressRes.items, ...localDraftCollected].forEach((b) =>
          mergedMap.set(b.id, b)
        );
        const merged = Array.from(mergedMap.values()).sort((a, b) => {
          const dateCmp = b.scheduled_date.localeCompare(a.scheduled_date);
          if (dateCmp !== 0) return dateCmp;
          return b.created_at.localeCompare(a.created_at);
        });
        nextTotal = merged.length;
        nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
        const safePage = Math.min(currentPage, nextTotalPages);
        rawItems = merged.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
      } else {
        let statusParam: BookingStatus | undefined;
        if (activeTab === "pending") {
          statusParam =
            pendingSubFilter === "scheduled" ? "scheduled" : "sample_collected";
        } else if (activeTab === "published") {
          statusParam = "completed";
        } else if (activeTab === "cancelled") {
          statusParam = "cancelled";
        }

        const response = await labBookingsApi.list({
          ...baseParams,
          page: currentPage,
          page_size: PAGE_SIZE,
          status: statusParam,
        });
        rawItems = response.items;
        nextTotal = response.total;
        nextTotalPages = Math.max(1, response.total_pages);
      }

      const enriched = await enrichBookingsWithPatients(rawItems);
      const uniqueBookings = Array.from(
        new Map(enriched.map((b) => [b.id, b])).values()
      );

      setBookings(uniqueBookings);
      setTotal(nextTotal);
      setTotalPages(nextTotalPages);

      // Keep selection valid or auto-select first booking on desktop
      setSelectedBookingId((prev) => {
        if (prev && uniqueBookings.some((b) => b.id === prev)) {
          return prev;
        }
        return uniqueBookings[0]?.id ?? null;
      });
    } catch (error) {
      const msg = getErrorMessage(error);
      if (msg.includes("Date range") || msg.includes("90 days")) {
        setDateRangeError(msg);
      }
      toast.error(msg || "Failed to load lab bookings");
      setBookings([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    pendingSubFilter,
    currentPage,
    startDate,
    endDate,
    debouncedSearch,
    dateRangeError,
    enrichBookingsWithPatients,
  ]);

  useEffect(() => {
    if (!dateRangeError) {
      fetchBookings();
    }
  }, [fetchBookings, dateRangeError]);

  // Client-side instant search across patient name, UHID, mobile, booking #, sample ID
  const filteredBookings = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) => {
      return (
        b.booking_number.toLowerCase().includes(q) ||
        (b.sample_id || "").toLowerCase().includes(q) ||
        (b.patient_name || "").toLowerCase().includes(q) ||
        (b.patient_uhid || "").toLowerCase().includes(q) ||
        (b.patient_mobile || "").toLowerCase().includes(q)
      );
    });
  }, [bookings, debouncedSearch]);

  const selectedBooking = useMemo(
    () =>
      bookings.find((b) => b.id === selectedBookingId) ||
      filteredBookings[0] ||
      null,
    [bookings, filteredBookings, selectedBookingId]
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchBookings(), fetchKpiCounts()]);
  }, [fetchBookings, fetchKpiCounts]);

  // Summary KPI counters (using accurate server counts + loaded urgent/STAT count)
  const urgentStatCount = useMemo(() => {
    return bookings.filter(
      (b) =>
        (b.priority === "stat" || b.priority === "urgent") &&
        b.status !== "completed" &&
        b.status !== "cancelled"
    ).length;
  }, [bookings]);

  const handleProgressUpdate = useCallback(
    (bookingId: string, testsWithResults: number, totalTests: number) => {
      setBookingResultProgress((prev) => {
        const existing = prev[bookingId];
        if (
          existing &&
          existing.testsWithResults === testsWithResults &&
          existing.totalTests === totalTests
        ) {
          return prev;
        }
        return {
          ...prev,
          [bookingId]: { testsWithResults, totalTests },
        };
      });
    },
    []
  );

  // Server-generated PDF print support
  const handleTriggerPrintReport = useCallback(async (booking: EnrichedLabBooking) => {
    try {
      toast.info("Preparing diagnostic report PDF...");
      await printServerLabReportPdf(booking.id, {
        onFallbackPreview: () => setSelectedReportBooking(booking),
      });
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to load diagnostic report PDF");
    }
  }, []);

  // Cancellation flow (preserving payment refund acknowledgment)
  const handleRequestCancelBooking = useCallback(async (booking: EnrichedLabBooking) => {
    if (booking.payment_id) {
      let paymentAmount: number | undefined;
      try {
        const tenantId =
          typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const apiTenantId = getTenantIdForApi(tenantId || undefined);
        const payment = await paymentsApi.getById(booking.payment_id, apiTenantId);
        paymentAmount = payment.amount;
      } catch {
        // Proceed with modal even if payment amount lookup fails
      }
      setPendingCancellation({
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
        paymentAmount,
      });
      setShowCancellationModal(true);
      return;
    }

    setPendingCancellation({
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
    });
    setShowCancellationModal(true);
  }, []);

  const handleConfirmCancellation = async () => {
    if (!pendingCancellation) return;
    setCancelling(true);
    try {
      await labBookingsApi.updateStatus(pendingCancellation.bookingId, "cancelled");
      clearBookingDraft(pendingCancellation.bookingId);
      toast.success("Booking cancelled");
      setShowCancellationModal(false);
      setPendingCancellation(null);
      await fetchBookings();
      await fetchKpiCounts();
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  // Summary PDF Export
  const handleExportPDF = useCallback(async () => {
    if (!startDate || !endDate) {
      toast.error("Select a date preset (e.g. Today or Last 3 Days) or custom date range to export PDF");
      return;
    }
    if (dateRangeError) {
      toast.error(dateRangeError);
      return;
    }

    setExporting(true);
    try {
      let exportStatus: BookingStatus | undefined;
      if (activeTab === "published") exportStatus = "completed";
      else if (activeTab === "cancelled") exportStatus = "cancelled";
      else if (activeTab === "draft") exportStatus = "in_progress";

      const response = await labBookingsApi.list({
        start_date: startDate,
        end_date: endDate,
        status: exportStatus,
      });

      const enriched = await enrichBookingsWithPatients(response.items);
      const allBookings = Array.from(
        new Map(enriched.map((b) => [b.id, b])).values()
      );

      if (allBookings.length === 0) {
        toast.error("No lab reports found in the selected range");
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const centerX = pageWidth / 2;
      let yPos = 15;

      if (logoDataUrl) {
        try {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = logoDataUrl;
          });
          const pxToMm = 0.264583;
          let w = img.width * pxToMm;
          let h = img.height * pxToMm;
          if (h > 24) {
            const scale = 24 / h;
            w *= scale;
            h = 24;
          }
          const format = logoDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          doc.addImage(logoDataUrl, format, centerX - w / 2, yPos, w, h);
          yPos += h + 5;
        } catch {
          // Continue without logo
        }
      }

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text((tenant?.name || hospitalName || "HOSPITAL").toUpperCase(), centerX, yPos, {
        align: "center",
      });
      yPos += 7;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Laboratory Reports Summary", centerX, yPos, { align: "center" });
      yPos += 6;

      doc.setDrawColor(30, 41, 59);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 6;

      doc.setFontSize(8);
      doc.text(
        `Range: ${formatDate(startDate)} to ${formatDate(endDate)}`,
        14,
        yPos
      );
      doc.text(`Total: ${allBookings.length} bookings`, pageWidth - 14, yPos, {
        align: "right",
      });
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [["Date", "Booking #", "Patient Name", "Status", "Priority", "Tests", "Amount"]],
        body: allBookings.map((b) => [
          formatDate(b.scheduled_date),
          b.booking_number,
          b.patient_name || "Patient",
          formatBookingSubStatus(b.status),
          b.priority.toUpperCase(),
          `${b.tests.length}`,
          formatCurrencyForPDF(b.total_amount),
        ]),
        theme: "striped",
        headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 7.5, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      doc.save(`lab_reports_${startDate}_to_${endDate}.pdf`);
      toast.success(`Exported ${allBookings.length} lab reports`);
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to export PDF");
    } finally {
      setExporting(false);
    }
  }, [
    startDate,
    endDate,
    dateRangeError,
    activeTab,
    enrichBookingsWithPatients,
    logoDataUrl,
    tenant?.name,
    hospitalName,
  ]);

  return (
    <div className="space-y-4">
      {/* Workbench Header & KPI Summary Strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-xs">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Lab Technician Workbench
                </h1>
                <p className="text-xs text-slate-500">
                  Enter results inline, auto-save drafts, review flagged values, and publish reports
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Compact Status Summary Pills */}
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100/70 cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span className="tabular-nums">{kpiCounts.pending}</span> Pending
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("draft")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-1.5 text-xs font-semibold text-sky-900 transition hover:bg-sky-100/70 cursor-pointer"
            >
              <FileEdit className="h-3.5 w-3.5 text-sky-600" />
              <span className="tabular-nums">{kpiCounts.draft}</span> Draft
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("published")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100/70 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="tabular-nums">{kpiCounts.published}</span> Published
            </button>
            {urgentStatCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                <span className="tabular-nums">{urgentStatCount}</span> Urgent/STAT
              </span>
            )}

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <button
              type="button"
              onClick={refreshAll}
              disabled={loading}
              title="Refresh worklist"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={!!dateRangeError || exporting}
              title="Export filtered lab reports summary PDF"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Split Master-Detail Workbench */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        {/* Left Queue */}
        <div
          className={`lg:col-span-4 xl:col-span-4 min-w-0 ${
            mobileShowWorkspace ? "hidden lg:block" : "block"
          }`}
        >
          <LabWorklistSidebar
            bookings={filteredBookings}
            loading={loading}
            selectedBookingId={selectedBooking?.id ?? null}
            onSelectBooking={(booking) => {
              setSelectedBookingId(booking.id);
              setMobileShowWorkspace(true);
            }}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            pendingSubFilter={pendingSubFilter}
            onPendingSubFilterChange={setPendingSubFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            datePreset={datePreset}
            onDatePresetChange={handleDatePresetChange}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(val) => {
              setDatePreset("custom");
              setStartDate(val);
            }}
            onEndDateChange={(val) => {
              setDatePreset("custom");
              setEndDate(val);
            }}
            minStartDate={getMinStartDate()}
            maxEndDate={getMaxEndDate()}
            todayDate={getTodayDateLocal()}
            dateRangeError={dateRangeError}
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            bookingResultProgress={bookingResultProgress}
            draftBookingIds={draftBookingIdsRefCurrent}
          />
        </div>

        {/* Right Report Workspace */}
        <div
          className={`lg:col-span-8 xl:col-span-8 min-w-0 ${
            mobileShowWorkspace ? "block" : "hidden lg:block"
          }`}
        >
          <LabReportWorkspace
            booking={selectedBooking}
            onBackToQueue={() => setMobileShowWorkspace(false)}
            onBookingUpdated={refreshAll}
            onRequestCancelBooking={handleRequestCancelBooking}
            onPrintReport={handleTriggerPrintReport}
            onOpenReportModal={(b) => setSelectedReportBooking(b)}
            onProgressUpdate={handleProgressUpdate}
            loadBookingDraft={loadBookingDraft}
            saveBookingDraft={saveBookingDraft}
            clearBookingDraft={clearBookingDraft}
            hasLocalDraftForBooking={
              selectedBooking ? draftBookingIds.has(selectedBooking.id) : false
            }
          />
        </div>
      </div>

      {/* Cancellation Refund Acknowledgment Modal */}
      <CancellationRefundAcknowledgmentModal
        isOpen={showCancellationModal}
        onClose={() => {
          setShowCancellationModal(false);
          setPendingCancellation(null);
        }}
        onConfirm={handleConfirmCancellation}
        type="lab"
        itemNumber={pendingCancellation?.bookingNumber}
        amount={pendingCancellation?.paymentAmount}
        loading={cancelling}
      />

      {/* Server-Generated Diagnostic Report PDF Preview Modal */}
      <LabReportPdfModal
        isOpen={selectedReportBooking !== null}
        onClose={() => setSelectedReportBooking(null)}
        booking={selectedReportBooking}
      />
    </div>
  );
}
