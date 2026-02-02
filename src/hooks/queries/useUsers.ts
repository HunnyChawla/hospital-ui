import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  usersApi,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UsersSearchParams
} from '@/services/usersApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UsersSearchParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export function useUsers(params?: UsersSearchParams) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: userKeys.list(params || {}),
    queryFn: async () => {
      return await usersApi.list({
        ...params,
        tenant_id: isPlatformOwner ? ((params?.tenant_id || tenantId) ?? undefined) : undefined,
      });
    },
  });
}

export function useUser(userId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: userKeys.detail(userId!),
    queryFn: async () => {
      return await usersApi.getById(
        userId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      return await usersApi.create(
        data,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (err) => {
      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to create user';
      toast.error(errorMessage);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: UpdateUserRequest;
    }) => {
      return await usersApi.update(
        userId,
        updates,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (data) => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (err) => {
      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to update user';
      toast.error(errorMessage);
    },
  });
}
