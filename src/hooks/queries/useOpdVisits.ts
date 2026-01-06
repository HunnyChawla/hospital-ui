import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opdVisitsApi, Visit, CreateVisitRequest, VisitStatus, OpdVisitsSearchParams } from '@/services/opdVisitsApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';
import { createMutationErrorHandler } from '@/utils/errorHandler';

/**
 * Query Keys Factory for OPD Visits
 */
export const opdVisitKeys = {
  all: ['opd-visits'] as const,
  lists: () => [...opdVisitKeys.all, 'list'] as const,
  list: (params: OpdVisitsSearchParams) => [...opdVisitKeys.lists(), params] as const,
  details: () => [...opdVisitKeys.all, 'detail'] as const,
  detail: (id: string) => [...opdVisitKeys.details(), id] as const,
};

/**
 * Fetch all OPD visits with optional filters
 */
export function useOpdVisits(params?: OpdVisitsSearchParams) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: opdVisitKeys.list(params || {}),
    queryFn: async () => {
      return await opdVisitsApi.list({
        ...params,
        tenant_id: isPlatformOwner ? ((params?.tenant_id || tenantId) ?? undefined) : undefined,
      });
    },
  });
}

/**
 * Fetch single OPD visit by ID
 */
export function useOpdVisit(visitId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: opdVisitKeys.detail(visitId!),
    queryFn: async () => {
      return await opdVisitsApi.getById(
        visitId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!visitId,
  });
}

/**
 * Create new OPD visit
 */
export function useCreateOpdVisit() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (data: CreateVisitRequest) => {
      return await opdVisitsApi.create(
        data,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onError: createMutationErrorHandler('Failed to create visit'),
    onSuccess: (visit) => {
      toast.success(`OPD visit created #${visit.visit_number}`);
      // Invalidate and refetch immediately on success
      queryClient.invalidateQueries({ queryKey: opdVisitKeys.lists() });
    },
  });
}

/**
 * Update OPD visit status
 */
export function useUpdateOpdVisitStatus() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      visitId,
      newStatus,
    }: {
      visitId: string;
      newStatus: VisitStatus;
    }) => {
      return await opdVisitsApi.updateStatus(
        visitId,
        newStatus,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onMutate: async ({ visitId, newStatus }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: opdVisitKeys.detail(visitId) });
      await queryClient.cancelQueries({ queryKey: opdVisitKeys.lists() });

      // Snapshot previous values
      const previousVisit = queryClient.getQueryData(opdVisitKeys.detail(visitId));
      const previousVisits = queryClient.getQueriesData({ queryKey: opdVisitKeys.lists() });

      // Optimistically update detail cache
      queryClient.setQueryData(opdVisitKeys.detail(visitId), (old: Visit | undefined) => {
        if (!old) return old;
        return { ...old, status: newStatus };
      });

      // Optimistically update list caches
      queryClient.setQueriesData(
        { queryKey: opdVisitKeys.lists() },
        (old: any) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((visit: Visit) =>
              visit.id === visitId ? { ...visit, status: newStatus } : visit
            ),
          };
        }
      );

      return { previousVisit, previousVisits };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousVisit) {
        queryClient.setQueryData(opdVisitKeys.detail(variables.visitId), context.previousVisit);
      }
      if (context?.previousVisits) {
        context.previousVisits.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      createMutationErrorHandler('Failed to update visit status')(err);
    },
    onSuccess: () => {
      toast.success('Visit status updated successfully');
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: opdVisitKeys.detail(variables.visitId) });
      queryClient.invalidateQueries({ queryKey: opdVisitKeys.lists() });
    },
  });
}

/**
 * Complete visit and advance queue
 */
export function useCompleteAndAdvance() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (visitId: string) => {
      return await opdVisitsApi.completeAndAdvance(
        visitId,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Visit completed successfully');
      // Invalidate both the current visit and the queue
      queryClient.invalidateQueries({ queryKey: opdVisitKeys.lists() });
      if (data.completed_visit) {
        queryClient.invalidateQueries({ queryKey: opdVisitKeys.detail(data.completed_visit.id) });
      }
      if (data.next_visit_advanced) {
        queryClient.invalidateQueries({ queryKey: opdVisitKeys.detail(data.next_visit_advanced.id) });
      }
    },
    onError: createMutationErrorHandler('Failed to complete visit'),
  });
}
