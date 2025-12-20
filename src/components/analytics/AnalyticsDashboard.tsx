"use client";

import { useEffect, useMemo, useState } from "react";
import { analyticsApi, AnalyticsFilters } from "@/services/analyticsApi";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { getErrorMessage } from "@/utils/errorHandler";
import { currency, formatDate } from "@/utils/format";
import {
  Activity,
  BedDouble,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  BarChart3,
  FlaskConical,
  Pill,
  Stethoscope,
  Users,
  Clock,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  LineChart,
  PieChart,
  Zap,
  Award,
  Percent,
} from "lucide-react";
import clsx from "clsx";
import { DetailedChartModal } from "./DetailedChartModal";

const today = new Date();
const toISODate = (d: Date) => d.toISOString().split("T")[0];
const startDefault = new Date(today);
startDefault.setDate(today.getDate() - 29);

type DatePreset = "today" | "week" | "month" | "last30" | "custom";

type AnalyticsData = {
  patientFlow: Awaited<ReturnType<typeof analyticsApi.patientFlow>> | null;
  bedOccupancy: Awaited<ReturnType<typeof analyticsApi.bedOccupancy>> | null;
  doctorUtilization: Awaited<ReturnType<typeof analyticsApi.doctorUtilization>> | null;
  revenue: Awaited<ReturnType<typeof analyticsApi.revenue>> | null;
  appointmentSummary: Awaited<ReturnType<typeof analyticsApi.appointmentSummary>> | null;
  diagnosticsUsage: Awaited<ReturnType<typeof analyticsApi.diagnosticsUsage>> | null;
  efficiencyScore: Awaited<ReturnType<typeof analyticsApi.efficiencyScore>> | null;
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const avg = (arr: number[]) => arr.length > 0 ? sum(arr) / arr.length : 0;
const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;

export function AnalyticsDashboard() {
  const [datePreset, setDatePreset] = useState<DatePreset>("last30");
  const [filters, setFilters] = useState<AnalyticsFilters>({
    start_date: toISODate(startDefault),
    end_date: toISODate(today),
    granularity: "daily",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartModalData, setChartModalData] = useState<{
    title: string;
    data: { period: string; value: number }[];
    chartType: "line" | "area" | "bar";
    color: "emerald" | "sky" | "amber" | "fuchsia" | "purple" | "indigo";
    formatValue?: (value: number) => string;
  } | null>(null);
  const [data, setData] = useState<AnalyticsData>({
    patientFlow: null,
    bedOccupancy: null,
    doctorUtilization: null,
    revenue: null,
    appointmentSummary: null,
    diagnosticsUsage: null,
    efficiencyScore: null,
  });

  const getDateRange = (preset: DatePreset): Pick<AnalyticsFilters, "start_date" | "end_date" | "granularity"> => {
    const end = new Date(today);
    const start = new Date(today);
    
    switch (preset) {
      case "today":
        start.setDate(today.getDate());
        return { start_date: toISODate(start), end_date: toISODate(end), granularity: "daily" as const };
      case "week":
        start.setDate(today.getDate() - 6);
        return { start_date: toISODate(start), end_date: toISODate(end), granularity: "daily" as const };
      case "month":
        start.setMonth(today.getMonth() - 1);
        return { start_date: toISODate(start), end_date: toISODate(end), granularity: "daily" as const };
      case "last30":
        start.setDate(today.getDate() - 29);
        return { start_date: toISODate(start), end_date: toISODate(end), granularity: "daily" as const };
      default:
        return { start_date: filters.start_date, end_date: filters.end_date, granularity: filters.granularity || "daily" as const };
    }
  };

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
        diagnosticsUsage,
        efficiencyScore,
      ] = await Promise.all([
        analyticsApi.patientFlow(currentFilters),
        analyticsApi.bedOccupancy(currentFilters),
        analyticsApi.doctorUtilization(currentFilters),
        analyticsApi.revenue(currentFilters),
        analyticsApi.appointmentSummary(currentFilters),
        analyticsApi.diagnosticsUsage(currentFilters),
        analyticsApi.efficiencyScore(currentFilters),
      ]);

      setData({
        patientFlow,
        bedOccupancy,
        doctorUtilization,
        revenue,
        appointmentSummary,
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
    const range = getDateRange(datePreset);
    const newFilters = {
      ...filters,
      ...range,
    };
    setFilters(newFilters);
    loadData(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset]);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
  };

  const handleCustomDateApply = (e: React.FormEvent) => {
    e.preventDefault();
    setDatePreset("custom");
    loadData(filters);
  };

  const summary = useMemo(() => {
    const flow = data.patientFlow?.data ?? [];
    const occupancy = data.bedOccupancy?.data ?? [];
    const docUtil = data.doctorUtilization?.data ?? [];
    const revenue = data.revenue?.data ?? [];
    const appointments = data.appointmentSummary?.data ?? [];
    const efficiency = data.efficiencyScore?.data ?? [];
    const diagnostics = data.diagnosticsUsage?.data ?? [];

    const latestOccupancy = occupancy.length > 0 ? occupancy[occupancy.length - 1] : null;
    const latestEfficiency = efficiency.length > 0 ? efficiency[efficiency.length - 1] : null;

    return {
      // Patient Flow
      totalAdmissions: sum(flow.map((p) => p.admissions)),
      totalDischarges: sum(flow.map((p) => p.discharges)),
      avgLengthOfStay: avg(flow.map((p) => p.avg_length_of_stay || 0).filter(v => v > 0)),
      readmissions: sum(flow.map((p) => p.readmissions)),
      readmissionRate: sum(flow.map((p) => p.discharges)) > 0
        ? (sum(flow.map((p) => p.readmissions)) / sum(flow.map((p) => p.discharges))) * 100
        : 0,
      
      // Bed Occupancy
      avgOccupancy: latestOccupancy?.occupancy_pct || 0,
      occupiedBeds: latestOccupancy?.avg_occupied_beds || 0,
      totalBeds: latestOccupancy?.total_beds || 0,
      maxOccupancy: max(occupancy.map((p) => p.occupancy_pct)),
      
      // Revenue
      revenueCollected: sum(revenue.map((p) => p.collected_amount)),
      revenueInvoiced: sum(revenue.map((p) => p.invoiced_amount)),
      revenueOutstanding: sum(revenue.map((p) => p.outstanding_amount)),
      collectionRate: sum(revenue.map((p) => p.invoiced_amount)) > 0 
        ? (sum(revenue.map((p) => p.collected_amount)) / sum(revenue.map((p) => p.invoiced_amount))) * 100 
        : 0,
      avgDailyRevenue: revenue.length > 0 ? sum(revenue.map((p) => p.collected_amount)) / revenue.length : 0,
      
      // Appointments
      totalAppointments: sum(appointments.map((p) => p.scheduled)),
      completedAppointments: sum(appointments.map((p) => p.completed)),
      cancelledAppointments: sum(appointments.map((p) => p.cancelled)),
      noShows: sum(appointments.map((p) => p.no_show)),
      appointmentCompletionRate: sum(appointments.map((p) => p.scheduled)) > 0
        ? (sum(appointments.map((p) => p.completed)) / sum(appointments.map((p) => p.scheduled))) * 100
        : 0,
      noShowRate: sum(appointments.map((p) => p.scheduled)) > 0
        ? (sum(appointments.map((p) => p.no_show)) / sum(appointments.map((p) => p.scheduled))) * 100
        : 0,
      
      // Doctor Utilization
      completedVisits: sum(docUtil.map((p) => p.completed_appointments)),
      avgConsultTime: avg(docUtil.map((p) => p.avg_consult_minutes || 0).filter(v => v > 0)),
      totalVisits: sum(docUtil.map((p) => p.visits)),
      
      // Efficiency
      efficiencyScore: latestEfficiency?.efficiency_score || 0,
      
      // Diagnostics
      diagnosticsRevenue: sum(diagnostics.map((p) => p.revenue)),
      totalLabOrders: sum(diagnostics.map((p) => p.orders)),
      completedLabOrders: sum(diagnostics.map((p) => p.completed)),
      labCompletionRate: sum(diagnostics.map((p) => p.orders)) > 0
        ? (sum(diagnostics.map((p) => p.completed)) / sum(diagnostics.map((p) => p.orders))) * 100
        : 0,
    };
  }, [data]);

  // Calculate trends (comparing first half vs second half of period)
  const trends = useMemo(() => {
    const revenue = data.revenue?.data ?? [];
    const appointments = data.appointmentSummary?.data ?? [];
    const flow = data.patientFlow?.data ?? [];
    const occupancy = data.bedOccupancy?.data ?? [];
    
    if (revenue.length < 2) return null;
    
    const mid = Math.floor(revenue.length / 2);
    const firstHalf = revenue.slice(0, mid);
    const secondHalf = revenue.slice(mid);
    
    const firstHalfRevenue = sum(firstHalf.map((p) => p.collected_amount));
    const secondHalfRevenue = sum(secondHalf.map((p) => p.collected_amount));
    const revenueChange = firstHalfRevenue > 0 
      ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 
      : 0;
    
    const firstHalfAppointments = sum(firstHalf.map((_, i) => appointments[i]?.scheduled || 0));
    const secondHalfAppointments = sum(secondHalf.map((_, i) => appointments[mid + i]?.scheduled || 0));
    const appointmentChange = firstHalfAppointments > 0
      ? ((secondHalfAppointments - firstHalfAppointments) / firstHalfAppointments) * 100
      : 0;
    
    const firstHalfAdmissions = sum(firstHalf.map((_, i) => flow[i]?.admissions || 0));
    const secondHalfAdmissions = sum(secondHalf.map((_, i) => flow[mid + i]?.admissions || 0));
    const admissionChange = firstHalfAdmissions > 0
      ? ((secondHalfAdmissions - firstHalfAdmissions) / firstHalfAdmissions) * 100
      : 0;

    const firstHalfOccupancy = avg(firstHalf.map((_, i) => occupancy[i]?.occupancy_pct || 0));
    const secondHalfOccupancy = avg(secondHalf.map((_, i) => occupancy[mid + i]?.occupancy_pct || 0));
    const occupancyChange = firstHalfOccupancy > 0
      ? ((secondHalfOccupancy - firstHalfOccupancy) / firstHalfOccupancy) * 100
      : 0;
    
    return {
      revenue: revenueChange,
      appointments: appointmentChange,
      admissions: admissionChange,
      occupancy: occupancyChange,
    };
  }, [data]);

  // Get chart data for visualizations
  const chartData = useMemo(() => {
    const revenue = data.revenue?.data ?? [];
    const appointments = data.appointmentSummary?.data ?? [];
    const flow = data.patientFlow?.data ?? [];
    const occupancy = data.bedOccupancy?.data ?? [];

    return {
      revenue: revenue.map((p) => p.collected_amount || 0).filter(v => !isNaN(v)),
      appointments: appointments.map((p) => p.scheduled || 0).filter(v => !isNaN(v)),
      admissions: flow.map((p) => p.admissions || 0).filter(v => !isNaN(v)),
      occupancy: occupancy.map((p) => p.occupancy_pct || 0).filter(v => !isNaN(v)),
    };
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-sky-50/30 to-white p-4 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Hospital Performance Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Comprehensive analytics from {formatDate(filters.start_date)} to {formatDate(filters.end_date)}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {(["today", "week", "month", "last30"] as DatePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={clsx(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                  datePreset === preset
                    ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/30"
                    : "bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow"
                )}
              >
                {preset === "today" ? "Today" : preset === "week" ? "This Week" : preset === "month" ? "This Month" : "Last 30 Days"}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        {datePreset === "custom" && (
          <form onSubmit={handleCustomDateApply} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Start date</span>
              <input
                type="date"
                value={filters.start_date}
                max={filters.end_date}
                onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">End date</span>
              <input
                type="date"
                value={filters.end_date}
                min={filters.start_date}
                onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Granularity</span>
              <select
                value={filters.granularity}
                onChange={(e) => setFilters((f) => ({ ...f, granularity: e.target.value as AnalyticsFilters["granularity"] }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                disabled={loading}
              >
                {loading ? "Loading..." : "Apply"}
              </button>
            </div>
          </form>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Revenue Collected"
          value={currency(summary.revenueCollected)}
          trend={trends?.revenue}
          icon={DollarSign}
          gradient="from-emerald-500 to-teal-500"
          bgGradient="from-emerald-50 to-teal-50"
          loading={loading}
          hint={`${summary.collectionRate.toFixed(1)}% collection rate`}
          chartData={chartData.revenue}
          periods={data.revenue?.data.map(d => d.period_start) || []}
          onChartClick={(data, chartType, color, formatValue) => {
            setChartModalData({ title: "Revenue Collected - Detailed View", data, chartType, color, formatValue });
            setShowChartModal(true);
          }}
        />
        <KPICard
          label="Bed Occupancy"
          value={`${summary.avgOccupancy.toFixed(1)}%`}
          trend={trends?.occupancy}
          icon={BedDouble}
          gradient="from-sky-500 to-blue-500"
          bgGradient="from-sky-50 to-blue-50"
          loading={loading}
          hint={`${summary.occupiedBeds.toFixed(0)} of ${summary.totalBeds} beds occupied`}
          chartData={chartData.occupancy}
          periods={data.bedOccupancy?.data.map(d => d.period_start) || []}
          onChartClick={(data, chartType, color, formatValue) => {
            setChartModalData({ title: "Bed Occupancy - Detailed View", data, chartType, color, formatValue: (v) => `${v.toFixed(1)}%` });
            setShowChartModal(true);
          }}
        />
        <KPICard
          label="Total Admissions"
          value={summary.totalAdmissions}
          trend={trends?.admissions}
          icon={Activity}
          gradient="from-amber-500 to-orange-500"
          bgGradient="from-amber-50 to-orange-50"
          loading={loading}
          hint={`${summary.totalDischarges} discharges • ${summary.readmissions} readmissions`}
          chartData={chartData.admissions}
          periods={data.patientFlow?.data.map(d => d.period_start) || []}
          onChartClick={(data, chartType, color) => {
            setChartModalData({ title: "Total Admissions - Detailed View", data, chartType, color });
            setShowChartModal(true);
          }}
        />
        <KPICard
          label="Efficiency Score"
          value={summary.efficiencyScore.toFixed(1)}
          trend={null}
          icon={Target}
          gradient="from-fuchsia-500 to-pink-500"
          bgGradient="from-fuchsia-50 to-pink-50"
          loading={loading}
          hint="Composite performance index"
          chartData={null}
        />
      </div>

      {/* Revenue Insights */}
      <div className="grid gap-3 lg:grid-cols-2">
        <RevenueInsightCard
          title="Total Revenue"
          collected={summary.revenueCollected}
          invoiced={summary.revenueInvoiced}
          outstanding={summary.revenueOutstanding}
          collectionRate={summary.collectionRate}
          avgDaily={summary.avgDailyRevenue}
          loading={loading}
          chartData={chartData.revenue}
          periods={data.revenue?.data.map(d => d.period_start) || []}
          onChartClick={(data, chartType, color, formatValue) => {
            setChartModalData({ title: "Total Revenue - Detailed View", data, chartType, color, formatValue });
            setShowChartModal(true);
          }}
        />
        <RevenueInsightCard
          title="Diagnostics Revenue"
          collected={summary.diagnosticsRevenue}
          invoiced={summary.diagnosticsRevenue}
          outstanding={0}
          collectionRate={100}
          avgDaily={summary.diagnosticsRevenue / (data.revenue?.data.length || 1)}
          loading={loading}
          chartData={data.diagnosticsUsage?.data.map((p) => p.revenue) || []}
          periods={data.diagnosticsUsage?.data.map(d => d.period_start) || []}
          onChartClick={(data, chartType, color, formatValue) => {
            setChartModalData({ title: "Diagnostics Revenue - Detailed View", data, chartType, color, formatValue });
            setShowChartModal(true);
          }}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <PerformanceCard
          label="Appointment Completion"
          value={`${summary.appointmentCompletionRate.toFixed(1)}%`}
          total={summary.totalAppointments}
          completed={summary.completedAppointments}
          cancelled={summary.cancelledAppointments}
          noShows={summary.noShows}
          noShowRate={summary.noShowRate}
          icon={Calendar}
          color="blue"
          loading={loading}
        />
        <PerformanceCard
          label="Lab Completion"
          value={`${summary.labCompletionRate.toFixed(1)}%`}
          total={summary.totalLabOrders}
          completed={summary.completedLabOrders}
          cancelled={0}
          noShows={0}
          noShowRate={0}
          icon={FlaskConical}
          color="purple"
          loading={loading}
        />
        <PerformanceCard
          label="Readmission Rate"
          value={`${summary.readmissionRate.toFixed(1)}%`}
          total={summary.totalDischarges}
          completed={summary.readmissions}
          cancelled={0}
          noShows={0}
          noShowRate={0}
          icon={Activity}
          color="rose"
          loading={loading}
        />
        <PerformanceCard
          label="Avg Consult Time"
          value={`${summary.avgConsultTime.toFixed(1)} min`}
          total={summary.totalVisits}
          completed={summary.completedVisits}
          cancelled={0}
          noShows={0}
          noShowRate={0}
          icon={Clock}
          color="teal"
          loading={loading}
        />
      </div>

      {/* Detailed Analytics */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Detailed Analytics</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <AnalyticsPanel
            title="Patient Flow"
            subtitle="Admissions, discharges, and length of stay"
            icon={Activity}
            loading={loading}
            rows={
              data.patientFlow?.data.map((p) => ({
                period: p.period_start,
                primary: `${p.admissions} admissions`,
                secondary: `${p.discharges} discharges`,
                chip: p.avg_length_of_stay ? `${p.avg_length_of_stay.toFixed(1)}d ALOS` : undefined,
                extra: p.readmissions > 0 ? `${p.readmissions} readmit` : undefined,
              })) || []
            }
          />

          <AnalyticsPanel
            title="Bed Occupancy"
            subtitle="Bed utilization and capacity"
            icon={BedDouble}
            loading={loading}
            rows={
              data.bedOccupancy?.data.map((p) => ({
                period: p.period_start,
                primary: `${p.occupancy_pct.toFixed(1)}% occupancy`,
                secondary: `${p.avg_occupied_beds.toFixed(1)} of ${p.total_beds} beds`,
              })) || []
            }
          />

          <AnalyticsPanel
            title="Doctor Utilization"
            subtitle="Appointments and consultation efficiency"
            icon={Stethoscope}
            loading={loading}
            rows={
              data.doctorUtilization?.data.map((p) => ({
                period: p.period_start,
                primary: `${p.completed_appointments}/${p.appointments} completed`,
                secondary: `${p.visits} visits • ${p.cancelled_appointments} cancelled`,
                chip: p.avg_consult_minutes ? `${p.avg_consult_minutes.toFixed(1)}m avg` : undefined,
              })) || []
            }
          />

          <AnalyticsPanel
            title="Appointments"
            subtitle="Scheduling and completion rates"
            icon={Calendar}
            loading={loading}
            rows={
              data.appointmentSummary?.data.map((p) => ({
                period: p.period_start,
                primary: `${p.completed}/${p.scheduled} completed`,
                secondary: `${p.confirmed} confirmed • ${p.cancelled} cancelled • ${p.no_show} no-shows`,
              })) || []
            }
          />
        </div>
      </div>

      {/* Detailed Chart Modal */}
      {chartModalData && (
        <DetailedChartModal
          isOpen={showChartModal}
          onClose={() => {
            setShowChartModal(false);
            setChartModalData(null);
          }}
          title={chartModalData.title}
          data={chartModalData.data}
          chartType={chartModalData.chartType}
          color={chartModalData.color}
          formatValue={chartModalData.formatValue}
        />
      )}
    </div>
  );
}

type KPICardProps = {
  label: string;
  value: string | number;
  trend: number | null;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  bgGradient: string;
  loading: boolean;
  hint?: string;
  chartData: number[] | null;
  periods?: string[];
  onChartClick?: (data: { period: string; value: number }[], chartType: "line" | "area" | "bar", color: "emerald" | "sky" | "amber" | "fuchsia" | "purple" | "indigo", formatValue?: (v: number) => string) => void;
};

function KPICard({ label, value, trend, icon: Icon, gradient, bgGradient, loading, hint, chartData, periods, onChartClick }: KPICardProps) {
  const TrendIcon = trend !== null 
    ? (trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus)
    : null;

  const validChartData = chartData?.filter(val => val !== null && val !== undefined && !isNaN(val)) || [];
  const maxValue = validChartData.length > 0 ? Math.max(...validChartData) : 1;
  const minHeight = 4; // Minimum height in pixels for visibility

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${bgGradient} border border-slate-200 p-4 shadow-lg`}>
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/20 blur-3xl"></div>
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
            {loading ? (
              <div className="mt-3 h-10 w-40 animate-pulse rounded bg-slate-200"></div>
            ) : (
              <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
            )}
            {hint && !loading && (
              <p className="mt-2 text-xs text-slate-600">{hint}</p>
            )}
            {trend !== null && TrendIcon && !loading && (
              <div className={clsx(
                "mt-3 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold",
                trend > 0 ? "bg-emerald-100 text-emerald-700" : trend < 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
              )}>
                <TrendIcon className="h-3.5 w-3.5" />
                <span>{Math.abs(trend).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className={`rounded-xl bg-gradient-to-br ${gradient} p-3 text-white shadow-lg`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {validChartData.length > 0 && !loading && maxValue > 0 && (
          <div 
            className="mt-4 cursor-pointer group"
            onClick={() => {
              if (onChartClick && periods && periods.length > 0) {
                // Use full data, not just the last 14
                const fullData = periods.map((period, idx) => ({
                  period: period || '',
                  value: chartData![idx] || 0,
                })).filter(d => d.period); // Filter out empty periods
                const chartType = label.includes('Revenue') ? 'line' : label.includes('Occupancy') ? 'area' : label.includes('Admissions') ? 'bar' : 'line';
                const color = label.includes('Revenue') ? 'emerald' : label.includes('Occupancy') ? 'sky' : label.includes('Admissions') ? 'amber' : 'fuchsia';
                const formatValue = label.includes('Occupancy')
                  ? (v: number) => `${v.toFixed(1)}%`
                  : label.includes('Revenue')
                  ? currency
                  : (v: number) => v.toString();
                onChartClick(fullData, chartType, color, formatValue);
              }
            }}
          >
            {label.includes('Revenue') ? (
              <RevenueLineChart data={chartData!.slice(-14)} maxValue={maxValue} color="emerald" />
            ) : label.includes('Occupancy') ? (
              <OccupancyAreaChart data={chartData!.slice(-14)} maxValue={maxValue} color="sky" />
            ) : label.includes('Admissions') ? (
              <AdmissionsBarChart data={chartData!.slice(-14)} maxValue={maxValue} color="amber" />
            ) : (
              <EfficiencySparkline data={chartData!.slice(-14)} maxValue={maxValue} color="fuchsia" />
            )}
            <div className="mt-2 text-center">
              <p className="text-xs text-slate-400 group-hover:text-sky-600 transition-colors">Click to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type RevenueInsightCardProps = {
  title: string;
  collected: number;
  invoiced: number;
  outstanding: number;
  collectionRate: number;
  avgDaily: number;
  loading: boolean;
  chartData: number[];
  periods?: string[];
  onChartClick?: (data: { period: string; value: number }[], chartType: "line" | "area" | "bar", color: "emerald" | "sky" | "amber" | "fuchsia" | "purple" | "indigo", formatValue?: (v: number) => string) => void;
};

function RevenueInsightCard({ title, collected, invoiced, outstanding, collectionRate, avgDaily, loading, chartData, periods, onChartClick }: RevenueInsightCardProps) {
  const validChartData = chartData.filter(val => val !== null && val !== undefined && !isNaN(val) && val >= 0);
  const maxValue = validChartData.length > 0 ? Math.max(...validChartData) : 1;
  const minHeight = 4; // Minimum height for visibility

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <div className="rounded-lg bg-sky-100 p-2">
          <DollarSign className="h-4 w-4 text-sky-600" />
        </div>
      </div>
      {loading ? (
        <SkeletonRow rows={4} />
      ) : (
        <>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                <span>Collected</span>
                <span className="font-bold text-emerald-600">{currency(collected)}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${Math.min(Math.max(collectionRate, 0), 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">{collectionRate.toFixed(1)}% collection rate</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Invoiced</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{currency(invoiced)}</p>
              </div>
              {outstanding > 0 ? (
                <div>
                  <p className="text-xs text-slate-500">Outstanding</p>
                  <p className="mt-1 text-sm font-bold text-amber-600">{currency(outstanding)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-500">Avg Daily</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">{currency(avgDaily)}</p>
                </div>
              )}
            </div>
          </div>
          {validChartData.length > 0 && maxValue > 0 && (
            <div 
              className="mt-4 cursor-pointer group"
              onClick={() => {
                if (onChartClick && periods && periods.length > 0) {
                  // Use full data, not just the last 14
                  const fullData = periods.map((period, idx) => ({
                    period: period || '',
                    value: chartData[idx] || 0,
                  })).filter(d => d.period); // Filter out empty periods
                  const chartType = title.includes('Diagnostics') ? 'area' : 'line';
                  const color = title.includes('Diagnostics') ? 'indigo' : 'sky';
                  onChartClick(fullData, chartType, color, currency);
                }
              }}
            >
              {title.includes('Diagnostics') ? (
                <OccupancyAreaChart data={chartData.slice(-14)} maxValue={maxValue} color="indigo" />
              ) : (
                <RevenueLineChart data={chartData.slice(-14)} maxValue={maxValue} color="sky" />
              )}
              <div className="mt-2 text-center">
                <p className="text-xs text-slate-400 group-hover:text-sky-600 transition-colors">Click to view details</p>
              </div>
            </div>
          )}
          {validChartData.length === 0 && !loading && (
            <div className="mt-4 text-center py-4 text-xs text-slate-400">
              No chart data available
            </div>
          )}
        </>
      )}
    </div>
  );
}

type PerformanceCardProps = {
  label: string;
  value: string;
  total: number;
  completed: number;
  cancelled: number;
  noShows: number;
  noShowRate: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "purple" | "rose" | "teal";
  loading: boolean;
};

function PerformanceCard({ label, value, total, completed, cancelled, noShows, noShowRate, icon: Icon, color, loading }: PerformanceCardProps) {
  const colorClasses = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", bar: "bg-blue-500", barGradient: "from-blue-500 to-blue-400" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", bar: "bg-purple-500", barGradient: "from-purple-500 to-purple-400" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", bar: "bg-rose-500", barGradient: "from-rose-500 to-rose-400" },
    teal: { bg: "bg-teal-50", text: "text-teal-600", bar: "bg-teal-500", barGradient: "from-teal-500 to-teal-400" },
  };

  const rate = total > 0 ? Math.min((completed / total) * 100, 100) : 0;
  const classes = colorClasses[color];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 truncate">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-24 animate-pulse rounded bg-slate-200"></div>
          ) : (
            <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${classes.bg} shrink-0`}>
          <Icon className={`h-5 w-5 ${classes.text}`} />
        </div>
      </div>
      {!loading && total > 0 && (
        <>
          <div className="mb-2">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full bg-gradient-to-r ${classes.barGradient} transition-all shadow-sm`}
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">{completed.toLocaleString()} of {total.toLocaleString()}</span>
            {noShows > 0 && (
              <span className="text-amber-600 font-semibold">{noShows} no-shows</span>
            )}
            {cancelled > 0 && noShows === 0 && (
              <span className="text-slate-400">{cancelled} cancelled</span>
            )}
          </div>
        </>
      )}
      {!loading && total === 0 && (
        <p className="text-xs text-slate-400 mt-2">No data available</p>
      )}
    </div>
  );
}

type PanelRow = {
  period: string;
  primary: string;
  secondary?: string;
  chip?: string;
  extra?: string;
};

type AnalyticsPanelProps = {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: PanelRow[];
  loading: boolean;
};

// Chart Components
type ChartProps = {
  data: number[];
  maxValue: number;
  color: "emerald" | "sky" | "amber" | "fuchsia" | "purple" | "indigo";
};

function RevenueLineChart({ data, maxValue, color }: ChartProps) {
  const width = 100;
  const height = 56;
  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - (val / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const colorClasses = {
    emerald: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.1)" },
    sky: { stroke: "#0ea5e9", fill: "rgba(14, 165, 233, 0.1)" },
    amber: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.1)" },
    fuchsia: { stroke: "#d946ef", fill: "rgba(217, 70, 239, 0.1)" },
    purple: { stroke: "#a855f7", fill: "rgba(168, 85, 247, 0.1)" },
    indigo: { stroke: "#6366f1", fill: "rgba(99, 102, 241, 0.1)" },
  };

  const colors = colorClasses[color];

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id={`lineGradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <polygon
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
          fill={`url(#lineGradient-${color})`}
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {data.map((val, idx) => {
          const x = padding + (idx / (data.length - 1 || 1)) * chartWidth;
          const y = padding + chartHeight - (val / maxValue) * chartHeight;
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="2.5"
              fill={colors.stroke}
              className="hover:r-3 transition-all"
            />
          );
        })}
      </svg>
    </div>
  );
}

function OccupancyAreaChart({ data, maxValue, color }: ChartProps) {
  const width = 100;
  const height = 56;
  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - (val / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const colorClasses = {
    emerald: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.2)" },
    sky: { stroke: "#0ea5e9", fill: "rgba(14, 165, 233, 0.2)" },
    amber: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.2)" },
    fuchsia: { stroke: "#d946ef", fill: "rgba(217, 70, 239, 0.2)" },
    purple: { stroke: "#a855f7", fill: "rgba(168, 85, 247, 0.2)" },
    indigo: { stroke: "#6366f1", fill: "rgba(99, 102, 241, 0.2)" },
  };

  const colors = colorClasses[color];

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Area fill */}
        <polygon
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="1.5"
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function AdmissionsBarChart({ data, maxValue, color }: ChartProps) {
  const colorClasses = {
    emerald: "from-emerald-600 to-emerald-500",
    sky: "from-sky-600 to-sky-500",
    amber: "from-amber-600 to-amber-500",
    fuchsia: "from-fuchsia-600 to-fuchsia-500",
    purple: "from-purple-600 to-purple-500",
    indigo: "from-indigo-600 to-indigo-500",
  };

  return (
    <div className="w-full flex items-end gap-0.5 h-14">
      {data.map((val, idx) => {
        const normalizedVal = val || 0;
        const percentage = maxValue > 0 ? (normalizedVal / maxValue) * 100 : 0;
        const barHeight = Math.max((percentage / 100) * 56, 4);
        return (
          <div
            key={idx}
            className={`flex-1 rounded-t bg-gradient-to-t ${colorClasses[color]} transition-all hover:opacity-90 hover:shadow-md border border-white/20`}
            style={{ height: `${barHeight}px` }}
            title={normalizedVal.toString()}
          />
        );
      })}
    </div>
  );
}

function EfficiencySparkline({ data, maxValue, color }: ChartProps) {
  const width = 100;
  const height = 32;
  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - (val / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const colorClasses = {
    emerald: "#10b981",
    sky: "#0ea5e9",
    amber: "#f59e0b",
    fuchsia: "#d946ef",
    purple: "#a855f7",
    indigo: "#6366f1",
  };

  const strokeColor = colorClasses[color];

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function AnalyticsPanel({ title, subtitle, icon: Icon, rows, loading }: AnalyticsPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {loading ? (
        <SkeletonRow rows={5} />
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">No data for the selected range.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {rows.slice(-15).reverse().map((row, idx) => (
            <div
              key={`${title}-${row.period}-${idx}`}
              className="rounded-lg border border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 transition hover:border-sky-200 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{row.primary}</p>
                <span className="text-xs font-medium text-slate-500">{formatDate(row.period)}</span>
              </div>
              {row.secondary && (
                <p className="mt-1.5 text-xs text-slate-600">{row.secondary}</p>
              )}
              {row.extra && (
                <p className="mt-1 text-xs text-slate-400">{row.extra}</p>
              )}
              {row.chip && (
                <span className="mt-2 inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                  {row.chip}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
