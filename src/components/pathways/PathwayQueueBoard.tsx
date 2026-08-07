"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Pathway, QueueItem } from "@/services/pathwaysApi";
import {
    useAdvanceVisit,
    useCallPatient,
    usePathwayQueue,
    usePathwayQueueSummary,
    usePathways,
} from "@/hooks/queries/usePathways";
import { usePathwayQueueStream } from "@/hooks/usePathwayQueueStream";
import { PathwayQueueCard } from "./PathwayQueueCard";

/**
 * A queue board whose columns come from the pathway, not from a list of status
 * strings in this file.
 *
 * The eye screens hold a hard-coded map of `awaiting_optometrist` and friends,
 * which is why a general hospital's queue rendered empty. Here the columns,
 * their labels, their order and their colours all come from the pathway
 * configuration, so a hospital that invents a stage gets a column for it
 * without anyone editing this component.
 */
export function PathwayQueueBoard() {
    const { data: pathways, isLoading: pathwaysLoading } = usePathways();
    const [selectedCode, setSelectedCode] = useState<string | null>(null);

    const usable = useMemo(
        () => (pathways ?? []).filter((p) => p.is_active && p.stages.length > 0),
        [pathways]
    );

    useEffect(() => {
        if (selectedCode || !usable.length) return;
        setSelectedCode((usable.find((p) => p.is_default) ?? usable[0]).code);
    }, [usable, selectedCode]);

    const pathway = usable.find((p) => p.code === selectedCode) ?? null;

    // Terminal stages are excluded: a finished visit is not waiting for anyone,
    // and a column of them grows without bound over a day.
    const liveStages = useMemo(
        () =>
            (pathway?.stages ?? [])
                .filter((s) => !s.is_terminal)
                .sort((a, b) => a.display_order - b.display_order),
        [pathway]
    );

    const stageCodes = useMemo(() => liveStages.map((s) => s.code), [liveStages]);

    const stream = usePathwayQueueStream({
        stageCodes,
        pathwayCode: selectedCode ?? undefined,
        enabled: !!selectedCode && stageCodes.length > 0,
    });

    // Polling stays as the floor, not as the primary. The stream is the fast
    // path; if it drops, a board that silently stops updating is worse than one
    // that lags. The interval is long because the stream normally carries it.
    const { data: queue, isLoading: queueLoading } = usePathwayQueue(
        {
            pathwayCode: selectedCode ?? undefined,
            stageCodes,
            pageSize: 500,
        },
        { enabled: !!selectedCode && stageCodes.length > 0 }
    );

    const { data: summary } = usePathwayQueueSummary(selectedCode);
    const advanceVisit = useAdvanceVisit();
    const callPatient = useCallPatient();

    const byStage = useMemo(() => {
        // The stream wins when it has ever delivered; polling fills the gap
        // before the first frame and after a drop. Resolved inside the memo so
        // the `??` chain does not build a new array on every render and defeat
        // it.
        const items = stream.items ?? queue?.items ?? [];
        const grouped = new Map<string, QueueItem[]>();
        for (const stage of liveStages) grouped.set(stage.code, []);
        for (const item of items) {
            grouped.get(item.stage.code)?.push(item);
        }
        return grouped;
    }, [stream.items, queue?.items, liveStages]);

    const waitEstimates = useMemo(() => {
        const map = new Map<string, number | null>();
        for (const entry of summary?.stages ?? []) {
            map.set(entry.stage.code, entry.estimated_wait_minutes);
        }
        return map;
    }, [summary]);

    const handleAdvance = (item: QueueItem, toStageCode: string) => {
        advanceVisit.mutate({ visitId: item.visit_id, toStageCode });
    };

    const handleCall = (item: QueueItem, role: string, toStageCode: string) => {
        callPatient.mutate({ visitId: item.visit_id, role, toStageCode });
    };

    if (pathwaysLoading) {
        return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;
    }

    if (!usable.length) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="font-medium text-slate-700">No pathway is in use yet</p>
                <p className="mt-1 text-sm text-slate-500">
                    Set one up under Clinical Pathways, then attach it to a department.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
                {/* Say plainly whether what is on screen is current. A board
                    that silently goes stale is the failure mode that matters —
                    staff trust it and call the wrong patient. */}
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        stream.status === "live"
                            ? "bg-emerald-50 text-emerald-700"
                            : stream.status === "stale"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                    }`}
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${
                            stream.status === "live"
                                ? "bg-emerald-500"
                                : stream.status === "stale"
                                  ? "bg-rose-500"
                                  : "bg-amber-500 animate-pulse"
                        }`}
                    />
                    {stream.status === "live"
                        ? "Live"
                        : stream.status === "stale"
                          ? "Not updating — reconnecting"
                          : stream.status === "connecting"
                            ? "Connecting"
                            : "Reconnecting"}
                </span>
                {stream.lastMessageAt && stream.status !== "live" && (
                    <span className="text-xs text-slate-400">
                        Last update {stream.lastMessageAt.toLocaleTimeString()}
                    </span>
                )}
            </div>

            {usable.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {usable.map((option: Pathway) => (
                        <button
                            key={option.code}
                            onClick={() => setSelectedCode(option.code)}
                            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                                option.code === selectedCode
                                    ? "bg-sky-500 text-white shadow-sm"
                                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            {option.name}
                        </button>
                    ))}
                </div>
            )}

            {pathway && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {liveStages.map((stage) => {
                        const items = byStage.get(stage.code) ?? [];
                        const estimate = waitEstimates.get(stage.code);

                        return (
                            <section
                                key={stage.code}
                                className="flex w-72 shrink-0 flex-col rounded-2xl bg-slate-50 p-3"
                            >
                                <header className="mb-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                            {/* Colour comes from the stage, so a new
                                                pathway is not born grey. */}
                                            <span
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{
                                                    backgroundColor: stage.colour ?? "#94a3b8",
                                                }}
                                            />
                                            {stage.label}
                                        </h3>
                                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                                            {items.length}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {/* Null means nothing has been measured yet.
                                            An honest dash beats an invented number
                                            on a screen patients can see. */}
                                        {estimate === null || estimate === undefined
                                            ? "No wait estimate yet"
                                            : `About ${estimate} min wait`}
                                    </p>
                                </header>

                                <div className="grid flex-1 gap-2">
                                    {queueLoading && items.length === 0 ? (
                                        <p className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Loading
                                        </p>
                                    ) : items.length === 0 ? (
                                        <p className="py-6 text-center text-xs text-slate-400">
                                            Nobody here
                                        </p>
                                    ) : (
                                        items.map((item) => (
                                            <PathwayQueueCard
                                                key={item.visit_id}
                                                item={item}
                                                pathway={pathway}
                                                onAdvance={handleAdvance}
                                                isAdvancing={advanceVisit.isPending}
                                                onCall={handleCall}
                                                isCalling={callPatient.isPending}
                                            />
                                        ))
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
