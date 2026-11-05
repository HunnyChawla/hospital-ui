"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, ArrowRight, LayoutGrid } from "lucide-react";
import { DashboardWidget } from "./DashboardWidget";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useAppSelector } from "@/redux/hooks";
import clsx from "clsx";

interface BedOccupancyWidgetProps {
  colSpan?: number;
  rowSpan?: number;
}

export function BedOccupancyWidget({
  colSpan = 1,
  rowSpan = 1,
}: BedOccupancyWidgetProps) {
  const router = useRouter();
  const beds = useAppSelector((s) => s.beds.list);
  const wards = useAppSelector((s) => s.wards.list);
  const loading = useAppSelector((s) => s.beds.loading);

  const stats = useMemo(() => {
    const total = beds.length;
    const occupied = beds.filter((b) => b.status === "occupied").length;
    const available = beds.filter((b) => b.status === "available").length;
    const maintenance = beds.filter((b) => b.status === "maintenance").length;
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

    // Ward breakdown
    const wardMap: Record<string, { total: number; occupied: number }> = {};
    for (const bed of beds) {
      const wardName = bed.ward_name || "General Ward";
      if (!wardMap[wardName]) {
        wardMap[wardName] = { total: 0, occupied: 0 };
      }
      wardMap[wardName].total += 1;
      if (bed.status === "occupied") {
        wardMap[wardName].occupied += 1;
      }
    }

    const wardList = Object.entries(wardMap).map(([name, data]) => ({
      name,
      ...data,
      pct: data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0,
    }));

    return { total, occupied, available, maintenance, pct, wardList };
  }, [beds]);

  const occupancyTone =
    stats.pct > 85 ? "rose" : stats.pct > 65 ? "amber" : "emerald";

  return (
    <DashboardWidget
      id="bed_occupancy_map"
      title="Bed Occupancy"
      icon={LayoutGrid}
      tone={occupancyTone}
      colSpan={colSpan}
      rowSpan={rowSpan}
      badge={
        <span
          className={clsx(
            "rounded-md px-2 py-0.5 text-xs font-bold",
            stats.pct > 85
              ? "bg-rose-100 text-rose-700"
              : stats.pct > 65
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700"
          )}
        >
          {stats.pct}% Full
        </span>
      }
      action={
        <button
          type="button"
          onClick={() => router.push("/admissions?tab=beds")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 px-2 py-1 rounded-md hover:bg-sky-50 transition-colors cursor-pointer"
        >
          <span>Beds</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      }
      loading={loading}
      isEmpty={beds.length === 0}
      emptyState={
        <EmptyStateCard
          icon={BedDouble}
          title="No beds configured"
          description="Configure wards and hospital beds to track real-time IPD occupancy."
          action={{
            label: "Configure Beds",
            onClick: () => router.push("/admissions?tab=beds"),
          }}
          tone="emerald"
          size="sm"
        />
      }
    >
      {rowSpan === 1 ? (
        /* Dedicated 1x Height Compact View (Guaranteed No Scrollbar) */
        <div className="flex h-full flex-col justify-center space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Beds Status</span>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                {stats.available} free
              </span>
              <span className="text-sky-700 font-bold bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded">
                {stats.occupied} occ
              </span>
            </div>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-500",
                stats.pct > 85
                  ? "bg-rose-500"
                  : stats.pct > 65
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              )}
              style={{ width: `${Math.min(stats.pct, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Total: {stats.total} beds</span>
            <span>{stats.pct}% occupied</span>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between space-y-3">
          {/* High-level progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
              <span>Overall Capacity</span>
              <span className="font-bold text-slate-900">
                {stats.occupied} / {stats.total} beds
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  stats.pct > 85
                    ? "bg-rose-500"
                    : stats.pct > 65
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(stats.pct, 100)}%` }}
              />
            </div>
          </div>

          {/* Quick summary metrics */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5">
              <p className="text-xs text-emerald-700 font-medium">Available</p>
              <p className="text-xl font-bold text-emerald-800 font-mono">
                {stats.available}
              </p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-2.5">
              <p className="text-xs text-sky-700 font-medium">Occupied</p>
              <p className="text-xl font-bold text-sky-800 font-mono">
                {stats.occupied}
              </p>
            </div>
          </div>

          {/* Ward-wise list (dynamic slice based on height) */}
          {stats.wardList.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-3 overflow-y-auto">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Ward Occupancy
              </p>
              {stats.wardList
                .slice(0, rowSpan === 4 ? 10 : rowSpan === 3 ? 6 : 3)
                .map((w, i) => (
                  <div key={i} className="text-xs space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span className="truncate max-w-[140px] font-medium">{w.name}</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {w.occupied}/{w.total} ({w.pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full"
                        style={{ width: `${Math.min(w.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </DashboardWidget>
  );
}
