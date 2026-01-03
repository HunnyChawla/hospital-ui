import { useQuery } from '@tanstack/react-query';
import { analyticsApi, Granularity } from '@/services/analyticsApi';
import { useTenantContext } from '@/lib/tenant-context';

export const analyticsKeys = {
  all: ['analytics'] as const,
  patientFlow: (startDate: string, endDate: string, granularity: Granularity) =>
    [...analyticsKeys.all, 'patient-flow', startDate, endDate, granularity] as const,
  bedOccupancy: (startDate: string, endDate: string, granularity: Granularity, wardId?: string) =>
    [...analyticsKeys.all, 'bed-occupancy', startDate, endDate, granularity, wardId] as const,
  doctorUtilization: (doctorId: string, startDate: string, endDate: string, granularity: Granularity) =>
    [...analyticsKeys.all, 'doctor-utilization', doctorId, startDate, endDate, granularity] as const,
  revenue: (startDate: string, endDate: string, granularity: Granularity) =>
    [...analyticsKeys.all, 'revenue', startDate, endDate, granularity] as const,
  appointments: (startDate: string, endDate: string, granularity: Granularity, doctorId?: string) =>
    [...analyticsKeys.all, 'appointments', startDate, endDate, granularity, doctorId] as const,
  diagnostics: (startDate: string, endDate: string, granularity: Granularity) =>
    [...analyticsKeys.all, 'diagnostics', startDate, endDate, granularity] as const,
};

export function usePatientFlowAnalytics(
  startDate: string,
  endDate: string,
  granularity: Granularity = 'daily'
) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: analyticsKeys.patientFlow(startDate, endDate, granularity),
    queryFn: async () => {
      return await analyticsApi.patientFlow({
        start_date: startDate,
        end_date: endDate,
        granularity,
      });
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBedOccupancyAnalytics(
  startDate: string,
  endDate: string,
  granularity: Granularity = 'daily',
  wardId?: string
) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: analyticsKeys.bedOccupancy(startDate, endDate, granularity, wardId),
    queryFn: async () => {
      return await analyticsApi.bedOccupancy({
        start_date: startDate,
        end_date: endDate,
        granularity,
        ward_id: wardId,
      });
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRevenueAnalytics(
  startDate: string,
  endDate: string,
  granularity: Granularity = 'daily'
) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: analyticsKeys.revenue(startDate, endDate, granularity),
    queryFn: async () => {
      return await analyticsApi.revenue({
        start_date: startDate,
        end_date: endDate,
        granularity,
      });
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}
