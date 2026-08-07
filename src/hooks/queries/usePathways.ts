import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    pathwaysApi,
    type CreatePathwayRequest,
    type CreateStageRequest,
    type Pathway,
    type PathwayStage,
    type QueueParams,
    type UpdatePathwayRequest,
    type UpdateStageRequest,
} from '@/services/pathwaysApi';
import { useTenantContext } from '@/lib/tenant-context';
import { createMutationErrorHandler } from '@/utils/errorHandler';
// Imported rather than written as string literals: the eye queue's key is
// 'opd-visits', not 'opdVisits', and an invalidation that misses is silent.
import { queueKeys } from './useQueue';
import { opdVisitKeys } from './useOpdVisits';

export const pathwayKeys = {
    all: ['pathways'] as const,
    list: () => [...pathwayKeys.all, 'list'] as const,
    queue: (params: QueueParams) => [...pathwayKeys.all, 'queue', params] as const,
    queueSummary: (pathwayCode: string) =>
        [...pathwayKeys.all, 'queue-summary', pathwayCode] as const,
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export function usePathways() {
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useQuery({
        queryKey: pathwayKeys.list(),
        queryFn: () => pathwaysApi.list(isPlatformOwner ? tenantId ?? undefined : undefined),
        // Configuration, not live data. Screens read stage labels and colours
        // from here on every render, so caching it properly matters.
        staleTime: 5 * 60 * 1000,
    });
}

export function usePathway(pathwayId: string | null) {
    const { data, ...rest } = usePathways();
    const pathway = useMemo(
        () => data?.find((p) => p.id === pathwayId) ?? null,
        [data, pathwayId]
    );
    // Served from the list rather than its own request: there are a handful of
    // pathways per tenant, and one cache entry avoids the two views disagreeing
    // about stage order mid-drag.
    return { data: pathway, ...rest };
}

/**
 * Look up a stage's presentation by code, across every pathway.
 *
 * This is what replaces the hard-coded status→label and status→colour maps
 * scattered through the queue and panel screens. Falls back to the raw code so
 * an unrecognised status renders as itself rather than as blank.
 */
export function useStageLookup() {
    const { data } = usePathways();

    return useMemo(() => {
        const byCode = new Map<string, PathwayStage>();
        for (const pathway of data ?? []) {
            for (const stage of pathway.stages) {
                // First writer wins. Two pathways can share a code (a copy of
                // the eye flow keeps `awaiting_doctor`), and their labels are
                // the same by construction, so the collision is not meaningful.
                if (!byCode.has(stage.code)) byCode.set(stage.code, stage);
            }
        }
        return {
            stage: (code: string) => byCode.get(code) ?? null,
            label: (code: string) => byCode.get(code)?.label ?? code,
            colour: (code: string) => byCode.get(code)?.colour ?? null,
        };
    }, [data]);
}

export function usePathwayQueue(params: QueueParams, options?: { enabled?: boolean }) {
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useQuery({
        queryKey: pathwayKeys.queue(params),
        queryFn: () =>
            pathwaysApi.getQueue(params, isPlatformOwner ? tenantId ?? undefined : undefined),
        enabled: options?.enabled ?? true,
        refetchInterval: 10000,
        refetchIntervalInBackground: true,
    });
}

export function usePathwayQueueSummary(pathwayCode: string | null) {
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useQuery({
        queryKey: pathwayKeys.queueSummary(pathwayCode ?? ''),
        queryFn: () =>
            pathwaysApi.getQueueSummary(
                pathwayCode as string,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        enabled: !!pathwayCode,
        refetchInterval: 10000,
    });
}

// ---------------------------------------------------------------------------
// Authoring
//
// Every stage mutation returns the whole pathway, so each handler writes that
// straight into the list cache. The builder therefore re-renders from what the
// server actually stored — which is what keeps display_order honest after a
// drag, instead of trusting the order the browser thought it sent.
// ---------------------------------------------------------------------------

function usePathwayCacheWriter() {
    const queryClient = useQueryClient();

    return (pathway: Pathway) => {
        queryClient.setQueryData<Pathway[]>(pathwayKeys.list(), (existing) => {
            if (!existing) return existing;
            const index = existing.findIndex((p) => p.id === pathway.id);
            if (index === -1) return [...existing, pathway];
            const next = [...existing];
            next[index] = pathway;
            return next;
        });
    };
}

export function useCreatePathway() {
    const queryClient = useQueryClient();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: (data: CreatePathwayRequest) =>
            pathwaysApi.create(data, isPlatformOwner ? tenantId ?? undefined : undefined),
        onSuccess: (pathway) => {
            queryClient.invalidateQueries({ queryKey: pathwayKeys.all });
            toast.success(
                `"${pathway.name}" created. It stays inactive until it has a start and an end.`
            );
        },
        onError: createMutationErrorHandler('Could not create the pathway'),
    });
}

export function useUpdatePathway() {
    const queryClient = useQueryClient();
    const writeToCache = usePathwayCacheWriter();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePathwayRequest }) =>
            pathwaysApi.update(id, data, isPlatformOwner ? tenantId ?? undefined : undefined),
        onSuccess: (pathway) => {
            writeToCache(pathway);
            // Making one pathway the default clears the flag on another, and
            // activating one changes what departments may attach to.
            queryClient.invalidateQueries({ queryKey: pathwayKeys.all });
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
        onError: createMutationErrorHandler('Could not update the pathway'),
    });
}

export function useDeletePathway() {
    const queryClient = useQueryClient();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: (pathwayId: string) =>
            pathwaysApi.remove(pathwayId, isPlatformOwner ? tenantId ?? undefined : undefined),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: pathwayKeys.all });
            toast.success('Pathway deleted');
        },
        onError: createMutationErrorHandler('Could not delete the pathway'),
    });
}

export function useAddStage() {
    const writeToCache = usePathwayCacheWriter();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: ({ pathwayId, data }: { pathwayId: string; data: CreateStageRequest }) =>
            pathwaysApi.addStage(
                pathwayId,
                data,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        onSuccess: writeToCache,
        onError: createMutationErrorHandler('Could not add the stage'),
    });
}

export function useUpdateStage() {
    const writeToCache = usePathwayCacheWriter();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: ({
            pathwayId,
            stageCode,
            data,
        }: {
            pathwayId: string;
            stageCode: string;
            data: UpdateStageRequest;
        }) =>
            pathwaysApi.updateStage(
                pathwayId,
                stageCode,
                data,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        onSuccess: writeToCache,
        onError: createMutationErrorHandler('Could not update the stage'),
    });
}

export function useDeleteStage() {
    const writeToCache = usePathwayCacheWriter();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: ({ pathwayId, stageCode }: { pathwayId: string; stageCode: string }) =>
            pathwaysApi.removeStage(
                pathwayId,
                stageCode,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        onSuccess: writeToCache,
        // The refusals here are the informative kind — "3 visits are recorded at
        // this stage" — so the message is what the admin needs to read.
        onError: createMutationErrorHandler('Could not remove the stage'),
    });
}

export function useReorderStages() {
    const queryClient = useQueryClient();
    const writeToCache = usePathwayCacheWriter();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: ({ pathwayId, stageCodes }: { pathwayId: string; stageCodes: string[] }) =>
            pathwaysApi.reorderStages(
                pathwayId,
                stageCodes,
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        onSuccess: writeToCache,
        onError: (error) => {
            createMutationErrorHandler('Could not save the new order')(error);
            // A rejected reorder means the browser's list no longer matches the
            // server's — usually someone else added a stage. Refetch so the drag
            // does not leave the screen showing an order that was never saved.
            queryClient.invalidateQueries({ queryKey: pathwayKeys.all });
        },
    });
}

export function useAdvanceVisit() {
    const queryClient = useQueryClient();
    const { tenantId, isPlatformOwner } = useTenantContext();

    return useMutation({
        mutationFn: ({
            visitId,
            toStageCode,
            performerRole,
        }: {
            visitId: string;
            toStageCode: string;
            performerRole?: string;
        }) =>
            pathwaysApi.advanceVisit(
                visitId,
                toStageCode,
                performerRole ?? 'staff',
                isPlatformOwner ? tenantId ?? undefined : undefined
            ),
        onSuccess: () => {
            // Every queue view is now wrong, including the eye ones still on
            // their own endpoints — the same visit appears in both.
            queryClient.invalidateQueries({ queryKey: pathwayKeys.all });
            queryClient.invalidateQueries({ queryKey: queueKeys.all });
            queryClient.invalidateQueries({ queryKey: opdVisitKeys.all });
        },
        onError: createMutationErrorHandler('Could not move the patient'),
    });
}
