"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  Search,
  User,
  Calendar,
  IndianRupee,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronDown,
  Flame,
  Phone,
  Sparkles,
  ShieldAlert,
  CalendarDays,
  UserCheck,
  UserX,
  Stethoscope,
  Activity,
  FileCheck,
  TrendingUp,
  Filter,
  BarChart3,
  X,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { PlannedSurgery } from "@/types";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { useAppSelector } from "@/redux/hooks";
import { SurgeryAdviceDrawer } from "./SurgeryAdviceDrawer";
import { formatDateDisplay, getTodayDateLocal } from "@/utils/format";

const STATUS_TABS = [
  { id: "all", label: "All Cases" },
  { id: "active_counselling", label: "Active Counselling", statuses: ["advised", "counselling_in_progress"] },
  { id: "pending_clearance", label: "Pending Clearance", statuses: ["pending_patient_decision", "pending_insurance", "pending_investigations", "pending_fitness"] },
  { id: "planned_day_care", label: "Planned / Day Care", statuses: ["confirmed", "released_to_daycare", "pre_op_started", "in_ot_preparation"] },
  { id: "completed_inactive", label: "Completed & Inactive", statuses: ["surgery_completed", "completed", "postponed", "cancelled_by_patient", "cancelled_by_hospital", "cancelled", "lost_to_followup"] },
];

const URGENCY_STYLES: Record<string, { label: string; style: string }> = {
  elective: { label: "Elective", style: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-semibold" },
  urgent: { label: "Urgent", style: "bg-amber-50 text-amber-800 border-amber-200/80 font-semibold" },
  emergency: { label: "Emergency", style: "bg-rose-50 text-rose-700 border-rose-200/80 font-bold animate-pulse" },
};

const STATUS_STYLES: Record<string, { label: string; style: string }> = {
  advised: { label: "New Advice", style: "bg-sky-50 text-sky-700 border-sky-200/80 font-bold" },
  counselling_in_progress: { label: "In Counselling", style: "bg-indigo-50 text-indigo-700 border-indigo-200/80 font-semibold" },
  pending_patient_decision: { label: "Pending Decision", style: "bg-amber-50 text-amber-800 border-amber-200/80 font-semibold" },
  pending_insurance: { label: "Pending Insurance", style: "bg-purple-50 text-purple-700 border-purple-200/80 font-semibold" },
  pending_investigations: { label: "Pending Reports", style: "bg-cyan-50 text-cyan-700 border-cyan-200/80 font-semibold" },
  pending_fitness: { label: "Pending Fitness", style: "bg-teal-50 text-teal-700 border-teal-200/80 font-semibold" },
  confirmed: { label: "Planned", style: "bg-emerald-50 text-emerald-800 border-emerald-200/80 font-bold" },
  released_to_daycare: { label: "Released to Day Care", style: "bg-violet-50 text-violet-800 border-violet-300 font-bold" },
  pre_op_started: { label: "Pre-Op Started", style: "bg-blue-50 text-blue-800 border-blue-300 font-bold" },
  in_ot_preparation: { label: "Pre-Op Started", style: "bg-blue-50 text-blue-800 border-blue-300 font-bold" },
  surgery_completed: { label: "Completed", style: "bg-slate-100 text-slate-600 border-slate-200 font-medium" },
  completed: { label: "Completed", style: "bg-slate-100 text-slate-600 border-slate-200 font-medium" },
  postponed: { label: "Postponed", style: "bg-amber-50 text-amber-800 border-amber-200 font-semibold" },
  cancelled_by_patient: { label: "Cancelled (Patient)", style: "bg-rose-50 text-rose-700 border-rose-200 font-semibold" },
  cancelled_by_hospital: { label: "Cancelled (Hospital)", style: "bg-rose-50 text-rose-700 border-rose-200 font-semibold" },
  cancelled: { label: "Cancelled", style: "bg-rose-50 text-rose-700 border-rose-200 font-semibold" },
  lost_to_followup: { label: "Lost to Follow-up", style: "bg-slate-100 text-slate-600 border-slate-200 font-semibold" },
};

export function CounsellorDashboard() {
  const doctors = useAppSelector((state) => state.doctors.list);
  const authState = useAppSelector((state) => state.auth);
  const currentUserId = authState.user?.user_id;

  const [items, setItems] = useState<PlannedSurgery[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsVisible, setStatsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("all");
  const [selectedSurgeonId, setSelectedSurgeonId] = useState<string>("all");
  const [selectedCounsellorFilter, setSelectedCounsellorFilter] = useState<"all" | "assigned_to_me" | "unassigned">("all");

  // Advanced Date & Time Filter System
  const [dateTarget, setDateTarget] = useState<"advised_date" | "planned_date">("advised_date");
  const [timePreset, setTimePreset] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [selectedItem, setSelectedItem] = useState<PlannedSurgery | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchSurgeries = async () => {
    setLoading(true);
    try {
      const response = await plannedSurgeriesApi.list({
        page_size: 150,
        sort_by: "advised_date",
      });
      setItems(response.items);
    } catch (error) {
      console.error("Failed to fetch planned surgeries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurgeries();
  }, []);

  // Sync selectedItem state with refreshed items list so side drawer stays updated and open
  useEffect(() => {
    if (selectedItem) {
      const updated = items.find((i) => i.id === selectedItem.id);
      if (updated) {
        setSelectedItem(updated);
      }
    }
  }, [items]);

  const handleRowClick = (item: PlannedSurgery) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const todayStr = getTodayDateLocal();

  // Helper to calculate days since date
  const getDaysAgo = (dateStr?: string | null) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - d.getTime();
    return Math.floor(diffTime / (1000 * 3600 * 24));
  };

  // Executive Metric Summaries
  const kpis = useMemo(() => {
    const freshNew = items.filter((i) => i.status === "advised").length;
    const inProgress = items.filter((i) => i.status === "counselling_in_progress").length;
    const pendingClearances = items.filter((i) =>
      ["pending_patient_decision", "pending_insurance", "pending_investigations", "pending_fitness"].includes(i.status)
    ).length;
    const plannedList = items.filter((i) => i.status === "confirmed");
    const releasedList = items.filter((i) => i.status === "released_to_daycare");
    const preOpList = items.filter((i) => ["pre_op_started", "in_ot_preparation"].includes(i.status));
    const activeList = [...plannedList, ...releasedList, ...preOpList];
    const activeRevenue = activeList.reduce((acc, curr) => acc + (curr.agreed_price || 0), 0);

    return {
      freshNew,
      inProgress,
      pendingClearances,
      plannedCount: plannedList.length,
      releasedCount: releasedList.length,
      preOpCount: preOpList.length,
      confirmedCount: activeList.length,
      confirmedRevenue: activeRevenue,
    };
  }, [items]);


  // Check if any filter is currently active
  const isAnyFilterActive = useMemo(() => {
    return (
      search.trim() !== "" ||
      selectedSurgeonId !== "all" ||
      selectedCounsellorFilter !== "all" ||
      selectedUrgency !== "all" ||
      timePreset !== "all" ||
      customStartDate !== "" ||
      customEndDate !== ""
    );
  }, [search, selectedSurgeonId, selectedCounsellorFilter, selectedUrgency, timePreset, customStartDate, customEndDate]);

  const handleResetAllFilters = () => {
    setSearch("");
    setSelectedSurgeonId("all");
    setSelectedCounsellorFilter("all");
    setSelectedUrgency("all");
    setTimePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search query (Name, Surgery, Surgeon, UHID, Mobile)
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = item.patient_name?.toLowerCase().includes(q);
        const uhidMatch = item.patient_uhid?.toLowerCase().includes(q);
        const mobileMatch = item.patient_mobile?.toLowerCase().includes(q);
        const surgeryMatch = item.surgery_name?.toLowerCase().includes(q);
        const surgeonMatch = item.surgeon_name?.toLowerCase().includes(q);
        if (!nameMatch && !uhidMatch && !mobileMatch && !surgeryMatch && !surgeonMatch) return false;
      }

      // Urgency filter
      if (selectedUrgency !== "all" && item.urgency !== selectedUrgency) {
        return false;
      }

      // Surgeon filter
      if (selectedSurgeonId !== "all" && item.surgeon_id !== selectedSurgeonId) {
        return false;
      }

      // Counsellor assignment filter
      if (selectedCounsellorFilter === "assigned_to_me" && item.counsellor_id !== currentUserId) {
        return false;
      }
      if (selectedCounsellorFilter === "unassigned" && item.counsellor_id) {
        return false;
      }

      // Tab filter
      const currentTabObj = STATUS_TABS.find((t) => t.id === activeTab);
      if (currentTabObj && currentTabObj.statuses) {
        if (!currentTabObj.statuses.includes(item.status)) return false;
      }

      // Advanced Time & Date Filtering
      if (timePreset !== "all") {
        const targetDateVal = item[dateTarget] || (dateTarget === "advised_date" ? item.created_at : null);
        if (targetDateVal) {
          const itemDateStr = targetDateVal.split("T")[0];
          const daysAgo = getDaysAgo(itemDateStr);

          if (dateTarget === "advised_date") {
            // Past / Operational Age Perspective
            if (timePreset === "today" && itemDateStr !== todayStr) return false;
            if (timePreset === "this_week" && (daysAgo < 0 || daysAgo > 7)) return false;
            if (timePreset === "this_month" && (daysAgo < 0 || daysAgo > 30)) return false;
            if (timePreset === "overdue" && daysAgo <= 3) return false;
          } else {
            // Future OT Schedule Perspective
            if (timePreset === "today" && itemDateStr !== todayStr) return false;
            if (timePreset === "this_week" && (daysAgo > 0 || daysAgo < -7)) return false;
            if (timePreset === "this_month" && (daysAgo > 0 || daysAgo < -30)) return false;
            if (timePreset === "overdue" && daysAgo <= 0) return false;
          }

          if (timePreset === "custom") {
            if (customStartDate && itemDateStr < customStartDate) return false;
            if (customEndDate && itemDateStr > customEndDate) return false;
          }
        } else if (timePreset !== "all") {
          return false;
        }
      }

      return true;
    });
  }, [
    items,
    search,
    selectedUrgency,
    selectedSurgeonId,
    selectedCounsellorFilter,
    activeTab,
    dateTarget,
    timePreset,
    customStartDate,
    customEndDate,
    todayStr,
  ]);

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-3.5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sky-600" />
            Surgery Counsellor Station
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track OPD doctor advice, patient counselling, package agreements, and OT bookings.
          </p>
        </div>

        {/* Toolbar Filters: Search + Surgeon + Assignment + Urgency */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[220px] sm:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, UHID, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full rounded-xl border bg-white pl-9 pr-8 py-2 text-sm outline-none transition ${
                search.trim()
                  ? "border-sky-400 ring-2 ring-sky-100 font-medium text-slate-900"
                  : "border-slate-200 text-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              }`}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Surgeon Filter */}
          <select
            value={selectedSurgeonId}
            onChange={(e) => setSelectedSurgeonId(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium outline-none transition cursor-pointer ${
              selectedSurgeonId !== "all"
                ? "border-sky-400 bg-sky-50 text-sky-900 font-semibold ring-2 ring-sky-100"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:border-sky-400"
            }`}
          >
            <option value="all">All Surgeons</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.name || doctor.user?.name || doctor.user_name || `Doctor ${doctor.id.slice(0, 6)}`}
              </option>
            ))}
          </select>

          {/* Counsellor Filter */}
          <select
            value={selectedCounsellorFilter}
            onChange={(e) => setSelectedCounsellorFilter(e.target.value as any)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium outline-none transition cursor-pointer ${
              selectedCounsellorFilter !== "all"
                ? "border-sky-400 bg-sky-50 text-sky-900 font-semibold ring-2 ring-sky-100"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:border-sky-400"
            }`}
          >
            <option value="all">All Assignments</option>
            <option value="assigned_to_me">Assigned to Me 👤</option>
            <option value="unassigned">Unassigned Only ⚡</option>
          </select>

          {/* Urgency Filter */}
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium outline-none transition cursor-pointer ${
              selectedUrgency !== "all"
                ? "border-sky-400 bg-sky-50 text-sky-900 font-semibold ring-2 ring-sky-100"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:border-sky-400"
            }`}
          >
            <option value="all">All Urgencies</option>
            <option value="elective">Elective</option>
            <option value="urgent">Urgent</option>
            <option value="emergency">Emergency</option>
          </select>

          {/* Refresh Action */}
          <button
            onClick={fetchSurgeries}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer disabled:opacity-50"
            title="Refresh patient list"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Reset Action */}
          {isAnyFilterActive && (
            <button
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 text-xs font-semibold hover:bg-rose-100 transition shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Statistics Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <button
          onClick={() => setStatsVisible(!statsVisible)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 rounded-xl"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-600" />
            <span className="text-sm font-semibold text-slate-700">
              Counselling Statistics & Key Metrics
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              statsVisible ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          className={`overflow-hidden transition-all duration-200 ${
            statsVisible ? "max-h-[600px] opacity-100 border-t border-slate-200 p-4" : "max-h-0 opacity-0 p-0"
          }`}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Stat 1: New Advice */}
            <div
              onClick={() => setActiveTab("active_counselling")}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-sky-50 to-sky-50/40 p-3.5 shadow-2xs transition hover:shadow-xs hover:border-sky-300"
            >
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight leading-tight">
                    New Doctor Advice
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-sky-800">{kpis.freshNew}</p>
                </div>
                <div className="rounded-lg bg-sky-100 p-2 text-sky-600 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Stat 2: In Counselling */}
            <div
              onClick={() => setActiveTab("active_counselling")}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-indigo-50 to-indigo-50/40 p-3.5 shadow-2xs transition hover:shadow-xs hover:border-indigo-300"
            >
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight leading-tight">
                    In Counselling
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-indigo-800">{kpis.inProgress}</p>
                </div>
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 group-hover:scale-105 transition-transform">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Stat 3: Pending Clearances */}
            <div
              onClick={() => setActiveTab("pending_clearance")}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-amber-50 to-amber-50/40 p-3.5 shadow-2xs transition hover:shadow-xs hover:border-amber-300"
            >
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight leading-tight">
                    Pending Clearances
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-amber-800">{kpis.pendingClearances}</p>
                </div>
                <div className="rounded-lg bg-amber-100 p-2 text-amber-600 group-hover:scale-105 transition-transform">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Stat 4: Planned */}
            <div
              onClick={() => setActiveTab("planned_day_care")}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-emerald-50 to-emerald-50/40 p-3.5 shadow-2xs transition hover:shadow-xs hover:border-emerald-300"
            >
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight leading-tight">
                    Planned
                  </p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-extrabold text-emerald-800">{kpis.plannedCount}</span>
                    <span className="text-xs font-bold text-emerald-700">
                      (₹{items.filter(i => i.status === "confirmed").reduce((a, c) => a + (c.agreed_price || 0), 0).toLocaleString("en-IN")})
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 group-hover:scale-105 transition-transform">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Stat 5: OT Ready */}
            <div
              onClick={() => setActiveTab("planned_day_care")}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-violet-50 to-violet-50/40 p-3.5 shadow-2xs transition hover:shadow-xs hover:border-violet-300"
            >
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight leading-tight">
                    Day Care Released
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-violet-800">{kpis.releasedCount}</p>
                </div>
                <div className="rounded-lg bg-violet-100 p-2 text-violet-600 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Dedicated Date & Time Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Date Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-sky-600" /> Mode:
          </span>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setDateTarget("advised_date")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                dateTarget === "advised_date"
                  ? "bg-white text-sky-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Advised Date
            </button>
            <button
              onClick={() => setDateTarget("planned_date")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                dateTarget === "planned_date"
                  ? "bg-white text-emerald-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Scheduled OT Date
            </button>
          </div>
        </div>

        {/* Quick Presets & Custom Range */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Dates" },
            { id: "today", label: "Today" },
            { id: "this_week", label: "This Week" },
            { id: "this_month", label: "This Month" },
            { id: "overdue", label: "Overdue (>3 Days ⚠️)" },
            { id: "custom", label: "Custom Range 📅" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setTimePreset(preset.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                timePreset === preset.id
                  ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Range Picker Inputs */}
        {timePreset === "custom" && (
          <div className="flex items-center gap-2 pt-2 sm:pt-0 w-full sm:w-auto">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium outline-none focus:border-sky-400"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium outline-none focus:border-sky-400"
            />
          </div>
        )}
      </div>

      {/* Primary Sub-Navigation Tabs Container */}
      <div className="space-y-3">
        {/* Tab Navigation bar matching PatientDetailView & Appointments tab theme */}
        <div className="border-b border-slate-200 bg-white rounded-t-xl px-3 pt-2">
          <div className="flex overflow-x-auto gap-2 scrollbar-none">
            {STATUS_TABS.map((tab) => {
              const count = items.filter((i) =>
                tab.statuses ? tab.statuses.includes(i.status) : true
              ).length;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "border-sky-500 text-sky-700 font-bold bg-sky-50/40 rounded-t-lg"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${
                      isActive
                        ? "bg-sky-100 text-sky-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between px-2 text-xs font-medium text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredItems.length}</span> of {items.length} cases
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="h-5 w-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Loading surgery cases...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <ClipboardList className="h-8 w-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No matching surgery cases found</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or date range.</p>
            {isAnyFilterActive && (
              <button
                onClick={handleResetAllFilters}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 text-white px-3.5 py-2 text-xs font-semibold hover:bg-sky-700 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Patient Profile</th>
                  <th className="px-5 py-3.5">Surgery Procedure & Site</th>
                  <th className="px-5 py-3.5">Urgency</th>
                  <th className="px-5 py-3.5">Status & Counsellor</th>
                  <th className="px-5 py-3.5">Package / Agreed Price</th>
                  <th className="px-5 py-3.5">Advised / OT Date</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredItems.map((item) => {
                  const statusInfo = STATUS_STYLES[item.status] || {
                    label: item.status,
                    style: "bg-slate-100 text-slate-700 border-slate-200",
                  };
                  const urgencyInfo = URGENCY_STYLES[item.urgency || "elective"] || URGENCY_STYLES.elective;
                  const isFreshAdvice = item.status === "advised";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isFreshAdvice ? "bg-sky-50/20" : ""
                      }`}
                    >
                      {/* Patient Details */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm">{item.patient_name || "Unknown"}</span>
                          {isFreshAdvice && (
                            <span className="bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1">
                          {item.patient_uhid && (
                            <span className="bg-slate-100 text-slate-700 font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                              {item.patient_uhid}
                            </span>
                          )}
                          {item.patient_mobile && (
                            <span className="text-slate-600 flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              {item.patient_mobile}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">Dr. {item.surgeon_name || "Unassigned"}</div>
                      </td>

                      {/* Surgery & Anatomy Site */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 text-sm">{item.surgery_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Site: {item.anatomy_site_name || item.eye || "N/A"}
                          {item.anatomy_site_short_code && ` (${item.anatomy_site_short_code})`}
                        </div>
                      </td>

                      {/* Urgency */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${urgencyInfo.style}`}
                        >
                          {urgencyInfo.label}
                        </span>
                      </td>

                      {/* Status & Counsellor */}
                      <td className="px-5 py-3.5 space-y-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${statusInfo.style}`}
                        >
                          {statusInfo.label}
                        </span>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                          {item.counsellor_name ? (
                            <span className="font-medium text-slate-700">{item.counsellor_name}</span>
                          ) : (
                            <span className="text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-medium">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Package & Price */}
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-900">{item.package_name || "Default Package"}</div>
                        <div className="text-xs font-semibold text-slate-700">
                          {item.agreed_price ? `₹${item.agreed_price.toLocaleString("en-IN")}` : "Price TBD"}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-5 py-3.5 text-xs text-slate-500 space-y-0.5">
                        {item.planned_date ? (
                          <div className="font-bold text-emerald-800 flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
                            OT: {formatDateDisplay(item.planned_date)}
                          </div>
                        ) : (
                          <div>Advised: {formatDateDisplay(item.advised_date || item.created_at)}</div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(item);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs transition hover:border-sky-300"
                        >
                          Manage <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      <SurgeryAdviceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        plannedSurgery={selectedItem}
        onRefresh={() => {
          fetchSurgeries();
        }}
      />
    </div>
  );
}
