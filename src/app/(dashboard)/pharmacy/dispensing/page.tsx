"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Calendar,
  Stethoscope,
  RotateCcw,
  Eye,
  BedDouble,
  Pill,
  FileText,
  Filter,
} from "lucide-react";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";
import { Pagination } from "@/components/common/Pagination";
import {
  pharmacyApi,
  PrescriptionQueueItem,
  DispensingDoctorOption,
  PrescriptionSource,
} from "@/services/pharmacyApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

type QueueStatusFilter = "pending,partially_dispensed" | "pending" | "partially_dispensed" | "dispensed" | "all";
type DatePreset = "all" | "today" | "last7" | "custom";

function toLocalISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DispensingQueuePage() {
  const [queue, setQueue] = useState<PrescriptionQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [encounterFilter, setEncounterFilter] = useState<"OPD" | "IPD" | "">("");
  const [sourceFilter, setSourceFilter] = useState<PrescriptionSource | "">("");
  const [doctorId, setDoctorId] = useState("");
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>("pending,partially_dispensed");

  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [manualDateTouched, setManualDateTouched] = useState(false);

  const [doctors, setDoctors] = useState<DispensingDoctorOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    pharmacyApi
      .getDispensingDoctors()
      .then((list) => {
        if (active) setDoctors(list);
      })
      .catch(() => {
        // Non-blocking: dropdown simply stays empty if doctor lookup fails
      });
    return () => {
      active = false;
    };
  }, []);

  const applyDatePreset = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    setManualDateTouched(preset !== "all" && preset !== "today");
    const now = new Date();
    if (preset === "today") {
      const todayStr = toLocalISODate(now);
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === "last7") {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setDateFrom(toLocalISODate(past));
      setDateTo(toLocalISODate(now));
    } else if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    }
    setPage(1);
  }, []);

  const handleStatusChange = (nextStatus: QueueStatusFilter) => {
    setStatusFilter(nextStatus);
    setPage(1);
    // Smart default: Pending views show All Dates so unfulfilled backlog isn't hidden;
    // Dispensed/All views default to Today unless the pharmacist chose a custom range.
    if (!manualDateTouched) {
      if (nextStatus === "dispensed" || nextStatus === "all") {
        const todayStr = toLocalISODate(new Date());
        setDatePreset("today");
        setDateFrom(todayStr);
        setDateTo(todayStr);
      } else {
        setDatePreset("all");
        setDateFrom("");
        setDateTo("");
      }
    }
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setEncounterFilter("");
    setSourceFilter("");
    setDoctorId("");
    setStatusFilter("pending,partially_dispensed");
    setManualDateTouched(false);
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasCustomFilters = useMemo(() => {
    return Boolean(
      debouncedSearch ||
        encounterFilter ||
        sourceFilter ||
        doctorId ||
        statusFilter !== "pending,partially_dispensed" ||
        datePreset !== "all"
    );
  }, [debouncedSearch, encounterFilter, sourceFilter, doctorId, statusFilter, datePreset]);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pharmacyApi.getDispensingQueue({
        search: debouncedSearch || undefined,
        encounter_type: encounterFilter || undefined,
        source: sourceFilter || undefined,
        doctor_id: doctorId || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: pageSize,
      });
      setQueue(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load dispensing queue");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, encounterFilter, sourceFilter, doctorId, statusFilter, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
            <Clock className="h-3 w-3 shrink-0" />
            Pending
          </span>
        );
      case "partially_dispensed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-800 ring-1 ring-inset ring-cyan-200">
            <Pill className="h-3 w-3 shrink-0" />
            Partial
          </span>
        );
      case "dispensed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            Dispensed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getSourceBadge = (source?: PrescriptionSource) => {
    switch (source) {
      case "optometry":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800 ring-1 ring-inset ring-violet-200">
            <Eye className="h-3 w-3" />
            Eye / Optometry
          </span>
        );
      case "ipd":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-200">
            <BedDouble className="h-3 w-3" />
            IPD Order
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            <FileText className="h-3 w-3" />
            Clinic Rx
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Prescription Dispensing Queue
          </h1>
          <p className="text-sm text-slate-600">
            Filter finalized clinic, ophthalmology, and active IPD medication orders by doctor, date, and status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50/70 px-3 py-1.5 text-xs font-semibold text-cyan-900"
          >
            <Filter className="h-3.5 w-3.5 text-cyan-700" />
            <span className="tabular-nums">{total}</span>
            <span>{total === 1 ? "order" : "orders"} matched</span>
          </div>
          {hasCustomFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      <PharmacyNav />

      {/* Filter Toolbar */}
      <section
        aria-label="Queue filters"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
      >
        {/* Row 1: Search, Doctor, Source, Encounter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5">
            <label htmlFor="dispense-search" className="sr-only">
              Search prescriptions
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="dispense-search"
                type="text"
                placeholder="Search Rx #, Order #, patient name, UHID, mobile..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
              />
            </div>
          </div>

          {/* Doctor Filter */}
          <div className="md:col-span-3">
            <label htmlFor="dispense-doctor" className="sr-only">
              Filter by prescribing doctor
            </label>
            <div className="relative">
              <Stethoscope className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <select
                id="dispense-doctor"
                value={doctorId}
                onChange={(e) => {
                  setDoctorId(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 cursor-pointer"
              >
                <option value="">All Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.doctor_id} value={doc.doctor_id}>
                    {doc.doctor_name}
                    {doc.specialization ? ` (${doc.specialization})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Source Filter */}
          <div className="md:col-span-2">
            <label htmlFor="dispense-source" className="sr-only">
              Filter by prescription source
            </label>
            <select
              id="dispense-source"
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value as PrescriptionSource | "");
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 cursor-pointer"
            >
              <option value="">All Sources</option>
              <option value="general">Clinic Rx</option>
              <option value="optometry">Eye / Optometry</option>
              <option value="ipd">IPD Orders</option>
            </select>
          </div>

          {/* Encounter Type Filter */}
          <div className="md:col-span-2">
            <label htmlFor="dispense-encounter" className="sr-only">
              Filter by encounter type
            </label>
            <select
              id="dispense-encounter"
              value={encounterFilter}
              onChange={(e) => {
                setEncounterFilter(e.target.value as "OPD" | "IPD" | "");
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 cursor-pointer"
            >
              <option value="">All Encounters</option>
              <option value="OPD">OPD Only</option>
              <option value="IPD">IPD Only</option>
            </select>
          </div>
        </div>

        {/* Row 2: Status Segmented Tabs + Date Quick Presets & Custom Range */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Status Tabs */}
          <div
            role="tablist"
            aria-label="Dispensing status"
            className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1"
          >
            {[
              { id: "pending,partially_dispensed", label: "Pending Queue" },
              { id: "pending", label: "Not Started" },
              { id: "partially_dispensed", label: "Partial" },
              { id: "dispensed", label: "Dispensed" },
              { id: "all", label: "All" },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleStatusChange(tab.id as QueueStatusFilter)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 cursor-pointer ${
                    active
                      ? "bg-white text-cyan-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Date Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              {[
                { id: "all" as DatePreset, label: "All Dates" },
                { id: "today" as DatePreset, label: "Today" },
                { id: "last7" as DatePreset, label: "Last 7 Days" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyDatePreset(preset.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 cursor-pointer ${
                    datePreset === preset.id
                      ? "bg-white text-cyan-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-slate-500 hidden sm:block" />
              <input
                type="date"
                aria-label="From date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setDatePreset("custom");
                  setManualDateTouched(true);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                aria-label="To date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setDatePreset("custom");
                  setManualDateTouched(true);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Queue Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Order / Rx #</th>
                <th className="py-3 px-4 font-semibold">Source & Type</th>
                <th className="py-3 px-4 font-semibold">Patient</th>
                <th className="py-3 px-4 font-semibold">Doctor / Prescriber</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold text-center">Items</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-4 w-full rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 px-4 text-center">
                    <div className="mx-auto max-w-sm space-y-2">
                      <p className="text-sm font-semibold text-slate-800">
                        No prescriptions match the selected filters
                      </p>
                      <p className="text-xs text-slate-500">
                        Try broadening your date range, clearing the doctor filter, or switching to All Dates.
                      </p>
                      {hasCustomFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-cyan-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 transition cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                queue.map((item) => {
                  const sourceQuery = item.source ? `&source=${item.source}` : "";
                  const workspaceHref = `/pharmacy/dispensing/workspace?rxId=${item.prescription_id}${sourceQuery}`;
                  const rxDate = new Date(item.prescription_date);

                  return (
                    <tr
                      key={`${item.source || "general"}-${item.prescription_id}`}
                      className="hover:bg-cyan-50/35 transition-colors"
                    >
                      {/* Rx # */}
                      <td className="py-3 px-4 align-top">
                        <Link
                          href={workspaceHref}
                          className="font-mono font-bold text-slate-900 hover:text-cyan-700 focus-visible:outline-none focus-visible:underline"
                        >
                          {item.prescription_number}
                        </Link>
                        {item.diagnosis && (
                          <p className="mt-0.5 text-[11px] text-slate-500 truncate max-w-[190px]" title={item.diagnosis}>
                            {item.diagnosis}
                          </p>
                        )}
                      </td>

                      {/* Source & Encounter */}
                      <td className="py-3 px-4 align-top space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {getSourceBadge(item.source)}
                          <span
                            className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              item.encounter_type === "IPD"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-cyan-100 text-cyan-800"
                            }`}
                          >
                            {item.encounter_type}
                          </span>
                        </div>
                        {(item.admission_number || item.ward_bed) && (
                          <div className="text-[11px] text-slate-600">
                            {item.admission_number ? `#${item.admission_number}` : ""}
                            {item.admission_number && item.ward_bed ? " · " : ""}
                            {item.ward_bed || ""}
                          </div>
                        )}
                      </td>

                      {/* Patient */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-900">{item.patient_name}</div>
                        <div className="text-[11px] font-mono text-slate-600">
                          {item.patient_uhid}
                          {item.patient_mobile ? ` · ${item.patient_mobile}` : ""}
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="py-3 px-4 align-top text-slate-800 font-medium">
                        {item.doctor_name ? (
                          <span>
                            {item.doctor_name.startsWith("Dr.") ? item.doctor_name : `Dr. ${item.doctor_name}`}
                          </span>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 align-top tabular-nums text-slate-700 whitespace-nowrap">
                        <div className="font-medium">
                          {rxDate.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {rxDate.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4 align-top text-center tabular-nums">
                        <span className="inline-flex min-w-[28px] justify-center rounded-lg bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                          {item.items_count}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 align-top text-center">
                        {getStatusBadge(item.pharmacy_status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-top text-right">
                        <Link
                          href={workspaceHref}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 cursor-pointer ${
                            item.pharmacy_status === "dispensed"
                              ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              : "bg-cyan-700 text-white shadow-xs hover:bg-cyan-600"
                          }`}
                        >
                          {item.pharmacy_status === "dispensed" ? "View" : "Dispense"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          total={total}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
}
