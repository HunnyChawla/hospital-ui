"use client";

import React from "react";
import { ChevronDown, Activity, Clock, CheckCircle2, Users, AlertTriangle } from "lucide-react";
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
}) => {
  const statItems = [
    {
      label: "Total OPD",
      shortLabel: "Total",
      value: stats?.todayTotal || 0,
      icon: Users,
      badgeBg: "bg-slate-100",
      badgeText: "text-slate-800",
      border: "border-slate-200",
      iconColor: "text-slate-500",
    },
    {
      label: "Pending",
      shortLabel: "Pending",
      value: stats?.todayPending || 0,
      icon: Clock,
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-800",
      border: "border-amber-200",
      iconColor: "text-amber-600",
    },
    {
      label: "In Progress",
      shortLabel: "In Progress",
      value: stats?.todayInProgress || 0,
      icon: Activity,
      badgeBg: "bg-sky-50",
      badgeText: "text-sky-800",
      border: "border-sky-200",
      iconColor: "text-sky-600",
    },
    {
      label: "Sent to Doctor",
      shortLabel: "Sent to Dr",
      value: stats?.sentToDoctor || stats?.todayCompleted || 0,
      icon: CheckCircle2,
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-800",
      border: "border-emerald-200",
      iconColor: "text-emerald-600",
    },
    {
      label: "No Show",
      shortLabel: "No Show",
      value: stats?.todayNoShow || 0,
      icon: AlertTriangle,
      badgeBg: "bg-rose-50",
      badgeText: "text-rose-800",
      border: "border-rose-200",
      iconColor: "text-rose-600",
    },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-xs flex-shrink-0 transition-all">
      {/* Sleek KPI Pill Strip (Always Visible, ~34px height) */}
      <div className="flex items-center justify-between px-2.5 py-1 text-left">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mr-1 flex-shrink-0">
            <Activity className="h-3.5 w-3.5 text-sky-600" />
            <span className="hidden sm:inline">Stats</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 w-16 animate-pulse rounded-md bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-nowrap">
              {statItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${item.badgeBg} ${item.badgeText} ${item.border} flex-shrink-0`}
                  >
                    <Icon className={`h-3 w-3 ${item.iconColor}`} />
                    <span className="text-slate-600 hidden md:inline">{item.shortLabel}:</span>
                    <span className="font-bold">{item.value}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expand / Collapse Details Toggle */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-medium px-1.5 py-1 rounded hover:bg-slate-100 transition flex-shrink-0 ml-2"
          title={isVisible ? "Hide detailed statistics" : "Show detailed statistics"}
          aria-expanded={isVisible}
        >
          <span className="hidden lg:inline text-[11px] text-slate-500">{isVisible ? "Hide Cards" : "Details"}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
              isVisible ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Expanded Detailed Cards View */}
      {isVisible && (
        <div className="border-t border-slate-100 px-2.5 py-2 bg-slate-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
            {statItems.map((item) => {
              const Icon = item.icon;
              const percent = stats && stats.todayTotal > 0 ? Math.round((item.value / stats.todayTotal) * 100) : 0;
              return (
                <div
                  key={item.label}
                  className={`rounded-lg border bg-white p-2.5 shadow-xs transition hover:border-slate-300 ${item.border}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">{item.label}</p>
                      <p className={`mt-0.5 text-xl font-bold ${item.badgeText}`}>{item.value}</p>
                    </div>
                    <div className={`p-1.5 rounded-md ${item.badgeBg}`}>
                      <Icon className={`h-4 w-4 ${item.iconColor}`} />
                    </div>
                  </div>
                  {stats && stats.todayTotal > 0 && item.label !== "Total OPD" && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">{percent}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
