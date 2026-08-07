"use client";

import { useState } from "react";
import { Activity, Pencil, ShieldCheck } from "lucide-react";
import { useObservationDefinitions } from "@/hooks/queries/useObservations";
import { ObservationDefinitionModal } from "@/components/observations/ObservationDefinitionModal";
import type { ObservationDefinition } from "@/services/observationsApi";

const TYPE_LABEL: Record<string, string> = {
    number: "Number",
    text: "Text",
    boolean: "Yes / No",
    choice: "Choice",
};

export default function ObservationsPage() {
    const { data: definitions, isLoading, isError, error } = useObservationDefinitions({
        includeInactive: true,
    });
    const [editing, setEditing] = useState<ObservationDefinition | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const open = (definition: ObservationDefinition | null) => {
        setEditing(definition);
        setIsOpen(true);
    };

    const formatRange = (low: number | null, high: number | null, unit: string | null) => {
        if (low === null && high === null) return "—";
        const text =
            low !== null && high !== null
                ? `${low}–${high}`
                : low !== null
                  ? `≥ ${low}`
                  : `≤ ${high}`;
        return unit ? `${text} ${unit}` : text;
    };

    return (
        <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500">
                            <Activity className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900">Observations</h1>
                            <p className="text-sm text-slate-500">
                                What this hospital records about a patient
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => open(null)}
                        className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                    >
                        New Observation
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="mb-4 text-sm text-slate-500">
                    Define anything your clinicians measure — intraocular pressure, head
                    circumference, fundal height, blood sugar. Then choose which stage of a{" "}
                    <a href="/pathways" className="text-sky-600 underline">
                        clinical pathway
                    </a>{" "}
                    asks for it, and whether a patient can be moved on without it.
                </p>

                {isLoading && (
                    <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
                )}
                {isError && (
                    <p className="py-8 text-center text-sm text-rose-600">
                        Could not load observations. {(error as Error)?.message}
                    </p>
                )}

                {definitions && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <th className="pb-2 pr-3 font-medium">Observation</th>
                                    <th className="pb-2 pr-3 font-medium">Type</th>
                                    <th className="pb-2 pr-3 font-medium">Usual range</th>
                                    <th className="pb-2 pr-3 font-medium">Rejected outside</th>
                                    <th className="pb-2 font-medium sr-only">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {definitions.map((definition) => (
                                    <tr
                                        key={definition.id}
                                        className="border-b border-slate-50 last:border-0"
                                    >
                                        <td className="py-3 pr-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={
                                                        definition.is_active
                                                            ? "font-medium text-slate-900"
                                                            : "font-medium text-slate-400 line-through"
                                                    }
                                                >
                                                    {definition.label}
                                                </span>
                                                {definition.is_system && (
                                                    <span
                                                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                                                        title="A core vital. Also saved to the vitals chart, and cannot be switched off."
                                                    >
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Core
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {definition.code}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-3 text-slate-600">
                                            {TYPE_LABEL[definition.value_type] ??
                                                definition.value_type}
                                            {definition.choices && (
                                                <span className="block text-xs text-slate-400">
                                                    {definition.choices.length} options
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 pr-3 text-slate-600">
                                            {formatRange(
                                                definition.min_normal,
                                                definition.max_normal,
                                                definition.unit
                                            )}
                                        </td>
                                        <td className="py-3 pr-3 text-slate-600">
                                            {formatRange(
                                                definition.min_allowed,
                                                definition.max_allowed,
                                                definition.unit
                                            )}
                                        </td>
                                        <td className="py-3 text-right">
                                            <button
                                                onClick={() => open(definition)}
                                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                aria-label={`Edit ${definition.label}`}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ObservationDefinitionModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                definition={editing}
            />
        </div>
    );
}
