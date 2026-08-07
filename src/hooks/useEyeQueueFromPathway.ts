"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { QueueItem } from "@/services/pathwaysApi";
import { eyeVisitDetailsApi, type EyeVisitDetail } from "@/services/eyeVisitDetailsApi";
import { usePathwayQueueStream } from "./usePathwayQueueStream";

/**
 * A queue item with its eye-specific detail merged back in.
 *
 * Flat, and named exactly as the eye endpoints named them, because twenty files
 * across the optometrist panel already read these keys. Track C moves where the
 * data comes from, not what the screens receive — that is what keeps the
 * migration to three hooks instead of twenty components.
 */
export interface EyeQueueRow extends Partial<EyeVisitDetail> {
    // --- generic, from /pathways/queue ---
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
    checked_in_at: string | null;
    waiting_minutes: number | null;
    created_at: string;
    updated_at: string;

    /**
     * The stage code, under the name the eye screens have always used. The eye
     * pathway's stage codes ARE the old status strings — that was the migration
     * rule Phase 2 was built on — so this is the same value, not a translation.
     */
    status: string;

    /** Kept because several eye components key rows on `id` rather than visit_id. */
    id: string;
}

interface Options {
    stageCodes: string[];
    doctorId?: string;
    includeCoveringDoctors?: boolean;
    enabled?: boolean;
}

function toRow(item: QueueItem, detail: EyeVisitDetail | undefined): EyeQueueRow {
    return {
        visit_id: item.visit_id,
        id: item.visit_id,
        patient_id: item.patient_id,
        patient_name: item.patient_name,
        patient_mobile: item.patient_mobile,
        patient_category: item.patient_category,
        doctor_id: item.doctor_id,
        doctor_name: item.doctor_name,
        visit_number: item.visit_number,
        visit_type: item.visit_type,
        is_revisit: item.is_revisit,
        token_number: item.token_number,
        chief_complaint: item.chief_complaint,
        checked_in_at: item.checked_in_at,
        waiting_minutes: item.waiting_minutes,
        created_at: item.created_at,
        updated_at: item.updated_at,
        status: item.stage.code,
        ...(detail ?? {}),
    };
}

/**
 * The eye queue, served by the generic pathway queue.
 *
 * Streams the queue from `/pathways/queue/stream` and fetches the eye-specific
 * fields alongside it, merging the two into the shape the eye screens already
 * consume.
 *
 * The detail fetch is keyed on the set of visit ids rather than run on every
 * frame: the stream fires whenever anything in the tenant moves, and refetching
 * a dilation timer because a different patient was called would be wasteful and
 * would make the countdown jump.
 */
export function useEyeQueueFromPathway({
    stageCodes,
    doctorId,
    includeCoveringDoctors,
    enabled = true,
}: Options) {
    const stream = usePathwayQueueStream({
        stageCodes,
        doctorId,
        includeCoveringDoctors,
        enabled,
    });

    const [details, setDetails] = useState<Record<string, EyeVisitDetail>>({});
    const inFlightRef = useRef<string>("");

    const visitIds = useMemo(
        () => (stream.items ?? []).map((i) => i.visit_id).sort(),
        [stream.items]
    );
    const visitKey = visitIds.join(",");

    useEffect(() => {
        if (!visitKey) {
            setDetails({});
            return;
        }
        // Same set of patients as last time: whatever moved, it was not who is
        // in the queue, so the eye detail cannot have changed shape.
        if (inFlightRef.current === visitKey) return;
        inFlightRef.current = visitKey;

        let cancelled = false;
        eyeVisitDetailsApi
            .forVisits(visitKey.split(","))
            .then((result) => {
                if (!cancelled) setDetails(result);
            })
            .catch(() => {
                // Losing the supplement must not blank the queue. The rows still
                // render; the dilation timer and cabin are simply absent until
                // the next fetch succeeds.
                if (!cancelled) inFlightRef.current = "";
            });

        return () => {
            cancelled = true;
        };
    }, [visitKey]);

    const rows = useMemo(
        () => (stream.items ?? []).map((item) => toRow(item, details[item.visit_id])),
        [stream.items, details]
    );

    return {
        rows,
        status: stream.status,
        lastMessageAt: stream.lastMessageAt,
        reconnect: stream.reconnect,
        /** Null until the first frame arrives, so callers can tell empty from loading. */
        isLoading: stream.items === null,
    };
}
