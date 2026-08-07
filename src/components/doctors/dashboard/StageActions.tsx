"use client";

import React, { useMemo } from "react";
import { Loader2, PhoneCall, ArrowRight, Undo2 } from "lucide-react";
import type { Pathway, PathwayStage } from "@/services/pathwaysApi";
import { nextStagesFor } from "@/components/pathways/PathwayQueueCard";

interface StageActionsProps {
    status: string;
    assignments?: { role: string; user_id: string; user_name: string | null }[];
    pathway: Pathway | null;
    visitId: string;
    currentUserId?: string | null;
    isUpdating?: boolean;
    onCall?: (visitId: string, toStageCode: string) => void;
    onAdvance?: (visitId: string, toStageCode: string) => void;
    onRelease?: (visitId: string) => void;
}

/**
 * The buttons a patient's current stage allows, read from the pathway.
 *
 * WHAT THIS REPLACES
 *
 * Three booleans hard-coded into the queue card:
 *
 *     canStart    = status === "doctor_assigned"
 *     canCall     = status === "awaiting_doctor"
 *     canComplete = status === "in_consultation" || "consultation_in_progress"
 *
 * Those are eye stage codes. `awaiting_doctor` does not exist on the standard
 * pathway — a general hospital's patients wait at `checked_in` — so the Call
 * button never appeared there at all, and the two that did appear moved
 * patients to statuses picked from a constant rather than from the pathway.
 *
 * Reading the stages instead means a client who adds a stage in the pathway
 * builder gets a button for it, with their own wording, without a release.
 */
export function StageActions({
    status,
    assignments,
    pathway,
    visitId,
    currentUserId,
    isUpdating = false,
    onCall,
    onAdvance,
    onRelease,
}: StageActionsProps) {
    const { callTargets, moveTargets } = useMemo(() => {
        if (!pathway) return { callTargets: [] as PathwayStage[], moveTargets: [] as PathwayStage[] };

        const item = { stage: { code: status } } as Parameters<typeof nextStagesFor>[0];
        const next = nextStagesFor(item, pathway).sort(
            (a, b) => a.display_order - b.display_order
        );

        // Calling and moving are different acts: calling takes the patient and
        // announces their name outside, moving just advances them. Stages that
        // accept an assignment are offered as calls, and first.
        return {
            callTargets: onCall ? next.filter((s) => s.allows_assignment) : [],
            moveTargets: next.filter((s) => !onCall || !s.allows_assignment),
        };
    }, [pathway, status, onCall]);

    // Releasing is offered only to the person actually holding the patient —
    // it undoes THEIR call. A patient who did not turn up is marked as a
    // no-show instead, which is one of the ordinary moves above.
    const heldByMe =
        !!currentUserId && (assignments ?? []).some((a) => a.user_id === currentUserId);

    if (!pathway) return null;
    if (callTargets.length === 0 && moveTargets.length === 0 && !heldByMe) return null;

    return (
        <div className="mt-2 flex flex-col gap-2">
            {callTargets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {callTargets.map((stage) => (
                        <button
                            key={stage.code}
                            onClick={(e) => {
                                e.stopPropagation();
                                onCall?.(visitId, stage.code);
                            }}
                            disabled={isUpdating}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isUpdating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <>
                                    <PhoneCall className="h-3 w-3" />
                                    <span>{stage.label}</span>
                                </>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {moveTargets.length > 0 && onAdvance && (
                <div className="flex flex-wrap gap-2">
                    {moveTargets.map((stage) => (
                        <button
                            key={stage.code}
                            onClick={(e) => {
                                e.stopPropagation();
                                onAdvance(visitId, stage.code);
                            }}
                            disabled={isUpdating}
                            style={
                                stage.colour
                                    ? { backgroundColor: `${stage.colour}1a`, color: stage.colour }
                                    : undefined
                            }
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                stage.colour
                                    ? "hover:brightness-95"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            {isUpdating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <>
                                    <ArrowRight className="h-3 w-3" />
                                    <span>{stage.label}</span>
                                </>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {heldByMe && onRelease && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRelease(visitId);
                    }}
                    disabled={isUpdating}
                    title="Undo the call — use this only if the wrong name was called"
                    className="flex items-center justify-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Undo2 className="h-3 w-3" />
                    Called by mistake
                </button>
            )}
        </div>
    );
}
