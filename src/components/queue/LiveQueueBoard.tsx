"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAppSelector } from "@/redux/hooks";
import { useSSE, SSEConnectionStatus } from "@/hooks/useSSE";
import { QueueEntry } from "@/types";
import { Clock, UserCheck, CheckCircle2, Stethoscope, Users, Activity, Sparkles, AlertCircle, Wifi, WifiOff, Loader2, Maximize } from "lucide-react";

type FilterTab = "all" | "pending" | "completed";

// Helper function to map SSE data to QueueEntry format
function mapSSEDataToQueueEntries(data: any): QueueEntry[] {
  if (!data) return [];

  // If data is already an array, assume it's the full queue
  if (Array.isArray(data)) {
    return data.map((item) => ({
      token: item.token_number || item.token || 0,
      patientName: item.patient_name || item.patientName || "Unknown",
      status: mapStatusToQueueStatus(item.status),
      etaMinutes: 0,
      visitId: item.id || item.visit_id,
      appointmentId: item.appointment_id,
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
    }));
  }

  // If data has a queue or entries property
  if (data.queue && Array.isArray(data.queue)) {
    return data.queue.map((item: any) => ({
      token: item.token_number || item.token || 0,
      patientName: item.patient_name || item.patientName || "Unknown",
      status: mapStatusToQueueStatus(item.status),
      etaMinutes: 0,
      visitId: item.id || item.visit_id,
      appointmentId: item.appointment_id,
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
    }));
  }

  // If data has entries property
  if (data.entries && Array.isArray(data.entries)) {
    return data.entries.map((item: any) => ({
      token: item.token_number || item.token || 0,
      patientName: item.patient_name || item.patientName || "Unknown",
      status: mapStatusToQueueStatus(item.status),
      etaMinutes: 0,
      visitId: item.id || item.visit_id,
      appointmentId: item.appointment_id,
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
    }));
  }

  // Single item update - return as array with one item
  if (data.id || data.visit_id) {
    return [
      {
        token: data.token_number || data.token || 0,
        patientName: data.patient_name || data.patientName || "Unknown",
        status: mapStatusToQueueStatus(data.status),
        etaMinutes: 0,
        visitId: data.id || data.visit_id,
        appointmentId: data.appointment_id,
        visit_type: data.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
      },
    ];
  }

  return [];
}

function mapStatusToQueueStatus(status: string): QueueEntry["status"] {
  switch (status) {
    case "checked_in":
    case "scheduled":
    case "confirmed":
      return "Waiting";
    case "in_consultation":
      return "In Consultation";
    case "completed":
    case "cancelled":
      return "Completed";
    default:
      return "Waiting";
  }
}

function getStatusBadge(status: SSEConnectionStatus) {
  switch (status) {
    case "connected":
      return {
        icon: Wifi,
        text: "Connected",
        className: "bg-emerald-100 text-emerald-700 border-emerald-300",
        iconClassName: "text-emerald-600",
      };
    case "connecting":
    case "reconnecting":
      return {
        icon: Loader2,
        text: status === "reconnecting" ? "Reconnecting..." : "Connecting...",
        className: "bg-amber-100 text-amber-700 border-amber-300",
        iconClassName: "text-amber-600 animate-spin",
      };
    case "error":
      return {
        icon: WifiOff,
        text: "Connection Error",
        className: "bg-rose-100 text-rose-700 border-rose-300",
        iconClassName: "text-rose-600",
      };
    default:
      return {
        icon: WifiOff,
        text: "Disconnected",
        className: "bg-slate-100 text-slate-700 border-slate-300",
        iconClassName: "text-slate-600",
      };
  }
}

// Helper to check if two entries arrays are equal
function areEntriesEqual(prev: QueueEntry[], next: QueueEntry[]): boolean {
  if (prev.length !== next.length) return false;
  return prev.every((p, i) => {
    const n = next[i];
    return (
      p.token === n.token &&
      p.patientName === n.patientName &&
      p.status === n.status &&
      p.visitId === n.visitId &&
      p.appointmentId === n.appointmentId &&
      p.visit_type === n.visit_type
    );
  });
}

interface LiveQueueBoardProps {
  onFullScreen?: () => void;
}

export function LiveQueueBoard({ onFullScreen }: LiveQueueBoardProps) {
  const doctors = useAppSelector((s) => s.doctors.list);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [entries, setEntries] = useState<QueueEntry[]>([]);

  // Build SSE URL
  const sseUrl = useMemo(
    () => (selectedDoctorId ? `/opd/queue/public/doctor/${selectedDoctorId}/stream` : null),
    [selectedDoctorId]
  );

  // Memoized message handler to prevent recreation on every render
  const handleMessage = useCallback((data: any) => {
    // Handle different event types
    const newEntries = mapSSEDataToQueueEntries(data);
    
    setEntries((prev) => {
      // If it's a single item update, merge with existing entries
      if (newEntries.length === 1 && newEntries[0].visitId) {
        const existingIndex = prev.findIndex(
          (e) => e.visitId === newEntries[0].visitId
        );
        if (existingIndex >= 0) {
          // Check if entry actually changed
          const existing = prev[existingIndex];
          const updated = newEntries[0];
          if (
            existing.token === updated.token &&
            existing.patientName === updated.patientName &&
            existing.status === updated.status &&
            existing.visit_type === updated.visit_type
          ) {
            // No change, return previous array to prevent re-render
            return prev;
          }
          // Update existing entry
          const updatedArray = [...prev];
          updatedArray[existingIndex] = updated;
          return updatedArray;
        } else {
          // Add new entry - check if it already exists by token to avoid duplicates
          const existsByToken = prev.some(
            (e) => e.token === newEntries[0].token && e.visitId === newEntries[0].visitId
          );
          if (existsByToken) {
            return prev;
          }
          const newArray = [...prev, newEntries[0]].sort((a, b) => a.token - b.token);
          return newArray;
        }
      } else if (newEntries.length > 0) {
        // Full queue update - check if data actually changed
        if (areEntriesEqual(prev, newEntries)) {
          // No change, return previous array to prevent re-render
          return prev;
        }
        return newEntries;
      }
      // Empty update - return previous
      return prev;
    });
  }, []);

  const { status, reconnect } = useSSE(sseUrl, {
    onMessage: handleMessage,
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });

  useEffect(() => {
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  // Reset entries when doctor changes
  useEffect(() => {
    setEntries([]);
  }, [selectedDoctorId]);

  // Filter entries based on active tab - memoized to prevent recalculation
  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (activeTab === "all") return true;
        if (activeTab === "pending") {
          return entry.status === "Waiting" || entry.status === "In Consultation";
        }
        if (activeTab === "completed") {
          return entry.status === "Completed";
        }
        return true;
      }),
    [entries, activeTab]
  );

  // Find the next token number (first waiting patient) from all entries - memoized
  const nextToken = useMemo(
    () =>
      entries
        .filter((entry) => entry.status === "Waiting" && entry.visitId)
        .sort((a, b) => a.token - b.token)[0]?.token,
    [entries]
  );

  // Get status counts for summary (from all entries)
  const statusCounts = useMemo(
    () => ({
      waiting: entries.filter((e) => e.status === "Waiting" && e.visitId).length,
      inConsultation: entries.filter((e) => e.status === "In Consultation" && e.visitId).length,
      completed: entries.filter((e) => e.status === "Completed").length,
      total: entries.filter((e) => e.visitId).length,
      pending: entries.filter(
        (e) => (e.status === "Waiting" || e.status === "In Consultation") && e.visitId
      ).length,
    }),
    [entries]
  );

  // Memoize status styles function
  const getStatusStyles = useCallback((status: string) => {
    switch (status) {
      case "Waiting":
        return {
          bg: "bg-gradient-to-br from-amber-50 via-amber-50/50 to-white",
          border: "border-amber-300/50",
          text: "text-amber-700",
          badge: "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20",
          icon: Clock,
          glow: "shadow-amber-500/10",
        };
      case "In Consultation":
        return {
          bg: "bg-gradient-to-br from-blue-50 via-blue-50/50 to-white",
          border: "border-blue-300/50",
          text: "text-blue-700",
          badge: "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20",
          icon: UserCheck,
          glow: "shadow-blue-500/10",
        };
      case "Completed":
        return {
          bg: "bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white",
          border: "border-emerald-300/50",
          text: "text-emerald-700",
          badge: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20",
          icon: CheckCircle2,
          glow: "shadow-emerald-500/10",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-slate-50 to-white",
          border: "border-slate-300/50",
          text: "text-slate-700",
          badge: "bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/20",
          icon: Clock,
          glow: "shadow-slate-500/10",
        };
    }
  }, []);

  const statusBadge = getStatusBadge(status);

  return (
    <div className="space-y-5">
      {/* Enhanced Header Section */}
      <div className="card relative overflow-hidden">
        <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-gradient-to-br from-sky-200/30 to-transparent blur-2xl" />
        <div className="relative p-2.5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
            {/* Doctor Selector */}
            {doctors.length > 0 && (
              <div className="flex-shrink-0">
                <label className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Select Doctor
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/0 via-sky-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="relative w-full min-w-[180px] appearance-none rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-all duration-200 hover:border-sky-300 hover:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 shadow-sm hover:shadow-md"
                  >
                    {doctors.map((doc) => {
                      const doctorName = doc.name || `Dr. ${doc.specialization}`;
                      return (
                        <option key={doc.id} value={doc.id}>
                          {doctorName} - {doc.specialization}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            {/* Connection Status Indicator */}
            <div className="flex-shrink-0">
              <label className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </label>
              <div
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${statusBadge.className}`}
              >
                <statusBadge.icon className={`h-3.5 w-3.5 ${statusBadge.iconClassName}`} />
                <span>{statusBadge.text}</span>
                {status === "error" && (
                  <button
                    onClick={reconnect}
                    className="ml-1 text-[10px] underline hover:no-underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>

            {/* Full Screen Button */}
            {onFullScreen && (
              <div className="flex-shrink-0">
                <label className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  View
                </label>
                <button
                  onClick={onFullScreen}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:border-sky-300 hover:bg-white hover:text-sky-700 shadow-sm hover:shadow-md"
                  title="Enter full screen mode"
                >
                  <Maximize className="h-3.5 w-3.5" />
                  <span>Full Screen</span>
                </button>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-0.5 lg:border-l lg:border-slate-200 lg:pl-4">
              {[
                { id: "all" as FilterTab, label: "All", count: statusCounts.total },
                { id: "pending" as FilterTab, label: "Pending", count: statusCounts.pending },
                { id: "completed" as FilterTab, label: "Completed", count: statusCounts.completed },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 border-b-2 px-2.5 py-1.5 text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? "border-sky-500 text-sky-700"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      activeTab === tab.id
                        ? "bg-sky-100 text-sky-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Stats Summary Cards */}
            {entries.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                {/* Total Patients */}
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 backdrop-blur-sm px-2.5 py-1.5 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-50">
                    <Users className="h-3 w-3 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-500">Total</p>
                    <p className="text-xs font-bold text-slate-900">{statusCounts.total}</p>
                  </div>
                </div>

                {/* Waiting Count */}
                <div className="flex items-center gap-1.5 rounded-lg border border-amber-200/50 bg-gradient-to-br from-amber-50/80 to-white/80 backdrop-blur-sm px-2.5 py-1.5 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25">
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-amber-600">Waiting</p>
                    <p className="text-xs font-bold text-amber-700">{statusCounts.waiting}</p>
                  </div>
                </div>

                {/* In Consultation Count */}
                <div className="flex items-center gap-1.5 rounded-lg border border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-white/80 backdrop-blur-sm px-2.5 py-1.5 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                    <UserCheck className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-blue-600">Consulting</p>
                    <p className="text-xs font-bold text-blue-700">{statusCounts.inConsultation}</p>
                  </div>
                </div>

                {/* Next Token Badge */}
                {nextToken !== undefined && (
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-sky-400 to-teal-500 opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300" />
                    <div className="relative flex flex-col items-center rounded-lg border-2 border-sky-200 bg-gradient-to-br from-sky-500 via-sky-500 to-teal-500 px-2.5 py-1.5 shadow-xl shadow-sky-500/25 ring-2 ring-sky-100/50 transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:shadow-sky-500/35">
                      <div className="flex items-center gap-0.5 mb-0.5">
                        <Sparkles className="h-2.5 w-2.5 text-white/90" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-white/90">Next</span>
                      </div>
                      <span className="text-base font-extrabold text-white drop-shadow-lg">{nextToken}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Queue Grid */}
      {filteredEntries.length === 0 && status !== "connecting" ? (
        <div className="card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
          <div className="relative p-14 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 shadow-lg">
              <Stethoscope className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-lg font-bold text-slate-900">
              {status === "disconnected" || status === "error"
                ? "Not connected"
                : activeTab === "all"
                ? "No patients in queue"
                : activeTab === "pending"
                ? "No pending patients"
                : "No completed visits"}
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              {status === "disconnected" || status === "error"
                ? "Select a doctor to start receiving live updates"
                : activeTab === "all"
                ? "Patients will appear here when they check in"
                : activeTab === "pending"
                ? "No patients are currently waiting or in consultation"
                : "No visits have been completed yet"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {filteredEntries.map((entry) => {
            const isWaiting = entry.status === "Waiting";
            const statusStyles = getStatusStyles(entry.status);
            const StatusIcon = statusStyles.icon;
            const isNextToken = nextToken !== undefined && entry.token === nextToken && isWaiting;
            const isEmergency = entry.visit_type === "emergency";
            // Use stable key - prefer visitId or appointmentId, fallback to token
            const cardKey = entry.visitId || entry.appointmentId || `token-${entry.token}`;

            return (
              <div
                key={cardKey}
                className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                  isEmergency
                    ? "border-rose-400 bg-gradient-to-br from-rose-50 via-red-50/50 to-white shadow-xl shadow-rose-500/30 ring-4 ring-rose-100/50 scale-[1.02]"
                    : isNextToken
                    ? "border-sky-400 bg-gradient-to-br from-sky-50 via-teal-50/50 to-white shadow-xl shadow-sky-500/20 ring-4 ring-sky-100/50 scale-[1.02]"
                    : `${statusStyles.border} ${statusStyles.bg} shadow-md hover:shadow-xl hover:scale-[1.01] ${statusStyles.glow}`
                }`}
              >
                {/* Animated background glow */}
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                    isEmergency
                      ? "bg-gradient-to-br from-rose-400/10 via-red-400/10 to-transparent"
                      : isNextToken
                      ? "bg-gradient-to-br from-sky-400/5 via-teal-400/5 to-transparent"
                      : statusStyles.bg
                  }`}
                />

                {/* Next Token Badge - On top-right */}
                {isNextToken && (
                  <div className="absolute right-2.5 top-2.5 z-10 animate-pulse">
                    <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-2.5 py-1 shadow-lg shadow-sky-500/30 ring-2 ring-white/50">
                      <Sparkles className="h-2.5 w-2.5 text-white" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white">Next</span>
                    </div>
                  </div>
                )}

                <div className="relative p-4">
                  {/* Header with Token */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`relative flex h-12 w-12 items-center justify-center rounded-xl ${
                          isEmergency
                            ? "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30"
                            : statusStyles.badge
                        } font-extrabold text-base transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3`}
                      >
                        <span className="drop-shadow-sm">{entry.token}</span>
                        {isEmergency && (
                          <div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[8px] font-bold text-rose-600 shadow-lg">
                            !
                          </div>
                        )}
                        {isNextToken && !isEmergency && (
                          <div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[8px] font-bold text-sky-600 shadow-lg">
                            !
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Token Number</p>
                        <p className="mt-0.5 text-sm font-bold text-slate-900">#{entry.token}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <div className={`flex items-center gap-1.5 rounded-xl px-2 py-0.5 ${statusStyles.badge} shadow-md`}>
                        <StatusIcon className="h-3 w-3" />
                        <span className="text-[11px] font-bold">{entry.status}</span>
                      </div>
                      {/* Emergency Badge - Below status badge */}
                      {isEmergency && (
                        <div className="absolute right-0 top-full mt-1.5 z-10 animate-pulse">
                          <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-2.5 py-1 shadow-lg shadow-rose-500/40 ring-2 ring-white/50">
                            <AlertCircle className="h-2.5 w-2.5 text-white" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-white">Emergency</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="mb-4 border-t border-slate-200/50 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50">
                        <Activity className="h-3.5 w-3.5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{entry.patientName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

