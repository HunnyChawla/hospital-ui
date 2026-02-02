import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi, PatientSearchParams, CreatePatientRequest, UpdatePatientRequest } from '@/services/patientsApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';
import { createMutationErrorHandler } from '@/utils/errorHandler';

/**
 * Query Keys Factory for Patients
 * Hierarchical structure ensures proper invalidation
 */
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params: PatientSearchParams) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

/**
 * Fetch patients list with optional search/filter params
 * Automatically includes tenant_id from context for multi-tenant support
 */
export function usePatients(params: PatientSearchParams = {}) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: patientKeys.list({ ...params, tenant_id: tenantId ?? undefined }),
    queryFn: async () => {
      const response = await patientsApi.search({
        ...params,
        tenant_id: isPlatformOwner ? params.tenant_id : undefined,
      });
      return {
        patients: patientsApi.mapToPatients(response.items),
        pagination: {
          total: response.total,
          page: response.page,
          page_size: response.page_size,
          total_pages: response.total_pages,
        },
      };
    },
  });
}

/**
 * Fetch single patient by ID
 * Returns raw API response with all fields (date_of_birth, email, address, etc.)
 */
export function usePatient(patientId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: patientKeys.detail(patientId!),
    queryFn: async () => {
      // Return raw API response to preserve all fields for forms
      const response = await patientsApi.getById(
        patientId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
      return response; // Don't map - return raw API response
    },
    enabled: !!patientId, // Only fetch when patientId is provided
  });
}

/**
 * Create new patient with optimistic updates
 */
export function useCreatePatient() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (data: CreatePatientRequest) => {
      return await patientsApi.create(
        data,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onMutate: async (newPatient) => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: patientKeys.lists() });

      // Snapshot the previous value
      const previousPatients = queryClient.getQueryData(patientKeys.lists());

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: patientKeys.lists() }, (old: any) => {
        if (!old || !old.patients) return old;

        return {
          ...old,
          patients: [newPatient, ...(old.patients || [])],
          pagination: {
            ...old.pagination,
            total: old.pagination.total + 1,
          },
        };
      });

      // Return context object with snapshot
      return { previousPatients };
    },
    onError: (err, newPatient, context) => {
      // If the mutation fails, use the context returned from onMutate to rollback
      if (context?.previousPatients) {
        queryClient.setQueryData(patientKeys.lists(), context.previousPatients);
      }

      // Show error toast
      createMutationErrorHandler('Failed to create patient')(err);
    },
    onSuccess: (data) => {
      // Show success toast
      toast.success('Patient created successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server and cache are in sync
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

/**
 * Update existing patient with optimistic updates
 */
export function useUpdatePatient() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      patientId,
      updates,
    }: {
      patientId: string;
      updates: UpdatePatientRequest;
    }) => {
      return await patientsApi.update(
        patientId,
        updates,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onMutate: async ({ patientId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: patientKeys.detail(patientId) });
      await queryClient.cancelQueries({ queryKey: patientKeys.lists() });

      // Snapshot previous values
      const previousPatient = queryClient.getQueryData(patientKeys.detail(patientId));
      const previousPatients = queryClient.getQueryData(patientKeys.lists());

      // Optimistically update detail cache
      queryClient.setQueryData(patientKeys.detail(patientId), (old: any) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      // Optimistically update list cache
      queryClient.setQueriesData({ queryKey: patientKeys.lists() }, (old: any) => {
        if (!old || !old.patients) return old;

        return {
          ...old,
          patients: old.patients.map((item: any) =>
            item.id === patientId ? { ...item, ...updates } : item
          ),
        };
      });

      return { previousPatient, previousPatients };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPatient) {
        queryClient.setQueryData(patientKeys.detail(variables.patientId), context.previousPatient);
      }
      if (context?.previousPatients) {
        queryClient.setQueryData(patientKeys.lists(), context.previousPatients);
      }

      // Show error toast
      createMutationErrorHandler('Failed to update patient')(err);
    },
    onSuccess: () => {
      toast.success('Patient updated successfully');
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(variables.patientId) });
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

/**
 * Global search patients across all fields
 */
export function useSearchPatients(searchTerm: string) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: [...patientKeys.lists(), 'global-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return { patients: [], pagination: { total: 0, page: 1, page_size: 20, total_pages: 0 } };
      }

      const response = await patientsApi.searchGlobal({
        q: searchTerm,
        tenant_id: isPlatformOwner ? tenantId ?? undefined : undefined,
      });

      return {
        patients: patientsApi.mapToPatients(response.items),
        pagination: {
          total: response.total,
          page: response.page,
          page_size: response.page_size,
          total_pages: response.total_pages,
        },
      };
    },
    enabled: searchTerm.trim().length > 0, // Only search when there's a search term
  });
}
