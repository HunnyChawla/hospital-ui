import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

/**
 * The health record: episodes, document versions and immunisations.
 *
 * Mirrors `hms/health_record`. One file rather than three because the three
 * are read together on every screen that uses any of them — a patient's
 * timeline shows episodes, the documents in each, and their immunisations.
 */

/** One visit, admission, day-care visit or surgery. */
export type EpisodeType =
    | "opd_visit"
    | "ipd_admission"
    | "day_care_visit"
    | "planned_surgery"
    | "lab_booking";

export type EpisodeStatus = "open" | "finalised" | "reopened";

/**
 * Why a finalised episode is being unlocked.
 *
 * Mirrors `ReopenReason` in `hms/health_record/domain/episode.py`. A closed
 * list, because this is the field a dispute reads — "late result" across a
 * hundred episodes is a pattern; a hundred sentences meaning the same thing
 * is not.
 */
export type ReopenReason =
    | "late_result"
    | "correction"
    | "omission"
    | "administrative"
    | "other";

export interface ReopenEpisodeRequest {
    reason: ReopenReason;
    /** Optional detail — except for "other", where the server requires it. */
    note?: string;
}

/** ABDM health-information types. */
export type HiType =
    | "Prescription"
    | "DiagnosticReport"
    | "OPConsultation"
    | "DischargeSummary"
    | "ImmunizationRecord"
    | "HealthDocumentRecord"
    | "WellnessRecord"
    | "Invoice";

/**
 * The state of an episode's care context in the ABDM ecosystem.
 *
 * - unlinked  — default; no ABHA or linking not attempted
 * - pending   — background job queued
 * - linked    — confirmed in patient's ABHA app ✅
 * - sms_sent  — mobile-only patient; ABDM sent a deep-link SMS
 * - failed    — linking failed; show a Retry button ❌
 * - no_abha   — patient has neither ABHA nor verified mobile
 */
export type AbdmLinkStatus =
    | "unlinked"
    | "pending"
    | "linked"
    | "sms_sent"
    | "failed"
    | "no_abha";

export interface Episode {
    id: string;
    tenant_id: string;
    patient_id: string;
    episode_type: EpisodeType;
    /** The visit / admission / day-care visit / surgery this episode is for. */
    source_id: string;
    reference_number: string;
    occurred_at: string;
    status: EpisodeStatus;
    /**
     * Which HI types this episode has content for. Derived server-side from
     * the owning tables, never maintained by hand.
     */
    hi_types: HiType[];
    /**
     * The label ABDM shows the patient. Built from a closed vocabulary — it
     * can never contain a diagnosis, test name or drug name.
     */
    care_context_display: string;
    finalised_at: string | null;
    finalised_by: string | null;
    reopened_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    /** ABDM care-context linking state. Defaults to 'unlinked'. */
    abdm_link_status: AbdmLinkStatus;
    /** When the care context was successfully linked or last notified. */
    abdm_linked_at: string | null;
    /** Last error message when abdm_link_status is 'failed'. */
    abdm_link_error: string | null;
}

export interface EpisodeTimeline {
    items: Episode[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface DocumentVersion {
    id: string;
    episode_id: string | null;
    doc_type: HiType;
    source_id: string;
    version: number;
    /** sha256 of the canonical content, not of the PDF. */
    content_hash: string;
    rendered_path: string | null;
    rendered_at: string | null;
    finalised_at: string;
    finalised_by: string | null;
    superseded_at: string | null;
    is_current: boolean;
}

export interface Vaccine {
    id: string;
    name: string;
    code: string | null;
    /** When this is typically given. A hint for whoever is entering it, not a rule. */
    schedule_hint: string | null;
    is_active: boolean;
}

export interface Immunisation {
    id: string;
    patient_id: string;
    episode_id: string | null;
    vaccine_id: string;
    /** Copied at the time — a renamed catalogue entry cannot rewrite history. */
    vaccine_name: string;
    dose_number: number | null;
    administered_on: string;
    batch_number: string | null;
    expiry_date: string | null;
    route: string | null;
    site: string | null;
    administered_by: string | null;
    notes: string | null;
}

export interface RecordImmunisationRequest {
    patient_id: string;
    vaccine_id: string;
    administered_on: string;
    episode_id?: string | null;
    dose_number?: number | null;
    batch_number?: string | null;
    expiry_date?: string | null;
    route?: string | null;
    site?: string | null;
    administered_by?: string | null;
    notes?: string | null;
}

function tenantParams(tenantId?: string) {
    const id = getTenantIdForApi(tenantId);
    return id ? { params: { tenant_id: id } } : undefined;
}

export const episodesApi = {
    async timeline(
        patientId: string,
        params?: { page?: number; page_size?: number },
        tenantId?: string
    ): Promise<EpisodeTimeline> {
        const id = getTenantIdForApi(tenantId);
        const response = await apiClient.get<EpisodeTimeline>(
            `/episodes/patient/${patientId}`,
            { params: { ...params, ...(id ? { tenant_id: id } : {}) } }
        );
        return response.data;
    },

    /**
     * The episode for a visit / admission / day-care visit / surgery.
     *
     * Null when there is none — a visit registered seconds ago may be ahead of
     * the worker that opens its episode, which is ordinary rather than an error.
     */
    async forSource(
        episodeType: EpisodeType,
        sourceId: string,
        tenantId?: string
    ): Promise<Episode | null> {
        const response = await apiClient.get<Episode | null>(
            `/episodes/by-source/${episodeType}/${sourceId}`,
            tenantParams(tenantId)
        );
        return response.data ?? null;
    },

    async get(episodeId: string, tenantId?: string): Promise<Episode> {
        const response = await apiClient.get<Episode>(
            `/episodes/${episodeId}`,
            tenantParams(tenantId)
        );
        return response.data;
    },

    /** Open an episode for an existing visit. Idempotent. */
    async create(
        episodeType: EpisodeType,
        sourceId: string,
        tenantId?: string
    ): Promise<Episode> {
        const response = await apiClient.post<Episode>(
            "/episodes",
            { episode_type: episodeType, source_id: sourceId },
            tenantParams(tenantId)
        );
        return response.data;
    },

    async finalise(episodeId: string, tenantId?: string): Promise<Episode> {
        const response = await apiClient.post<Episode>(
            `/episodes/${episodeId}/finalise`,
            {},
            tenantParams(tenantId)
        );
        return response.data;
    },

    async reopen(
        episodeId: string,
        body: ReopenEpisodeRequest,
        tenantId?: string
    ): Promise<Episode> {
        const response = await apiClient.post<Episode>(
            `/episodes/${episodeId}/reopen`,
            body,
            tenantParams(tenantId)
        );
        return response.data;
    },

    /**
     * Trigger or retry ABDM care-context linking for one episode.
     *
     * Sets `abdm_link_status` to `pending` immediately so the UI can show
     * progress. Phase 5 wires the actual Demographic Auth → `link/carecontext`
     * call on the server side.
     *
     * Only needs to be called when status is `failed` or `unlinked` — the
     * server is idempotent for `linked`, `sms_sent`, and `pending`.
     */
    async linkAbdm(episodeId: string, tenantId?: string): Promise<Episode> {
        const response = await apiClient.post<Episode>(
            `/episodes/${episodeId}/link-abdm`,
            {},
            tenantParams(tenantId)
        );
        return response.data;
    },
};


export const healthDocumentsApi = {
    async forEpisode(episodeId: string, tenantId?: string): Promise<DocumentVersion[]> {
        const response = await apiClient.get<DocumentVersion[]>(
            `/health-record/documents/episode/${episodeId}`,
            tenantParams(tenantId)
        );
        return response.data;
    },

    async history(
        docType: HiType,
        sourceId: string,
        tenantId?: string
    ): Promise<DocumentVersion[]> {
        const response = await apiClient.get<DocumentVersion[]>(
            `/health-record/documents/${docType}/${sourceId}/versions`,
            tenantParams(tenantId)
        );
        return response.data;
    },

    /** Freeze every document in an episode. Idempotent through the content hash. */
    async finaliseEpisode(episodeId: string, tenantId?: string): Promise<DocumentVersion[]> {
        const response = await apiClient.post<DocumentVersion[]>(
            `/health-record/documents/episode/${episodeId}/finalise`,
            {},
            tenantParams(tenantId)
        );
        return response.data;
    },

    /**
     * The rendered PDF for one version, as a blob.
     *
     * Fetched rather than pointed at with an `<iframe src>`: the endpoint needs
     * an Authorization header, and an iframe sends none — it would render the
     * login redirect inside the viewer, which looks like a broken PDF.
     */
    async pdf(versionId: string, tenantId?: string): Promise<Blob> {
        const id = getTenantIdForApi(tenantId);
        const response = await apiClient.get<Blob>(
            `/health-record/documents/version/${versionId}/pdf`,
            { responseType: "blob", params: id ? { tenant_id: id } : undefined }
        );
        return response.data;
    },
};

export const immunisationsApi = {
    async vaccines(tenantId?: string): Promise<Vaccine[]> {
        const response = await apiClient.get<Vaccine[]>(
            "/immunisations/vaccines",
            tenantParams(tenantId)
        );
        return response.data;
    },

    async forPatient(patientId: string, tenantId?: string): Promise<Immunisation[]> {
        const response = await apiClient.get<Immunisation[]>(
            `/immunisations/patient/${patientId}`,
            tenantParams(tenantId)
        );
        return response.data;
    },

    async record(
        request: RecordImmunisationRequest,
        tenantId?: string
    ): Promise<Immunisation> {
        const response = await apiClient.post<Immunisation>(
            "/immunisations",
            request,
            tenantParams(tenantId)
        );
        return response.data;
    },

    async remove(immunisationId: string, tenantId?: string): Promise<void> {
        await apiClient.delete(`/immunisations/${immunisationId}`, tenantParams(tenantId));
    },
};
