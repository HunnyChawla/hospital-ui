"use client";

import React, { useMemo, useState } from "react";
import clsx from "clsx";
import { Users, Hand, Play, CheckCircle, UserX, RotateCcw, PhoneCall } from "lucide-react";
import {
  CLINIC_QUEUE_FILTERS,
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
}: ClinicCollapsibleQueueSectionProps) {
  const { statusLabel } = useTenantLabels();
  const [search, setSearch] = useState("");

  // Keep the assigned-patient isolation logic from the optometrist queue:
  // picked patients are only visible to the examiner they belong to.
  const filteredPatients = useMemo(() => {
    const base = isDoctor
      ? patients.filter((p) =>
          CLINIC_QUEUE_FILTERS[activeFilter].statuses.includes(p.status)
        )
      : filterClinicQueuePatients(patients, activeFilter, examinerId, allowPickAny);

    if (!search.trim()) return base;
    const term = search.trim().toLowerCase();
    return base.filter(
      (p) =>
        p.patient_name.toLowerCase().includes(term) ||
        String(p.token_number).includes(term) ||
        (p.patient_uhid || "").toLowerCase().includes(term)
    );
  }, [patients, activeFilter, isDoctor, examinerId, allowPickAny, search]);

  const queueCounts = useMemo(() => getClinicQueueCounts(patients), [patients]);

  if (!visible) return null;

  const renderActions = (patient: ClinicQueuePatient) => {
    const busy = actionInProgressVisitId === patient.visit_id;
    const btn = (
      label: string,
      action: ClinicActionType,
      Icon: React.ComponentType<{ className?: string }>,
      tone: string
    ) => (
      <button
        key={action}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          onAction(patient.visit_id, action);
        }}
        className={clsx(
          "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition disabled:opacity-50",
          tone
        )}
      >
        <Icon className="h-3 w-3" />
        {label}
      </button>
    );

    if (isDoctor) {
      switch (patient.status) {
        case "awaiting_doctor":
          return [
            btn("Call", "start_consultation", PhoneCall, "bg-sky-600 text-white hover:bg-sky-700"),
            btn("Pick", "pick_doctor", Hand, "bg-slate-100 text-slate-700 hover:bg-slate-200"),
            btn("No Show", "mark_no_show", UserX, "bg-rose-50 text-rose-600 hover:bg-rose-100"),
          ];
        case "doctor_assigned":
          return [
            btn("Start", "start_consultation", Play, "bg-sky-600 text-white hover:bg-sky-700"),
            btn("Release", "unpick_doctor", RotateCcw, "bg-slate-100 text-slate-700 hover:bg-slate-200"),
          ];
        case "consultation_in_progress":
          return [
            btn(
              "Complete",
              "complete_consultation",
              CheckCircle,
              "bg-emerald-600 text-white hover:bg-emerald-700"
            ),
          ];
        case "no_show":
          return [
            btn("Call", "start_consultation", PhoneCall, "bg-sky-600 text-white hover:bg-sky-700"),
          ];
        default:
          return null;
      }
    }

    // Examiner actions
    switch (patient.status) {
      case "awaiting_examiner":
        return [
          btn("Pick", "pick", Hand, "bg-sky-600 text-white hover:bg-sky-700"),
          btn("No Show", "mark_no_show", UserX, "bg-rose-50 text-rose-600 hover:bg-rose-100"),
        ];
      case "examiner_assigned":
        return [
          btn("Start", "start_examination", Play, "bg-indigo-600 text-white hover:bg-indigo-700"),
          btn("Unpick", "unpick", RotateCcw, "bg-slate-100 text-slate-700 hover:bg-slate-200"),
        ];
      case "examination_in_progress":
        return [
          btn(
            "Complete",
            "complete_examination",
            CheckCircle,
            "bg-emerald-600 text-white hover:bg-emerald-700"
          ),
        ];
      case "no_show":
        return [btn("Pick", "pick", Hand, "bg-sky-600 text-white hover:bg-sky-700")];
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200/70 bg-white shadow-sm">
      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-slate-100 p-2">
        {(Object.keys(CLINIC_QUEUE_FILTERS) as ClinicQueueFilter[]).map((filter) => {
          const cfg = CLINIC_QUEUE_FILTERS[filter];
          const Icon = cfg.icon;
          return (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={clsx(
                "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition",
                activeFilter === filter
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
              <span
                className={clsx(
                  "rounded-full px-1.5 text-[10px] font-bold",
                  activeFilter === filter ? "bg-white/20" : "bg-slate-200 text-slate-600"
                )}
              >
                {queueCounts[filter]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="border-b border-slate-100 p-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / token / UHID"
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-sky-400 focus:outline-none"
        />
      </div>

      {/* Patient list */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filteredPatients.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <Users className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-xs text-slate-500">No patients in this list</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPatients.map((patient) => (
              <div
                key={patient.visit_id}
                onClick={() => onSelectPatient(patient)}
                className={clsx(
                  "cursor-pointer rounded-lg border p-2.5 transition hover:border-sky-300 hover:shadow-sm",
                  selectedVisitId === patient.visit_id
                    ? "border-sky-400 bg-sky-50/60"
                    : "border-slate-200 bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-7 flex-shrink-0 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-white">
                        #{patient.token_number}
                      </span>
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {patient.patient_name}
                      </p>
                      {patient.visit_type === "emergency" && (
                        <span className="rounded bg-red-100 px-1 text-[9px] font-bold uppercase text-red-700">
                          EMG
                        </span>
                      )}
                      {patient.is_revisit && (
                        <span className="rounded bg-violet-100 px-1 text-[9px] font-bold uppercase text-violet-700">
                          Re-visit
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <ClinicStatusBadge status={patient.status} />
                      {patient.examiner_name && !isDoctor && (
                        <span className="text-[10px] text-slate-500">
                          {patient.examiner_name}
                        </span>
                      )}
                      {patient.picked_by_doctor_name && isDoctor && (
                        <span className="text-[10px] text-slate-500">
                          {patient.picked_by_doctor_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">{renderActions(patient)}</div>
                {patient.expected_next_status_time &&
                  CLINIC_QUEUE_FILTERS.pending.statuses.includes(patient.status) && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Expected {statusLabel(patient.status).toLowerCase()} until{" "}
                      {new Date(patient.expected_next_status_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
