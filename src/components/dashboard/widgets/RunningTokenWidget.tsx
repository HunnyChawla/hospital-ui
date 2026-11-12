"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Ticket,
  ExternalLink,
  Users,
  Activity,
  Clock,
  CheckCircle2,
  Stethoscope,
} from "lucide-react";
import { DashboardWidget } from "./DashboardWidget";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useTVDisplayQueue } from "@/hooks/useTVDisplayQueue";
import { useAppSelector } from "@/redux/hooks";
import clsx from "clsx";

interface RunningTokenWidgetProps {
  colSpan?: number;
  rowSpan?: number;
}

export function RunningTokenWidget({
  colSpan = 2,
  rowSpan = 1,
}: RunningTokenWidgetProps) {
  const router = useRouter();
  const doctors = useAppSelector((s) => s.doctors.list);

  // Hook into live TV display queue with sounds disabled for the dashboard
  const {
    doctorPatients,
    optometristPatients,
    doctorStats,
    connectionStatus,
  } = useTVDisplayQueue({
    doctorId: doctors[0]?.id || null,
    autoConnect: true,
    enableSound: false,
    enableVoice: false,
  });

  // Combine and sort patients
  const allPatients = useMemo(() => {
    return [...doctorPatients, ...optometristPatients];
  }, [doctorPatients, optometristPatients]);

  // Current in-consultation / being examined patient(s)
  const currentlyServing = useMemo(() => {
    return allPatients.filter((p) => {
      const s = p.status?.toLowerCase();
      return (
        s === "consultation_in_progress" ||
        s === "in_consultation" ||
        s === "examination_in_progress" ||
        s === "optometrist_investigation_in_progress"
      );
    });
  }, [allPatients]);

  // Next patient in line
  const nextInLine = useMemo(() => {
    return allPatients
      .filter((p) => {
        const s = p.status?.toLowerCase();
        return (
          s === "awaiting_doctor" ||
          s === "awaiting_examiner" ||
          s === "awaiting_optometrist" ||
          s === "waiting"
        );
      })
      .sort((a, b) => {
        const numA = typeof a.token_number === "number" ? a.token_number : parseInt(String(a.token_number)) || 999;
        const numB = typeof b.token_number === "number" ? b.token_number : parseInt(String(b.token_number)) || 999;
        return numA - numB;
      })[0];
  }, [allPatients]);

  const primaryServing = currentlyServing[0];
  const otherServing = currentlyServing.slice(1);

  const totalWaiting = doctorStats?.waiting ?? allPatients.filter(
    (p) => p.status?.includes("awaiting") || p.status === "waiting"
  ).length;

  const totalServing = doctorStats?.inProgress ?? currentlyServing.length;
  const totalCompleted = allPatients.filter(
    (p) => p.status === "completed" || p.status === "consultation_completed"
  ).length;

  const isLive = connectionStatus === "connected";
  const hasQueueActivity = allPatients.length > 0 || Boolean(primaryServing) || Boolean(nextInLine);

  // Compact 1x Height Mode (fits inside a 145px tile identically to top stat card)
  if (rowSpan === 1) {
    return (
      <DashboardWidget
        id="running_token"
        title="Live Tokens"
        icon={Ticket}
        tone="emerald"
        colSpan={colSpan}
        rowSpan={rowSpan}
        badge={
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <span
              className={clsx(
                "h-1.5 w-1.5 rounded-full",
                isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              )}
            />
            {isLive ? "Live" : "Offline"}
          </span>
        }
        action={
          <button
            type="button"
            onClick={() => router.push("/queue")}
            className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline"
          >
            Board &rarr;
          </button>
        }
      >
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl font-extrabold text-emerald-950 font-mono">
                {primaryServing ? `#${primaryServing.token_number}` : "--"}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {primaryServing?.patient_name || "No active patient"}
                </p>
                <p className="text-[10px] text-emerald-700 font-medium truncate">
                  {primaryServing?.doctor_cabin || "Now Serving"}
                </p>
              </div>
            </div>

            {colSpan >= 2 && nextInLine && (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3 min-w-0">
                <span className="text-xl font-bold text-sky-900 font-mono">
                  #{nextInLine.token_number}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {nextInLine.patient_name}
                  </p>
                  <p className="text-[10px] text-sky-600 font-medium">Next Up</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-[11px] text-slate-500 font-mono">
            <span>Wait: <strong className="text-slate-800">{totalWaiting}</strong></span>
            <span>Serving: <strong className="text-emerald-700">{totalServing}</strong></span>
            <span>Done: <strong className="text-sky-700">{totalCompleted}</strong></span>
          </div>
        </div>
      </DashboardWidget>
    );
  }

  return (
    <DashboardWidget
      id="running_token"
      title="OPD Live Tokens"
      icon={Ticket}
      tone="emerald"
      colSpan={colSpan}
      rowSpan={rowSpan}
      badge={
        <div
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border shrink-0",
            isLive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-50 text-slate-500 border-slate-200"
          )}
        >
          <span
            className={clsx(
              "h-1.5 w-1.5 rounded-full",
              isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
            )}
          />
          <span className="hidden sm:inline">{isLive ? "Live Sync" : "Connecting"}</span>
        </div>
      }
    >
      <div className="flex h-full flex-col justify-between space-y-3">
        {/* Hero Active Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* NOW SERVING CARD */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/20 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                Now Serving
              </span>

              {primaryServing?.doctor_cabin && (
                <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  {primaryServing.doctor_cabin}
                </span>
              )}
            </div>

            {primaryServing ? (
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-4xl font-extrabold tracking-tight text-emerald-950 font-mono">
                    #{primaryServing.token_number}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-800 truncate max-w-[180px]">
                    {primaryServing.patient_name}
                  </p>
                  <p className="text-xs text-emerald-700 font-medium">
                    In Consultation
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-xs">
                  <Stethoscope className="h-6 w-6" />
                </div>
              </div>
            ) : (
              <div className="py-2 text-center">
                <p className="text-2xl font-bold text-slate-300">--</p>
                <p className="text-xs text-slate-500 mt-1">Ready for next patient</p>
              </div>
            )}
          </div>

          {/* NEXT IN LINE CARD */}
          <div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/40 via-white to-sky-50/10 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-sky-600" />
                Next Up
              </span>
              {nextInLine?.visit_type === "emergency" && (
                <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700 animate-pulse">
                  Emergency
                </span>
              )}
            </div>

            {nextInLine ? (
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-4xl font-extrabold tracking-tight text-sky-950 font-mono">
                    #{nextInLine.token_number}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-800 truncate max-w-[180px]">
                    {nextInLine.patient_name}
                  </p>
                  <p className="text-xs text-sky-700 font-medium capitalize">
                    {nextInLine.visit_type ? `${nextInLine.visit_type} visit` : "Waiting"}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-xs">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            ) : (
              <div className="py-2 text-center">
                <p className="text-2xl font-bold text-slate-300">--</p>
                <p className="text-xs text-slate-500 mt-1">No waiting patients</p>
              </div>
            )}
          </div>
        </div>

        {/* Other Active Rooms (if multiple doctors are consulting simultaneously) */}
        {otherServing.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Also In Consultation:
            </p>
            <div className="flex flex-wrap gap-2">
              {otherServing.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs"
                >
                  <span className="font-bold text-emerald-600 font-mono">#{p.token_number}</span>
                  <span className="truncate max-w-[100px]">{p.patient_name}</span>
                  {p.doctor_cabin && (
                    <span className="text-[10px] text-slate-400">({p.doctor_cabin})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Queue Metrics Footer */}
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2.5 text-center mt-auto shrink-0">
          <div className="rounded-xl bg-slate-50/80 p-2">
            <p className="text-xs text-slate-500 font-medium">Waiting</p>
            <p className="text-lg font-bold text-slate-900">{totalWaiting}</p>
          </div>
          <div className="rounded-xl bg-emerald-50/60 p-2">
            <p className="text-xs text-emerald-700 font-medium">Consulting</p>
            <p className="text-lg font-bold text-emerald-800">{totalServing}</p>
          </div>
          <div className="rounded-xl bg-sky-50/60 p-2">
            <p className="text-xs text-sky-700 font-medium">Completed</p>
            <p className="text-lg font-bold text-sky-800">{totalCompleted}</p>
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
}
