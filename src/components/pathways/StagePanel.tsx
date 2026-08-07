"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, UserCheck, Users } from "lucide-react";
import {
    useAdvanceVisit,
    usePathwayQueue,
    usePathways,
    useReleasePatient,
} from "@/hooks/queries/usePathways";
import type { Pathway, QueueItem } from "@/services/pathwaysApi";
import { GenericStageBody } from "./GenericStageBody";
import { panelForStage } from "./stagePanelRegistry";

interface StagePanelProps {
    /**
     * Whose panel this is. Patients are selected by `waiting_for_role`, not by
     * who performed the stage — the difference is what puts a patient in the
     * doctor's list the moment the optometrist finishes with them.
     */
    role: string;
}

/**
 * The generic half of a stage panel: find this role's patients, pick one, do
 * the work, move them on.
 *
 * The work itself is looked up per stage (`stagePanelRegistry`) rather than
 * built in, because a refraction form and a nurse's vitals check have nothing
 * in common but their position in a queue.
 */
/**
 * Where to send a patient when they are released.
 *
 * The stage they came from, which is the waiting stage this one is reachable
 * from. Falls back to undefined — releasing without moving — rather than
 * guessing, because putting a patient in the wrong queue is worse than leaving
 * them where they are for someone to move deliberately.
 */
function previousWaitingStage(item: QueueItem, pathway: Pathway): string | undefined {
    const current = pathway.stages.find((s) => s.code === item.stage.code);
    const from = current?.entry_from_codes;
    if (!from?.length) return undefined;
    return pathway.stages
        .filter((s) => from.includes(s.code) && s.stage_type === "waiting")
        .sort((a, b) => a.display_order - b.display_order)[0]?.code;
}

export function StagePanel({ role }: StagePanelProps) {
    const { data: pathways, isLoading: pathwaysLoading } = usePathways();
    const advanceVisit = useAdvanceVisit();
    const releasePatient = useReleasePatient();
    const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

    // Read after mount, not during render: localStorage is not available on the
    // server, so reading it while rendering both breaks hydration and counts as
    // an impure render.
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    useEffect(() => setCurrentUserId(localStorage.getItem("user_id")), []);

    // Every stage across every active pathway that this role is waiting on. A
    // hospital may run several pathways at once and one nurse covers all of
    // them, so this is not scoped to a single pathway.
    const { stageCodes, pathwayByStage } = useMemo(() => {
        const codes: string[] = [];
        const byStage = new Map<string, Pathway>();
        for (const pathway of pathways ?? []) {
            if (!pathway.is_active) continue;
            for (const stage of pathway.stages) {
                if ((stage.waiting_for_role ?? stage.assigned_role) !== role) continue;
                if (stage.is_terminal) continue;
                codes.push(stage.code);
                if (!byStage.has(stage.code)) byStage.set(stage.code, pathway);
            }
        }
        return { stageCodes: codes, pathwayByStage: byStage };
    }, [pathways, role]);

    const { data: queue, isLoading: queueLoading } = usePathwayQueue(
        { stageCodes, pageSize: 200 },
        { enabled: stageCodes.length > 0 }
    );

    const items = useMemo(() => queue?.items ?? [], [queue]);
    const selected: QueueItem | null =
        items.find((i) => i.visit_id === selectedVisitId) ?? null;

    // Keep a patient selected as the queue refetches, but drop the selection
    // once they have moved on — showing a stale patient's forms invites
    // recording an observation against the wrong visit.
    useEffect(() => {
        if (!items.length) {
            setSelectedVisitId(null);
            return;
        }
        if (!items.some((i) => i.visit_id === selectedVisitId)) {
            setSelectedVisitId(items[0].visit_id);
        }
    }, [items, selectedVisitId]);

    if (pathwaysLoading) {
        return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;
    }

    if (stageCodes.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="font-medium text-slate-700">
                    No stage in any active pathway is waiting on {role}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                    Add one under{" "}
                    <Link href="/pathways" className="text-sky-600 underline">
                        Clinical Pathways
                    </Link>{" "}
                    and set who it waits for.
                </p>
            </div>
        );
    }

    const pathway = selected ? pathwayByStage.get(selected.stage.code) ?? null : null;
    const body = panelForStage(
        selected && pathway
            ? pathway.stages.find((s) => s.code === selected.stage.code) ?? null
            : null
    );

    return (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Users className="h-4 w-4 text-slate-400" />
                    Waiting for you
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {items.length}
                    </span>
                </h2>

                {queueLoading && items.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
                ) : items.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">Nobody waiting</p>
                ) : (
                    <div className="grid gap-2">
                        {items.map((item) => (
                            <button
                                key={item.visit_id}
                                onClick={() => setSelectedVisitId(item.visit_id)}
                                className={`w-full rounded-xl border p-2.5 text-left transition ${
                                    item.visit_id === selectedVisitId
                                        ? "border-sky-300 bg-sky-50"
                                        : "border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                        {item.token_number ?? "—"}
                                    </span>
                                    <span className="truncate text-sm font-medium text-slate-900">
                                        {item.patient_name}
                                    </span>
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                    <span className="truncate">{item.stage.label}</span>
                                    {item.waiting_minutes !== null && (
                                        <span className="ml-auto inline-flex shrink-0 items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {item.waiting_minutes}m
                                        </span>
                                    )}
                                </div>
                                {item.assignments.length > 0 && (
                                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-sky-700">
                                        <UserCheck className="h-3 w-3" />
                                        {item.assignments[0].user_name ?? "Taken"}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </aside>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                {!selected || !pathway ? (
                    <p className="py-12 text-center text-sm text-slate-500">
                        Select a patient to begin.
                    </p>
                ) : body.kind === "redirect" ? (
                    <div className="grid justify-items-center gap-3 py-12 text-center">
                        <p className="font-medium text-slate-700">
                            {selected.stage.label} has its own screen
                        </p>
                        <p className="max-w-md text-sm text-slate-500">
                            This stage records eye-examination data — refraction, IOP, vision —
                            which the purpose-built panel already handles.
                        </p>
                        <Link
                            href={body.href}
                            className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                        >
                            {body.label}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                ) : (
                    <GenericStageBody
                        key={selected.visit_id}
                        item={selected}
                        pathway={pathway}
                        isAdvancing={advanceVisit.isPending}
                        onAdvance={(toStageCode) =>
                            advanceVisit.mutate({
                                visitId: selected.visit_id,
                                toStageCode,
                                performerRole: role,
                            })
                        }
                        heldByMe={selected.assignments.some(
                            (a) => a.role === role && a.user_id === currentUserId
                        )}
                        onRelease={() =>
                            releasePatient.mutate({
                                visitId: selected.visit_id,
                                role,
                                backToStageCode: previousWaitingStage(selected, pathway),
                            })
                        }
                        isReleasing={releasePatient.isPending}
                    />
                )}
            </section>
        </div>
    );
}
