"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, ArrowRight, DollarSign, Wallet } from "lucide-react";
import { DashboardWidget } from "./DashboardWidget";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { analyticsApi, RevenuePoint } from "@/services/analyticsApi";
import { currency, formatDate } from "@/utils/format";
import clsx from "clsx";

interface RevenueChartWidgetProps {
  colSpan?: number;
  rowSpan?: number;
}

export function RevenueChartWidget({
  colSpan = 2,
  rowSpan = 1,
}: RevenueChartWidgetProps) {
  const router = useRouter();
  const [data, setData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchRevenue = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const past = new Date();
        past.setDate(today.getDate() - 6);

        const res = await analyticsApi.revenue({
          start_date: past.toISOString().split("T")[0],
          end_date: today.toISOString().split("T")[0],
          granularity: "daily",
        });

        if (mounted) {
          setData(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load revenue trend for dashboard:", err);
        if (mounted) setData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRevenue();
    return () => {
      mounted = false;
    };
  }, []);

  const totalCollected = data.reduce((acc, d) => acc + (d.collected_amount || 0), 0);
  const totalInvoiced = data.reduce((acc, d) => acc + (d.invoiced_amount || 0), 0);
  const collectionPct = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Build SVG path points for sparkline
  const maxVal = Math.max(...data.map((d) => Math.max(d.collected_amount || 0, d.invoiced_amount || 0)), 100);

  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 300;
    const y = 80 - ((d.collected_amount || 0) / maxVal) * 70;
    return `${x},${y}`;
  });

  const pathD = points.length > 0 ? `M ${points.join(" L ")}` : "";
  const areaD = points.length > 0 ? `${pathD} L 300,80 L 0,80 Z` : "";

  const isCompact1x = rowSpan === 1;
  const chartHeightClass =
    rowSpan === 4 ? "h-64" : rowSpan === 3 ? "h-44" : "h-24";

  return (
    <DashboardWidget
      id="revenue_chart"
      title="Revenue Trend (7 Days)"
      icon={TrendingUp}
      tone="emerald"
      colSpan={colSpan}
      rowSpan={rowSpan}
      badge={
        totalCollected > 0 ? (
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            {collectionPct}% collected
          </span>
        ) : undefined
      }
      action={
        <button
          type="button"
          onClick={() => router.push("/analytics")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 px-2 py-1 rounded-md hover:bg-sky-50 transition-colors cursor-pointer"
        >
          <span>Analytics</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      }
      loading={loading}
      isEmpty={data.length === 0 || (totalCollected === 0 && totalInvoiced === 0)}
      emptyState={
        <EmptyStateCard
          icon={TrendingUp}
          title="No revenue trend yet"
          description="Invoiced and collected amounts over the past 7 days will be charted here."
          action={{
            label: "View Billing",
            onClick: () => router.push("/billing"),
          }}
          tone="emerald"
          size="sm"
        />
      }
    >
      {isCompact1x ? (
        /* Dedicated 1x Height Compact View (Guaranteed No Scrollbar) */
        <div className="flex h-full items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              7-Day Collected
            </p>
            <p className="text-xl font-bold text-emerald-700 font-mono mt-0.5">
              {currency(totalCollected)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
              Invoiced: {currency(totalInvoiced)}
            </p>
          </div>

          <div className="relative h-12 w-32 sm:w-44 shrink-0 rounded-lg bg-emerald-50/40 p-1 border border-emerald-100/60">
            <svg
              viewBox="0 0 300 80"
              className="h-full w-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="revenueGradientCompact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#revenueGradientCompact)" />
              <path
                d={pathD}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between space-y-3">
          {/* KPI Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-xs text-slate-500 font-medium">7-Day Collected</p>
              <p className="text-xl font-bold text-emerald-700 font-mono mt-0.5">
                {currency(totalCollected)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-xs text-slate-500 font-medium">7-Day Invoiced</p>
              <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                {currency(totalInvoiced)}
              </p>
            </div>
          </div>

          {/* SVG Sparkline Graph */}
          <div
            className={clsx(
              "relative w-full rounded-xl bg-gradient-to-b from-emerald-50/40 to-transparent p-2",
              chartHeightClass
            )}
          >
            <svg
              viewBox="0 0 300 80"
              className="h-full w-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gradient Fill Area */}
              <path d={areaD} fill="url(#revenueGradient)" />

              {/* Main Polyline */}
              <path
                d={pathD}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {points.map((pt, i) => {
                const [cx, cy] = pt.split(",");
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="3.5"
                    className="fill-white stroke-emerald-600 stroke-2"
                  />
                );
              })}
            </svg>
          </div>

          {/* Date labels */}
          <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
            <span>{data[0]?.period_start ? formatDate(data[0].period_start) : ""}</span>
            <span>{data[data.length - 1]?.period_start ? formatDate(data[data.length - 1].period_start) : ""}</span>
          </div>
        </div>
      )}
    </DashboardWidget>
  );
}
