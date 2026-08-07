"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import type { StageObservation, VisitObservation } from "@/services/observationsApi";
import { useRecordObservations, useVisitObservations } from "@/hooks/queries/useObservations";

interface ObservationFormProps {
    visitId: string;
    stageCode: string;
    /** What this stage asks for, in order, with which are mandatory. */
    asks: StageObservation[];
}

type FieldValue = string | boolean;

/**
 * The capture form for a stage, built entirely from configuration.
 *
 * There is no hard-coded field list here. A hospital that adds "fundal height"
 * to its antenatal stage gets an input for it without anyone editing this file
 * — which is the whole point of making observations configurable.
 */
export function ObservationForm({ visitId, stageCode, asks }: ObservationFormProps) {
    const { data: recorded } = useVisitObservations(visitId);
    const recordObservations = useRecordObservations();
    const [values, setValues] = useState<Record<string, FieldValue>>({});
    const [dirty, setDirty] = useState(false);

    const recordedByCode = useMemo(() => {
        const map = new Map<string, VisitObservation>();
        for (const observation of recorded ?? []) map.set(observation.code, observation);
        return map;
    }, [recorded]);

    // Seed the form from what has already been recorded, but never overwrite
    // what the user is part-way through typing — the queue refetches every ten
    // seconds and would otherwise erase a half-entered blood pressure.
    useEffect(() => {
        if (dirty) return;
        const next: Record<string, FieldValue> = {};
        for (const ask of asks) {
            const existing = recordedByCode.get(ask.definition.code);
            if (!existing) continue;
            if (existing.value_boolean !== null) next[ask.definition.code] = existing.value_boolean;
            else if (existing.value_number !== null)
                next[ask.definition.code] = String(existing.value_number);
            else if (existing.value_text !== null) next[ask.definition.code] = existing.value_text;
        }
        setValues(next);
    }, [recordedByCode, asks, dirty]);

    const setValue = (code: string, value: FieldValue) => {
        setDirty(true);
        setValues((previous) => ({ ...previous, [code]: value }));
    };

    const missingRequired = asks.filter((ask) => {
        if (!ask.is_required) return false;
        const value = values[ask.definition.code];
        return value === undefined || value === "" || value === null;
    });

    const handleSave = async () => {
        // Send every field the stage asks for, including the ones left blank:
        // blanking a value is a real edit, and omitting it would silently keep
        // the old reading.
        const payload: Record<string, unknown> = {};
        for (const ask of asks) {
            payload[ask.definition.code] = values[ask.definition.code] ?? null;
        }
        await recordObservations.mutateAsync({ visitId, values: payload, stageCode });
        setDirty(false);
    };

    if (asks.length === 0) return null;

    return (
        <section className="rounded-xl border border-slate-200 p-3">
            <header className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Observations</h3>
                {missingRequired.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {missingRequired.length} required still to fill
                    </span>
                )}
            </header>

            <div className="grid gap-3 sm:grid-cols-2">
                {asks.map((ask) => {
                    const { definition } = ask;
                    const value = values[definition.code];
                    const existing = recordedByCode.get(definition.code);

                    return (
                        <div key={definition.code}>
                            <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                                {definition.label}
                                {definition.unit && (
                                    <span className="text-xs font-normal text-slate-400">
                                        ({definition.unit})
                                    </span>
                                )}
                                {ask.is_required && <span className="text-rose-500">*</span>}
                            </label>

                            {definition.value_type === "boolean" ? (
                                <select
                                    value={value === true ? "yes" : value === false ? "no" : ""}
                                    onChange={(event) => {
                                        const raw = event.target.value;
                                        setValue(definition.code, raw === "yes");
                                        if (raw === "") setValue(definition.code, "");
                                    }}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                >
                                    <option value="">—</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                            ) : definition.value_type === "choice" ? (
                                <select
                                    value={typeof value === "string" ? value : ""}
                                    onChange={(event) => setValue(definition.code, event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                >
                                    <option value="">—</option>
                                    {(definition.choices ?? []).map((choice) => (
                                        <option key={choice} value={choice}>
                                            {choice}
                                        </option>
                                    ))}
                                </select>
                            ) : definition.value_type === "number" ? (
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    min={definition.min_allowed ?? undefined}
                                    max={definition.max_allowed ?? undefined}
                                    value={typeof value === "string" ? value : ""}
                                    onChange={(event) => setValue(definition.code, event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={typeof value === "string" ? value : ""}
                                    onChange={(event) => setValue(definition.code, event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                />
                            )}

                            {/* The abnormal flag comes from the saved reading, not
                                from what is being typed — flagging mid-keystroke
                                turns "12" into an alarm on the way to "120". */}
                            {existing?.is_abnormal && (
                                <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700">
                                    <AlertTriangle className="h-3 w-3" />
                                    Outside the usual range
                                    {definition.min_normal !== null && definition.max_normal !== null
                                        ? ` (${definition.min_normal}–${definition.max_normal})`
                                        : ""}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                    onClick={handleSave}
                    disabled={recordObservations.isPending || !dirty}
                    className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
                >
                    <Check className="h-4 w-4" />
                    {recordObservations.isPending ? "Saving…" : "Save observations"}
                </button>
                {!dirty && recorded && recorded.length > 0 && (
                    <span className="text-xs text-slate-400">Saved</span>
                )}
            </div>
        </section>
    );
}
