"use client";

import { ArrowRight, Clock } from "lucide-react";
import { Pathway, PathwayStage, QueueItem } from "@/services/pathwaysApi";

interface PathwayQueueCardProps {
    item: QueueItem;
    pathway: Pathway;
    onAdvance: (item: QueueItem, toStageCode: string) => void;
    isAdvancing: boolean;
}

/**
 * Which stages this patient may be moved to next.
 *
 * Computed from the same entry rules the backend enforces, so the buttons
 * offered are the moves that will actually be accepted. Getting this wrong is
 * only a cosmetic problem — the server still refuses — but offering a button
 * that always fails is its own kind of broken.
 */
export function nextStagesFor(item: QueueItem, pathway: Pathway): PathwayStage[] {
    const current = item.stage.code;
    return pathway.stages.filter((stage) => {
        if (stage.code === current) return false;
        if (stage.entry_blocked_from_codes?.includes(current)) return false;
        if (stage.entry_from_codes && !stage.entry_from_codes.includes(current)) return false;
        return true;
    });
}

function waitingLabel(minutes: number | null): string | null {
    if (minutes === null || minutes < 0) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
}

export function PathwayQueueCard({
    item,
    pathway,
    onAdvance,
    isAdvancing,
}: PathwayQueueCardProps) {
    const isEmergency = item.visit_type === "emergency";
    const waiting = waitingLabel(item.waiting_minutes);

    // Ordered by position in the pathway, so the natural next step comes first
    // and the detours and backward moves follow.
    const nextStages = nextStagesFor(item, pathway).sort(
        (a, b) => a.display_order - b.display_order
    );
    const [primary, ...others] = nextStages;

    return (
        <div
            className={`rounded-xl border bg-white p-3 shadow-sm ${
                isEmergency ? "border-l-4 border-l-rose-500 border-y-slate-200 border-r-slate-200" : "border-slate-200"
            }`}
        >
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-sm font-semibold text-slate-700">
                    {item.token_number ?? "—"}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{item.patient_name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>{item.visit_number}</span>
                        {item.doctor_name && <span>· {item.doctor_name}</span>}
                        {item.is_revisit && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-600">
                                Revisit
                            </span>
                        )}
                        {isEmergency && (
                            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 font-medium text-rose-700">
                                Emergency
                            </span>
                        )}
                    </div>
                    {waiting && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            Waiting {waiting}
                        </p>
                    )}
                    {item.chief_complaint && (
                        <p className="mt-1 truncate text-xs text-slate-500">
                            {item.chief_complaint}
                        </p>
                    )}
                </div>
            </div>

            {primary && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                        onClick={() => onAdvance(item, primary.code)}
                        disabled={isAdvancing}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                    >
                        <ArrowRight className="h-3.5 w-3.5" />
                        {primary.label}
                    </button>

                    {others.length > 0 && (
                        // A select rather than more buttons: a pathway can have a
                        // dozen stages, and a row of them buries the usual move.
                        <select
                            value=""
                            disabled={isAdvancing}
                            onChange={(event) => {
                                if (event.target.value) onAdvance(item, event.target.value);
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-sky-400 disabled:opacity-50"
                            aria-label={`Move ${item.patient_name} somewhere else`}
                        >
                            <option value="">Move elsewhere…</option>
                            {others.map((stage) => (
                                <option key={stage.code} value={stage.code}>
                                    {stage.label}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}
        </div>
    );
}
