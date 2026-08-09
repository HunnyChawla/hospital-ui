"use client";

import React from "react";
import { Users, Clock, Activity, CheckCircle, UserX } from "lucide-react";

export interface ClinicStats {
  todayTotal: number;
  pending: number;
  inProgress: number;
  sentToDoctor: number;
  completed: number;
  noShow: number;
}

interface ClinicCollapsibleStatsSectionProps {
  stats: ClinicStats;
  visible: boolean;
}

const TILES: Array<{
  key: keyof ClinicStats;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { key: "todayTotal", label: "Today's Patients", icon: Users, color: "text-sky-600 bg-sky-50" },
  { key: "pending", label: "Pending", icon: Clock, color: "text-amber-600 bg-amber-50" },
  { key: "inProgress", label: "In Progress", icon: Activity, color: "text-indigo-600 bg-indigo-50" },
  { key: "sentToDoctor", label: "With Doctor", icon: Activity, color: "text-purple-600 bg-purple-50" },
  { key: "completed", label: "Completed", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
  { key: "noShow", label: "No Show", icon: UserX, color: "text-rose-600 bg-rose-50" },
];

export function ClinicCollapsibleStatsSection({
  stats,
  visible,
}: ClinicCollapsibleStatsSectionProps) {
  if (!visible) return null;

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        return (
          <div
            key={tile.key}
            className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-3 py-2 shadow-sm"
          >
            <div className={`rounded-lg p-1.5 ${tile.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight text-slate-800">
                {stats[tile.key]}
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {tile.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
