import { useQuery } from '@tanstack/react-query';
import { queueApi } from '@/services/queueApi';
import { useTenantContext } from '@/lib/tenant-context';

export const queueKeys = {
  all: ['queue'] as const,
  doctorQueue: (doctorId: string, status?: string) => [...queueKeys.all, 'doctor', doctorId, status] as const,
  combinedQueue: (doctorId: string, date?: string, appointmentsOnly?: boolean) =>
    [...queueKeys.all, 'combined', doctorId, date, appointmentsOnly] as const,
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
    refetchInterval: 10000, // Poll every 10s for real-time updates
    refetchIntervalInBackground: true,
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
    refetchInterval: 10000, // Poll every 10s for real-time updates
    refetchIntervalInBackground: true,
  });
}
