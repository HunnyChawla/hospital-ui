"use client";

import { useEffect, useMemo, useState } from "react";
import { analyticsApi, AnalyticsFilters } from "@/services/analyticsApi";
import { StatCard } from "@/components/common/StatCard";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { getErrorMessage } from "@/utils/errorHandler";
import { currency } from "@/utils/format";
import {
  Activity,
  BedDouble,
  Calendar,
  LineChart,
  Pill,
  Stethoscope,
  Wallet,
  AlertCircle,
  BarChart3,
  FlaskConical,
} from "lucide-react";
import clsx from "clsx";

const today = new Date();
const toISODate = (d: Date) => d.toISOString().split("T")[0];
const startDefault = new Date(today);
startDefault.setDate(today.getDate() - 29);

type AnalyticsData = {
  patientFlow: Awaited<ReturnType<typeof analyticsApi.patientFlow>> | null;
  bedOccupancy: Awaited<ReturnType<typeof analyticsApi.bedOccupancy>> | null;
  doctorUtilization: Awaited<ReturnType<typeof analyticsApi.doctorUtilization>> | null;
  revenue: Awaited<ReturnType<typeof analyticsApi.revenue>> | null;
  appointmentSummary: Awaited<ReturnType<typeof analyticsApi.appointmentSummary>> | null;
  pharmacyUsage: Awaited<ReturnType<typeof analyticsApi.pharmacyUsage>> | null;
  diagnosticsUsage: Awaited<ReturnType<typeof analyticsApi.diagnosticsUsage>> | null;
  efficiencyScore: Awaited<ReturnType<typeof analyticsApi.efficiencyScore>> | null;
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export function AnalyticsDashboard() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    start_date: toISODate(startDefault),
    end_date: toISODate(today),
    granularity: "daily",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData>({
    patientFlow: null,
    bedOccupancy: null,
    doctorUtilization: null,
    revenue: null,
    appointmentSummary: null,
    pharmacyUsage: null,
    diagnosticsUsage: null,
    efficiencyScore: null,
  });

  const loadData = async (currentFilters: AnalyticsFilters) => {
    setLoading(true);
    setError(null);
    try {
      const [
        patientFlow,
        bedOccupancy,
        doctorUtilization,
        revenue,
        appointmentSummary,
        pharmacyUsage,
        diagnosticsUsage,
        efficiencyScore,
      ] = await Promise.all([
        analyticsApi.patientFlow(currentFilters),
        analyticsApi.bedOccupancy(currentFilters),
        analyticsApi.doctorUtilization(currentFilters),
        analyticsApi.revenue(currentFilters),
        analyticsApi.appointmentSummary(currentFilters),
        analyticsApi.pharmacyUsage(currentFilters),
        analyticsApi.diagnosticsUsage(currentFilters),
        analyticsApi.efficiencyScore(currentFilters),
      ]);

      setData({
        patientFlow,
        bedOccupancy,
        doctorUtilization,
        revenue,
        appointmentSummary,
        pharmacyUsage,
        diagnosticsUsage,
        efficiencyScore,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(filters);
  };

  const summary = useMemo(() => {
    const flow = data.patientFlow?.data ?? [];
    const occupancy = data.bedOccupancy?.data ?? [];
    const docUtil = data.doctorUtilization?.data ?? [];
    const revenue = data.revenue?.data ?? [];
    const appointments = data.appointmentSummary?.data ?? [];
    const efficiency = data.efficiencyScore?.data ?? [];

    return {
      admissions: sum(flow.map((p) => p.admissions)),
      discharges: sum(flow.map((p) => p.discharges)),
      occupancyPct: occupancy.length ? occupancy[occupancy.length - 1].occupancy_pct : null,
      revenueCollected: sum(revenue.map((p) => p.collected_amount)),
      totalAppointments: sum(appointments.map((p) => p.scheduled)),
      completedVisits: sum(docUtil.map((p) => p.completed_appointments)),
      efficiencyScore: efficiency.length ? efficiency[efficiency.length - 1].efficiency_score : null,
    };
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={handleApply}>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Start date</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={filters.start_date}
                max={filters.end_date}
                onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 outline-none focus:border-sky-400"
                required
              />
            </div>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">End date</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={filters.end_date}
                min={filters.start_date}
                onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 outline-none focus:border-sky-400"
                required
              />
            </div>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Granularity</span>
            <select
              value={filters.granularity}
              onChange={(e) => setFilters((f) => ({ ...f, granularity: e.target.value as AnalyticsFilters["granularity"] }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow"
              disabled={loading}
            >
              {loading ? "Loading..." : "Apply filters"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Admissions"
          value={summary.admissions}
          hint="Total in selected period"
          icon={Activity}
          tone="sky"
        />
        <StatCard
          label="Discharges"
          value={summary.discharges}
          hint="Including planned & early"
          icon={BedDouble}
          tone="emerald"
        />
        <StatCard
          label="Revenue collected"
          value={currency(summary.revenueCollected || 0)}
          hint="Collections in period"
          icon={Wallet}
          tone="amber"
        />
        <StatCard
          label="Efficiency"
          value={summary.efficiencyScore ? summary.efficiencyScore.toFixed(1) : "-"}
          hint="Composite score"
          icon={LineChart}
          tone="fuchsia"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsPanel
          title="Patient flow"
          subtitle="Admissions, discharges, readmissions"
          icon={Activity}
          loading={loading}
          rows={
            data.patientFlow?.data.map((p) => ({
              period: p.period_start,
              primary: `${p.admissions} admissions`,
              secondary: `${p.discharges} discharges • ${p.readmissions} readmit`,
              chip: p.avg_length_of_stay ? `${p.avg_length_of_stay.toFixed(1)}d ALOS` : undefined,
            })) || []
          }
        />

        <AnalyticsPanel
          title="Bed occupancy"
          subtitle="Average occupied beds and %"
          icon={BedDouble}
          loading={loading}
          rows={
            data.bedOccupancy?.data.map((p) => ({
              period: p.period_start,
              primary: `${p.avg_occupied_beds.toFixed(1)} of ${p.total_beds} beds`,
              secondary: `Occupancy ${p.occupancy_pct.toFixed(1)}%`,
            })) || []
          }
        />

        <AnalyticsPanel
          title="Doctor utilization"
          subtitle="Appointments, visits, consult time"
          icon={Stethoscope}
          loading={loading}
          rows={
            data.doctorUtilization?.data.map((p) => ({
              period: p.period_start,
              primary: `${p.completed_appointments} completed / ${p.appointments} scheduled`,
              secondary: `${p.visits} visits • ${p.cancelled_appointments} cancelled • ${p.no_shows} no-shows`,
              chip: p.avg_consult_minutes ? `${p.avg_consult_minutes.toFixed(1)}m avg consult` : undefined,
            })) || []
          }
        />

        <AnalyticsPanel
          title="Revenue"
          subtitle="Invoiced vs collected"
          icon={Wallet}
          loading={loading}
          rows={
            data.revenue?.data.map((p) => ({
              period: p.period_start,
              primary: `${currency(p.collected_amount)} collected`,
              secondary: `${currency(p.invoiced_amount)} invoiced • ${currency(p.outstanding_amount)} outstanding`,
            })) || []
          }
        />

        <AnalyticsPanel
          title="Appointments"
          subtitle="Scheduled → completed funnel"
          icon={Calendar}
          loading={loading}
          rows={
            data.appointmentSummary?.data.map((p) => ({
              period: p.period_start,
              primary: `${p.completed} completed / ${p.scheduled} scheduled`,
              secondary: `${p.cancelled} cancelled • ${p.no_show} no-shows • ${p.confirmed} confirmed`,
            })) || []
          }
        />

        <AnalyticsPanel
          title="Pharmacy usage"
          subtitle="Units dispensed and revenue"
          icon={Pill}
          loading={loading}
          rows={
            data.pharmacyUsage?.data.map((p) => ({
              period: p.period_start,
              primary: `${p.total_units.toFixed(1)} units`,
              secondary: `${currency(p.revenue)} revenue`,
            })) || []
          }
        />

        <AnalyticsPanel
          title="Diagnostics"
          subtitle="Orders and revenue"
          icon={FlaskConical}
          loading={loading}
          rows={
            data.diagnosticsUsage?.data.map((p) => ({
              period: p.period_start,
              primary: `${p.completed} completed / ${p.orders} orders`,
              secondary: `${currency(p.revenue)} revenue`,
            })) || []
          }
        />

        <AnalyticsPanel
          title="Efficiency score"
          subtitle="Composite index"
          icon={BarChart3}
          loading={loading}
          rows={
            data.efficiencyScore?.data.map((p) => ({
              period: p.period_start,
              primary: `Score ${p.efficiency_score.toFixed(1)}`,
              secondary: [
                p.occupancy_pct ? `Occ ${p.occupancy_pct.toFixed(1)}%` : null,
                p.avg_length_of_stay ? `ALOS ${p.avg_length_of_stay.toFixed(1)}d` : null,
                p.revenue_per_day ? `Rev/day ${currency(p.revenue_per_day)}` : null,
              ]
                .filter(Boolean)
                .join(" • "),
            })) || []
          }
        />
      </div>
    </div>
  );
}

type PanelRow = {
  period: string;
  primary: string;
  secondary?: string;
  chip?: string;
};

type AnalyticsPanelProps = {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: PanelRow[];
  loading: boolean;
};

function AnalyticsPanel({ title, subtitle, icon: Icon, rows, loading }: AnalyticsPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {loading ? (
        <SkeletonRow rows={3} />
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">No data for the selected range.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={`${title}-${row.period}-${row.primary}`}
              className="rounded-xl border border-slate-100 px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{row.primary}</p>
                <span className="text-xs text-slate-500">{row.period}</span>
              </div>
              {row.secondary ? <p className="text-xs text-slate-500">{row.secondary}</p> : null}
              {row.chip ? (
                <span
                  className={clsx(
                    "mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold",
                    "bg-sky-50 text-sky-700"
                  )}
                >
                  {row.chip}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

