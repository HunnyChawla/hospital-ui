"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  Calendar,
  Loader2,
  CalendarDays,
  UserCheck,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Stethoscope,
  Smile,
  ClipboardCheck,
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

type DashboardLane = "all" | "pre_op" | "in_ot" | "post_op";

const LANE_STATUSES: Record<Exclude<DashboardLane, "all">, DayCareStatus[]> = {
  pre_op: ["scheduled", "checked_in", "pre_assessment_completed", "ready_for_ot"],
  in_ot: ["in_ot"],
  post_op: ["recovery", "discharged"],
};

export function DayCareDashboard() {
  const doctors = useAppSelector((s) => s.doctors.list);

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateLocal());
  const [selectedSurgeon, setSelectedSurgeon] = useState<string>("");
  const [patientSearch, setPatientSearch] = useState<string>("");
  const [activeLane, setActiveLane] = useState<DashboardLane>("all");

  const [visits, setVisits] = useState<DayCareVisit[]>([]);
  const [releasedSurgeries, setReleasedSurgeries] = useState<PlannedSurgery[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReleased, setLoadingReleased] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const safeVisits = Array.isArray(visits) ? visits : [];

  const stats = {
    total: safeVisits.filter((v) => !["cancelled", "postponed", "no_show"].includes(v.status)).length,
    preOp: safeVisits.filter((v) => (LANE_STATUSES.pre_op as string[]).includes(v.status)).length,
    inOT: safeVisits.filter((v) => v.status === "in_ot").length,
    recovery: safeVisits.filter((v) => v.status === "recovery").length,
    discharged: safeVisits.filter((v) => v.status === "discharged").length,
  };

  const fetchDayCareVisits = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dayCareApi.listVisits({
        date: selectedDate,
        surgeon_id: selectedSurgeon || undefined,
      });
      setVisits(response || []);
    } catch (err) {
      console.error("Failed to load day care visits:", err);
      toast.error(getErrorMessage(err) || "Failed to fetch day care records");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedSurgeon]);

  const fetchReleasedSurgeries = useCallback(async () => {
    setLoadingReleased(true);
    try {
      const response = await plannedSurgeriesApi.list({
        from_date: selectedDate,
        to_date: selectedDate,
        date_status: "planned",
      });
      const items = response.items || [];
      const filtered = items.filter((ps) => {
        const isReleased = ps.status === "released_to_daycare";
        const hasNoVisit = !safeVisits.some((v) => v.planned_surgery_id === ps.id);
        return isReleased && hasNoVisit;
      });
      setReleasedSurgeries(filtered);
    } catch (err) {
      console.error("Failed to load released surgeries:", err);
    } finally {
      setLoadingReleased(false);
    }
  }, [selectedDate, safeVisits]);

  useEffect(() => { fetchDayCareVisits(); }, [fetchDayCareVisits]);
  useEffect(() => { fetchReleasedSurgeries(); }, [visits, fetchReleasedSurgeries]);

  const handleStartVisit = async (plannedSurgeryId: string) => {
    setActionLoading(plannedSurgeryId);
    try {
      await dayCareApi.createVisit({ planned_surgery_id: plannedSurgeryId, visit_date: selectedDate });
      toast.success("Patient checked in for Pre-Op");
      fetchDayCareVisits();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to initiate Day Care visit");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: DayCareStatus) => {
    const map: Record<string, string> = {
      scheduled: "bg-slate-100 text-slate-700 border-slate-200",
      checked_in: "bg-emerald-50 text-emerald-700 border-emerald-200",
      pre_assessment_completed: "bg-blue-50 text-blue-700 border-blue-200",
      ready_for_ot: "bg-indigo-50 text-indigo-700 border-indigo-200",
      in_ot: "bg-purple-50 text-purple-700 border-purple-200",
      recovery: "bg-amber-50 text-amber-700 border-amber-200",
      discharged: "bg-teal-50 text-teal-700 border-teal-200",
      cancelled: "bg-rose-50 text-rose-700 border-rose-200",
      postponed: "bg-yellow-50 text-yellow-700 border-yellow-200",
      no_show: "bg-zinc-100 text-zinc-700 border-zinc-200",
    };
    return map[status] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  const fmtStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const filteredVisits = safeVisits.filter((v) => {
    const inLane =
      activeLane === "all" ||
      (LANE_STATUSES[activeLane as Exclude<DashboardLane, "all">] as string[]).includes(v.status);
    const inSearch =
      !patientSearch ||
      v.patient_name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      v.patient_uhid?.toLowerCase().includes(patientSearch.toLowerCase());
    return inLane && inSearch;
  });

  const laneCount = (lane: DashboardLane) => {
    if (lane === "all") return stats.total;
    return safeVisits.filter((v) =>
      (LANE_STATUSES[lane as Exclude<DashboardLane, "all">] as string[]).includes(v.status)
    ).length;
  };

  const LANES: { id: DashboardLane; label: string; activeColor: string }[] = [
    { id: "all", label: "All Patients", activeColor: "bg-slate-900" },
    { id: "pre_op", label: "Pre-Op Queue", activeColor: "bg-blue-700" },
    { id: "in_ot", label: "In OT", activeColor: "bg-purple-700" },
    { id: "post_op", label: "Post-Op / Recovery", activeColor: "bg-amber-700" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Day Care Surgery Panel</h1>
        <p className="mt-1 text-sm text-slate-500 font-medium">
          Monitor pre-op checks, surgeries, recoveries and discharges
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Total Active", count: stats.total, icon: <TrendingUp className="h-5 w-5 text-sky-600" />, border: "border-sky-100", bg: "from-sky-500/10 to-sky-600/5" },
          { label: "Pre-Op Queue", count: stats.preOp, icon: <ClipboardCheck className="h-5 w-5 text-blue-600" />, border: "border-blue-100", bg: "from-blue-500/10 to-blue-600/5" },
          { label: "In OT", count: stats.inOT, icon: <Search className="h-5 w-5 text-purple-600" />, border: "border-purple-100", bg: "from-purple-500/10 to-purple-600/5" },
          { label: "Recovery", count: stats.recovery, icon: <Stethoscope className="h-5 w-5 text-amber-600" />, border: "border-amber-100", bg: "from-amber-500/10 to-amber-600/5" },
          { label: "Discharged", count: stats.discharged, icon: <CheckCircle2 className="h-5 w-5 text-teal-600" />, border: "border-teal-100", bg: "from-teal-500/10 to-teal-600/5" },
        ].map((m, idx) => (
          <div key={idx} className={clsx("rounded-2xl border bg-gradient-to-br p-5 shadow-sm bg-white flex items-center justify-between", m.border, m.bg)}>
            <div>
              <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{m.label}</span>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{m.count}</p>
            </div>
            <div className="p-3 bg-white/80 rounded-2xl shadow-sm border border-slate-100/50 shrink-0">{m.icon}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Search className="h-4 w-4 text-slate-400" />Patient Name / UHID</label>
            <input type="text" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search patients..." className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-sky-400" />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Calendar className="h-4 w-4 text-slate-400" />Visit Date</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-sky-400" />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Stethoscope className="h-4 w-4 text-slate-400" />Surgeon</label>
            <select value={selectedSurgeon} onChange={(e) => setSelectedSurgeon(e.target.value)} className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-sky-400">
              <option value="">All Surgeons</option>
              {doctors.map((d) => (<option key={d.id} value={d.id}>{d.name || `Dr. ${d.id.slice(0, 8)}`}</option>))}
            </select>
          </div>
          <div>
            <button onClick={fetchDayCareVisits} className="w-full text-xs font-semibold px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition">Reload Records</button>
          </div>
        </div>
      </div>

      {/* 4-Tab Lane Switcher */}
      <div className="flex border border-slate-200 bg-white rounded-2xl p-1.5 shadow-sm gap-1">
        {LANES.map((lane) => {
          const count = laneCount(lane.id);
          const isActive = activeLane === lane.id;
          return (
            <button key={lane.id} onClick={() => setActiveLane(lane.id)} className={clsx("flex-1 flex items-center justify-center gap-2 py-2.5 px-2 text-sm font-bold rounded-xl transition-all", isActive ? `${lane.activeColor} text-white shadow-sm` : "text-slate-600 hover:bg-slate-50")}>
              <span className="hidden sm:inline">{lane.label}</span>
              <span className="sm:hidden text-xs">{lane.label.split(" ")[0]}</span>
              <span className={clsx("ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full", isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Patient List */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">{LANES.find((l) => l.id === activeLane)?.label} ({filteredVisits.length})</h2>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20"><Loader2 className="h-10 w-10 text-sky-600 animate-spin" /><p className="text-sm font-semibold text-slate-500 mt-4">Loading patients...</p></div>
            ) : filteredVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="rounded-full bg-slate-50 p-4 border border-slate-100 mb-4"><CalendarDays className="h-8 w-8 text-slate-400" /></div>
                <p className="text-base font-bold text-slate-800">No patients in this lane</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">{activeLane === "all" ? "No day care visits for this date. Ensure the Counsellor has released patients." : `No patients in the ${LANES.find((l) => l.id === activeLane)?.label} stage.`}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredVisits.map((v) => (
                  <div key={v.id} className="p-5 hover:bg-slate-50/40 transition-colors flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{v.patient_name}</span>
                          <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border", getStatusBadge(v.status))}>{fmtStatus(v.status)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          UHID: <span className="font-semibold text-slate-700">{v.patient_uhid || "N/A"}</span> | Phone: <span className="font-semibold text-slate-700">{v.patient_mobile || "N/A"}</span> | Surgery: <span className="font-semibold text-slate-800">{v.surgery_name}</span> | Surgeon: <span className="font-semibold text-slate-700">{v.surgeon_name}</span>
                        </p>
                      </div>
                      <Link href={`/day-care/workflow?id=${v.id}`} className="inline-flex items-center gap-1 px-3.5 py-2 bg-sky-50 hover:bg-sky-100/80 border border-sky-100 text-sky-700 text-xs font-bold rounded-xl shadow-sm transition-all">
                        Workflow Details<ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="py-2.5 px-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <DayCareTimeline timeline={v.timeline || []} currentStatus={v.status} cancellationReason={v.cancellation_reason} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Released Panel */}
        <div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col max-h-[600px]">
            <div className="border-b border-slate-100 bg-violet-50/50 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                Released — Pending Check-In
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Released by Counsellor for {formatDate(selectedDate)}</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {loadingReleased ? (
                <div className="flex flex-col items-center justify-center py-12"><Loader2 className="h-8 w-8 text-sky-600 animate-spin" /><p className="text-xs font-semibold text-slate-500 mt-2">Loading...</p></div>
              ) : releasedSurgeries.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Smile className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">No patients pending check-in</p>
                  <p className="text-[10px] text-slate-500 mt-1">Counsellor must release patients to Day Care first.</p>
                </div>
              ) : (
                releasedSurgeries.map((s) => (
                  <div key={s.id} className="p-3.5 hover:bg-slate-50/80 rounded-xl transition-colors flex flex-col gap-2.5">
                    <div>
                      <p className="font-bold text-xs text-slate-800">{s.patient_name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        UHID: <span className="font-semibold text-slate-700">{s.patient_uhid || "N/A"}</span> | Phone: <span className="font-semibold text-slate-700">{s.patient_mobile || "N/A"}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Surgery: <span className="font-semibold text-slate-700">{s.surgery_name}</span> | Surgeon: <span className="font-semibold text-slate-700">{s.surgeon_name}</span></p>
                      {s.planned_time && (<p className="text-[9px] font-semibold text-violet-700 bg-violet-50 border border-violet-100/50 px-1.5 py-0.5 rounded-md mt-1.5 w-max">Scheduled: {s.planned_time.slice(0, 5)}</p>)}
                    </div>
                    <button onClick={() => handleStartVisit(s.id)} disabled={actionLoading === s.id} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold rounded-xl text-xs shadow-sm transition-all">
                      {actionLoading === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                      Check In for Pre-Op
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
