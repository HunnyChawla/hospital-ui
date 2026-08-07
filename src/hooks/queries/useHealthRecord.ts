"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    episodesApi,
    healthDocumentsApi,
    immunisationsApi,
    type HiType,
    type RecordImmunisationRequest,
} from "@/services/healthRecordApi";
import { useTenantContext } from "@/lib/tenant-context";
import { getErrorMessage } from "@/utils/errorHandler";

export const healthRecordKeys = {
    all: ["health-record"] as const,
    timeline: (patientId: string) => ["health-record", "timeline", patientId] as const,
    episode: (episodeId: string) => ["health-record", "episode", episodeId] as const,
    documents: (episodeId: string) => ["health-record", "documents", episodeId] as const,
    history: (docType: HiType, sourceId: string) =>
        ["health-record", "history", docType, sourceId] as const,
    vaccines: ["health-record", "vaccines"] as const,
    immunisations: (patientId: string) =>
        ["health-record", "immunisations", patientId] as const,
};

function useTenant() {
    const { tenantId, isPlatformOwner } = useTenantContext();
    return isPlatformOwner ? tenantId ?? undefined : undefined;
}

export function usePatientTimeline(patientId: string | null) {
    const tenant = useTenant();
    return useQuery({
        queryKey: healthRecordKeys.timeline(patientId ?? ""),
        queryFn: () => episodesApi.timeline(patientId!, { page_size: 100 }, tenant),
        enabled: !!patientId,
    });
}

export function useEpisodeDocuments(episodeId: string | null) {
    const tenant = useTenant();
    return useQuery({
        queryKey: healthRecordKeys.documents(episodeId ?? ""),
        queryFn: () => healthDocumentsApi.forEpisode(episodeId!, tenant),
        enabled: !!episodeId,
    });
}

export function useDocumentHistory(docType: HiType | null, sourceId: string | null) {
    const tenant = useTenant();
    return useQuery({
        queryKey: healthRecordKeys.history(docType ?? "Prescription", sourceId ?? ""),
        queryFn: () => healthDocumentsApi.history(docType!, sourceId!, tenant),
        enabled: !!docType && !!sourceId,
    });
}

export function useFinaliseEpisode() {
    const queryClient = useQueryClient();
    const tenant = useTenant();

    return useMutation({
        mutationFn: async (episodeId: string) => {
            // Documents first, then the episode. The other order would close
            // the episode while its documents were still editable, which is
            // the state finalising exists to prevent.
            await healthDocumentsApi.finaliseEpisode(episodeId, tenant);
            return episodesApi.finalise(episodeId, tenant);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: healthRecordKeys.all });
            toast.success("Visit finalised");
        },
        onError: (error) => toast.error(getErrorMessage(error) || "Could not finalise this visit"),
    });
}

export function useReopenEpisode() {
    const queryClient = useQueryClient();
    const tenant = useTenant();

    return useMutation({
        mutationFn: (episodeId: string) => episodesApi.reopen(episodeId, tenant),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: healthRecordKeys.all });
            toast.success("Visit reopened — new documents will be recorded as a new version");
        },
        onError: (error) => toast.error(getErrorMessage(error) || "Could not reopen this visit"),
    });
}

export function useVaccines() {
    const tenant = useTenant();
    return useQuery({
        queryKey: healthRecordKeys.vaccines,
        queryFn: () => immunisationsApi.vaccines(tenant),
        // The catalogue changes about never; refetching it on every mount is
        // a request per screen for nothing.
        staleTime: 30 * 60 * 1000,
    });
}

export function usePatientImmunisations(patientId: string | null) {
    const tenant = useTenant();
    return useQuery({
        queryKey: healthRecordKeys.immunisations(patientId ?? ""),
        queryFn: () => immunisationsApi.forPatient(patientId!, tenant),
        enabled: !!patientId,
    });
}

export function useRecordImmunisation() {
    const queryClient = useQueryClient();
    const tenant = useTenant();

    return useMutation({
        mutationFn: (request: RecordImmunisationRequest) =>
            immunisationsApi.record(request, tenant),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: healthRecordKeys.all });
            toast.success("Immunisation recorded");
        },
        // The server's messages here are the informative kind — "this vaccine's
        // expiry date is before the date it was given" tells the person exactly
        // what to fix.
        onError: (error) => toast.error(getErrorMessage(error) || "Could not record this dose"),
    });
}

export function useDeleteImmunisation() {
    const queryClient = useQueryClient();
    const tenant = useTenant();

    return useMutation({
        mutationFn: (immunisationId: string) => immunisationsApi.remove(immunisationId, tenant),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: healthRecordKeys.all });
            toast.success("Record removed");
        },
        onError: (error) => toast.error(getErrorMessage(error) || "Could not remove this record"),
    });
}
