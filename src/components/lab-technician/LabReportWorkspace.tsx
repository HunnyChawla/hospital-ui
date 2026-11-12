"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LabBookingTest } from "@/services/labBookingsApi";
import { labBookingsApi } from "@/services/labBookingsApi";
import {
  labTestsApi,
  type LabTestResult,
  type ParameterWithResult,
  type PublishResultsRequest,
} from "@/services/labTestsApi";
import { mrdApi } from "@/services/mrdApi";
import type { LabTestResultItem } from "@/types";
import { formatDate } from "@/utils/format";
import { getErrorMessage } from "@/utils/errorHandler";
import { toast } from "sonner";
import { MaskedValue } from "@/components/common/MaskedValue";
import { NormalRangeIndicator } from "@/components/doctors/shared/NormalRangeIndicator";
import { MRDImage } from "./TestResultsForm";
import { ParameterEntryRow } from "./ParameterEntryRow";
import type { EnrichedLabBooking } from "./LabWorklistSidebar";
import {
  deriveReportStage,
  evaluateParameterAbnormality,
  formatBookingSubStatus,
  getReportStageMeta,
  type BookingDraftMap,
  type DraftParameterEntry,
} from "./useLabDraftStorage";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  FlaskConical,
  Loader2,
  Lock,
  Printer,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";

interface LabReportWorkspaceProps {
  booking: EnrichedLabBooking | null;
  onBackToQueue?: () => void;
  onBookingUpdated: () => Promise<void> | void;
  onRequestCancelBooking: (booking: EnrichedLabBooking) => void;
  onPrintReport: (booking: EnrichedLabBooking) => void;
  onOpenReportModal: (booking: EnrichedLabBooking) => void;
  onProgressUpdate: (
    bookingId: string,
    testsWithResults: number,
    totalTests: number
  ) => void;
  loadBookingDraft: (
    bookingId: string
  ) => { updatedAt: string; items: Record<string, Record<string, { result_numeric: string; result_value: string; notes: string }>> } | null;
  saveBookingDraft: (bookingId: string, draftMap: BookingDraftMap) => string | null;
  clearBookingDraft: (bookingId: string) => void;
  hasLocalDraftForBooking: boolean;
}

type WorkspaceMode = "edit" | "review";

function mergeFallbackParameters(
  params: Awaited<ReturnType<typeof labTestsApi.getTestParameters>>,
  results: LabTestResult[]
): ParameterWithResult[] {
  const resultByParamId = new Map(results.map((r) => [r.parameter_id, r]));
  return params
    .filter((p) => p.is_active)
    .sort((a, b) => (a.display_order ?? 9999) - (b.display_order ?? 9999))
    .map((p) => {
      const existing = resultByParamId.get(p.id);
      return {
        parameter_id: p.id,
        tenant_id: p.tenant_id || null,
        test_code: p.test_code,
        parameter_code: p.parameter_code,
        parameter_name: p.parameter_name,
        unit: p.unit,
        normal_min: p.normal_min,
        normal_max: p.normal_max,
        normal_text: p.normal_text,
        gender: p.gender,
        age_min: p.age_min,
        age_max: p.age_max,
        method: p.method,
        display_order: p.display_order,
        is_active: p.is_active,
        section_name: p.section_name ?? null,
        parameter_type: p.parameter_type,
        dropdown_options: p.dropdown_options ?? null,
        is_published: Boolean(existing),
        existing_result_value: existing?.result_value ?? null,
        existing_result_numeric: existing?.result_numeric ?? null,
        existing_notes: existing?.notes ?? null,
        existing_is_abnormal: existing?.is_abnormal ?? null,
        result_id: existing?.id ?? null,
      };
    });
}

function buildInitialDraftForParameters(
  tests: LabBookingTest[],
  paramsByTest: Record<string, ParameterWithResult[]>,
  localDraft: ReturnType<LabReportWorkspaceProps["loadBookingDraft"]>
): { initialMap: BookingDraftMap; restoredLocal: boolean } {
  const initialMap: BookingDraftMap = {};
  let restoredLocal = false;

  for (const test of tests) {
    const params = paramsByTest[test.id] || [];
    const testDraft = localDraft?.items?.[test.id] || {};
    const paramEntries: Record<string, DraftParameterEntry> = {};

    for (const p of params) {
      const localEntry = testDraft[p.parameter_id];
      if (localEntry) {
        restoredLocal = true;
      }

      // Handle numeric zero safely (backend returns existing_result_numeric: null when value is 0 due to truthiness check)
      const serverNumeric =
        p.existing_result_numeric !== null && p.existing_result_numeric !== undefined
          ? String(p.existing_result_numeric)
          : p.parameter_type === "number" &&
              p.existing_result_value !== null &&
              p.existing_result_value !== undefined &&
              p.existing_result_value.trim() !== ""
            ? p.existing_result_value
            : "";

      const serverValue = p.existing_result_value ?? "";
      const serverNotes = p.existing_notes ?? "";

      paramEntries[p.parameter_id] = {
        result_numeric: localEntry ? localEntry.result_numeric : serverNumeric,
        result_value: localEntry ? localEntry.result_value : serverValue,
        notes: localEntry ? localEntry.notes : serverNotes,
        image_file: null,
        image_url:
          p.parameter_type === "image" && (localEntry?.result_value || serverValue)
            ? localEntry?.result_value || serverValue
            : undefined,
      };
    }

    initialMap[test.id] = paramEntries;
  }

  return { initialMap, restoredLocal };
}

function isEntryFilled(
  param: ParameterWithResult,
  entry: DraftParameterEntry | undefined
): boolean {
  if (!entry) return false;
  if (param.parameter_type === "number") {
    return entry.result_numeric.trim() !== "";
  }
  if (param.parameter_type === "image") {
    return entry.result_value.trim() !== "" || Boolean(entry.image_file);
  }
  return entry.result_value.trim() !== "";
}

export function LabReportWorkspace({
  booking,
  onBackToQueue,
  onBookingUpdated,
  onRequestCancelBooking,
  onPrintReport,
  onOpenReportModal,
  onProgressUpdate,
  loadBookingDraft,
  saveBookingDraft,
  clearBookingDraft,
  hasLocalDraftForBooking,
}: LabReportWorkspaceProps) {
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [paramsByTest, setParamsByTest] = useState<Record<string, ParameterWithResult[]>>({});
  const [publishedResults, setPublishedResults] = useState<LabTestResultItem[]>([]);
  const [draftMap, setDraftMap] = useState<BookingDraftMap>({});
  const [activeTestFilter, setActiveTestFilter] = useState<string>("all");
  const [mode, setMode] = useState<WorkspaceMode>("edit");
  const [restoredFromLocal, setRestoredFromLocal] = useState(false);
  const [lastLocalSavedAt, setLastLocalSavedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishingFinal, setPublishingFinal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadWorkspaceData = useCallback(async () => {
    if (!booking) return;
    setLoadingWorkspace(true);
    setMode("edit");
    setActiveTestFilter("all");
    setIsDirty(false);

    try {
      if (booking.status === "completed") {
        const res = await labBookingsApi.getResults(booking.id);
        const items = Array.isArray(res) ? res : [];
        setPublishedResults(items);
        setParamsByTest({});
        setDraftMap({});
        setRestoredFromLocal(false);
        const testsWithRes = items.filter((item) => (item.results?.length ?? 0) > 0).length;
        onProgressUpdate(booking.id, testsWithRes, booking.tests.length);
        return;
      }

      if (booking.status === "cancelled" || booking.status === "scheduled") {
        setPublishedResults([]);
        setParamsByTest({});
        setDraftMap({});
        setRestoredFromLocal(false);
        return;
      }

      // Active editing states: sample_collected or in_progress
      const entries = await Promise.all(
        booking.tests.map(async (test) => {
          try {
            const paramsWithRes = await labTestsApi.getParametersWithResults(
              booking.id,
              test.id,
              booking.patient_gender
            );
            const activeSorted = paramsWithRes
              .filter((p) => p.is_active)
              .sort((a, b) => (a.display_order ?? 9999) - (b.display_order ?? 9999));
            return [test.id, activeSorted] as const;
          } catch {
            // Resilient fallback if test parameters are global or endpoint returns 404
            const [params, results] = await Promise.all([
              labTestsApi
                .getTestParameters(test.test_code, booking.patient_gender)
                .catch(() => []),
              labTestsApi.getResults(booking.id, test.id).catch(() => []),
            ]);
            return [
              test.id,
              mergeFallbackParameters(
                Array.isArray(params) ? params : [],
                Array.isArray(results) ? results : []
              ),
            ] as const;
          }
        })
      );

      const nextParamsByTest: Record<string, ParameterWithResult[]> = {};
      let testsWithServerResults = 0;
      for (const [testId, params] of entries) {
        nextParamsByTest[testId] = params;
        if (params.some((p) => p.is_published)) {
          testsWithServerResults += 1;
        }
      }

      const localDraft = loadBookingDraft(booking.id);
      const { initialMap, restoredLocal } = buildInitialDraftForParameters(
        booking.tests,
        nextParamsByTest,
        localDraft
      );

      setParamsByTest(nextParamsByTest);
      setDraftMap(initialMap);
      setPublishedResults([]);
      setRestoredFromLocal(restoredLocal);
      setLastLocalSavedAt(localDraft?.updatedAt ?? null);
      setIsDirty(restoredLocal);
      onProgressUpdate(booking.id, testsWithServerResults, booking.tests.length);
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to load laboratory report workspace");
    } finally {
      setLoadingWorkspace(false);
    }
  }, [booking, loadBookingDraft, onProgressUpdate]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Debounced auto-save to tenant-scoped localStorage whenever dirty
  useEffect(() => {
    if (!booking || !isDirty) return;
    if (booking.status === "completed" || booking.status === "cancelled") return;

    const timer = setTimeout(() => {
      const savedAt = saveBookingDraft(booking.id, draftMap);
      setLastLocalSavedAt(savedAt);
    }, 350);

    return () => clearTimeout(timer);
  }, [booking, draftMap, isDirty, saveBookingDraft]);

  const updateParameterField = useCallback(
    (
      bookingItemId: string,
      parameterId: string,
      patch: Partial<DraftParameterEntry>
    ) => {
      setDraftMap((prev) => {
        const currentTest = prev[bookingItemId] || {};
        const currentParam = currentTest[parameterId] || {
          result_numeric: "",
          result_value: "",
          notes: "",
        };
        return {
          ...prev,
          [bookingItemId]: {
            ...currentTest,
            [parameterId]: {
              ...currentParam,
              ...patch,
            },
          },
        };
      });
      setIsDirty(true);
    },
    []
  );

  // Derived counters & validation
  const workspaceSummary = useMemo(() => {
    if (!booking) {
      return {
        totalParams: 0,
        filledParams: 0,
        abnormalCount: 0,
        testsWithAtLeastOneEntry: 0,
        testsMissingAllEntries: [] as LabBookingTest[],
        abnormalItems: [] as Array<{
          testName: string;
          paramName: string;
          valueDisplay: string;
          referenceDisplay: string;
          flag: "low" | "high" | "abnormal";
        }>,
        hasAnyServerResults: false,
      };
    }

    let totalParams = 0;
    let filledParams = 0;
    let abnormalCount = 0;
    let testsWithAtLeastOneEntry = 0;
    let hasAnyServerResults = false;
    const testsMissingAllEntries: LabBookingTest[] = [];
    const abnormalItems: Array<{
      testName: string;
      paramName: string;
      valueDisplay: string;
      referenceDisplay: string;
      flag: "low" | "high" | "abnormal";
    }> = [];

    for (const test of booking.tests) {
      const params = paramsByTest[test.id] || [];
      const testEntries = draftMap[test.id] || {};
      let testFilled = 0;

      for (const p of params) {
        totalParams += 1;
        if (p.is_published) hasAnyServerResults = true;
        const entry = testEntries[p.parameter_id];
        if (isEntryFilled(p, entry)) {
          filledParams += 1;
          testFilled += 1;
        }

        const flag = evaluateParameterAbnormality({
          parameterType: p.parameter_type,
          resultNumeric: entry?.result_numeric,
          resultValue: entry?.result_value,
          normalMin: p.normal_min,
          normalMax: p.normal_max,
          normalText: p.normal_text,
        });

        if (flag === "low" || flag === "high" || flag === "abnormal") {
          abnormalCount += 1;
          const valStr =
            p.parameter_type === "number"
              ? `${entry?.result_numeric || ""}${p.unit ? ` ${p.unit}` : ""}`
              : entry?.result_value || "";
          const refStr =
            p.parameter_type === "number" && p.normal_min !== null && p.normal_max !== null
              ? `${p.normal_min} – ${p.normal_max}${p.unit ? ` ${p.unit}` : ""}`
              : p.normal_text || "—";
          abnormalItems.push({
            testName: test.test_name,
            paramName: p.parameter_name || p.parameter_code || "Parameter",
            valueDisplay: valStr,
            referenceDisplay: refStr,
            flag,
          });
        }
      }

      if (testFilled > 0) {
        testsWithAtLeastOneEntry += 1;
      } else {
        testsMissingAllEntries.push(test);
      }
    }

    return {
      totalParams,
      filledParams,
      abnormalCount,
      testsWithAtLeastOneEntry,
      testsMissingAllEntries,
      abnormalItems,
      hasAnyServerResults,
    };
  }, [booking, paramsByTest, draftMap]);

  const handleCollectSampleAndStart = async () => {
    if (!booking) return;
    setUpdatingStatus(true);
    try {
      await labBookingsApi.updateStatus(booking.id, "sample_collected");
      toast.success("Sample collected — ready for parameter entry");
      await onBookingUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to update sample status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  /**
   * Uploads any pending local image files and submits results for all tests
   * that have at least one entered parameter.
   */
  const persistResultsToServer = async (): Promise<number> => {
    if (!booking) return 0;
    const tenantId =
      typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
    let savedTestsCount = 0;

    for (const test of booking.tests) {
      const params = paramsByTest[test.id] || [];
      const testEntries = { ...(draftMap[test.id] || {}) };

      // Upload pending image files first
      for (const param of params) {
        const entry = testEntries[param.parameter_id];
        if (param.parameter_type === "image" && entry?.image_file) {
          const uploadRes = await mrdApi.upload(
            {
              file: entry.image_file,
              document_name: `${test.test_name}_${param.parameter_name || param.parameter_code}_result`,
              category: "LAB_REPORT",
              patient_id: booking.patient_id,
              lab_booking_id: booking.id,
            },
            tenantId || undefined
          );
          testEntries[param.parameter_id] = {
            ...entry,
            result_value: uploadRes.id,
            image_file: null,
            image_url: uploadRes.id,
          };
        }
      }

      const payloadResults: PublishResultsRequest["results"] = params
        .filter((param) => isEntryFilled(param, testEntries[param.parameter_id]))
        .map((param) => {
          const entry = testEntries[param.parameter_id];
          return {
            parameter_id: param.parameter_id,
            result_numeric:
              param.parameter_type === "number"
                ? parseFloat(entry.result_numeric)
                : undefined,
            result_value:
              param.parameter_type !== "number" ? entry.result_value : undefined,
            notes: entry.notes.trim() || undefined,
          };
        });

      if (payloadResults.length > 0) {
        await labTestsApi.publishResults(booking.id, test.id, {
          results: payloadResults,
        });
        savedTestsCount += 1;
      }
    }

    return savedTestsCount;
  };

  const handleSaveDraft = async () => {
    if (!booking) return;
    if (workspaceSummary.filledParams === 0) {
      toast.error("Enter at least one parameter value before saving a draft");
      return;
    }

    setSavingDraft(true);
    try {
      const savedCount = await persistResultsToServer();
      clearBookingDraft(booking.id);
      setRestoredFromLocal(false);
      setIsDirty(false);
      toast.success(
        `Draft saved for ${savedCount} test${savedCount !== 1 ? "s" : ""}. You can continue editing or publish when ready.`
      );
      await onBookingUpdated();
      await loadWorkspaceData();
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to save draft results");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDiscardLocalDraft = async () => {
    if (!booking) return;
    clearBookingDraft(booking.id);
    setRestoredFromLocal(false);
    setIsDirty(false);
    toast.info("Local unsaved edits discarded");
    await loadWorkspaceData();
  };

  const handlePublishFinalReport = async () => {
    if (!booking) return;
    if (workspaceSummary.testsMissingAllEntries.length > 0) {
      toast.error("Every test in this booking needs at least one result before publishing");
      return;
    }

    setPublishingFinal(true);
    try {
      await persistResultsToServer();
      await labBookingsApi.updateStatus(booking.id, "completed");
      clearBookingDraft(booking.id);
      setRestoredFromLocal(false);
      setIsDirty(false);
      toast.success("Laboratory report published and finalized");
      await onBookingUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to publish laboratory report");
    } finally {
      setPublishingFinal(false);
    }
  };

  const handleDownloadOfficialPdf = async () => {
    if (!booking) return;
    setDownloadingPdf(true);
    try {
      await labBookingsApi.downloadReportPdf(
        booking.id,
        `Diagnostic_Report_${booking.booking_number}.pdf`
      );
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to download official PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!booking) {
    return (
      <section className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          <FlaskConical className="h-7 w-7" />
        </div>
        <h2 className="text-base font-semibold text-slate-900">
          Select a lab booking from the queue
        </h2>
        <p className="mt-1.5 max-w-md text-sm text-slate-500">
          Choose a Pending, Draft, or Published booking on the left to inspect patient context,
          enter test parameters inline, review flagged results, and publish the report.
        </p>
      </section>
    );
  }

  const stage = deriveReportStage(
    booking,
    workspaceSummary.hasAnyServerResults,
    hasLocalDraftForBooking || isDirty
  );
  const stageMeta = getReportStageMeta(stage);

  const visibleTests =
    activeTestFilter === "all"
      ? booking.tests
      : booking.tests.filter((t) => t.id === activeTestFilter);

  return (
    <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Mobile Back Bar */}
      {onBackToQueue && (
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={onBackToQueue}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Queue
          </button>
          <span className="font-mono text-xs font-semibold text-slate-600">
            {booking.booking_number}
          </span>
        </div>
      )}

      {/* Sticky Patient & Report Header */}
      <header className="border-b border-slate-200 bg-gradient-to-r from-slate-50/90 to-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          {/* Patient Identity */}
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 truncate">
                {booking.patient_name || `Patient ${booking.patient_id.slice(0, 8)}`}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stageMeta.badgeClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${stageMeta.dotClass}`} />
                {stageMeta.label}
              </span>
              {booking.priority !== "routine" && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                    booking.priority === "stat"
                      ? "bg-rose-600 text-white"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}
                >
                  {booking.priority}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="font-mono font-semibold text-slate-800">
                #{booking.booking_number}
              </span>
              {booking.patient_uhid && (
                <span className="font-mono">
                  UHID: <strong className="text-slate-800">{booking.patient_uhid}</strong>
                </span>
              )}
              {(booking.patient_age !== undefined || booking.patient_gender_label) && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {[
                    booking.patient_age !== undefined ? `${booking.patient_age}y` : null,
                    booking.patient_gender_label,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </span>
              )}
              {booking.patient_mobile && (
                <MaskedValue type="mobile" value={booking.patient_mobile} size="xs" />
              )}
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {formatDate(booking.scheduled_date)}
              </span>
              {booking.sample_id && (
                <span className="rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-800">
                  Sample: {booking.sample_id}
                </span>
              )}
            </div>

            {booking.notes && (
              <p className="mt-1 rounded-lg border border-amber-200/70 bg-amber-50/70 px-2.5 py-1 text-xs text-amber-900">
                <strong className="font-semibold">Booking Note:</strong> {booking.notes}
              </p>
            )}
          </div>

          {/* Secondary / Lifecycle Header Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {booking.status === "completed" && (
              <>
                <button
                  type="button"
                  onClick={() => onPrintReport(booking)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-slate-500" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={handleDownloadOfficialPdf}
                  disabled={downloadingPdf}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:from-sky-600 hover:to-teal-600 disabled:opacity-60 cursor-pointer"
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => onOpenReportModal(booking)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  Report Preview
                </button>
              </>
            )}

            {(booking.status === "scheduled" ||
              booking.status === "sample_collected" ||
              booking.status === "in_progress") && (
              <button
                type="button"
                onClick={() => onRequestCancelBooking(booking)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                Cancel Booking
              </button>
            )}
          </div>
        </div>

        {/* Sub-status & Draft Indicator Strip */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
          <p className="text-slate-600">
            <span className="font-medium text-slate-800">
              Workflow Stage: {formatBookingSubStatus(booking.status)}
            </span>
            <span className="mx-2 text-slate-300">|</span>
            <span>{stageMeta.description}</span>
          </p>

          {(restoredFromLocal || isDirty || lastLocalSavedAt) &&
            booking.status !== "completed" &&
            booking.status !== "cancelled" && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                  <Sparkles className="h-3 w-3" />
                  {lastLocalSavedAt
                    ? `Auto-saved locally at ${new Date(lastLocalSavedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Unsaved local edits"}
                </span>
                <button
                  type="button"
                  onClick={handleDiscardLocalDraft}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Discard
                </button>
              </div>
            )}
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 p-4 sm:p-6">
        {loadingWorkspace ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            <p className="mt-3 text-sm font-medium">Loading test parameters and results...</p>
          </div>
        ) : booking.status === "cancelled" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center">
            <XCircle className="mx-auto h-10 w-10 text-rose-500" />
            <h3 className="mt-3 text-base font-semibold text-rose-900">
              Booking Cancelled
            </h3>
            <p className="mt-1 text-sm text-rose-700">
              This lab booking has been cancelled. Result entry and publishing are disabled.
            </p>
          </div>
        ) : booking.status === "scheduled" ? (
          /* Pending Collection State: 1-Click to Collect Sample & Start Entry */
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                  Pending Sample Collection
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Ready to collect sample for {booking.tests.length} ordered test
                  {booking.tests.length !== 1 ? "s" : ""}
                </h3>
                <p className="text-sm text-slate-600">
                  Collect the sample to generate a Sample ID and unlock inline parameter entry immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCollectSampleAndStart}
                disabled={updatingStatus}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-sky-600 hover:to-teal-600 disabled:opacity-60 cursor-pointer"
              >
                {updatingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <FlaskConical className="h-4 w-4" />
                    Collect Sample &amp; Start Entry
                  </>
                )}
              </button>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {booking.tests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between rounded-xl border border-amber-200/70 bg-white px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {test.test_name}
                    </p>
                    <p className="font-mono text-xs text-slate-500">{test.test_code}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : booking.status === "completed" ? (
          /* Published View: Locked Clinical Report */
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
              <div className="flex items-center gap-2.5 text-emerald-900">
                <Lock className="h-4 w-4 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-semibold">
                    Report Published &amp; Locked
                  </p>
                  <p className="text-xs text-emerald-700">
                    All test results are finalized and synced to the patient&apos;s diagnostic health record.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Finalized
              </span>
            </div>

            {publishedResults.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                  No parameter results found for this published booking.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {publishedResults.map((testItem) => {
                  const resultsBySection = (testItem.results || []).reduce<
                    Record<string, typeof testItem.results>
                  >((acc, r) => {
                    const sec = r.section_name || "General Parameters";
                    if (!acc[sec]) acc[sec] = [];
                    acc[sec].push(r);
                    return acc;
                  }, {});

                  return (
                    <div
                      key={testItem.booking_item_id}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {testItem.test_name}
                          </h3>
                          <p className="font-mono text-xs text-slate-500">
                            {testItem.test_code}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          {testItem.results.length} parameter
                          {testItem.results.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 p-4 space-y-4">
                        {Object.entries(resultsBySection).map(([sectionName, sectionRows]) => (
                          <div key={sectionName} className="pt-3 first:pt-0 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              {sectionName}
                            </h4>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              {sectionRows.map((param) => (
                                <div
                                  key={param.id}
                                  className={`rounded-xl border p-3.5 ${
                                    param.is_abnormal
                                      ? "border-rose-200 bg-rose-50/50"
                                      : "border-slate-200 bg-white"
                                  }`}
                                >
                                  {param.parameter_type === "image" ? (
                                    <div className="space-y-2">
                                      <p className="text-xs font-semibold text-slate-800">
                                        {param.parameter_name}
                                      </p>
                                      <div className="flex h-44 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
                                        <MRDImage
                                          documentId={param.result_value}
                                          clickable
                                          className="max-h-full max-w-full object-contain"
                                          alt={param.parameter_name}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <NormalRangeIndicator
                                      label={param.parameter_name}
                                      value={param.result_numeric ?? param.result_value}
                                      normalMin={param.normal_min}
                                      normalMax={param.normal_max}
                                      unit={param.unit || ""}
                                      size="sm"
                                    />
                                  )}
                                  {param.normal_text && (
                                    <p className="mt-1.5 text-xs text-slate-500">
                                      Expected: <span className="font-medium text-slate-700">{param.normal_text}</span>
                                    </p>
                                  )}
                                  {param.notes && (
                                    <p className="mt-1.5 text-xs italic text-slate-600">
                                      Note: {param.notes}
                                    </p>
                                  )}
                                  {param.verified_at && (
                                    <p className="mt-2 text-[11px] font-medium text-emerald-700">
                                      Verified {new Date(param.verified_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : mode === "review" ? (
          /* Pre-Publish Review Mode */
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <ClipboardCheck className="h-5 w-5 text-sky-700 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Review Before Publishing
                  </h3>
                  <p className="text-xs text-slate-600">
                    Verify abnormal flags and completeness. Publishing locks the report and sends it to Health Records.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold tabular-nums text-slate-700 border border-sky-200">
                {workspaceSummary.filledParams} / {workspaceSummary.totalParams} parameters filled
              </span>
            </div>

            {workspaceSummary.testsMissingAllEntries.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-rose-900">
                      Incomplete Tests Detected
                    </h4>
                    <p className="text-xs text-rose-800">
                      Each test must have at least one parameter value before publishing the final report:
                    </p>
                    <ul className="list-disc pl-4 text-xs font-semibold text-rose-900">
                      {workspaceSummary.testsMissingAllEntries.map((t) => (
                        <li key={t.id}>
                          {t.test_name} ({t.test_code})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {workspaceSummary.abnormalItems.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                  <h4 className="text-sm font-bold">
                    {workspaceSummary.abnormalItems.length} Out-of-Range Finding
                    {workspaceSummary.abnormalItems.length !== 1 ? "s" : ""}
                  </h4>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {workspaceSummary.abnormalItems.map((item, idx) => (
                    <div
                      key={`${item.testName}-${item.paramName}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {item.paramName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.testName} • Ref: {item.referenceDisplay}
                        </p>
                      </div>
                      <span className="ml-2 shrink-0 rounded-full bg-rose-100 px-2 py-0.5 font-bold tabular-nums text-rose-800">
                        {item.valueDisplay} ({item.flag.toUpperCase()})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Review Table per Test */}
            <div className="space-y-4">
              {booking.tests.map((test) => {
                const params = paramsByTest[test.id] || [];
                const entries = draftMap[test.id] || {};
                const filledRows = params.filter((p) =>
                  isEntryFilled(p, entries[p.parameter_id])
                );

                return (
                  <div
                    key={test.id}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                      <span className="text-sm font-bold text-slate-900">
                        {test.test_name}{" "}
                        <span className="font-mono text-xs font-normal text-slate-500">
                          ({test.test_code})
                        </span>
                      </span>
                      <span className="text-xs font-medium text-slate-600 tabular-nums">
                        {filledRows.length}/{params.length} entered
                      </span>
                    </div>

                    {filledRows.length === 0 ? (
                      <p className="p-4 text-xs italic text-rose-600">
                        No parameter values entered for this test yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-100 bg-slate-50/50 text-slate-500">
                            <tr>
                              <th className="px-4 py-2 font-semibold">Parameter</th>
                              <th className="px-4 py-2 font-semibold">Entered Value</th>
                              <th className="px-4 py-2 font-semibold">Reference</th>
                              <th className="px-4 py-2 font-semibold">Flag</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filledRows.map((p) => {
                              const entry = entries[p.parameter_id];
                              const flag = evaluateParameterAbnormality({
                                parameterType: p.parameter_type,
                                resultNumeric: entry?.result_numeric,
                                resultValue: entry?.result_value,
                                normalMin: p.normal_min,
                                normalMax: p.normal_max,
                                normalText: p.normal_text,
                              });
                              const displayVal =
                                p.parameter_type === "image"
                                  ? entry?.image_file?.name || "Uploaded diagnostic image"
                                  : p.parameter_type === "number"
                                    ? `${entry?.result_numeric}${p.unit ? ` ${p.unit}` : ""}`
                                    : entry?.result_value;

                              const refText =
                                p.parameter_type === "number" &&
                                p.normal_min !== null &&
                                p.normal_max !== null
                                  ? `${p.normal_min} – ${p.normal_max}${p.unit ? ` ${p.unit}` : ""}`
                                  : p.normal_text || "—";

                              return (
                                <tr key={p.parameter_id}>
                                  <td className="px-4 py-2.5 font-medium text-slate-900">
                                    {p.parameter_name}
                                    {entry?.notes && (
                                      <p className="text-[11px] font-normal italic text-slate-500">
                                        Note: {entry.notes}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 font-semibold tabular-nums text-slate-900">
                                    {displayVal}
                                  </td>
                                  <td className="px-4 py-2.5 tabular-nums text-slate-600">
                                    {refText}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {flag === "normal" ? (
                                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                        Normal
                                      </span>
                                    ) : flag === "none" ? (
                                      <span className="text-slate-400">—</span>
                                    ) : (
                                      <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 uppercase">
                                        {flag}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Active Parameter Entry / Edit Mode */
          <div className="space-y-5">
            {/* Test Filter Pills + Live Progress */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {booking.tests.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveTestFilter("all")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      activeTestFilter === "all"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    All Tests ({booking.tests.length})
                  </button>
                )}
                {booking.tests.map((test) => {
                  const testParams = paramsByTest[test.id] || [];
                  const testEntries = draftMap[test.id] || {};
                  const filledCount = testParams.filter((p) =>
                    isEntryFilled(p, testEntries[p.parameter_id])
                  ).length;
                  const isSaved = testParams.some((p) => p.is_published);
                  const isActive = activeTestFilter === test.id;

                  return (
                    <button
                      key={test.id}
                      type="button"
                      onClick={() =>
                        setActiveTestFilter(
                          booking.tests.length === 1 ? "all" : test.id
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? "bg-sky-600 text-white shadow-xs"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate max-w-[160px]">{test.test_name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                          isActive
                            ? "bg-white/20 text-white"
                            : isSaved
                              ? "bg-emerald-50 text-emerald-700"
                              : filledCount > 0
                                ? "bg-sky-50 text-sky-700"
                                : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {filledCount}/{testParams.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Progress Counters */}
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium tabular-nums text-slate-700">
                  {workspaceSummary.filledParams}/{workspaceSummary.totalParams} filled
                </span>
                {workspaceSummary.abnormalCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 font-semibold tabular-nums text-rose-700 border border-rose-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {workspaceSummary.abnormalCount} flagged
                  </span>
                )}
              </div>
            </div>

            {/* Inline Parameter Entry Cards */}
            <div className="space-y-6">
              {visibleTests.map((test) => {
                const testParams = paramsByTest[test.id] || [];
                const testEntries = draftMap[test.id] || {};
                const paramsBySection = testParams.reduce<
                  Record<string, ParameterWithResult[]>
                >((acc, param) => {
                  const section = param.section_name || "General Parameters";
                  if (!acc[section]) acc[section] = [];
                  acc[section].push(param);
                  return acc;
                }, {});

                return (
                  <div
                    key={test.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/40 overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-4 py-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {test.test_name}
                          </h3>
                          <span className="font-mono text-xs text-slate-500">
                            {test.test_code}
                          </span>
                          {testParams.some((p) => p.is_published) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200">
                              <FileCheck2 className="h-3 w-3" />
                              Saved Draft
                            </span>
                          )}
                        </div>
                        {test.prescription_metadata &&
                          Object.keys(test.prescription_metadata).length > 0 && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {Object.entries(test.prescription_metadata)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" • ")}
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 space-y-5">
                      {testParams.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                          No active parameters configured for {test.test_name} ({test.test_code}).
                        </div>
                      ) : (
                        Object.entries(paramsBySection).map(([sectionName, sectionParams]) => (
                          <div key={sectionName} className="space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                {sectionName}
                              </h4>
                              <span className="text-[11px] text-slate-400 tabular-nums">
                                {sectionParams.length} parameter
                                {sectionParams.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {sectionParams.map((param) => (
                                <ParameterEntryRow
                                  key={param.parameter_id}
                                  parameter={param}
                                  value={
                                    testEntries[param.parameter_id] || {
                                      result_numeric: "",
                                      result_value: "",
                                      notes: "",
                                    }
                                  }
                                  onNumericChange={(pid, val) =>
                                    updateParameterField(test.id, pid, {
                                      result_numeric: val,
                                    })
                                  }
                                  onTextChange={(pid, val) =>
                                    updateParameterField(test.id, pid, {
                                      result_value: val,
                                    })
                                  }
                                  onImageChange={(pid, file) =>
                                    updateParameterField(test.id, pid, {
                                      image_file: file,
                                    })
                                  }
                                  onNotesChange={(pid, notes) =>
                                    updateParameterField(test.id, pid, {
                                      notes,
                                    })
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar (Edit & Review Modes) */}
      {(booking.status === "sample_collected" || booking.status === "in_progress") &&
        !loadingWorkspace && (
          <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
            {mode === "edit" ? (
              <>
                <div className="text-xs text-slate-500">
                  {workspaceSummary.testsMissingAllEntries.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      All {booking.tests.length} test
                      {booking.tests.length !== 1 ? "s" : ""} ready for review
                    </span>
                  ) : (
                    <span className="tabular-nums">
                      {workspaceSummary.testsWithAtLeastOneEntry}/{booking.tests.length} tests
                      have entered values
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={savingDraft || publishingFinal || workspaceSummary.filledParams === 0}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {savingDraft ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Draft...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Draft
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("review")}
                    disabled={savingDraft || publishingFinal || workspaceSummary.filledParams === 0}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-sky-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Review &amp; Publish
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  disabled={publishingFinal}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Edit
                </button>

                <button
                  type="button"
                  onClick={handlePublishFinalReport}
                  disabled={
                    publishingFinal || workspaceSummary.testsMissingAllEntries.length > 0
                  }
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {publishingFinal ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing Report...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Publish Final Report
                    </>
                  )}
                </button>
              </>
            )}
          </footer>
        )}
    </section>
  );
}
