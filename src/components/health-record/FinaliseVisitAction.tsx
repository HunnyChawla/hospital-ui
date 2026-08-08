"use client";

import React, { useState } from "react";
import { Lock, Unlock, Loader2, CheckCircle2 } from "lucide-react";
import {
    useEpisodeForSource,
    useFinaliseEpisode,
    useReopenEpisode,
} from "@/hooks/queries/useHealthRecord";
import { usePermissions } from "@/hooks/usePermissions";
import type { EpisodeType } from "@/services/healthRecordApi";
import { FinaliseConfirmDialog, mayReopenEpisode } from "./FinaliseConfirmDialog";

interface FinaliseVisitActionProps {
    /** Which kind of record this is. */
    episodeType: EpisodeType;
    /** The visit / admission / day-care visit / surgery id. */
    sourceId: string | null;
    /** Rendered when there is no episode yet and one cannot be opened. */
    compact?: boolean;
}

/**
 * "Finalise visit" — one control, usable from OPD, IPD, day care and surgery.
 *
 * One component rather than four because finalising means the same thing
 * everywhere: freeze this encounter's documents so they are safe to publish.
 * Four copies would drift, and the confirmation wording is the part most
 * worth keeping identical — it is what tells staff what they are about to do.
 *
 * The episode is looked up from the source row rather than passed in, because
 * every one of those four screens already knows its own id and none of them
 * knows about episodes.
 */
export function FinaliseVisitAction({
    episodeType,
    sourceId,
    compact = false,
}: FinaliseVisitActionProps) {
    const { data: episode, isLoading } = useEpisodeForSource(episodeType, sourceId);
    const finalise = useFinaliseEpisode();
    const reopen = useReopenEpisode();
    const { isAdmin, userRole } = usePermissions();
    const [confirming, setConfirming] = useState<"finalise" | "reopen" | null>(null);

    if (!sourceId || isLoading) return null;

    // No episode yet — nothing to finalise. Not an error state: episodes open
    // from a domain event, and a visit registered seconds ago may be ahead of
    // the worker.
    if (!episode) return null;

    const finalised = episode.status === "finalised";
    const busy = finalise.isPending || reopen.isPending;

    // Reopening is deliberately narrower than finalising. Anyone completing a
    // visit may close it; undoing that is a correction to a signed record, so
    // it is limited to the people who amend clinical content.
    //
    // Nurses included: late vitals and notes are theirs, and routing those
    // through a doctor adds a queue to the routine case. Kept in step with
    // REOPEN_ROLES in hms/health_record/api/episode_routes.py — and the server
    // enforces it, so this only decides whether the button is worth showing.
    const mayReopen = mayReopenEpisode(isAdmin, userRole);

    if (finalised && compact) {
        return <FinalisedBadge />;
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {finalised && <FinalisedBadge />}

            {busy ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Working…
                </span>
            ) : finalised ? (
                mayReopen && (
                    <button
                        onClick={() => setConfirming("reopen")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        <Unlock className="h-3.5 w-3.5" />
                        Reopen
                    </button>
                )
            ) : (
                <button
                    onClick={() => setConfirming("finalise")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                >
                    <Lock className="h-3.5 w-3.5" />
                    Finalise visit
                </button>
            )}

            {confirming && (
                <FinaliseConfirmDialog
                    mode={confirming}
                    onCancel={() => setConfirming(null)}
                    onConfirm={(reason, note) => {
                        if (confirming === "finalise") finalise.mutate(episode.id);
                        else if (reason)
                            reopen.mutate({ episodeId: episode.id, reason, note });
                        setConfirming(null);
                    }}
                />
            )}
        </div>
    );
}

/** F8: the state has to be visible, not inferred from a disabled button. */
export function FinalisedBadge() {
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
            title="This visit's documents are frozen. Reopen it to make changes."
        >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Finalised
        </span>
    );
}
