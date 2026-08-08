"use client";

import React, { useState } from "react";
import { Lock, AlertTriangle } from "lucide-react";
import type { ReopenReason } from "@/services/healthRecordApi";

/**
 * The confirmation for finalising or reopening a visit.
 *
 * Extracted because there were two of these and they had drifted. The version
 * in `FinaliseVisitAction` asked for confirmation; the one on the patient
 * timeline reopened a finalised record on a single click, with no confirmation
 * and no permission check. Same action, same consequences, two behaviours —
 * which is exactly what a second copy always becomes.
 *
 * The wording is the part most worth keeping identical: it is what tells staff
 * what they are about to do.
 */

/**
 * Why a finalised visit is being unlocked, in the order these actually happen.
 *
 * Mirrors `ReopenReason` in `hms/health_record/domain/episode.py`. Short on
 * purpose — a picklist long enough to scroll gets answered with whichever
 * option is first.
 */
export const REOPEN_REASONS: { value: ReopenReason; label: string; hint: string }[] = [
    {
        value: "late_result",
        label: "Late result",
        hint: "Lab, imaging or histopath arrived after the visit closed",
    },
    { value: "correction", label: "Correction", hint: "Something recorded was wrong" },
    { value: "omission", label: "Omission", hint: "Something done but never written down" },
    {
        value: "administrative",
        label: "Administrative",
        hint: "Billing or paperwork — no change to clinical content",
    },
    { value: "other", label: "Other", hint: "Requires a note" },
];

/**
 * Who may reopen.
 *
 * Kept in step with `REOPEN_ROLES` in `hms/health_record/api/episode_routes.py`.
 * The server enforces it; this only decides whether showing the button is
 * worth it. Nurses are included because late vitals and notes are theirs, and
 * routing those through a doctor adds a queue to the routine case.
 */
export function mayReopenEpisode(
    isAdmin: boolean,
    userRole: string | null | undefined
): boolean {
    return isAdmin || userRole === "doctor" || userRole === "nurse";
}

export function FinaliseConfirmDialog({
    mode,
    onCancel,
    onConfirm,
}: {
    mode: "finalise" | "reopen";
    onCancel: () => void;
    onConfirm: (reason?: ReopenReason, note?: string) => void;
}) {
    const finalising = mode === "finalise";
    const [reason, setReason] = useState<ReopenReason | "">("");
    const [note, setNote] = useState("");

    // "Other" opts out of the picklist, so it has to pay for that with a
    // sentence — the server rejects it otherwise, and finding that out via a
    // failed request would be a worse way to learn it.
    const noteRequired = reason === "other";
    const canConfirm =
        finalising || (reason !== "" && (!noteRequired || note.trim().length > 0));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                <div className="flex gap-3">
                    <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                            finalising
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-amber-50 text-amber-600"
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
                                    <p>
                                        Your name, the time and the reason below are recorded in
                                        the audit trail.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {!finalising && (
                    <div className="mt-4 space-y-3">
                        <div>
                            <label
                                htmlFor="reopen-reason"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Why are you reopening this?{" "}
                                <span className="text-rose-500">*</span>
                            </label>
                            <select
                                id="reopen-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value as ReopenReason)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            >
                                <option value="">Select a reason…</option>
                                {REOPEN_REASONS.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                            {reason && (
                                <p className="mt-1 text-[11px] text-slate-500">
                                    {REOPEN_REASONS.find((r) => r.value === reason)?.hint}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="reopen-note"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Note{" "}
                                {noteRequired ? (
                                    <span className="text-rose-500">*</span>
                                ) : (
                                    <span className="font-normal text-slate-400">(optional)</span>
                                )}
                            </label>
                            <textarea
                                id="reopen-note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={2}
                                maxLength={500}
                                placeholder={
                                    noteRequired
                                        ? "Required — say what happened"
                                        : "e.g. histopathology report received"
                                }
                                className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                        </div>
                    </div>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() =>
                            onConfirm(
                                finalising ? undefined : (reason as ReopenReason),
                                note.trim() || undefined
                            )
                        }
                        disabled={!canConfirm}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
