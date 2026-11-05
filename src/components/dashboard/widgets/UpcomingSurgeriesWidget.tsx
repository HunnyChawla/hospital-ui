"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Calendar, ArrowRight, User, Stethoscope } from "lucide-react";
import { DashboardWidget } from "./DashboardWidget";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { PlannedSurgery } from "@/types";
import { formatDate, getTodayDateLocal } from "@/utils/format";
import clsx from "clsx";

interface UpcomingSurgeriesWidgetProps {
  colSpan?: number;
  rowSpan?: number;
}

export function UpcomingSurgeriesWidget({
  colSpan = 2,
  rowSpan = 1,
}: UpcomingSurgeriesWidgetProps) {
  const router = useRouter();
  const [surgeries, setSurgeries] = useState<PlannedSurgery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchSurgeries = async () => {
      setLoading(true);
      try {
        const todayStr = getTodayDateLocal();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const toDateStr = futureDate.toISOString().split("T")[0];

        const pageSize = rowSpan === 4 ? 9 : rowSpan === 3 ? 6 : rowSpan === 2 ? 3 : 1;

        const res = await plannedSurgeriesApi.list({
          from_date: todayStr,
          to_date: toDateStr,
          page_size: pageSize,
        });

        if (mounted) {
          setSurgeries(res.items || []);
        }
      } catch (err) {
        console.error("Failed to load upcoming surgeries for dashboard:", err);
        if (mounted) setSurgeries([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSurgeries();
    return () => {
      mounted = false;
    };
  }, [rowSpan]);

  const statusStyles: Record<string, string> = {
    scheduled: "bg-sky-50 text-sky-700 border-sky-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    rescheduled: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const maxDisplay = rowSpan === 4 ? 9 : rowSpan === 3 ? 6 : rowSpan === 2 ? 3 : 1;
  const isCompact1x = rowSpan === 1;

  return (
    <DashboardWidget
      id="upcoming_surgeries"
      title="Upcoming Surgeries"
      icon={Scissors}
      tone="purple"
      colSpan={colSpan}
      rowSpan={rowSpan}
      badge={
        surgeries.length > 0 ? (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
            {surgeries.length} planned
          </span>
        ) : undefined
      }
      action={
        <button
          type="button"
          onClick={() => router.push("/planned-surgeries")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 px-2 py-1 rounded-md hover:bg-sky-50 transition-colors cursor-pointer"
        >
          <span>All Surgeries</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      }
      loading={loading}
      isEmpty={surgeries.length === 0}
      emptyState={
        <EmptyStateCard
          icon={Scissors}
          title="No planned surgeries"
          description="There are no OT or daycare surgeries scheduled for the upcoming 7 days."
          action={{
            label: "Schedule Surgery",
            onClick: () => router.push("/planned-surgeries"),
          }}
          tone="purple"
          size="sm"
        />
      }
    >
      {isCompact1x ? (
        /* Dedicated 1x Height Compact View (Guaranteed No Scrollbar) */
        <div className="flex h-full flex-col justify-center">
          {surgeries.slice(0, 1).map((surg) => {
            const statusCls =
              statusStyles[surg.status] || "bg-slate-50 text-slate-700 border-slate-200";

            return (
              <div
                key={surg.id}
                onClick={() => router.push("/planned-surgeries")}
                className="group flex items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-gradient-to-r from-white to-slate-50/50 p-2.5 transition-all hover:border-purple-300 hover:shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 shadow-2xs">
                    <Scissors className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {surg.surgery_name || "Surgery"}
                      </p>
                      <span
                        className={clsx(
                          "inline-block rounded px-1.5 py-0.2 text-[10px] font-semibold capitalize border",
                          statusCls
                        )}
                      >
                        {surg.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {surg.patient_name || "Patient"}
                      {surg.surgeon_name
                        ? ` • ${surg.surgeon_name.replace(/^(dr\.?\s*)+/i, "Dr. ")}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {surg.planned_date && (
                    <span className="text-[10px] font-mono font-medium text-slate-500">
                      {formatDate(surg.planned_date)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between space-y-2">
          <div className="space-y-2 overflow-y-auto flex-1">
            {surgeries.slice(0, maxDisplay).map((surg) => {
              const statusCls =
                statusStyles[surg.status] || "bg-slate-50 text-slate-700 border-slate-200";

              return (
                <div
                  key={surg.id}
                  onClick={() => router.push("/planned-surgeries")}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-2.5 transition-all hover:border-purple-300 hover:shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shadow-2xs">
                      <Scissors className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {surg.surgery_name || "Surgery"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
                        <span className="font-medium text-slate-700">
                          {surg.patient_name || "Patient"}
                        </span>
                        {surg.surgeon_name && (
                          <>
                            <span>•</span>
                            <span className="truncate">{surg.surgeon_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={clsx(
                        "inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize",
                        statusCls
                      )}
                    >
                      {surg.status}
                    </span>
                    {surg.planned_date && (
                      <p className="mt-1 text-[11px] font-mono text-slate-400">
                        {formatDate(surg.planned_date)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {surgeries.length > 0 && (
            <button
              type="button"
              onClick={() => router.push("/planned-surgeries")}
              className="w-full mt-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 shrink-0"
            >
              View all planned surgeries →
            </button>
          )}
        </div>
      )}
    </DashboardWidget>
  );
}
