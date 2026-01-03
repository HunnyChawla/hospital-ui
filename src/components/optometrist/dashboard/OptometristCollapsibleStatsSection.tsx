"use client";

import React from "react";
import { ChevronDown, ChevronUp, Activity, Clock, CheckCircle, Users } from "lucide-react";
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
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50"
        title={isVisible ? "Collapse stats" : "Expand stats"}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">Today's Statistics</span>
        </div>
        {isVisible ? (
          <ChevronUp className="h-4 w-4 text-slate-400 transition-transform duration-200" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200" />
        )}
      </button>

      {/* Stats Content */}
      {isVisible && (
        <div className="border-t border-slate-200 p-2 sm:p-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <div className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 sm:mb-2 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-12 sm:w-16 mx-auto mb-1 animate-pulse rounded bg-slate-200" />
                  <div className="h-2 w-16 sm:w-20 mx-auto animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
              {/* Total Patients */}
              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 rounded-lg bg-slate-100">
                  <Users className="w-4 h-4 sm:w-6 sm:h-6 text-slate-600" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-slate-900">{stats.todayTotal}</div>
                <div className="text-xs sm:text-sm text-slate-600">Total</div>
              </div>

              {/* Pending */}
              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 rounded-lg bg-amber-100">
                  <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-amber-600">{stats.todayPending}</div>
                <div className="text-xs sm:text-sm text-slate-600">Pending</div>
              </div>

              {/* In Progress */}
              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 rounded-lg bg-blue-100">
                  <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.todayInProgress}</div>
                <div className="text-xs sm:text-sm text-slate-600">In Progress</div>
              </div>

              {/* Completed */}
              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 rounded-lg bg-emerald-100">
                  <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-emerald-600">{stats.todayCompleted}</div>
                <div className="text-xs sm:text-sm text-slate-600">Completed</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 py-4">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No statistics available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
