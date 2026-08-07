import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    departmentsApi,
    type CreateDepartmentRequest,
    type Department,
    type UpdateDepartmentRequest,
} from '@/services/departmentsApi';
import { useTenantContext } from '@/lib/tenant-context';
import { createMutationErrorHandler } from '@/utils/errorHandler';
import { doctorKeys } from './useDoctors';

export const departmentKeys = {
    all: ['departments'] as const,
    list: (includeInactive: boolean) => [...departmentKeys.all, 'list', includeInactive] as const,
    detail: (id: string) => [...departmentKeys.all, 'detail', id] as const,
};

export function useDepartments(options?: { includeInactive?: boolean }) {
    const { tenantId, isPlatformOwner } = useTenantContext();
    const includeInactive = options?.includeInactive ?? true;

    return useQuery({
        queryKey: departmentKeys.list(includeInactive),
        queryFn: () =>
            departmentsApi.list(
                includeInactive,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        // Departments change a few times a year, not a few times a minute.
        staleTime: 5 * 60 * 1000,
    });
}

export function useDepartment(departmentId: string | null) {
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useQuery({
        queryKey: departmentKeys.detail(departmentId ?? ''),
        queryFn: () =>
            departmentsApi.getById(
                departmentId as string,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        enabled: !!departmentId,
    });
}

export function useCreateDepartment() {
    const queryClient = useQueryClient();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: (data: CreateDepartmentRequest) =>
            departmentsApi.create(data, isPlatformOwner ? tenantId ?? undefined : undefined),
        onSuccess: (department: Department) => {
            queryClient.invalidateQueries({ queryKey: departmentKeys.all });
            toast.success(`Department "${department.name}" created`);
        },
        onError: createMutationErrorHandler('Could not create the department'),
    });
}

export function useUpdateDepartment() {
    const queryClient = useQueryClient();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentRequest }) =>
            departmentsApi.update(id, data, isPlatformOwner ? tenantId ?? undefined : undefined),
        onSuccess: (department: Department) => {
            queryClient.invalidateQueries({ queryKey: departmentKeys.all });
            toast.success(`"${department.name}" updated`);
        },
        // The backend refuses some edits for good reasons — attaching a pathway
        // that is not active yet, for instance — and its message says what to do
        // next. getErrorMessage surfaces that verbatim; the default below is only
        // reached when there is no message at all.
        onError: createMutationErrorHandler('Could not update the department'),
    });
}

export function useAssignDoctorToDepartment() {
    const queryClient = useQueryClient();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: ({ doctorId, departmentId }: { doctorId: string; departmentId: string | null }) =>
            departmentsApi.assignDoctor(
                doctorId,
                departmentId,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        onSuccess: () => {
            // Doctor counts live on the department rows, and the doctor's own
            // record now points elsewhere — both lists are stale.
            queryClient.invalidateQueries({ queryKey: departmentKeys.all });
            queryClient.invalidateQueries({ queryKey: doctorKeys.all });
        },
        onError: createMutationErrorHandler('Could not move the doctor'),
    });
}
