import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plannedSurgeriesApi, PlannedSurgeryParams } from '@/services/plannedSurgeriesApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';
import { createMutationErrorHandler } from '@/utils/errorHandler';
import type { StatusTransitionRequest, RescheduleRequest } from '@/types';

/**
 * Query Keys Factory for Planned Surgeries
 */
export const plannedSurgeryKeys = {
  all: ['planned-surgeries'] as const,
  lists: () => [...plannedSurgeryKeys.all, 'list'] as const,
  list: (params: PlannedSurgeryParams) => [...plannedSurgeryKeys.lists(), params] as const,
  details: () => [...plannedSurgeryKeys.all, 'detail'] as const,
  detail: (id: string) => [...plannedSurgeryKeys.details(), id] as const,
  histories: () => [...plannedSurgeryKeys.all, 'history'] as const,
  history: (id: string) => [...plannedSurgeryKeys.histories(), id] as const,
};

/**
 * Fetch all planned surgeries with optional filters
 */
export function usePlannedSurgeries(params?: PlannedSurgeryParams) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: plannedSurgeryKeys.list(params || {}),
    queryFn: async () => {
      return await plannedSurgeriesApi.list(
        params,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
  });
}

/**
 * Fetch single planned surgery by ID
 */
export function usePlannedSurgery(id: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: plannedSurgeryKeys.detail(id!),
    queryFn: async () => {
      return await plannedSurgeriesApi.get(
        id!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!id,
  });
}

/**
 * Fetch status history for a planned surgery
 */
export function usePlannedSurgeryHistory(id: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: plannedSurgeryKeys.history(id!),
    queryFn: async () => {
      return await plannedSurgeriesApi.getHistory(
        id!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!id,
  });
}

/**
 * Transition a planned surgery to a new status
 */
export function useTransitionSurgeryStatus() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: StatusTransitionRequest }) => {
      return await plannedSurgeriesApi.transitionStatus(
        id,
        payload,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (_data, variables) => {
      const statusLabels: Record<string, string> = {
        scheduled: 'scheduled',
        postponed: 'postponed',
        completed: 'marked as completed',
        cancelled: 'cancelled',
        denied: 'marked as denied',
      };
      const label = statusLabels[variables.payload.to_status] || 'updated';
      toast.success(`Surgery ${label} successfully`);
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.histories() });
    },
    onError: createMutationErrorHandler('Failed to update surgery status'),
  });
}

/**
 * Reschedule a planned surgery
 */
export function useRescheduleSurgery() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: RescheduleRequest }) => {
      return await plannedSurgeriesApi.reschedule(
        id,
        payload,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: () => {
      toast.success('Surgery rescheduled successfully');
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.histories() });
    },
    onError: createMutationErrorHandler('Failed to reschedule surgery'),
  });
}

/**
 * Cancel a planned surgery (convenience wrapper)
 */
export function useCancelPlannedSurgery() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (id: string) => {
      return await plannedSurgeriesApi.cancel(
        id,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: () => {
      toast.success('Planned surgery cancelled successfully');
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.histories() });
    },
    onError: createMutationErrorHandler('Failed to cancel planned surgery'),
  });
}
