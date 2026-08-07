"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import type { PathwayStage } from "@/services/pathwaysApi";
import {
    useObservationDefinitions,
    useSetStageObservations,
    useStageObservations,
} from "@/hooks/queries/useObservations";

interface StageObservationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stage: PathwayStage;
}

interface Selection {
    selected: boolean;
    required: boolean;
}

/**
 * Choose what gets recorded at a stage, and what cannot be skipped.
 *
 * The "required" column is the one that does clinical work: the server refuses
 * to move a patient out of the stage until every required observation has a
 * value. "Nobody leaves triage without a blood pressure" stops being training
 * and becomes a rule.
 */
export function StageObservationsModal({ isOpen, onClose, stage }: StageObservationsModalProps) {
    const { data: definitions, isLoading } = useObservationDefinitions();
    const { data: current } = useStageObservations(isOpen ? stage.id : null);
    const setStageObservations = useSetStageObservations();

    const [selections, setSelections] = useState<Record<string, Selection>>({});

    useEffect(() => {
        if (!isOpen || !definitions) return;
        const next: Record<string, Selection> = {};
        for (const definition of definitions) {
            const existing = current?.find((c) => c.definition.id === definition.id);
            next[definition.id] = {
                selected: !!existing,
                required: existing?.is_required ?? false,
            };
        }
        setSelections(next);
    }, [isOpen, definitions, current]);

    const toggle = (id: string, patch: Partial<Selection>) => {
        setSelections((previous) => {
            const entry = previous[id] ?? { selected: false, required: false };
            const updated = { ...entry, ...patch };
            // Requiring something that is not asked for is meaningless, and
            // would block every patient at this stage forever.
            if (updated.required) updated.selected = true;
            if (!updated.selected) updated.required = false;
            return { ...previous, [id]: updated };
        });
    };

    const handleSave = async () => {
        const observations = (definitions ?? [])
            .filter((d) => selections[d.id]?.selected)
            .map((d) => ({
                observation_definition_id: d.id,
                is_required: selections[d.id]?.required ?? false,
            }));
        await setStageObservations.mutateAsync({ stageId: stage.id, observations });
        onClose();
    };

    const requiredCount = Object.values(selections).filter((s) => s.required).length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`What is recorded at "${stage.label}"`}
            size="lg"
        >
            <div className="grid gap-4">
                <p className="text-sm text-slate-500">
                    Tick what staff should record at this stage. Marking one <strong>required</strong>{" "}
                    means the patient cannot be moved on until it has a value.
                </p>

                {requiredCount > 0 && stage.is_terminal && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <p className="text-sm text-amber-800">
                            This stage ends the visit, so nobody moves out of it — a required
                            observation here will never be enforced. Mark it on the stage before
                            this one instead.
                        </p>
                    </div>
                )}

                {isLoading ? (
                    <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
                ) : (
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white">
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <th className="pb-2 pr-3 font-medium">Observation</th>
                                    <th className="w-20 pb-2 text-center font-medium">Record</th>
                                    <th className="w-20 pb-2 text-center font-medium">Required</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(definitions ?? []).map((definition) => {
                                    const selection = selections[definition.id] ?? {
                                        selected: false,
                                        required: false,
                                    };
                                    return (
                                        <tr
                                            key={definition.id}
                                            className="border-b border-slate-50 last:border-0"
                                        >
                                            <td className="py-2 pr-3">
                                                <span className="font-medium text-slate-800">
                                                    {definition.label}
                                                </span>
                                                {definition.unit && (
                                                    <span className="ml-1 text-xs text-slate-400">
                                                        ({definition.unit})
                                                    </span>
                                                )}
                                                <span className="block text-xs text-slate-400">
                                                    {definition.value_type}
                                                    {definition.writes_to_vitals &&
                                                        " · also saved to vitals"}
                                                </span>
                                            </td>
                                            <td className="py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selection.selected}
                                                    onChange={(event) =>
                                                        toggle(definition.id, {
                                                            selected: event.target.checked,
                                                        })
                                                    }
                                                    aria-label={`Record ${definition.label}`}
                                                    className="rounded"
                                                />
                                            </td>
                                            <td className="py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selection.required}
                                                    onChange={(event) =>
                                                        toggle(definition.id, {
                                                            required: event.target.checked,
                                                        })
                                                    }
                                                    aria-label={`Require ${definition.label}`}
                                                    className="rounded"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={setStageObservations.isPending}
                        className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
                    >
                        {setStageObservations.isPending ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
