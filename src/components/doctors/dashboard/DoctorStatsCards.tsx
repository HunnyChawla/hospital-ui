"use client";

import React from "react";
import { Users, Clock, Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import { DoctorStats } from "@/types";

interface DoctorStatsCardsProps {
  stats: DoctorStats | null;
  loading?: boolean;
  compact?: boolean;
}

export const DoctorStatsCards: React.FC<DoctorStatsCardsProps> = ({
  stats,
  loading = false,
  compact = false,
}) => {
  const statItems = [
    {
      label: "Total OPD",
      value: stats?.todayTotal || 0,
      icon: Users,
      color: "slate",
      bgGradient: "from-slate-50 to-slate-50/50",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      textColor: "text-slate-800",
    },
    {
      label: "Pending at Optom",
      value: stats?.pendingOptometrist || 0,
      icon: Clock,
      color: "amber",
      bgGradient: "from-amber-50 to-amber-50/50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      textColor: "text-amber-700",
    },
    {
      label: "In-Progress at Optom",
      value: stats?.inProgressOptometrist || 0,
      icon: Activity,
      color: "purple",
      bgGradient: "from-purple-50 to-purple-50/50",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      textColor: "text-purple-700",
    },
    {
      label: "Ready for Doctor",
      value: stats?.pendingDoctor || 0,
      icon: Clock,
      color: "sky",
      bgGradient: "from-sky-50 to-sky-50/50",
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
      textColor: "text-sky-700",
    },
    {
      label: "In Consultation",
      value: stats?.inProgressDoctor || 0,
      icon: Activity,
      color: "blue",
      bgGradient: "from-blue-50 to-blue-50/50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      textColor: "text-blue-700",
    },
    {
      label: "Completed Today",
      value: stats?.todayCompleted || 0,
      icon: CheckCircle2,
      color: "emerald",
      bgGradient: "from-emerald-50 to-emerald-50/50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      textColor: "text-emerald-700",
    },
    {
      label: "No Show",
      value: stats?.todayNoShow || 0,
      icon: AlertTriangle,
      color: "rose",
      bgGradient: "from-rose-50 to-rose-50/50",
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
      textColor: "text-rose-700",
    },
  ];

  if (loading) {
    return (
      <div className={compact ? "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" : "grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7"}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className={compact ? "h-20 animate-pulse rounded-lg bg-slate-100" : "h-24 animate-pulse rounded-xl bg-slate-100"}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={compact ? "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" : "grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7"}>
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`group relative overflow-hidden border border-slate-200/80 bg-gradient-to-br ${item.bgGradient} shadow-sm transition hover:shadow-md ${
              compact ? "rounded-lg p-2.5" : "rounded-xl p-3.5"
            }`}
          >
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight leading-tight">
                  {item.label}
                </p>
                <p className={`mt-1 text-2xl font-extrabold ${item.textColor}`}>
                  {item.value}
                </p>
              </div>

              <div
                className={`flex items-center justify-center rounded-lg ${item.iconBg} shrink-0 shadow-xs ${
                  compact ? "h-7 w-7" : "h-9 w-9"
                }`}
              >
                <Icon className={compact ? `h-3.5 w-3.5 ${item.iconColor}` : `h-4.5 w-4.5 ${item.iconColor}`} />
              </div>
            </div>

            {/* Progress indicator */}
            {!compact && stats && stats.todayTotal > 0 && item.label !== "Total OPD" && (
              <div className="mt-2 flex items-center gap-1.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200/60">
                  <div
                    className={`h-full rounded-full ${item.iconBg.replace('bg-', 'bg-')}`}
                    style={{
                      width: `${Math.min(100, Math.round((item.value / stats.todayTotal) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-400">
                  {Math.round((item.value / stats.todayTotal) * 100)}%
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
