import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  admissionsApi,
  Admission,
  CreateAdmissionRequest,
  UpdateAdmissionRequest,
  DischargeRequest,
  TransferBedRequest,
  InitiateDischargeRequest,
  AdmissionsSearchParams
} from '@/services/admissionsApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';

/**
 * Query Keys Factory for Admissions
 */
export const admissionKeys = {
  all: ['admissions'] as const,
  lists: () => [...admissionKeys.all, 'list'] as const,
  list: (params: AdmissionsSearchParams) => [...admissionKeys.lists(), params] as const,
  details: () => [...admissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...admissionKeys.details(), id] as const,
  amountDue: (id: string) => [...admissionKeys.detail(id), 'amount-due'] as const,
};

/**
 * Fetch all admissions with optional filters
 */
export function useAdmissions(params?: AdmissionsSearchParams) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: admissionKeys.list(params || {}),
    queryFn: async () => {
      return await admissionsApi.list({
        ...params,
        tenant_id: isPlatformOwner ? ((params?.tenant_id || tenantId) ?? undefined) : undefined,
      });
    },
  });
}

/**
 * Fetch single admission by ID
 */
export function useAdmission(admissionId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: admissionKeys.detail(admissionId!),
    queryFn: async () => {
      return await admissionsApi.getById(
        admissionId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!admissionId,
  });
}

/**
 * Fetch amount due for an admission
 */
export function useAmountDue(admissionId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: admissionKeys.amountDue(admissionId!),
    queryFn: async () => {
      return await admissionsApi.getAmountDue(
        admissionId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!admissionId,
  });
}

/**
 * Create new admission
 */
export function useCreateAdmission() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (data: CreateAdmissionRequest) => {
      return await admissionsApi.create(
        data,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onMutate: async (newAdmission) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: admissionKeys.lists() });

      // Snapshot previous value
      const previousAdmissions = queryClient.getQueriesData({ queryKey: admissionKeys.lists() });

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: admissionKeys.lists() },
        (old: any) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: [{ ...newAdmission, id: 'temp-id' } as Admission, ...old.items],
            total: old.total + 1,
          };
        }
      );

      return { previousAdmissions };
    },
    onError: (err, newAdmission, context) => {
      // Rollback on error
      if (context?.previousAdmissions) {
        context.previousAdmissions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to create admission';
      toast.error(errorMessage);
    },
    onSuccess: () => {
      toast.success('Admission created successfully');
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: admissionKeys.lists() });
    },
  });
}

/**
 * Update existing admission
 */
export function useUpdateAdmission() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      admissionId,
      updates,
    }: {
      admissionId: string;
      updates: UpdateAdmissionRequest;
    }) => {
      return await admissionsApi.update(
        admissionId,
        updates,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onMutate: async ({ admissionId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: admissionKeys.detail(admissionId) });
      await queryClient.cancelQueries({ queryKey: admissionKeys.lists() });

      // Snapshot previous values
      const previousAdmission = queryClient.getQueryData(admissionKeys.detail(admissionId));
      const previousAdmissions = queryClient.getQueriesData({ queryKey: admissionKeys.lists() });

      // Optimistically update detail cache
      queryClient.setQueryData(admissionKeys.detail(admissionId), (old: Admission | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      // Optimistically update list caches
      queryClient.setQueriesData(
        { queryKey: admissionKeys.lists() },
        (old: any) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((admission: Admission) =>
              admission.id === admissionId ? { ...admission, ...updates } : admission
            ),
          };
        }
      );

      return { previousAdmission, previousAdmissions };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousAdmission) {
        queryClient.setQueryData(admissionKeys.detail(variables.admissionId), context.previousAdmission);
      }
      if (context?.previousAdmissions) {
        context.previousAdmissions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to update admission';
      toast.error(errorMessage);
    },
    onSuccess: () => {
      toast.success('Admission updated successfully');
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: admissionKeys.detail(variables.admissionId) });
      queryClient.invalidateQueries({ queryKey: admissionKeys.lists() });
    },
  });
}

/**
 * Discharge an admission
 */
export function useDischargeAdmission() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      admissionId,
      dischargeData,
    }: {
      admissionId: string;
      dischargeData: DischargeRequest;
    }) => {
      return await admissionsApi.discharge(
        admissionId,
        dischargeData,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (data) => {
      toast.success('Patient discharged successfully');
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: admissionKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: admissionKeys.lists() });
    },
    onError: (err) => {
      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to discharge patient';
      toast.error(errorMessage);
    },
  });
}

/**
 * Initiate discharge process
 */
export function useInitiateDischarge() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      admissionId,
      initiateData,
    }: {
      admissionId: string;
      initiateData: InitiateDischargeRequest;
    }) => {
      return await admissionsApi.initiateDischarge(
        admissionId,
        initiateData,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (data) => {
      toast.success('Discharge initiated successfully');
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: admissionKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: admissionKeys.lists() });
    },
    onError: (err) => {
      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to initiate discharge';
      toast.error(errorMessage);
    },
  });
}

/**
 * Transfer patient to different bed
 */
export function useTransferBed() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      admissionId,
      transferData,
    }: {
      admissionId: string;
      transferData: TransferBedRequest;
    }) => {
      return await admissionsApi.transferBed(
        admissionId,
        transferData,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (data) => {
      toast.success('Patient transferred successfully');
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: admissionKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: admissionKeys.lists() });
    },
    onError: (err) => {
      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to transfer patient';
      toast.error(errorMessage);
    },
  });
}
