import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  servicesApi,
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServicesSearchParams
} from '@/services/servicesApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';

export const serviceKeys = {
  all: ['services'] as const,
  lists: () => [...serviceKeys.all, 'list'] as const,
  list: (params: ServicesSearchParams) => [...serviceKeys.lists(), params] as const,
  details: () => [...serviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...serviceKeys.details(), id] as const,
};

export function useServices(params?: ServicesSearchParams) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: serviceKeys.list(params || {}),
    queryFn: async () => {
      return await servicesApi.list({
        ...params,
        tenant_id: isPlatformOwner ? ((params?.tenant_id || tenantId) ?? undefined) : undefined,
      });
    },
  });
}

export function useService(serviceId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: serviceKeys.detail(serviceId!),
    queryFn: async () => {
      return await servicesApi.getById(
        serviceId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!serviceId,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (data: CreateServiceRequest) => {
      return await servicesApi.create(
        data,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: () => {
      toast.success('Service created successfully');
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
    },
    onError: (err) => {
      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to create service';
      toast.error(errorMessage);
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      serviceId,
      updates,
    }: {
      serviceId: string;
      updates: UpdateServiceRequest;
    }) => {
      return await servicesApi.update(
        serviceId,
        updates,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (data) => {
      toast.success('Service updated successfully');
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
    },
    onError: (err) => {
      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to update service';
      toast.error(errorMessage);
    },
  });
}
