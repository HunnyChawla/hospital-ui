"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import {
  HeartPulse,
  CalendarPlus,
  Stethoscope,
  Beaker,
  CreditCard,
  BedDouble,
  LayoutList,
  Users2,
  BarChart3,
  Zap,
} from "lucide-react";
import { DashboardWidget } from "./DashboardWidget";
import clsx from "clsx";

interface QuickActionItem {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  path: string;
  tone: "sky" | "emerald" | "blue" | "purple" | "amber" | "teal";
}

const PRIMARY_ACTIONS: QuickActionItem[] = [
  {
    id: "add_patient",
    label: "Add Patient",
    sublabel: "Register new",
    icon: HeartPulse,
    path: "/patients?action=add",
    tone: "sky",
  },
  {
    id: "book_appointment",
    label: "Book Appointment",
    sublabel: "Schedule visit",
    icon: CalendarPlus,
    path: "/opd?action=appointment&tab=appointments",
    tone: "emerald",
  },
  {
    id: "opd_visit",
    label: "OPD Visit",
    sublabel: "Walk-in patient",
    icon: Stethoscope,
    path: "/opd?action=opd&tab=opd",
    tone: "blue",
  },
  {
    id: "billing",
    label: "Billing",
    sublabel: "Collect & invoice",
    icon: CreditCard,
    path: "/billing",
    tone: "amber",
  },
  {
    id: "admit_patient",
    label: "Admit Patient",
    sublabel: "IPD admission",
    icon: BedDouble,
    path: "/admissions?action=add&tab=admissions",
    tone: "teal",
  },
  {
    id: "lab_booking",
    label: "Lab Booking",
    sublabel: "Test request",
    icon: Beaker,
    path: "/lab-bookings?action=add",
    tone: "purple",
  },
];

const toneStyles = {
  sky: "from-sky-50/50 to-white hover:border-sky-300 hover:shadow-sky-100 text-sky-600 bg-sky-100 group-hover:bg-sky-200",
  emerald: "from-emerald-50/50 to-white hover:border-emerald-300 hover:shadow-emerald-100 text-emerald-600 bg-emerald-100 group-hover:bg-emerald-200",
  blue: "from-blue-50/50 to-white hover:border-blue-300 hover:shadow-blue-100 text-blue-600 bg-blue-100 group-hover:bg-blue-200",
  amber: "from-amber-50/50 to-white hover:border-amber-300 hover:shadow-amber-100 text-amber-600 bg-amber-100 group-hover:bg-amber-200",
  teal: "from-teal-50/50 to-white hover:border-teal-300 hover:shadow-teal-100 text-teal-600 bg-teal-100 group-hover:bg-teal-200",
  purple: "from-purple-50/50 to-white hover:border-purple-300 hover:shadow-purple-100 text-purple-600 bg-purple-100 group-hover:bg-purple-200",
};

export function QuickActionsWidget({
  colSpan = 4,
  rowSpan = 1,
}: {
  colSpan?: number;
  rowSpan?: number;
}) {
  const router = useRouter();
  const { hasAccess } = usePermissions();

  const visiblePrimaryActions = PRIMARY_ACTIONS.filter((action) => {
    const screen = action.path.split("?")[0];
    return hasAccess(screen);
  });

  if (visiblePrimaryActions.length === 0) {
    return null;
  }

  // Adjust button grid based on colSpan
  const gridColsClass =
    colSpan >= 4
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
      : colSpan === 3
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3"
      : colSpan === 2
      ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-4"
      : "grid-cols-2";

  const isCompact1x = rowSpan === 1;

  // Intelligently cap displayed actions based on available physical tile dimensions
  const maxActions =
    rowSpan === 1
      ? colSpan === 1
        ? 2
        : colSpan === 2
        ? 4
        : 6
      : rowSpan === 2 && colSpan === 1
      ? 4
      : visiblePrimaryActions.length;

  const displayedActions = visiblePrimaryActions.slice(0, maxActions);

  return (
    <DashboardWidget
      id="quick_actions"
      title="Quick Actions"
      icon={Zap}
      tone="amber"
      colSpan={colSpan}
      rowSpan={rowSpan}
    >
      <div className="flex h-full items-center">
        {/* Primary Action Buttons (Responsive Auto-Reflow Grid) */}
        <div className={`grid ${gridColsClass} gap-2.5 w-full`}>
          {displayedActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => router.push(action.path)}
                className={clsx(
                  "group relative flex flex-col items-center justify-center rounded-xl border border-slate-200/90 bg-gradient-to-br text-center transition-all duration-200 hover:shadow-md active:scale-98 cursor-pointer",
                  toneStyles[action.tone],
                  isCompact1x ? "p-2" : "p-3"
                )}
              >
                <div
                  className={clsx(
                    "flex items-center justify-center rounded-xl transition-transform group-hover:scale-110 shadow-2xs",
                    isCompact1x ? "h-7 w-7 mb-1" : "h-9 w-9 mb-2"
                  )}
                >
                  <Icon className={isCompact1x ? "h-4 w-4" : "h-5 w-5"} />
                </div>
                <p className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-full">
                  {action.label}
                </p>
                {!isCompact1x && (
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {action.sublabel}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </DashboardWidget>
  );
}
