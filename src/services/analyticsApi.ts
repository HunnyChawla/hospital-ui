import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type Granularity = "daily" | "weekly" | "monthly";

export type AnalyticsMeta = {
  start_date: string;
  end_date: string;
  granularity: Granularity;
  filters: Record<string, unknown>;
};

export type PatientFlowPoint = {
  period_start: string;
  admissions: number;
  discharges: number;
  avg_length_of_stay?: number | null;
  readmissions: number;
};

export type BedOccupancyPoint = {
  period_start: string;
  total_beds: number;
  avg_occupied_beds: number;
  occupancy_pct: number;
};

export type DoctorUtilizationPoint = {
  period_start: string;
  appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_shows: number;
  visits: number;
  avg_consult_minutes?: number | null;
  admissions: number;
};

export type RevenuePoint = {
  period_start: string;
  invoiced_amount: number;
  collected_amount: number;
  outstanding_amount: number;
};

export type AppointmentSummaryPoint = {
  period_start: string;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
};

export type DiagnosticsUsagePoint = {
  period_start: string;
  orders: number;
  completed: number;
  revenue: number;
};

export type EfficiencyScorePoint = {
  period_start: string;
  efficiency_score: number;
  occupancy_pct?: number | null;
  avg_length_of_stay?: number | null;
  revenue_per_day?: number | null;
};

export type AnalyticsFilters = {
  start_date: string;
  end_date: string;
  granularity?: Granularity;
  ward_id?: string;
  doctor_id?: string;
  department_id?: string;
};

type SeriesResponse<T> = {
  meta: AnalyticsMeta;
  data: T[];
};

const withTenantParam = (filters: AnalyticsFilters) => {
  const tenantId =
    typeof window !== "undefined"
      ? getTenantIdForApi(localStorage.getItem("tenant_id") || undefined)
      : undefined;
  return tenantId ? { ...filters, tenant_id: tenantId } : filters;
};

export const analyticsApi = {
  patientFlow: async (filters: AnalyticsFilters): Promise<SeriesResponse<PatientFlowPoint>> => {
    const params = withTenantParam(filters);
    const response = await apiClient.get("/analytics/operations/patient-flow", { params });
    return response.data;
  },
  bedOccupancy: async (filters: AnalyticsFilters): Promise<SeriesResponse<BedOccupancyPoint>> => {
    const params = withTenantParam(filters);
    const response = await apiClient.get("/analytics/operations/bed-occupancy", { params });
    return response.data;
  },
  doctorUtilization: async (
    filters: AnalyticsFilters
  ): Promise<SeriesResponse<DoctorUtilizationPoint>> => {
    const params = withTenantParam(filters);
    const response = await apiClient.get("/analytics/utilization/doctors", { params });
    return response.data;
  },
  revenue: async (filters: AnalyticsFilters): Promise<SeriesResponse<RevenuePoint>> => {
    const params = withTenantParam(filters);
    const response = await apiClient.get("/analytics/finance/revenue", { params });
    return response.data;
  },
  appointmentSummary: async (
    filters: AnalyticsFilters
  ): Promise<SeriesResponse<AppointmentSummaryPoint>> => {
    const params = withTenantParam(filters);
    const response = await apiClient.get("/analytics/appointments/summary", { params });
    return response.data;
  },
  diagnosticsUsage: async (
    filters: AnalyticsFilters
  ): Promise<SeriesResponse<DiagnosticsUsagePoint>> => {
    const params = withTenantParam(filters);
    const response = await apiClient.get("/analytics/diagnostics/usage", { params });
    return response.data;
  },
  efficiencyScore: async (
    filters: AnalyticsFilters
  ): Promise<SeriesResponse<EfficiencyScorePoint>> => {
    const params = withTenantParam(filters);
    const response = await apiClient.get("/analytics/efficiency/score", { params });
    return response.data;
  },
};

