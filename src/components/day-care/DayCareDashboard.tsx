"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  Calendar,
  Filter,
  Activity,
  Plus,
  Loader2,
  CalendarDays,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Stethoscope,
  Smile,
  Frown,
  AlertCircle
} from "lucide-react";
import { dayCareApi } from "@/services/dayCareApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { DayCareVisit, DayCareStatus } from "@/types/dayCare";
import { PlannedSurgery } from "@/types";
import { getTodayDateLocal, formatDate } from "@/utils/format";
import { useAppSelector } from "@/redux/hooks";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { DayCareTimeline } from "./DayCareTimeline";
import clsx from "clsx";
import Link from "next/link";

export function DayCareDashboard() {
  const doctors = useAppSelector((s) => s.doctors.list);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateLocal());
  const [selectedSurgeon, setSelectedSurgeon] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [patientSearch, setPatientSearch] = useState<string>("");

  // Loading and data states
  const [visits, setVisits] = useState<DayCareVisit[]>([]);
  const [plannedSurgeries, setPlannedSurgeries] = useState<PlannedSurgery[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlanned, setLoadingPlanned] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Stats calculation
  const getStats = () => {
    const safeVisits = Array.isArray(visits) ? visits : [];
    const active = safeVisits.filter(v => !["discharged", "cancelled", "postponed", "no_show"].includes(v.status)).length;
    const scheduled = safeVisits.filter(v => v.status === "scheduled").length;
    const inOT = safeVisits.filter(v => v.status === "in_ot").length;
    const recovery = safeVisits.filter(v => v.status === "recovery").length;
    const discharged = safeVisits.filter(v => v.status === "discharged").length;

    return { active, scheduled, inOT, recovery, discharged };
  };

  const stats = getStats();

  // Fetch daycare visits
  const fetchDayCareVisits = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dayCareApi.listVisits({
        date: selectedDate,
        surgeon_id: selectedSurgeon || undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined
      });
      setVisits(response || []);
    } catch (err) {
      console.error("Failed to load day care visits:", err);
      toast.error(getErrorMessage(err) || "Failed to fetch day care records");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedSurgeon, selectedStatus]);

  // Fetch planned surgeries for today to auto-populate the list
  const fetchPlannedSurgeries = useCallback(async () => {
    setLoadingPlanned(true);
    try {
      // Query planned surgeries scheduled for the selected date (confirmed, scheduled, in_ot_preparation)
      const response = await plannedSurgeriesApi.list({
        from_date: selectedDate,
        to_date: selectedDate,
        date_status: "planned",
      });

      // Filter out completed/cancelled surgeries and those that already have a daycare visit record
      const items = response.items || [];
      const filtered = items.filter((ps) => {
        const isEligibleStatus = ["confirmed", "scheduled", "in_ot_preparation"].includes(ps.status);
        const hasNoVisitYet = !(Array.isArray(visits) ? visits : []).some((v) => v.planned_surgery_id === ps.id);
        return isEligibleStatus && hasNoVisitYet;
      });

      setPlannedSurgeries(filtered);
    } catch (err) {
      console.error("Failed to load planned surgeries:", err);
    } finally {
      setLoadingPlanned(false);
    }
  }, [selectedDate, visits]);

  useEffect(() => {
    fetchDayCareVisits();
  }, [fetchDayCareVisits]);

  useEffect(() => {
    if (visits && visits.length >= 0) {
      fetchPlannedSurgeries();
    }
  }, [visits, fetchPlannedSurgeries]);

  // Handle start day care visit
  const handleStartVisit = async (plannedSurgeryId: string) => {
    setActionLoading(plannedSurgeryId);
    try {
      await dayCareApi.createVisit({
        planned_surgery_id: plannedSurgeryId,
        visit_date: selectedDate
      });
      toast.success("Day Care visit started for patient");
      fetchDayCareVisits();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to initiate Day Care visit");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeColor = (status: DayCareStatus) => {
    switch (status) {
      case "scheduled":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "checked_in":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "pre_assessment_completed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ready_for_ot":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "in_ot":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "recovery":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "discharged":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "postponed":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "no_show":
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const formatStatusText = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const filteredVisits = (Array.isArray(visits) ? visits : []).filter(v => {
    if (!patientSearch) return true;
    return v.patient_name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      v.patient_uhid?.toLowerCase().includes(patientSearch.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Day Care Surgery Panel
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Monitor admissions, pre-op checks, surgeries, recoveries and discharges in real-time
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Active Operations", count: stats.active, icon: <TrendingUp className="h-5 w-5 text-sky-600" />, bg: "from-sky-500/10 to-sky-600/5", border: "border-sky-100" },
          { label: "Scheduled Visits", count: stats.scheduled, icon: <Clock className="h-5 w-5 text-slate-600" />, bg: "from-slate-500/10 to-slate-600/5", border: "border-slate-100" },
          { label: "Patients In OT", count: stats.inOT, icon: <Activity className="h-5 w-5 text-purple-600" />, bg: "from-purple-500/10 to-purple-600/5", border: "border-purple-100" },
          { label: "In Recovery", count: stats.recovery, icon: <Smile className="h-5 w-5 text-amber-600" />, bg: "from-amber-500/10 to-amber-600/5", border: "border-amber-100" },
          { label: "Discharged", count: stats.discharged, icon: <CheckCircle2 className="h-5 w-5 text-teal-600" />, bg: "from-teal-500/10 to-teal-600/5", border: "border-teal-100" }
        ].map((m, idx) => (
          <div key={idx} className={clsx("rounded-2xl border bg-gradient-to-br p-5 shadow-sm bg-white flex items-center justify-between", m.border, m.bg)}>
            <div>
              <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{m.label}</span>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{m.count}</p>
            </div>
            <div className="p-3 bg-white/80 rounded-2xl shadow-sm border border-slate-100/50 shrink-0">
              {m.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          {/* Patient Search */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              Patient Name / UHID
            </label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search patients..."
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-sky-400"
            />
          </div>

          {/* Date Selector */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              Visit Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-sky-400"
            />
          </div>

          {/* Surgeon Selector */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Stethoscope className="h-4 w-4 text-slate-400" />
              Surgeon
            </label>
            <select
              value={selectedSurgeon}
              onChange={(e) => setSelectedSurgeon(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-sky-400"
            >
              <option value="">All Surgeons</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || `Dr. ${d.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Status Selector */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Filter className="h-4 w-4 text-slate-400" />
              Workflow Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-sky-400"
            >
              <option value="all">All Stages</option>
              <option value="scheduled">Scheduled</option>
              <option value="checked_in">Checked In</option>
              <option value="pre_assessment_completed">Pre-Assessment Completed</option>
              <option value="ready_for_ot">Ready for OT</option>
              <option value="in_ot">In OT</option>
              <option value="recovery">Recovery</option>
              <option value="discharged">Discharged</option>
              <option value="cancelled">Cancelled</option>
              <option value="postponed">Postponed</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          {/* Refresh Button */}
          <div>
            <button
              onClick={fetchDayCareVisits}
              className="w-full text-xs font-semibold px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition"
            >
              Reload Records
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Visits (Left 70%) & Auto-Populate Pending Surgeries (Right 30%) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Visits List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Active Day Care Patients ({filteredVisits.length})</h2>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white">
                <Loader2 className="h-10 w-10 text-sky-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-500 mt-4">Loading daycare visits...</p>
              </div>
            ) : filteredVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white text-center px-4">
                <div className="rounded-full bg-slate-50 p-4 border border-slate-100 mb-4">
                  <CalendarDays className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-base font-bold text-slate-800">No daycare visits logged</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  There are no day care surgeries started for this filters setup. Select a surgery from the side panel to check them in.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredVisits.map((v) => (
                  <div key={v.id} className="p-5 hover:bg-slate-50/40 transition-colors flex flex-col gap-4">
                    {/* Top Row: Info */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{v.patient_name}</span>
                          <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border", getStatusBadgeColor(v.status))}>
                            {formatStatusText(v.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          UHID: <span className="font-semibold text-slate-700">{v.patient_uhid || "N/A"}</span> |{" "}
                          Surgery: <span className="font-semibold text-slate-800">{v.surgery_name}</span> | Surgeon:{" "}
                          <span className="font-semibold text-slate-700">{v.surgeon_name}</span>
                        </p>
                      </div>

                      <Link
                        href={`/day-care/workflow?id=${v.id}`}
                        className="inline-flex items-center gap-1 px-3.5 py-2 bg-sky-50 hover:bg-sky-100/80 border border-sky-100 text-sky-700 text-xs font-bold rounded-xl shadow-sm transition-all"
                      >
                        Workflow Details
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>

                    {/* Timeline Component Row */}
                    <div className="py-2.5 px-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <DayCareTimeline
                        timeline={v.timeline || []}
                        currentStatus={v.status}
                        cancellationReason={v.cancellation_reason}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scheduled Surgeries Panel (Auto-Populate Source) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-full max-h-[600px]">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex flex-col gap-1">
              <h2 className="text-base font-bold text-slate-900">Scheduled Surgeries</h2>
              <p className="text-[11px] text-slate-500">
                Scheduled doctor surgeries for {formatDate(selectedDate)}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {loadingPlanned ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-500 mt-2">Checking surgeries...</p>
                </div>
              ) : plannedSurgeries.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Smile className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">All set for daycare check-ins</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    No remaining pending surgeries found for this date.
                  </p>
                </div>
              ) : (
                plannedSurgeries.map((s) => (
                  <div key={s.id} className="p-3.5 hover:bg-slate-50/80 rounded-xl transition-colors flex flex-col gap-2.5">
                    <div>
                      <p className="font-bold text-xs text-slate-800">{s.patient_name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Surgery: <span className="font-semibold text-slate-700">{s.surgery_name}</span> | Surgeon:{" "}
                        <span className="font-semibold text-slate-700">{s.surgeon_name}</span>
                      </p>
                      {s.planned_time && (
                        <p className="text-[9px] font-semibold text-sky-600 bg-sky-50 border border-sky-100/50 px-1.5 py-0.5 rounded-md mt-1.5 w-max">
                          Time: {s.planned_time.slice(0, 5)}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleStartVisit(s.id)}
                      disabled={actionLoading === s.id}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold rounded-xl text-xs shadow-sm transition-all"
                    >
                      {actionLoading === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      Check In Patient
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
