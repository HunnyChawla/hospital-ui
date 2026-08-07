import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

// ============================================================================
// Types
//
// A clinical pathway is the ordered set of stages a visit moves through. The
// eye-hospital flow is one configuration of it; a general OPD flow is another.
//
// The single most important thing to know when working with these: a stage's
// `code` is immutable. Those codes ARE the values in the visit's status field
// on live rows, and they are hard-coded into the waiting-room TV displays.
// There is deliberately no way to edit one — relabel instead.
// ============================================================================

export type StageType =
    | "waiting"       // nobody is acting yet; the patient sits in a queue
    | "assisted"      // a non-doctor clinical role is working
    | "consultation"  // the doctor is with the patient
    | "procedure"     // a timed step that interrupts the flow, e.g. dilation
    | "terminal";     // the visit is over

/**
 * Where a stage's patients are counted on a dashboard.
 *
 * Computed server-side from the stage, never inferred from the status string
 * here. The doctor panel used to hold a switch over eye statuses whose
 * `default:` swept everything unknown into "pending optometrist" — which is
 * what a general hospital's nurse stage landed in.
 */
export type StageBucket =
    | "pending_assistant"
    | "with_assistant"
    | "pending_doctor"
    | "with_doctor"
    | "completed"
    | "not_attended";

export interface PathwayStage {
    id: string;
    code: string;
    label: string;
    display_order: number;
    stage_type: StageType;
    /** Who performs this stage. */
    assigned_role: string | null;
    /**
     * Whose queue the patient is in right now — not always `assigned_role`.
     * A stage the optometrist performs can leave the patient waiting for the
     * doctor; the two differ at every handoff, and this is the one panels and
     * dashboards should filter on.
     */
    waiting_for_role: string | null;
    is_initial: boolean;
    is_terminal: boolean;
    /**
     * The visit ended without being completed. Independent of `is_terminal`:
     * a no-show may still come back and be seen.
     */
    is_abandonment: boolean;
    /** Allow-list of stage codes a visit may arrive from. Null means anywhere. */
    entry_from_codes: string[] | null;
    /** Deny-list, checked before the allow-list. */
    entry_blocked_from_codes: string[] | null;
    stamps_consultation_started: boolean;
    stamps_consultation_ended: boolean;
    colour: string | null;
    /** A patient can be called into this stage. False for queues and endings. */
    allows_assignment: boolean;
    /**
     * Staff may call any patient waiting HERE, not only the next in line.
     *
     * Read from the stage the patient is currently in, not the one they are
     * being called into — "may I skip down this queue" is a question about the
     * queue. Replaces the old per-tenant `allow_doctor_pick_any` /
     * `allow_optometrist_pick_any` flags.
     */
    allow_call_out_of_turn: boolean;
    /** Roughly how long this step takes, before any history has been measured. */
    expected_duration_minutes: number | null;
    /**
     * Visits whose current status is this stage's code. Non-zero means the
     * stage cannot be deleted — show it, don't just disable the button.
     */
    visit_count: number;
}

export interface Pathway {
    id: string;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    is_default: boolean;
    /** Seeded by the platform: stages can be added and reordered, never removed. */
    is_system: boolean;
    department_count: number;
    stages: PathwayStage[];
}

export interface CreatePathwayRequest {
    code: string;
    name: string;
    description?: string | null;
    /**
     * Code of a pathway whose stages to copy. Strongly preferred over starting
     * empty — an empty pathway cannot admit a patient and cannot be activated.
     */
    copy_stages_from?: string;
}

export interface UpdatePathwayRequest {
    name?: string;
    description?: string | null;
    is_active?: boolean;
    is_default?: boolean;
}

export interface CreateStageRequest {
    code: string;
    label: string;
    stage_type: StageType;
    display_order?: number;
    assigned_role?: string | null;
    /** Defaults to assigned_role server-side when omitted. */
    waiting_for_role?: string | null;
    is_initial?: boolean;
    is_terminal?: boolean;
    is_abandonment?: boolean;
    allows_assignment?: boolean;
    allow_call_out_of_turn?: boolean;
    expected_duration_minutes?: number | null;
    entry_from_codes?: string[] | null;
    entry_blocked_from_codes?: string[] | null;
    stamps_consultation_started?: boolean;
    stamps_consultation_ended?: boolean;
    colour?: string | null;
}

export interface UpdateStageRequest {
    label?: string;
    stage_type?: StageType;
    assigned_role?: string | null;
    waiting_for_role?: string;
    /** Set waiting_for_role to null — nobody in particular is waiting. */
    clear_waiting_for_role?: boolean;
    is_initial?: boolean;
    is_terminal?: boolean;
    is_abandonment?: boolean;
    allows_assignment?: boolean;
    allow_call_out_of_turn?: boolean;
    expected_duration_minutes?: number | null;
    entry_from_codes?: string[];
    entry_blocked_from_codes?: string[];
    stamps_consultation_started?: boolean;
    stamps_consultation_ended?: boolean;
    colour?: string | null;
    /**
     * Reset entry_from_codes to null (enterable from anywhere). Needed because
     * an omitted field means "unchanged", so there is no other way to clear it.
     */
    clear_entry_from?: boolean;
    clear_entry_blocked_from?: boolean;
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export interface QueueStageInfo {
    code: string;
    label: string;
    stage_type: StageType;
    display_order: number;
    assigned_role: string | null;
    waiting_for_role: string | null;
    colour: string | null;
    is_terminal: boolean;
    is_abandonment: boolean;
    /** Which dashboard bucket this patient counts towards. */
    bucket: StageBucket;
}

export interface QueueAssignment {
    role: string;
    user_id: string;
    user_name: string | null;
    /**
     * Which room to send the patient to — the cabin of whoever holds them.
     *
     * Read by the waiting-room TV for its spoken call-out. It lives here rather
     * than as a flat `doctor_cabin` on the item because the room belongs to the
     * person who called the patient, not to the speciality.
     */
    user_cabin: string | null;
    assigned_at: string;
}

export interface QueueItem {
    visit_id: string;
    patient_id: string;
    patient_name: string;
    patient_mobile: string | null;
    patient_category: string | null;
    doctor_id: string | null;
    doctor_name: string | null;
    visit_number: string;
    visit_type: string;
    is_revisit: boolean;
    token_number: number | null;
    chief_complaint: string | null;
    /**
     * The stage carries its own label and colour, so screens render from this
     * rather than holding a map of every status string in every speciality.
     */
    stage: QueueStageInfo;
    checked_in_at: string | null;
    /**
     * Stamped by whichever stage carries `stamps_consultation_started`. Generic
     * despite the name — every speciality has a point where the clinician
     * starts, and the pathway decides which stage that is.
     */
    consultation_started_at: string | null;
    consultation_ended_at: string | null;
    stage_entered_at: string | null;
    waiting_minutes: number | null;
    /**
     * Who currently holds this patient. Usually empty or one entry, but a visit
     * can be held by an assistant and a doctor at once — which is why it is a
     * list rather than a single field.
     */
    assignments: QueueAssignment[];
    created_at: string;
    updated_at: string;
}

export interface QueueStageSummary {
    stage: QueueStageInfo;
    waiting_count: number;
    /** Null when nothing has been measured yet — show "—", never a guess. */
    estimated_wait_minutes: number | null;
}

export interface PathwayQueueSummary {
    pathway_code: string;
    pathway_name: string;
    stages: QueueStageSummary[];
    total_waiting: number;
}

export interface PaginatedQueue {
    items: QueueItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface QueueParams {
    pathwayCode?: string;
    stageCodes?: string[];
    doctorId?: string;
    /**
     * Widen to doctors sharing a cover group. A cover group may span
     * departments, so results can mix pathways — each item carries its stage.
     */
    includeCoveringDoctors?: boolean;
    page?: number;
    pageSize?: number;
}

// ============================================================================
// API Methods
// ============================================================================

function tenantParams(tenantId?: string): Record<string, string> {
    const apiTenantId = getTenantIdForApi(tenantId);
    return apiTenantId ? { tenant_id: apiTenantId } : {};
}

export const pathwaysApi = {
    /** Every pathway with its stages. Readable by any staff member. */
    async list(tenantId?: string): Promise<Pathway[]> {
        const response = await apiClient.get<Pathway[]>("/pathways", {
            params: tenantParams(tenantId),
        });
        return response.data;
    },

    /** Create a pathway. It starts inactive until it has a way in and a way out. */
    async create(data: CreatePathwayRequest, tenantId?: string): Promise<Pathway> {
        const response = await apiClient.post<Pathway>("/pathways", data, {
            params: tenantParams(tenantId),
        });
        return response.data;
    },

    async update(pathwayId: string, data: UpdatePathwayRequest, tenantId?: string): Promise<Pathway> {
        const response = await apiClient.patch<Pathway>(`/pathways/${pathwayId}`, data, {
            params: tenantParams(tenantId),
        });
        return response.data;
    },

    async remove(pathwayId: string, tenantId?: string): Promise<void> {
        await apiClient.delete(`/pathways/${pathwayId}`, { params: tenantParams(tenantId) });
    },

    // Every stage mutation returns the whole pathway, so the builder re-renders
    // from the server's truth rather than patching its own copy — which is what
    // keeps display_order correct after a reorder.

    async addStage(pathwayId: string, data: CreateStageRequest, tenantId?: string): Promise<Pathway> {
        const response = await apiClient.post<Pathway>(`/pathways/${pathwayId}/stages`, data, {
            params: tenantParams(tenantId),
        });
        return response.data;
    },

    async updateStage(
        pathwayId: string,
        stageCode: string,
        data: UpdateStageRequest,
        tenantId?: string
    ): Promise<Pathway> {
        const response = await apiClient.patch<Pathway>(
            `/pathways/${pathwayId}/stages/${stageCode}`,
            data,
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },

    async removeStage(pathwayId: string, stageCode: string, tenantId?: string): Promise<Pathway> {
        const response = await apiClient.delete<Pathway>(
            `/pathways/${pathwayId}/stages/${stageCode}`,
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },

    /**
     * Save a new stage order — the drag-and-drop write.
     *
     * Send every stage code, not just the ones that moved. The server rejects a
     * partial list, which is how a stale tab (someone else added a stage) gets
     * caught instead of scattering the stages it did not know about.
     */
    async reorderStages(pathwayId: string, stageCodes: string[], tenantId?: string): Promise<Pathway> {
        const response = await apiClient.put<Pathway>(
            `/pathways/${pathwayId}/stages/order`,
            { stage_codes: stageCodes },
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },

    /** Patients waiting, in any pathway. */
    async getQueue(params: QueueParams = {}, tenantId?: string): Promise<PaginatedQueue> {
        const query: Record<string, string | number | boolean> = {
            ...tenantParams(tenantId),
        };
        if (params.pathwayCode) query.pathway_code = params.pathwayCode;
        if (params.stageCodes?.length) query.stage_codes = params.stageCodes.join(",");
        if (params.doctorId) query.doctor_id = params.doctorId;
        if (params.includeCoveringDoctors) query.include_covering_doctors = true;
        if (params.page) query.page = params.page;
        if (params.pageSize) query.page_size = params.pageSize;

        const response = await apiClient.get<PaginatedQueue>("/pathways/queue", { params: query });
        return response.data;
    },

    /** Counts per stage — the queue board. Empty stages are included. */
    async getQueueSummary(pathwayCode: string, tenantId?: string): Promise<PathwayQueueSummary> {
        const response = await apiClient.get<PathwayQueueSummary>(
            `/pathways/${pathwayCode}/queue/summary`,
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },

    /**
     * Call a patient in: take them, and move them to the stage you called them
     * to. The TV announces it as a consequence of the stage change.
     *
     * No `user_id` — the caller takes the patient themselves. A 409 means
     * someone else got there first, or the queue is strictly in order and this
     * is not the next patient; the message says which.
     */
    async callPatient(
        visitId: string,
        role: string,
        toStageCode: string,
        tenantId?: string
    ): Promise<QueueItem> {
        const response = await apiClient.post<QueueItem>(
            `/pathways/queue/${visitId}/call`,
            { role, to_stage_code: toStageCode },
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },

    /**
     * Let a patient go — the wrong name was called.
     *
     * Rare by design: a patient who does not turn up is marked as a no-show,
     * which is an ordinary stage move.
     */
    async releasePatient(
        visitId: string,
        role: string,
        backToStageCode?: string,
        tenantId?: string
    ): Promise<void> {
        const params: Record<string, string> = { ...tenantParams(tenantId) };
        if (backToStageCode) params.back_to_stage_code = backToStageCode;
        await apiClient.delete(`/pathways/queue/${visitId}/call/${role}`, { params });
    },

    /**
     * Move a visit to another stage.
     *
     * A 409 means the move conflicts with where the visit actually is — usually
     * because someone else moved it a moment ago. Refetch and show the truth
     * rather than retrying.
     */
    async advanceVisit(
        visitId: string,
        toStageCode: string,
        performerRole: string = "staff",
        tenantId?: string
    ): Promise<QueueItem> {
        const response = await apiClient.post<QueueItem>(
            `/pathways/queue/${visitId}/advance`,
            { to_stage_code: toStageCode, performer_role: performerRole },
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },
};
