"use client";

import React from "react";
import { ChevronDown, ChevronUp, Activity, Clock, CheckCircle2, Users } from "lucide-react";
import type { OptometristStats } from "@/types";

interface OptometristCollapsibleStatsSectionProps {
  stats: OptometristStats | null;
  loading?: boolean;
  isVisible: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export const OptometristCollapsibleStatsSection: React.FC<OptometristCollapsibleStatsSectionProps> = ({
  stats,
  loading = false,
  isVisible,
  onToggle,
  compact = false,
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">Statistics</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isVisible ? "rotate-180" : ""
            }`}
        />
      </button>

      {/* Collapsible Content */}
      <div
        className={`stats-collapse-transition overflow-hidden ${isVisible ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <div className="border-t border-slate-200 px-4 pb-4 pt-3">
          {loading ? (
            <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={compact ? "h-20 animate-pulse rounded-lg bg-slate-100" : "h-28 animate-pulse rounded-xl bg-slate-100"}
                />
              ))}
            </div>
          ) : (
            <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"}>
              {statItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`group relative overflow-hidden border border-slate-100 bg-gradient-to-br ${item.bgGradient} shadow-sm transition hover:shadow-md ${compact ? "rounded-lg p-3" : "rounded-xl p-5"
                      }`}
                  >
                    {/* Background glow */}
                    {!compact && (
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/50 opacity-0 blur-2xl transition group-hover:opacity-100" />
                    )}

                    <div className="relative flex items-start justify-between">
                      <div>
                        <p className={compact ? "text-xs font-medium text-slate-600" : "text-sm font-medium text-slate-600"}>
                          {item.label}
                        </p>
                        <p className={compact ? `mt-1 text-2xl font-bold ${item.textColor}` : `mt-2 text-3xl font-bold ${item.textColor}`}>
                          {item.value}
                        </p>
                      </div>

                      <div
                        className={`flex items-center justify-center rounded-xl ${item.iconBg} shadow-sm ${compact ? "h-9 w-9" : "h-12 w-12"
                          }`}
                      >
                        <Icon className={compact ? `h-4 w-4 ${item.iconColor}` : `h-6 w-6 ${item.iconColor}`} />
                      </div>
                    </div>

                    {/* Progress indicator */}
                    {!compact && stats && stats.todayTotal > 0 && item.label !== "Total Patients" && (
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
          )}
        </div>
      </div>
    </div>
  );
};
