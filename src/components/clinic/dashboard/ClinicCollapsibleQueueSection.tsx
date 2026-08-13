"use client";

import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import clsx from "clsx";
import {
  Users,
  Hand,
  Play,
  CheckCircle,
  UserX,
  RotateCcw,
  PhoneCall,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  CLINIC_EXAMINER_QUEUE_FILTERS,
  CLINIC_DOCTOR_QUEUE_FILTERS,
  filterClinicQueuePatients,
  getClinicQueueCounts,
  type ClinicQueueFilter,
  type ClinicQueuePatient,
} from "@/utils/clinicQueueFilters";
import { ClinicStatusBadge } from "../shared/ClinicStatusBadge";
import { useTenantLabels } from "@/hooks/useTenantLabels";

export type ClinicActionType =
  | "pick"
  | "unpick"
  | "start_examination"
  | "complete_examination"
  | "mark_no_show"
  | "start_consultation"
  | "complete_consultation"
  | "pick_doctor"
  | "unpick_doctor";

interface ClinicCollapsibleQueueSectionProps {
  patients: ClinicQueuePatient[];
  visible: boolean;
  activeFilter: ClinicQueueFilter;
  onFilterChange: (filter: ClinicQueueFilter) => void;
  onSelectPatient: (patient: ClinicQueuePatient) => void;
  onAction: (visitId: string, action: ClinicActionType) => void;
  selectedVisitId: string | null;
  isDoctor: boolean;
  /** Current examiner's user id — drives assigned-patient isolation. */
  examinerId?: string | null;
  allowPickAny?: boolean;
  actionInProgressVisitId?: string | null;
  isVisible: boolean;
  onToggle: () => void;
  loading?: boolean;
}

export function ClinicCollapsibleQueueSection({
  patients,
  visible,
  activeFilter,
  onFilterChange,
  onSelectPatient,
  onAction,
  selectedVisitId,
  isDoctor,
  examinerId,
  allowPickAny = false,
  actionInProgressVisitId,
  isVisible,
  onToggle,
  loading = false,
}: ClinicCollapsibleQueueSectionProps) {
  const { statusLabel } = useTenantLabels();
  const [search, setSearch] = useState("");

  // Scroll functionality for tabs
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const checkScrollButtons = useCallback(() => {
    const container = tabsContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkScrollButtons();
    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollButtons);
      window.addEventListener("resize", checkScrollButtons);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScrollButtons);
      }
      window.removeEventListener("resize", checkScrollButtons);
    };
  }, [checkScrollButtons]);

  // Re-check scroll buttons when filters change or visibility changes
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(checkScrollButtons, 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible, patients, activeFilter, checkScrollButtons]);

  const scrollTabs = (direction: "left" | "right") => {
    const container = tabsContainerRef.current;
    if (container) {
      const scrollAmount = 150;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  // Keep the assigned-patient isolation logic from the optometrist queue:
  // picked patients are only visible to the examiner they belong to.
  const filteredPatients = useMemo(() => {
    const base = filterClinicQueuePatients(
      patients,
      activeFilter,
      isDoctor,
      isDoctor ? null : examinerId,
      allowPickAny
    );

    if (!search.trim()) return base;
    const term = search.trim().toLowerCase();
    return base.filter(
      (p) =>
        p.patient_name.toLowerCase().includes(term) ||
        String(p.token_number).includes(term) ||
        (p.patient_uhid || "").toLowerCase().includes(term)
    );
  }, [patients, activeFilter, isDoctor, examinerId, allowPickAny, search]);

  const queueCounts = useMemo(() => getClinicQueueCounts(patients, isDoctor), [patients, isDoctor]);

  const filters = useMemo(() => {
    return [
      { key: "pending" as ClinicQueueFilter, label: "Pending", count: queueCounts.pending },
      { key: "completed" as ClinicQueueFilter, label: "Completed", count: queueCounts.completed },
      ...((queueCounts.no_show > 0 || activeFilter === "no_show") ? [{ key: "no_show" as ClinicQueueFilter, label: "No Show", count: queueCounts.no_show }] : [])
    ];
  }, [queueCounts, activeFilter]);

  if (!visible) return null;

  const renderActions = (patient: ClinicQueuePatient, index: number) => {
    const busy = actionInProgressVisitId === patient.visit_id;
    const btn = (
      label: string,
      action: ClinicActionType,
      Icon: React.ComponentType<{ className?: string }>,
      btnClass: string
    ) => (
      <button
        key={action}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          if (action === "start_consultation" || action === "start_examination") {
            onSelectPatient(patient);
          }
          onAction(patient.visit_id, action);
        }}
        className={clsx(
          "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 text-white",
          btnClass
        )}
      >
        {busy && actionInProgressVisitId === patient.visit_id ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </>
        )}
      </button>
    );

    if (isDoctor) {
      switch (patient.status) {
        case "awaiting_doctor":
          return (
            <div className="flex w-full gap-2">
              {(allowPickAny || index === 0) && btn("Call Patient", "pick_doctor", Users, "bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700")}
              {index === 0 && btn("No Show", "mark_no_show", UserX, "bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/30 hover:from-rose-600 hover:to-red-700")}
            </div>
          );
        case "doctor_assigned":
          return (
            <div className="flex w-full gap-2">
              {btn("Start", "start_consultation", Play, "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700")}
              {btn("Return to Queue", "unpick_doctor", X, "bg-gradient-to-r from-slate-400 to-slate-500 shadow-slate-400/30 hover:from-slate-500 hover:to-slate-600")}
            </div>
          );
        case "consultation_in_progress":
          return (
            <div className="flex w-full gap-2">
              {btn("Complete", "complete_consultation", CheckCircle, "bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/30 hover:from-emerald-600 hover:to-green-700")}
            </div>
          );
        case "no_show":
          return (
            <div className="flex w-full gap-2">
              {btn("Call Patient", "pick_doctor", Users, "bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700")}
            </div>
          );
        default:
          return null;
      }
    }

    // Examiner actions
    switch (patient.status) {
      case "awaiting_examiner":
        return (
          <div className="flex w-full gap-2">
            {(allowPickAny || index === 0) && btn("Call Patient", "pick", Users, "bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700")}
            {index === 0 && btn("No Show", "mark_no_show", UserX, "bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/30 hover:from-rose-600 hover:to-red-700")}
          </div>
        );
      case "examiner_assigned":
        return (
          <div className="flex w-full gap-2">
            {btn("Start", "start_examination", Play, "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700")}
            {btn("Return to Queue", "unpick", X, "bg-gradient-to-r from-slate-400 to-slate-500 shadow-slate-400/30 hover:from-slate-500 hover:to-slate-600")}
          </div>
        );
      case "examination_in_progress":
        return (
          <div className="flex w-full gap-2">
            {btn("Complete", "complete_examination", CheckCircle, "bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/30 hover:from-emerald-600 hover:to-green-700")}
          </div>
        );
      case "no_show":
        return (
          <div className="flex w-full gap-2">
            {btn("Call Patient", "pick", Users, "bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700")}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm shadow-lg shadow-slate-200/50 flex flex-col h-full transition-all duration-300 hover:shadow-xl">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="group flex w-full items-center justify-between px-3 py-2.5 text-left transition-all hover:bg-gradient-to-r hover:from-slate-50 hover:to-sky-50/30 flex-shrink-0 rounded-t-xl"
        title={isVisible ? "Collapse queue" : "Expand queue"}
      >
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-gradient-to-br from-sky-50 to-blue-600 p-1.5 shadow-md shadow-sky-500/30 transition-transform group-hover:scale-110">
            <Users className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-800">Patient Queue</span>
          <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-full shadow-sm">
            {filteredPatients.length}
          </span>
        </div>
        <ChevronRight
          className={clsx(
            "h-4 w-4 text-slate-500 transition-all duration-300 group-hover:text-sky-600",
            isVisible && "rotate-90"
          )}
        />
      </button>

      {/* Queue Content */}
      {isVisible && (
        <div className="border-t border-slate-200/60 flex flex-col flex-1 min-h-0">
          {/* Filter Tabs */}
          <div className="relative border-b border-slate-200/60 flex-shrink-0 bg-slate-50/50">
            {/* Left Scroll Button */}
            {showLeftScroll && (
              <button
                onClick={() => scrollTabs("left")}
                className="absolute left-0 top-0 bottom-0 z-10 flex w-8 items-center justify-center bg-gradient-to-r from-white via-white/80 to-transparent backdrop-blur-[2px] hover:text-sky-600 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
            )}

            {/* Right Scroll Button */}
            {showRightScroll && (
              <button
                onClick={() => scrollTabs("right")}
                className="absolute right-0 top-0 bottom-0 z-10 flex w-8 items-center justify-center bg-gradient-to-l from-white via-white/80 to-transparent backdrop-blur-[2px] hover:text-sky-600 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
            )}

            <div
              ref={tabsContainerRef}
              className="flex overflow-x-auto scrollbar-hide px-1"
            >
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => onFilterChange(filter.key)}
                  className={clsx(
                    "flex-shrink-0 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap",
                    activeFilter === filter.key
                      ? "text-sky-700 border-sky-600 bg-gradient-to-b from-sky-50 to-white shadow-sm"
                      : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/50"
                  )}
                >
                  {filter.label}
                  <span
                    className={clsx(
                      "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                      activeFilter === filter.key ? "bg-sky-200/50" : "bg-slate-200/50"
                    )}
                  >
                    ({filter.count})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-slate-200/60 p-2 bg-slate-50/30">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / token / UHID"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Patient list */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loading ? (
              <div className="p-6 text-center text-slate-500">
                <div className="h-8 w-8 mx-auto mb-3 animate-spin rounded-full border-3 border-slate-200 border-t-sky-600" />
                <p className="text-sm font-medium">Loading queue...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <div className="rounded-xl bg-slate-100/50 p-6 inline-block">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No patients in this list</p>
                </div>
              </div>
            ) : (
              filteredPatients.map((patient, index) => {
                const isEmergency = patient.visit_type === "emergency";
                const isSelected = selectedVisitId === patient.visit_id;

                const isClickable =
                  activeFilter !== "pending" ||
                  (isDoctor
                    ? patient.status === "consultation_in_progress"
                    : patient.status === "examination_in_progress");

                return (
                  <div
                    key={patient.visit_id}
                    onClick={() => {
                      if (isClickable) {
                        onSelectPatient(patient);
                      }
                    }}
                    className={clsx(
                      "p-2 transition-all duration-200 border-b last:border-b-0 animate-in fade-in slide-in-from-right-2",
                      isClickable ? "cursor-pointer" : "cursor-default",
                      isEmergency
                        ? isSelected
                          ? "bg-gradient-to-r from-red-50 via-rose-50 to-red-50/30 border-l-4 border-red-600 shadow-md border-b-red-200"
                          : isClickable
                          ? "bg-gradient-to-r from-red-50/50 to-rose-50/30 border-l-4 border-red-500 hover:from-red-50 hover:to-rose-50 hover:shadow-md border-b-red-100"
                          : "bg-gradient-to-r from-red-50/50 to-rose-50/30 border-l-4 border-red-500 border-b-red-100"
                        : isSelected
                        ? "bg-gradient-to-r from-sky-50 to-blue-50/30 border-l-4 border-sky-600 shadow-sm border-b-slate-100"
                        : isClickable
                        ? "hover:bg-slate-50/80 hover:shadow-sm border-b-slate-100"
                        : "border-b-slate-100"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex-1 min-w-0">
                        {/* Name and UHID on a single inline line */}
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span
                            className={clsx(
                              "font-semibold truncate text-sm",
                              isEmergency ? "text-red-900" : "text-slate-900"
                            )}
                          >
                            {patient.patient_name}
                          </span>
                          {patient.patient_uhid && (
                            <span
                              className={clsx(
                                "text-[10px] font-medium",
                                isEmergency ? "text-red-700" : "text-slate-400"
                              )}
                            >
                              ({patient.patient_uhid})
                            </span>
                          )}
                        </div>

                        {/* Combined Metadata Badges / Info Line */}
                        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500 flex-wrap">
                          <span
                            className={clsx(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap",
                              isEmergency
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "bg-slate-100 text-slate-700"
                            )}
                          >
                            Token: {patient.token_number}
                          </span>

                          <span>·</span>

                          {isEmergency ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white shadow-sm animate-pulse whitespace-nowrap">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Emergency
                            </span>
                          ) : patient.visit_type ? (
                            <span className="font-medium text-slate-500 whitespace-nowrap">
                              {patient.visit_type
                                .replace(/_/g, " ")
                                .toLowerCase()
                                .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                          ) : null}

                          {patient.is_revisit && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                Revisit
                              </span>
                            </>
                          )}

                          {patient.examiner_name && !isDoctor && (
                            <>
                              <span>·</span>
                              <span className="font-medium text-slate-500 whitespace-nowrap">
                                Ex: {patient.examiner_name}
                              </span>
                            </>
                          )}

                          {patient.picked_by_doctor_name && isDoctor && (
                            <>
                              <span>·</span>
                              <span className="font-medium text-slate-500 whitespace-nowrap">
                                Dr: {patient.picked_by_doctor_name}
                              </span>
                            </>
                          )}

                          <span>·</span>

                          <span className="flex items-center gap-0.5 whitespace-nowrap">
                            <svg
                              className="w-3 h-3 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {formatDateTime(patient.checked_in_at || patient.time)}
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <ClinicStatusBadge
                          status={patient.status}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold border-slate-200 shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">{renderActions(patient, index)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
