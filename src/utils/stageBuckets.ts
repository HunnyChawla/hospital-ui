import type { PathwayStage, StageBucket } from "@/services/pathwaysApi";

/**
 * Which dashboard bucket a visit's status belongs to.
 *
 * Replaces the hand-written switch in `DoctorPanel.tsx`, which listed the eye
 * statuses by name and swept everything else into "pending optometrist" via its
 * `default:` branch. In a hospital with no optometrists that label was simply
 * wrong, and the count it produced was meaningless.
 *
 * The rule lives on the server (`hms/pathways/domain/buckets.py`) and arrives
 * on every queue item as `stage.bucket`. This module is for the places that
 * only have a status string — the live-queue SSE feed and appointment slots,
 * neither of which carries a stage object.
 *
 * Resolution order:
 *   1. the stage from the pathway configuration, if the status names one
 *   2. the legacy map below, for statuses no pathway defines
 *   3. `pending_assistant`, matching the old `default:` branch
 */

/**
 * Statuses that exist outside any pathway.
 *
 * These come from appointments and older code paths rather than from
 * `pathway_stages`, so no configuration will ever explain them. Transcribed
 * from the switch this replaces, so their counts do not move.
 */
const LEGACY_STATUS_BUCKETS: Record<string, StageBucket> = {
    checked_in_opd: "pending_assistant",
    waiting: "pending_assistant",
    scheduled: "pending_assistant",
    start_consultation: "with_doctor",
    in_consultation: "with_doctor",
    completed: "completed",
};

export type StageIndex = Map<string, PathwayStage>;

/**
 * Index every stage of every pathway by code, for status lookups.
 *
 * ⚠️ ORDER MATTERS. First writer wins, and shared codes do NOT always agree:
 * `checked_in` waits for the doctor on the standard pathway but for nobody on
 * the eye one, which buckets it as optometry. Pass the pathway you actually
 * care about FIRST and let the rest only fill in codes it never defines.
 */
export function indexStages(pathways: { stages: PathwayStage[] }[] | undefined): StageIndex {
    const index: StageIndex = new Map();
    for (const pathway of pathways ?? []) {
        for (const stage of pathway.stages) {
            if (!index.has(stage.code)) index.set(stage.code, stage);
        }
    }
    return index;
}

/** The server-side rule, restated for statuses that arrive without a stage. */
export function bucketForStage(stage: PathwayStage): StageBucket {
    if (stage.is_abandonment) return "not_attended";
    if (stage.is_terminal) return "completed";

    const queueRole = stage.waiting_for_role ?? stage.assigned_role;
    if (queueRole === "doctor") {
        return stage.stage_type === "consultation" ? "with_doctor" : "pending_doctor";
    }
    if (stage.stage_type === "assisted" || stage.stage_type === "procedure") {
        return "with_assistant";
    }
    return "pending_assistant";
}

export function bucketForStatus(status: string | null | undefined, stages: StageIndex): StageBucket {
    if (!status) return "pending_assistant";

    const stage = stages.get(status);
    if (stage) return bucketForStage(stage);

    return LEGACY_STATUS_BUCKETS[status] ?? "pending_assistant";
}

export interface BucketCounts {
    pendingAssistant: number;
    withAssistant: number;
    pendingDoctor: number;
    withDoctor: number;
    completed: number;
    notAttended: number;
}

export function emptyCounts(): BucketCounts {
    return {
        pendingAssistant: 0,
        withAssistant: 0,
        pendingDoctor: 0,
        withDoctor: 0,
        completed: 0,
        notAttended: 0,
    };
}

const FIELD_FOR: Record<StageBucket, keyof BucketCounts> = {
    pending_assistant: "pendingAssistant",
    with_assistant: "withAssistant",
    pending_doctor: "pendingDoctor",
    with_doctor: "withDoctor",
    completed: "completed",
    not_attended: "notAttended",
};

export function countByBucket(
    items: { status?: string | null }[],
    stages: StageIndex
): BucketCounts {
    const counts = emptyCounts();
    for (const item of items) {
        counts[FIELD_FOR[bucketForStatus(item.status, stages)]]++;
    }
    return counts;
}

/**
 * Whether this pathway involves anyone before the doctor at all.
 *
 * A general OPD does not: patients check in and see the doctor. Its dashboard
 * should not carry "Pending at …" and "In-progress at …" cards that can only
 * ever read zero — which is what a hospital with no optometrist was shown.
 */
export function hasAssistantStage(pathway: { stages: PathwayStage[] } | null): boolean {
    if (!pathway) return false;
    return pathway.stages.some((stage) => {
        const role = stage.waiting_for_role ?? stage.assigned_role;
        return !!role && role !== "doctor";
    });
}

/**
 * The queue a patient goes back to when this role gives them up.
 *
 * Mirrors `PathwayService.waiting_stage_for_role` on the server. Releasing used
 * to send the patient to a hard-coded `awaiting_doctor`, a stage the standard
 * pathway has no equivalent of — so a general hospital's released patient
 * landed in a status nothing recognised and dropped out of the queue.
 *
 * Falls back to the role-less waiting stage, where a patient who belongs to
 * nobody in particular waits.
 */
export function waitingStageForRole(
    pathway: { stages: PathwayStage[] } | null,
    role: string
): PathwayStage | null {
    const waiting = (pathway?.stages ?? [])
        .filter((s) => s.stage_type === "waiting" && !s.is_abandonment)
        .sort((a, b) => a.display_order - b.display_order);

    const queueRole = (s: PathwayStage) => s.waiting_for_role ?? s.assigned_role;
    return (
        waiting.find((s) => queueRole(s) === role) ??
        waiting.find((s) => !queueRole(s)) ??
        null
    );
}

/**
 * What to call the assistant phase on this hospital's dashboard.
 *
 * ⚠️ Takes ONE pathway, not the whole index. Reading every pathway in the tenant
 * was the bug behind "Pending at Optometrist" appearing in a general hospital:
 * the tenant has the eye pathway seeded alongside the standard one, so scanning
 * all of them always found `optometrist` regardless of which pathway the doctor
 * on screen actually follows.
 *
 * Falls back to the neutral word rather than to "Optometrist", so a
 * misconfigured pathway reads as vague instead of as wrong.
 */
export function assistantRoleLabel(pathway: { stages: PathwayStage[] } | null): string {
    const roles = new Set<string>();
    for (const stage of pathway?.stages ?? []) {
        const role = stage.waiting_for_role ?? stage.assigned_role;
        if (role && role !== "doctor") roles.add(role);
    }
    if (roles.size !== 1) return "Assistant";

    const [role] = [...roles];
    return role.charAt(0).toUpperCase() + role.slice(1);
}
