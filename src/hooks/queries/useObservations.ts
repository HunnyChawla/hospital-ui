import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    observationsApi,
    type CreateObservationDefinitionRequest,
    type StageObservationEntry,
    type UpdateObservationDefinitionRequest,
} from '@/services/observationsApi';
import { useTenantContext } from '@/lib/tenant-context';
import { createMutationErrorHandler } from '@/utils/errorHandler';
import { pathwayKeys } from './usePathways';

export const observationKeys = {
    all: ['observations'] as const,
    definitions: (includeInactive: boolean) =>
        [...observationKeys.all, 'definitions', includeInactive] as const,
    forStage: (stageId: string) => [...observationKeys.all, 'stage', stageId] as const,
    forVisit: (visitId: string) => [...observationKeys.all, 'visit', visitId] as const,
};

export function useObservationDefinitions(options?: { includeInactive?: boolean }) {
    const { tenantId, isPlatformOwner } = useTenantContext();
    const includeInactive = options?.includeInactive ?? false;

    return useQuery({
        queryKey: observationKeys.definitions(includeInactive),
        queryFn: () =>
            observationsApi.listDefinitions(
                includeInactive,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        // Configuration. Every capture form is built from it, so it is read
        // constantly and changes a few times a year.
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreateObservationDefinition() {
    const queryClient = useQueryClient();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: (data: CreateObservationDefinitionRequest) =>
            observationsApi.createDefinition(
                data,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        onSuccess: (definition) => {
            queryClient.invalidateQueries({ queryKey: observationKeys.all });
            toast.success(`"${definition.label}" added`);
        },
        onError: createMutationErrorHandler('Could not add the observation'),
    });
}

export function useUpdateObservationDefinition() {
    const queryClient = useQueryClient();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateObservationDefinitionRequest }) =>
            observationsApi.updateDefinition(
                id,
                data,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: observationKeys.all }),
        onError: createMutationErrorHandler('Could not update the observation'),
    });
}

export function useStageObservations(stageId: string | null) {
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useQuery({
        queryKey: observationKeys.forStage(stageId ?? ''),
        queryFn: () =>
            observationsApi.getForStage(
                stageId as string,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        enabled: !!stageId,
    });
}

export function useSetStageObservations() {
    const queryClient = useQueryClient();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: ({
            stageId,
            observations,
        }: {
            stageId: string;
            observations: StageObservationEntry[];
        }) =>
            observationsApi.setForStage(
                stageId,
                observations,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: observationKeys.forStage(variables.stageId),
            });
            toast.success('Saved');
        },
        onError: createMutationErrorHandler('Could not save what this stage asks for'),
    });
}

export function useVisitObservations(visitId: string | null) {
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useQuery({
        queryKey: observationKeys.forVisit(visitId ?? ''),
        queryFn: () =>
            observationsApi.getForVisit(
                visitId as string,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        enabled: !!visitId,
    });
}

export function useRecordObservations() {
    const queryClient = useQueryClient();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: ({
            visitId,
            values,
            stageCode,
        }: {
            visitId: string;
            values: Record<string, unknown>;
            stageCode?: string;
        }) =>
            observationsApi.recordForVisit(
                visitId,
                values,
                stageCode,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: observationKeys.forVisit(variables.visitId),
            });
            // Recording a core vital writes through to vital_signs, so the
            // doctor panel's chart is now stale too.
            queryClient.invalidateQueries({ queryKey: ['vitalSigns'] });
            // A required observation may have just unblocked the patient's move.
            queryClient.invalidateQueries({ queryKey: pathwayKeys.all });
        },
        onError: createMutationErrorHandler('Could not save the observations'),
    });
}
