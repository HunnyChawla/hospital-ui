"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  HeartPulse,
  BedDouble,
  Coins,
  Currency,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react";
import { currency } from "@/utils/format";
import clsx from "clsx";

interface BaseStatWidgetProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
  tone: "sky" | "emerald" | "amber" | "purple";
  insights?: { label: string; value: string | number; trend?: "up" | "down" | "neutral" }[];
  loading?: boolean;
  onClick?: () => void;
}

const toneStyles = {
  sky: {
    bg: "bg-sky-50",
    text: "text-sky-600",
    border: "border-sky-100",
    glow: "from-sky-100/50 to-white",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-100",
    glow: "from-emerald-100/50 to-white",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-100",
    glow: "from-amber-100/50 to-white",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    border: "border-purple-100",
    glow: "from-purple-100/50 to-white",
  },
};

function StatCardContainer({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  insights = [],
  loading = false,
  onClick,
}: BaseStatWidgetProps) {
  const styles = toneStyles[tone];

  return (
    <div
      onClick={onClick}
      className={clsx(
        "group relative flex h-full min-h-[145px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-slate-300",
        onClick && "cursor-pointer"
      )}
    >
      {/* Glow accent */}
      <div
        className={clsx(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br blur-2xl transition-transform group-hover:scale-125",
          styles.glow
        )}
      />

      {/* Top Header */}
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-8 w-24 rounded-lg bg-slate-200 animate-pulse" />
          ) : (
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono">
              {value}
            </p>
          )}
          {hint && <p className="mt-0.5 text-xs text-slate-500 truncate">{hint}</p>}
        </div>

        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-2xs transition-transform group-hover:scale-105",
            styles.bg,
            styles.text,
            styles.border
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Bottom Insights - Standardized 1-line footer for pixel-equal tile heights */}
      {insights.length > 0 && (
        <div className="mt-3.5 border-t border-slate-100 pt-2.5">
          {loading ? (
            <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
          ) : (
            insights.map((ins, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs text-slate-600"
              >
                <span className="truncate">{ins.label}</span>
                <div className="flex items-center gap-1 font-semibold text-slate-900 shrink-0">
                  {ins.trend === "up" && (
                    <span className="text-emerald-600 font-bold">↑</span>
                  )}
                  {ins.trend === "down" && (
                    <span className="text-rose-600 font-bold">↓</span>
                  )}
                  <span>{ins.value}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function StatPatientsWidget({
  count = 0,
  insights,
  loading = false,
}: {
  count?: number;
  insights?: { today: number; completed: number } | null;
  loading?: boolean;
}) {
  const router = useRouter();

  return (
    <StatCardContainer
      label="Total Patients"
      value={count}
      hint="Registered patients"
      icon={HeartPulse}
      tone="sky"
      loading={loading}
      onClick={() => router.push("/patients")}
      insights={[
        {
          label: insights?.today !== undefined ? "Today's visits" : "Patient directory",
          value: insights?.today !== undefined ? `${insights.today} scheduled` : "Active",
          trend: (insights?.today ?? 0) > 0 ? "up" : "neutral",
        },
      ]}
    />
  );
}

export function StatAdmissionsWidget({
  activeCount = 0,
  totalCount = 0,
  occupancy,
  loading = false,
}: {
  activeCount?: number;
  totalCount?: number;
  occupancy?: { occupied: number; total: number; occupancy: number } | null;
  loading?: boolean;
}) {
  const router = useRouter();

  return (
    <StatCardContainer
      label="Active Admissions"
      value={activeCount}
      hint="Inpatient admissions"
      icon={BedDouble}
      tone="emerald"
      loading={loading}
      onClick={() => router.push("/admissions")}
      insights={[
        {
          label: occupancy ? "Bed occupancy" : "Total admissions",
          value: occupancy
            ? `${occupancy.occupied}/${occupancy.total} (${occupancy.occupancy}%)`
            : `${totalCount} recorded`,
          trend: occupancy && occupancy.occupancy > 75 ? "up" : "neutral",
        },
      ]}
    />
  );
}

export function StatBillingWidget({
  pendingAmount = 0,
  collectedAmount = 0,
  loading = false,
}: {
  pendingAmount?: number;
  collectedAmount?: number;
  loading?: boolean;
}) {
  const router = useRouter();

  return (
    <StatCardContainer
      label="Pending Billing"
      value={currency(pendingAmount)}
      hint="Outstanding invoices"
      icon={Coins}
      tone="amber"
      loading={loading}
      onClick={() => router.push("/billing")}
      insights={[
        {
          label: "Total collected",
          value: currency(collectedAmount),
          trend: collectedAmount > 0 ? "up" : "neutral",
        },
      ]}
    />
  );
}

export function StatDailyRevenueWidget({
  todayCollected = 0,
  yesterdayCollected = 0,
  loading = false,
}: {
  todayCollected?: number;
  yesterdayCollected?: number;
  loading?: boolean;
}) {
  const router = useRouter();

  const change = todayCollected - yesterdayCollected;
  const pct =
    yesterdayCollected > 0
      ? ((change / yesterdayCollected) * 100).toFixed(1)
      : todayCollected > 0
      ? "100"
      : "0";

  return (
    <StatCardContainer
      label="Daily Revenue"
      value={currency(todayCollected)}
      hint="Today collected"
      icon={Currency}
      tone="emerald"
      loading={loading}
      onClick={() => router.push("/billing")}
      insights={[
        {
          label: "Yesterday",
          value: `${currency(yesterdayCollected)} (${Number(pct) >= 0 ? "+" : ""}${pct}%)`,
          trend: Number(pct) >= 0 ? "up" : "down",
        },
      ]}
    />
  );
}
