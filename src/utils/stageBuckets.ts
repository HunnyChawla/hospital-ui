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

/** Index every stage of every pathway by code, for status lookups. */
export function indexStages(pathways: { stages: PathwayStage[] }[] | undefined): StageIndex {
    const index: StageIndex = new Map();
    for (const pathway of pathways ?? []) {
        for (const stage of pathway.stages) {
            // First writer wins: two pathways may share a code (a copy of the
            // eye flow keeps `awaiting_doctor`) and agree on what it means.
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
 * What to call the assistant phase on this hospital's dashboard.
 *
 * An eye hospital says "Optometrist"; a general one says "Nurse" or whatever
 * its pathway actually configures. Falls back to the neutral word rather than
 * to "Optometrist", so a misconfigured pathway reads as vague instead of wrong.
 */
export function assistantRoleLabel(stages: StageIndex): string {
    const roles = new Set<string>();
    for (const stage of stages.values()) {
        const role = stage.waiting_for_role ?? stage.assigned_role;
        if (role && role !== "doctor") roles.add(role);
    }
    if (roles.size !== 1) return "Assistant";

    const [role] = [...roles];
    return role.charAt(0).toUpperCase() + role.slice(1);
}
