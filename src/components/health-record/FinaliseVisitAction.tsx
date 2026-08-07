"use client";

import React, { useState } from "react";
import { Lock, Unlock, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
    useEpisodeForSource,
    useFinaliseEpisode,
    useReopenEpisode,
} from "@/hooks/queries/useHealthRecord";
import { usePermissions } from "@/hooks/usePermissions";
import type { EpisodeType } from "@/services/healthRecordApi";

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
    // it is limited to the people who own the clinical content.
    const mayReopen = isAdmin || userRole === "doctor";

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
                <ConfirmDialog
                    mode={confirming}
                    onCancel={() => setConfirming(null)}
                    onConfirm={() => {
                        if (confirming === "finalise") finalise.mutate(episode.id);
                        else reopen.mutate(episode.id);
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

function ConfirmDialog({
    mode,
    onCancel,
    onConfirm,
}: {
    mode: "finalise" | "reopen";
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const finalising = mode === "finalise";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                <div className="flex gap-3">
                    <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                            finalising ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        }`}
                    >
                        {finalising ? (
                            <Lock className="h-4 w-4" />
                        ) : (
                            <AlertTriangle className="h-4 w-4" />
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            {finalising ? "Finalise this visit?" : "Reopen this visit?"}
                        </h3>
                        {/* Says what actually happens, in the order it happens.
                            "Are you sure?" tells nobody anything. */}
                        <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                            {finalising ? (
                                <>
                                    <p>
                                        Its prescriptions, notes and reports will be frozen and a
                                        version of each recorded.
                                    </p>
                                    <p>
                                        You can reopen it afterwards if something arrives late —
                                        that is recorded too.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p>
                                        Documents become editable again, and anything finalised
                                        afterwards is saved as a new version.
                                    </p>
                                    <p>This is recorded in the audit trail.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition ${
                            finalising
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : "bg-amber-500 hover:bg-amber-600"
                        }`}
                    >
                        {finalising ? "Finalise" : "Reopen"}
                    </button>
                </div>
            </div>
        </div>
    );
}
