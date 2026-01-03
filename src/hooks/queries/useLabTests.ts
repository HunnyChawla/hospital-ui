import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  labTestsApi,
  LabTest,
  CreateLabTestRequest,
  UpdateLabTestRequest,
  LabTestsSearchParams
} from '@/services/labTestsApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';

/**
 * Query Keys Factory for Lab Tests
 */
export const labTestKeys = {
  all: ['lab-tests'] as const,
  lists: () => [...labTestKeys.all, 'list'] as const,
  list: (params: LabTestsSearchParams) => [...labTestKeys.lists(), params] as const,
  details: () => [...labTestKeys.all, 'detail'] as const,
  detail: (id: string) => [...labTestKeys.details(), id] as const,
};

/**
 * Fetch all lab tests with optional filters
 */
export function useLabTests(params?: LabTestsSearchParams) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: labTestKeys.list(params || {}),
    queryFn: async () => {
      return await labTestsApi.list({
        ...params,
        tenant_id: isPlatformOwner ? ((params?.tenant_id || tenantId) ?? undefined) : undefined,
      });
    },
  });
}

/**
 * Fetch single lab test by ID
 */
export function useLabTest(testId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: labTestKeys.detail(testId!),
    queryFn: async () => {
      return await labTestsApi.getById(
        testId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!testId,
  });
}

/**
 * Create new lab test
 */
export function useCreateLabTest() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (data: CreateLabTestRequest) => {
      return await labTestsApi.create(
        data,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: () => {
      toast.success('Lab test created successfully');
      queryClient.invalidateQueries({ queryKey: labTestKeys.lists() });
    },
    onError: (err) => {
      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to create lab test';
      toast.error(errorMessage);
    },
  });
}

/**
 * Update existing lab test
 */
export function useUpdateLabTest() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      testId,
      updates,
    }: {
      testId: string;
      updates: UpdateLabTestRequest;
    }) => {
      return await labTestsApi.update(
        testId,
        updates,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (data) => {
      toast.success('Lab test updated successfully');
      queryClient.invalidateQueries({ queryKey: labTestKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: labTestKeys.lists() });
    },
    onError: (err) => {
      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to update lab test';
      toast.error(errorMessage);
    },
  });
}
