"use client";

import React from "react";
import { ChevronDown, BarChart3 } from "lucide-react";
import { DoctorStatsCards } from "./DoctorStatsCards";
import type { DoctorStats } from "@/types";

interface CollapsibleStatsSectionProps {
  stats: DoctorStats | null;
  loading?: boolean;
  isVisible: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export const CollapsibleStatsSection: React.FC<CollapsibleStatsSectionProps> = ({
  stats,
  loading = false,
  isVisible,
  onToggle,
  compact = true,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">Statistics</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isVisible ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Collapsible Content */}
      <div
        className={`stats-collapse-transition overflow-hidden ${
          isVisible ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-slate-200 px-4 pb-4 pt-3">
          <DoctorStatsCards stats={stats} loading={loading} compact={compact} />
        </div>
      </div>
    </div>
  );
};
