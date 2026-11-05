"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, ArrowRight, User, Stethoscope, CheckCircle2 } from "lucide-react";
import { DashboardWidget } from "./DashboardWidget";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useAppointmentsByDoctor } from "@/hooks/queries/useAppointments";
import { useAppSelector } from "@/redux/hooks";
import { getTodayDateLocal } from "@/utils/format";
import clsx from "clsx";

interface TodayAppointmentsWidgetProps {
  colSpan?: number;
  rowSpan?: number;
}

export function TodayAppointmentsWidget({
  colSpan = 2,
  rowSpan = 1,
}: TodayAppointmentsWidgetProps) {
  const router = useRouter();
  const doctors = useAppSelector((s) => s.doctors.list);
  const primaryDoctorId = doctors[0]?.id || "";

  const todayStr = useMemo(() => getTodayDateLocal(), []);

  const queryPageSize = rowSpan === 4 ? 12 : rowSpan === 3 ? 10 : rowSpan === 2 ? 6 : 4;
  const maxDisplay = rowSpan === 4 ? 9 : rowSpan === 3 ? 6 : rowSpan === 2 ? 3 : 1;
  const isCompact1x = rowSpan === 1;

  const { data, isLoading } = useAppointmentsByDoctor(
    primaryDoctorId,
    todayStr,
    todayStr,
    { page: 1, page_size: queryPageSize }
  );

  const appointments = data?.items || [];
  const totalToday = data?.total || appointments.length;

  const statusStyles: Record<string, string> = {
    checked_in: "bg-emerald-50 text-emerald-700 border-emerald-200",
    confirmed: "bg-sky-50 text-sky-700 border-sky-200",
    completed: "bg-slate-100 text-slate-700 border-slate-200",
    scheduled: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <DashboardWidget
      id="today_appointments"
      title="Today's Appointments"
      icon={Calendar}
      tone="sky"
      colSpan={colSpan}
      rowSpan={rowSpan}
      badge={
        totalToday > 0 ? (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
            {totalToday}
          </span>
        ) : undefined
      }
      action={
        <button
          type="button"
          onClick={() => router.push("/opd?tab=appointments")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      }
      loading={isLoading}
      isEmpty={appointments.length === 0}
      emptyState={
        <EmptyStateCard
          icon={Calendar}
          title="No appointments today"
          description="There are no scheduled patient visits on the calendar for today."
          action={{
            label: "Schedule Appointment",
            onClick: () => router.push("/opd?action=appointment&tab=appointments"),
          }}
          tone="sky"
          size="sm"
        />
      }
    >
      {isCompact1x ? (
        /* Dedicated 1x Height Compact Row (Guaranteed No Scrollbar) */
        <div className="flex h-full flex-col justify-center">
          {appointments.slice(0, 1).map((appt) => {
            const statusCls = statusStyles[appt.status] || "bg-slate-50 text-slate-700 border-slate-200";
            const formattedTime = appt.appointment_time
              ? appt.appointment_time.slice(0, 5)
              : "--:--";

            return (
              <div
                key={appt.id}
                onClick={() => router.push("/opd?tab=appointments")}
                className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-gradient-to-r from-white to-slate-50/50 p-2.5 transition-all hover:border-sky-300 hover:shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex flex-col items-center justify-center rounded-lg bg-white border border-slate-200/80 px-2 py-0.5 min-w-[45px] shrink-0">
                    <span className="text-[9px] font-medium text-slate-400 uppercase">
                      Time
                    </span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {formattedTime}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {appt.patient_name || "Patient"}
                      </p>
                      {appt.token_number ? (
                        <span className="font-mono text-[11px] font-bold text-sky-600">
                          #{appt.token_number}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {appt.patient_mobile || "Scheduled visit"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span
                    className={clsx(
                      "inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize",
                      statusCls
                    )}
                  >
                    {appt.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between space-y-2">
          <div className="space-y-2 overflow-y-auto flex-1">
            {appointments.slice(0, maxDisplay).map((appt) => {
              const statusCls = statusStyles[appt.status] || "bg-slate-50 text-slate-700 border-slate-200";
              const formattedTime = appt.appointment_time
                ? appt.appointment_time.slice(0, 5)
                : "--:--";

              return (
                <div
                  key={appt.id}
                  onClick={() => router.push("/opd?tab=appointments")}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-2.5 transition-all hover:border-sky-300 hover:shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Time Badge */}
                    <div className="flex flex-col items-center justify-center rounded-lg bg-slate-50 border border-slate-200/60 px-2 py-1 min-w-[50px] shrink-0">
                      <span className="text-[10px] font-medium text-slate-400 uppercase">
                        Time
                      </span>
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {formattedTime}
                      </span>
                    </div>

                    {/* Patient Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {appt.patient_name || "Patient"}
                        </p>
                        {appt.token_number ? (
                          <span className="font-mono text-xs font-bold text-sky-600">
                            #{appt.token_number}
                          </span>
                        ) : null}
                      </div>
                      {appt.patient_mobile && (
                        <p className="text-xs text-slate-400 truncate">
                          {appt.patient_mobile}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="shrink-0">
                    <span
                      className={clsx(
                        "inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize",
                        statusCls
                      )}
                    >
                      {appt.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {appointments.length > 0 && (
            <button
              type="button"
              onClick={() => router.push("/opd?tab=appointments")}
              className="w-full mt-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 shrink-0"
            >
              View all appointments →
            </button>
          )}
        </div>
      )}
    </DashboardWidget>
  );
}
