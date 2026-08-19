import { useQuery } from '@tanstack/react-query';
import { queueApi } from '@/services/queueApi';
import { useTenantContext } from '@/lib/tenant-context';

export const queueKeys = {
  all: ['queue'] as const,
  doctorQueue: (doctorId: string, status?: string) => [...queueKeys.all, 'doctor', doctorId, status] as const,
  combinedQueue: (doctorId: string, date?: string, appointmentsOnly?: boolean) =>
    [...queueKeys.all, 'combined', doctorId, date, appointmentsOnly] as const,
};

// Calculate polling interval with exponential backoff on error (10s -> 20s -> 40s -> max 60s)
const getQueueRefetchInterval = (query: any, baseIntervalMs = 10000, maxIntervalMs = 60000) => {
  if (query.state.error) {
    const failureCount = query.state.failureCount || 1;
    return Math.min(baseIntervalMs * Math.pow(2, Math.min(failureCount, 3)), maxIntervalMs);
  }
  return baseIntervalMs;
};

export function useDoctorQueue(
  doctorId: string,
  options?: {
    status?: string;
  }
) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: queueKeys.doctorQueue(doctorId, options?.status),
    queryFn: async () => {
      return await queueApi.getDoctorQueue(doctorId, {
        status: options?.status,
        tenantId: isPlatformOwner ? tenantId ?? undefined : undefined,
      });
    },
    enabled: !!doctorId,
    refetchInterval: (query) => getQueueRefetchInterval(query),
    refetchIntervalInBackground: false,
  });
}

export function useCombinedQueue(
  doctorId: string,
  options?: {
    queueDate?: string;
    appointmentsOnly?: boolean;
  }
) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: queueKeys.combinedQueue(doctorId, options?.queueDate, options?.appointmentsOnly),
    queryFn: async () => {
      return await queueApi.getCombinedQueue(doctorId, {
        queueDate: options?.queueDate,
        appointmentsOnly: options?.appointmentsOnly,
        tenantId: isPlatformOwner ? tenantId ?? undefined : undefined,
      });
    },
    enabled: !!doctorId,
    refetchInterval: (query) => getQueueRefetchInterval(query),
    refetchIntervalInBackground: false,
  });
}
