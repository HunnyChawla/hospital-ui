"use client";

import type { BookingStatus, LabBooking } from "@/services/labBookingsApi";
import { formatDate } from "@/utils/format";
import {
  deriveReportStage,
  formatBookingSubStatus,
  getReportStageMeta,
  type ReportStage,
} from "./useLabDraftStorage";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FlaskConical,
  Search,
  Sparkles,
  X,
} from "lucide-react";

export type WorklistTab = "all" | "pending" | "draft" | "published" | "cancelled";
export type DatePreset = "today" | "yesterday" | "3days" | "all" | "custom";
export type PendingSubFilter = "all" | "scheduled" | "sample_collected";

export interface EnrichedLabBooking extends LabBooking {
  patient_name?: string;
  patient_mobile?: string;
  patient_gender?: string;
  patient_gender_label?: string;
  patient_age?: number;
  patient_uhid?: string;
}

interface LabWorklistSidebarProps {
  bookings: EnrichedLabBooking[];
  loading: boolean;
  selectedBookingId: string | null;
  onSelectBooking: (booking: EnrichedLabBooking) => void;
  activeTab: WorklistTab;
  onTabChange: (tab: WorklistTab) => void;
  pendingSubFilter: PendingSubFilter;
  onPendingSubFilterChange: (sub: PendingSubFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  minStartDate?: string;
  maxEndDate?: string;
  todayDate: string;
  dateRangeError: string;
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  bookingResultProgress: Record<string, { testsWithResults: number; totalTests: number }>;
  draftBookingIds: Set<string>;
}

const TABS: Array<{ id: WorklistTab; label: string; dotClass?: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending", dotClass: "bg-amber-500" },
  { id: "draft", label: "Draft", dotClass: "bg-sky-500" },
  { id: "published", label: "Published", dotClass: "bg-emerald-500" },
  { id: "cancelled", label: "Cancelled", dotClass: "bg-rose-400" },
];

export function LabWorklistSidebar({
  bookings,
  loading,
  selectedBookingId,
  onSelectBooking,
  activeTab,
  onTabChange,
  pendingSubFilter,
  onPendingSubFilterChange,
  searchQuery,
  onSearchQueryChange,
  datePreset,
  onDatePresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minStartDate,
  maxEndDate,
  todayDate,
  dateRangeError,
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
  bookingResultProgress,
  draftBookingIds,
}: LabWorklistSidebarProps) {
  const getPriorityBadge = (priority: string) => {
    if (priority === "stat") {
      return {
        label: "STAT",
        badgeClass: "bg-rose-600 text-white",
        borderClass: "border-l-4 border-l-rose-600",
      };
    }
    if (priority === "urgent") {
      return {
        label: "URGENT",
        badgeClass: "bg-amber-100 text-amber-900 border border-amber-300",
        borderClass: "border-l-4 border-l-amber-500",
      };
    }
    return {
      label: "Routine",
      badgeClass: "bg-slate-100 text-slate-600",
      borderClass: "",
    };
  };

  return (
    <aside className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Search & Date Controls */}
      <div className="space-y-3 border-b border-slate-100 p-3.5">
        {/* Search Input */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search patient, booking #, sample ID..."
            aria-label="Search lab bookings by patient, booking number, or sample ID"
            className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-9 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus-visible:ring-2 focus-visible:ring-sky-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "3days", label: "Last 3 Days" },
              { id: "all", label: "All Dates" },
              { id: "custom", label: "Custom" },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onDatePresetChange(preset.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                datePreset === preset.id
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Inputs */}
        {datePreset === "custom" && (
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div>
              <label
                htmlFor="lab-start-date"
                className="mb-1 block text-[11px] font-semibold text-slate-600"
              >
                From
              </label>
              <input
                id="lab-start-date"
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                max={endDate ? (endDate < todayDate ? endDate : todayDate) : todayDate}
                min={minStartDate || undefined}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label
                htmlFor="lab-end-date"
                className="mb-1 block text-[11px] font-semibold text-slate-600"
              >
                To
              </label>
              <input
                id="lab-end-date"
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                min={startDate || undefined}
                max={maxEndDate || todayDate}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-400"
              />
            </div>
          </div>
        )}

        {dateRangeError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{dateRangeError}</span>
          </div>
        )}

        {/* Primary Report Lifecycle Tabs */}
        <div
          role="tablist"
          aria-label="Filter reports by status"
          className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-1 min-w-[60px] items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.dotClass && (
                  <span className={`h-1.5 w-1.5 rounded-full ${tab.dotClass}`} aria-hidden="true" />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Pending Sub-filters */}
        {activeTab === "pending" && (
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: "all", label: "All Pending" },
                { id: "scheduled", label: "Scheduled" },
                { id: "sample_collected", label: "Sample Collected" },
              ] as const
            ).map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => onPendingSubFilterChange(sub.id)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                  pendingSubFilter === sub.id
                    ? "bg-amber-100 text-amber-900"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[calc(100vh-340px)] min-h-[280px]">
        {loading ? (
          <div className="space-y-2.5 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 w-full animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FlaskConical className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No reports match your filters</p>
            <p className="mt-1 text-xs text-slate-500">
              Try switching status tabs, expanding the date range, or clearing the search box.
            </p>
          </div>
        ) : (
          bookings.map((booking) => {
            const isSelected = booking.id === selectedBookingId;
            const progress = bookingResultProgress[booking.id];
            const hasServerResults = progress ? progress.testsWithResults > 0 : false;
            const hasLocalDraft = draftBookingIds.has(booking.id);
            const stage: ReportStage = deriveReportStage(
              booking,
              hasServerResults,
              hasLocalDraft
            );
            const stageMeta = getReportStageMeta(stage);
            const priorityMeta = getPriorityBadge(booking.priority);

            return (
              <button
                key={booking.id}
                type="button"
                onClick={() => onSelectBooking(booking)}
                className={`w-full text-left p-3.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 ${
                  priorityMeta.borderClass
                } ${
                  isSelected
                    ? "bg-sky-50/90"
                    : "bg-white hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {booking.patient_name || `Patient ${booking.patient_id.slice(0, 8)}`}
                      </span>
                      {booking.priority !== "routine" && (
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${priorityMeta.badgeClass}`}
                        >
                          {priorityMeta.label}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700">
                        {booking.booking_number}
                      </span>
                      {booking.patient_uhid && (
                        <span className="font-mono text-[11px] text-slate-500">
                          • {booking.patient_uhid}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Report Stage Pill */}
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stageMeta.badgeClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${stageMeta.dotClass}`} />
                    {stageMeta.label}
                  </span>
                </div>

                {/* Bottom Metadata Row */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(booking.scheduled_date)}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <FlaskConical className="h-3.5 w-3.5 text-slate-400" />
                      {progress
                        ? `${progress.testsWithResults}/${booking.tests.length} saved`
                        : `${booking.tests.length} test${booking.tests.length !== 1 ? "s" : ""}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasLocalDraft && stage !== "published" && (
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                        <Sparkles className="h-2.5 w-2.5" />
                        Unsaved edits
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {formatBookingSubStatus(booking.status as BookingStatus)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-600">
        <span className="tabular-nums">
          {total === 0
            ? "0 bookings"
            : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, total)} of ${total}`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-semibold tabular-nums text-slate-800">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
