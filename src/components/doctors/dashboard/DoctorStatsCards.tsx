"use client";

import React from "react";
import { Users, Clock, Activity, CheckCircle2 } from "lucide-react";
import { DoctorStats } from "@/types";

interface DoctorStatsCardsProps {
  stats: DoctorStats | null;
  loading?: boolean;
}

export const DoctorStatsCards: React.FC<DoctorStatsCardsProps> = ({
  stats,
  loading = false,
}) => {
  const statItems = [
    {
      label: "Total Patients",
      value: stats?.todayTotal || 0,
      icon: Users,
      color: "sky",
      bgGradient: "from-sky-50 to-sky-50/50",
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
      textColor: "text-sky-700",
    },
    {
      label: "Pending",
      value: stats?.todayPending || 0,
      icon: Clock,
      color: "amber",
      bgGradient: "from-amber-50 to-amber-50/50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      textColor: "text-amber-700",
    },
    {
      label: "In Progress",
      value: stats?.todayInProgress || 0,
      icon: Activity,
      color: "blue",
      bgGradient: "from-blue-50 to-blue-50/50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      textColor: "text-blue-700",
    },
    {
      label: "Completed",
      value: stats?.todayCompleted || 0,
      icon: CheckCircle2,
      color: "emerald",
      bgGradient: "from-emerald-50 to-emerald-50/50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      textColor: "text-emerald-700",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`group relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br ${item.bgGradient} p-5 shadow-sm transition hover:shadow-md`}
          >
            {/* Background glow */}
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/50 opacity-0 blur-2xl transition group-hover:opacity-100" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {item.label}
                </p>
                <p className={`mt-2 text-3xl font-bold ${item.textColor}`}>
                  {item.value}
                </p>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconBg} shadow-sm`}
              >
                <Icon className={`h-6 w-6 ${item.iconColor}`} />
              </div>
            </div>

            {/* Progress indicator */}
            {stats && stats.todayTotal > 0 && item.label !== "Total Patients" && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/60">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${item.iconBg}`}
                    style={{
                      width: `${(item.value / stats.todayTotal) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500">
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
