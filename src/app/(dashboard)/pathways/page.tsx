"use client";

import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { usePathways } from "@/hooks/queries/usePathways";
import { PathwayBuilder } from "@/components/pathways/PathwayBuilder";
import { PathwayFormModal } from "@/components/pathways/PathwayFormModal";

export default function PathwaysPage() {
    const { data: pathways, isLoading, isError, error } = usePathways();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Select the default pathway on first load — it is the one most hospitals
    // will want to look at, and an empty right-hand pane reads as broken.
    useEffect(() => {
        if (selectedId || !pathways?.length) return;
        setSelectedId((pathways.find((p) => p.is_default) ?? pathways[0]).id);
    }, [pathways, selectedId]);

    const selected = pathways?.find((p) => p.id === selectedId) ?? null;

    return (
        <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500">
                            <GitBranch className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900">
                                Clinical Pathways
                            </h1>
                            <p className="text-sm text-slate-500">
                                The steps a patient moves through, per department
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                    >
                        New Pathway
                    </button>
                </div>
            </div>

            {isLoading && (
                <p className="py-8 text-center text-sm text-slate-500">Loading pathways…</p>
            )}

            {isError && (
                <p className="py-8 text-center text-sm text-rose-600">
                    Could not load pathways. {(error as Error)?.message}
                </p>
            )}

            {pathways && (
                <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                    <nav className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                        {pathways.map((pathway) => (
                            <button
                                key={pathway.id}
                                onClick={() => setSelectedId(pathway.id)}
                                className={`w-full rounded-xl px-3 py-2 text-left transition ${
                                    pathway.id === selectedId
                                        ? "bg-sky-50 text-sky-900"
                                        : "text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                <span className="block text-sm font-medium">{pathway.name}</span>
                                <span className="block text-xs text-slate-400">
                                    {pathway.stages.length} stage
                                    {pathway.stages.length === 1 ? "" : "s"}
                                    {!pathway.is_active && " · not in use"}
                                </span>
                            </button>
                        ))}
                        {pathways.length === 0 && (
                            <p className="px-3 py-4 text-sm text-slate-500">
                                No pathways yet. Create one to describe how patients move through a
                                department.
                            </p>
                        )}
                    </nav>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        {selected ? (
                            <PathwayBuilder key={selected.id} pathway={selected} />
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-500">
                                Select a pathway to edit it.
                            </p>
                        )}
                    </div>
                </div>
            )}

            <PathwayFormModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={setSelectedId}
            />
        </div>
    );
}
