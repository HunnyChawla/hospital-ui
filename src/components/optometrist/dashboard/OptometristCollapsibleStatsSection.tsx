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
    <div className="rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-lg shadow-slate-200/50 transition-all duration-300 hover:shadow-xl">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="group flex w-full items-center justify-between px-5 py-3.5 text-left transition-all hover:bg-gradient-to-r hover:from-slate-50 hover:to-sky-50/30 rounded-t-xl"
        title={isVisible ? "Collapse stats" : "Expand stats"}
      >
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 shadow-md shadow-sky-500/30 transition-transform group-hover:scale-110">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-800">Today's Statistics</span>
        </div>
        {isVisible ? (
          <ChevronUp className="h-4 w-4 text-slate-500 transition-all duration-200 group-hover:text-sky-600 group-hover:-translate-y-0.5" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500 transition-all duration-200 group-hover:text-sky-600 group-hover:translate-y-0.5" />
        )}
      </button>

      {/* Stats Content */}
      {isVisible && (
        <div className="border-t border-slate-200/60 p-4 sm:p-5 bg-gradient-to-br from-slate-50/50 to-transparent">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center p-4 rounded-xl bg-white/50 backdrop-blur-sm">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 animate-pulse rounded-xl bg-slate-200" />
                  <div className="h-4 w-14 sm:w-16 mx-auto mb-1.5 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-16 sm:w-20 mx-auto animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {/* Total Patients */}
              <div className="group text-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-slate-300 cursor-default">
                <div className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-md transition-transform group-hover:scale-110">
                  <Users className="w-5 h-5 sm:w-7 sm:h-7 text-slate-700" />
                </div>
                <div className="text-xl sm:text-3xl font-bold text-slate-900 mb-0.5">{stats.todayTotal}</div>
                <div className="text-xs sm:text-sm font-medium text-slate-600">Total Patients</div>
              </div>

              {/* Pending */}
              <div className="group text-center p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/60 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-amber-300 cursor-default">
                <div className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-3 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 shadow-md transition-transform group-hover:scale-110">
                  <Clock className="w-5 h-5 sm:w-7 sm:h-7 text-amber-700" />
                </div>
                <div className="text-xl sm:text-3xl font-bold text-amber-700 mb-0.5">{stats.todayPending}</div>
                <div className="text-xs sm:text-sm font-medium text-amber-700">Pending</div>
              </div>

              {/* In Progress */}
              <div className="group text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50/50 border border-blue-200/60 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-blue-300 cursor-default">
                <div className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-3 rounded-xl bg-gradient-to-br from-blue-100 to-sky-100 shadow-md transition-transform group-hover:scale-110">
                  <Activity className="w-5 h-5 sm:w-7 sm:h-7 text-blue-700" />
                </div>
                <div className="text-xl sm:text-3xl font-bold text-blue-700 mb-0.5">{stats.todayInProgress}</div>
                <div className="text-xs sm:text-sm font-medium text-blue-700">In Progress</div>
              </div>

              {/* Completed */}
              <div className="group text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50/50 border border-emerald-200/60 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-emerald-300 cursor-default">
                <div className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-3 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 shadow-md transition-transform group-hover:scale-110">
                  <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-700" />
                </div>
                <div className="text-xl sm:text-3xl font-bold text-emerald-700 mb-0.5">{stats.todayCompleted}</div>
                <div className="text-xs sm:text-sm font-medium text-emerald-700">Completed</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 py-8">
              <div className="rounded-xl bg-slate-100/50 p-6 inline-block">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No statistics available</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
