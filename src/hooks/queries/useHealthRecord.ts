"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    episodesApi,
    healthDocumentsApi,
    immunisationsApi,
    type Episode,
    type EpisodeType,
    type HiType,
    type RecordImmunisationRequest,
    type ReopenEpisodeRequest,
} from "@/services/healthRecordApi";
import { useTenantContext } from "@/lib/tenant-context";
import { getErrorMessage } from "@/utils/errorHandler";

export const healthRecordKeys = {
    all: ["health-record"] as const,
    timeline: (patientId: string) => ["health-record", "timeline", patientId] as const,
    episode: (episodeId: string) => ["health-record", "episode", episodeId] as const,
    bySource: (episodeType: string, sourceId: string) =>
        ["health-record", "by-source", episodeType, sourceId] as const,
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

/**
 * The episode for one visit / admission / day-care visit / surgery.
 *
 * What the "Finalise visit" control on each of those screens asks. Those
 * screens know their own id and nothing about episodes, which is the point.
 */
export function useEpisodeForSource(episodeType: EpisodeType, sourceId: string | null) {
    const tenant = useTenant();
    return useQuery({
        queryKey: healthRecordKeys.bySource(episodeType, sourceId ?? ""),
        queryFn: () => episodesApi.forSource(episodeType, sourceId!, tenant),
        enabled: !!sourceId,
    });
}

/**
 * Whether this record's documents are frozen, and why.
 *
 * The server refuses these edits too — see
 * `hms/health_record/service/edit_gate.py`. This exists so a doctor learns
 * before typing rather than after saving, not as the enforcement: a disabled
 * button the API would have accepted anyway is theatre.
 *
 * `reopened` deliberately does NOT lock. That state exists precisely so a
 * hospital can make changes; locking it would make reopening pointless.
 */
export function useEpisodeLock(episodeType: EpisodeType, sourceId: string | null) {
    const { data: episode, isLoading } = useEpisodeForSource(episodeType, sourceId);
    const locked = episode?.status === "finalised";

    return {
        locked,
        episode: episode ?? null,
        isLoading,
        reason: locked
            ? "This visit has been finalised and its records are frozen. Reopen it to make changes."
            : null,
    };
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
        mutationFn: ({ episodeId, ...body }: { episodeId: string } & ReopenEpisodeRequest) =>
            episodesApi.reopen(episodeId, body, tenant),
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

/**
 * Trigger or retry ABDM care-context linking for one episode.
 *
 * Visible as a "Link to ABDM" / "Retry" button on the care-context panel when
 * `abdm_link_status` is `failed` or `unlinked`. The server marks the episode
 * `pending` immediately so the UI reflects progress while Phase 5 runs the
 * actual Demographic Auth in the background.
 */
export function useManualLinkCareContext() {
    const queryClient = useQueryClient();
    const tenant = useTenant();

    return useMutation<Episode, Error, string>({
        mutationFn: (episodeId: string) => episodesApi.linkAbdm(episodeId, tenant),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: healthRecordKeys.all });
            toast.success("ABDM linking initiated — the care context will appear in the patient's ABHA app shortly");
        },
        onError: (error) =>
            toast.error(getErrorMessage(error) || "Could not initiate ABDM linking for this episode"),
    });
}
