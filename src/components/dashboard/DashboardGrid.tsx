"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardWidgetConfigItem } from "@/services/dashboardConfigApi";
import { WIDGET_REGISTRY } from "./widgets/WidgetRegistry";
import { DashboardWidget } from "./widgets/DashboardWidget";
import { RunningTokenWidget } from "./widgets/RunningTokenWidget";
import { WelcomeHeaderWidget } from "./widgets/WelcomeHeaderWidget";
import { QuickActionsWidget } from "./widgets/QuickActionsWidget";
import {
  StatPatientsWidget,
  StatAdmissionsWidget,
  StatBillingWidget,
  StatDailyRevenueWidget,
} from "./widgets/StatWidgets";
import { TodayAppointmentsWidget } from "./widgets/TodayAppointmentsWidget";
import { BedOccupancyWidget } from "./widgets/BedOccupancyWidget";
import { UpcomingSurgeriesWidget } from "./widgets/UpcomingSurgeriesWidget";
import { RevenueChartWidget } from "./widgets/RevenueChartWidget";
import { RecentAdmissionsList } from "./RecentAdmissionsList";
import { DashboardBillingList } from "./DashboardBillingList";
import { AdmissionDetailModal } from "@/components/ipd/AdmissionDetailModal";
import { useAppSelector } from "@/redux/hooks";
import { BedDouble, Receipt, ArrowRight, SlidersHorizontal, Sparkles, RefreshCw } from "lucide-react";
import { currency } from "@/utils/format";
import clsx from "clsx";

interface DashboardGridProps {
  widgets: DashboardWidgetConfigItem[];
  isEditing?: boolean;
  onRemoveWidget?: (widgetKey: string) => void;
  onCustomizeClick?: () => void;
  onRefreshClick?: () => void;
  isRefreshing?: boolean;
  insightsLoading?: boolean;
  dailyRevenue?: any;
  appointmentInsights?: any;
  bedOccupancy?: any;
  totalCollected?: number;
  totalPending?: number;
}

export function DashboardGrid({
  widgets,
  isEditing = false,
  onRemoveWidget,
  onCustomizeClick,
  onRefreshClick,
  isRefreshing,
  insightsLoading,
  dailyRevenue,
  appointmentInsights,
  bedOccupancy,
  totalCollected = 0,
  totalPending = 0,
}: DashboardGridProps) {
  const router = useRouter();

  // Admission modal state
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);

  // Billing state
  const [billingFilter, setBillingFilter] = useState<"pending" | "paid">("pending");

  // Redux data
  const patients = useAppSelector((s) => s.patients.list);
  const totalPatientsCount =
    useAppSelector((s) => s.patients.pagination?.total) ?? patients.length;
  const admissions = useAppSelector((s) => s.admissions.list);
  const activeAdmissionsCount = useMemo(
    () => admissions.filter((a) => a.status === "admitted").length,
    [admissions]
  );

  // Group stat cards if multiple exist so they render in a balanced sub-grid
  const statWidgetKeys = new Set([
    "stat_patients",
    "stat_admissions",
    "stat_billing",
    "stat_daily_revenue",
  ]);

  const activeStatWidgets = widgets.filter((w) => statWidgetKeys.has(w.widget_key));
  const otherWidgets = widgets.filter((w) => !statWidgetKeys.has(w.widget_key));

  const renderStatCard = (key: string) => {
    switch (key) {
      case "stat_patients":
        return (
          <StatPatientsWidget
            count={totalPatientsCount}
            insights={appointmentInsights}
            loading={insightsLoading}
          />
        );
      case "stat_admissions":
        return (
          <StatAdmissionsWidget
            activeCount={activeAdmissionsCount}
            totalCount={admissions.length}
            occupancy={bedOccupancy}
            loading={insightsLoading}
          />
        );
      case "stat_billing":
        return (
          <StatBillingWidget
            pendingAmount={totalPending}
            collectedAmount={totalCollected}
            loading={false}
          />
        );
      case "stat_daily_revenue":
        return (
          <StatDailyRevenueWidget
            todayCollected={dailyRevenue?.today?.collected ?? 0}
            yesterdayCollected={dailyRevenue?.yesterday?.collected ?? 0}
            loading={insightsLoading}
          />
        );
      default:
        return null;
    }
  };

  const renderWidgetContent = (widget: DashboardWidgetConfigItem) => {
    const key = widget.widget_key;

    switch (key) {
      case "welcome_header":
        return (
          <WelcomeHeaderWidget
            onCustomizeClick={onCustomizeClick}
            onRefreshClick={onRefreshClick}
            isRefreshing={isRefreshing}
          />
        );

      case "running_token":
        return <RunningTokenWidget colSpan={widget.col_span} rowSpan={widget.row_span || 1} />;

      case "quick_actions":
        return <QuickActionsWidget colSpan={widget.col_span} rowSpan={widget.row_span || 1} />;

      case "today_appointments":
        return <TodayAppointmentsWidget colSpan={widget.col_span} rowSpan={widget.row_span || 1} />;

      case "bed_occupancy_map":
        return <BedOccupancyWidget colSpan={widget.col_span} rowSpan={widget.row_span || 1} />;

      case "upcoming_surgeries":
        return <UpcomingSurgeriesWidget colSpan={widget.col_span} rowSpan={widget.row_span || 1} />;

      case "revenue_chart":
        return <RevenueChartWidget colSpan={widget.col_span} rowSpan={widget.row_span || 1} />;

      case "recent_admissions":
        return (
          <DashboardWidget
            id="recent_admissions"
            title={widget.label_override || "Recent Admissions"}
            icon={BedDouble}
            tone="emerald"
            colSpan={widget.col_span}
            rowSpan={widget.row_span || 1}
            isEditing={isEditing}
            onRemove={onRemoveWidget ? () => onRemoveWidget(key) : undefined}
            badge={
              admissions.length > 0 ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  {admissions.length} total
                </span>
              ) : undefined
            }
            action={
              <button
                type="button"
                onClick={() => router.push("/admissions?tab=admissions")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 px-2 py-1 rounded-md hover:bg-sky-50 transition-colors cursor-pointer"
              >
                <span>All Admissions</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            <RecentAdmissionsList
              admissions={admissions}
              colSpan={widget.col_span || 1}
              onAdmissionClick={(id) => {
                setSelectedAdmissionId(id);
                setShowAdmissionModal(true);
              }}
              onViewAll={() => router.push("/admissions?tab=admissions")}
              maxItems={widget.row_span === 4 ? 9 : widget.row_span === 3 ? 6 : widget.row_span === 2 ? 3 : 1}
            />
          </DashboardWidget>
        );

      case "bills_list":
        return (
          <DashboardWidget
            id="bills_list"
            title={widget.label_override || "Bills & Receipts"}
            icon={Receipt}
            tone="amber"
            colSpan={widget.col_span}
            rowSpan={widget.row_span || 1}
            isEditing={isEditing}
            onRemove={onRemoveWidget ? () => onRemoveWidget(key) : undefined}
            badge={
              billingFilter === "pending" && totalPending > 0 ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 font-mono">
                  {currency(totalPending)}
                </span>
              ) : billingFilter === "paid" && totalCollected > 0 ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 font-mono">
                  {currency(totalCollected)}
                </span>
              ) : undefined
            }
            action={
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setBillingFilter("pending")}
                  className={clsx(
                    "px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    billingFilter === "pending"
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setBillingFilter("paid")}
                  className={clsx(
                    "px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    billingFilter === "paid"
                      ? "bg-emerald-500 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  Paid
                </button>
              </div>
            }
          >
            <DashboardBillingList
              statusFilter={billingFilter}
              onStatusFilterChange={setBillingFilter}
              colSpan={widget.col_span || 1}
              rowSpan={widget.row_span || 1}
              hideHeader={true}
            />
          </DashboardWidget>
        );

      default:
        return null;
    }
  };

  /**
   * Maps widget's configured col_span (1..4) to responsive grid column classes.
   * Strictly respects user configuration so 1x widgets NEVER blow up to full screen.
   */
  const getColSpanClass = (colSpan: number = 1): string => {
    switch (colSpan) {
      case 4:
        return "col-span-1 md:col-span-2 lg:col-span-4";
      case 3:
        return "col-span-1 md:col-span-2 lg:col-span-3";
      case 2:
        return "col-span-1 md:col-span-2 lg:col-span-2";
      case 1:
      default:
        return "col-span-1";
    }
  };

  // Determine dynamic columns for the stat row:
  // 1 card -> 1 col, 2 cards -> 2 cols, 3 cards -> 3 cols, 4 cards -> 4 cols!
  // This eliminates the 4th empty slot bug!
  const statGridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[Math.min(activeStatWidgets.length, 4) as 1 | 2 | 3 | 4] || "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="space-y-4">
      {/* 1. Header Widget (if active) OR Compact Bar (if welcome header hidden) */}
      {widgets.some((w) => w.widget_key === "welcome_header") ? (
        <div>
          {renderWidgetContent(
            widgets.find((w) => w.widget_key === "welcome_header")!
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-sky-50/20 to-slate-50 px-4 py-2.5 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-bold text-slate-900">Hospital Operations</span>
            <span className="hidden sm:inline text-xs text-slate-400">•</span>
            <span className="hidden sm:inline text-xs text-slate-500">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshClick && (
              <button
                type="button"
                onClick={onRefreshClick}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50 cursor-pointer shadow-2xs"
                title="Refresh Dashboard Data"
              >
                <RefreshCw
                  className={clsx("h-3.5 w-3.5", isRefreshing && "animate-spin text-sky-600")}
                />
                <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Refresh"}</span>
              </button>
            )}

            {onCustomizeClick && (
              <button
                type="button"
                onClick={onCustomizeClick}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 cursor-pointer shadow-2xs"
                title="Customize Dashboard Layout"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                <span>Customize</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Responsive Auto-Reflowing Stat Cards Row (Guaranteed Equal Heights) */}
      {activeStatWidgets.length > 0 && (
        <div className={clsx("grid gap-3 sm:gap-4 items-stretch", statGridCols)}>
          {activeStatWidgets.map((stat) => (
            <div key={stat.widget_key} className="h-full">
              {renderStatCard(stat.widget_key)}
            </div>
          ))}
        </div>
      )}

      {/* 3. Main Dashboard Grid (Auto-Reflow Dense 4-Columns, Base 145px Unit) */}
      {(() => {
        const visibleOthers = otherWidgets.filter((w) => w.widget_key !== "welcome_header");

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 grid-flow-dense auto-rows-[145px] items-stretch">
            {visibleOthers.map((widget) => {
              const spanClass = getColSpanClass(widget.col_span || 1);
              const rowSpanClass = {
                1: "row-span-1 h-[145px]",
                2: "row-span-2 h-[306px]",
                3: "row-span-3 h-[467px]",
                4: "row-span-4 h-[628px]",
              }[widget.row_span || 1] || "row-span-1 h-[145px]";

              return (
                <div
                  key={widget.widget_key}
                  className={clsx(
                    "transition-all duration-200 flex flex-col",
                    spanClass,
                    rowSpanClass
                  )}
                >
                  {renderWidgetContent(widget)}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Detail Modals */}
      {selectedAdmissionId && (
        <AdmissionDetailModal
          isOpen={showAdmissionModal}
          onClose={() => {
            setShowAdmissionModal(false);
            setSelectedAdmissionId(null);
          }}
          admissionId={selectedAdmissionId}
        />
      )}
    </div>
  );
}
