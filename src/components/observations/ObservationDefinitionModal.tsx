"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import type { ObservationDefinition, ObservationValueType } from "@/services/observationsApi";
import {
    useCreateObservationDefinition,
    useUpdateObservationDefinition,
} from "@/hooks/queries/useObservations";

interface ObservationDefinitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Null creates; a definition edits it. */
    definition?: ObservationDefinition | null;
}

interface FormValues {
    code: string;
    label: string;
    value_type: ObservationValueType;
    unit: string;
    min_normal: string;
    max_normal: string;
    min_allowed: string;
    max_allowed: string;
    choices: string;
    display_order: number;
    is_active: boolean;
}

const TYPES: { value: ObservationValueType; label: string; hint: string }[] = [
    { value: "number", label: "Number", hint: "A measurement — 128, 37.2, 21" },
    { value: "text", label: "Text", hint: "Free text, for a note or a description" },
    { value: "boolean", label: "Yes / No", hint: "A single question with two answers" },
    { value: "choice", label: "Choice", hint: "One of a fixed list you define below" },
];

function toCode(label: string): string {
    return label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 59);
}

/** "" for an empty box, so the API sees null rather than 0. */
function numberOrNull(raw: string): number | null {
    const trimmed = raw?.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
}

export function ObservationDefinitionModal({
    isOpen,
    onClose,
    definition,
}: ObservationDefinitionModalProps) {
    const isEdit = !!definition;
    const createDefinition = useCreateObservationDefinition();
    const updateDefinition = useUpdateObservationDefinition();

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>();

    useEffect(() => {
        if (!isOpen) return;
        reset({
            code: definition?.code ?? "",
            label: definition?.label ?? "",
            value_type: definition?.value_type ?? "number",
            unit: definition?.unit ?? "",
            min_normal: definition?.min_normal?.toString() ?? "",
            max_normal: definition?.max_normal?.toString() ?? "",
            min_allowed: definition?.min_allowed?.toString() ?? "",
            max_allowed: definition?.max_allowed?.toString() ?? "",
            choices: definition?.choices?.join("\n") ?? "",
            display_order: definition?.display_order ?? 0,
            is_active: definition?.is_active ?? true,
        });
    }, [isOpen, definition, reset]);

    const label = watch("label");
    const valueType = watch("value_type");
    const isNumeric = valueType === "number";

    const onSubmit = async (values: FormValues) => {
        const choices = values.choices
            .split("\n")
            .map((c) => c.trim())
            .filter(Boolean);

        const shared = {
            label: values.label.trim(),
            unit: values.unit.trim() || null,
            min_normal: isNumeric ? numberOrNull(values.min_normal) : null,
            max_normal: isNumeric ? numberOrNull(values.max_normal) : null,
            min_allowed: isNumeric ? numberOrNull(values.min_allowed) : null,
            max_allowed: isNumeric ? numberOrNull(values.max_allowed) : null,
            choices: values.value_type === "choice" ? choices : null,
            display_order: Number(values.display_order) || 0,
        };

        if (isEdit && definition) {
            await updateDefinition.mutateAsync({
                id: definition.id,
                // A core vital cannot be switched off — the server refuses, and
                // offering the toggle would just produce an error.
                data: definition.is_system
                    ? shared
                    : { ...shared, is_active: values.is_active },
            });
        } else {
            await createDefinition.mutateAsync({
                code: values.code.trim() || toCode(values.label),
                value_type: values.value_type,
                ...shared,
            });
        }
        onClose();
    };

    const isSaving = createDefinition.isPending || updateDefinition.isPending;
    const typeHint = TYPES.find((t) => t.value === valueType)?.hint;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit "${definition?.label}"` : "New observation"}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            {...register("label", { required: "A name is required" })}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                            placeholder="Intraocular pressure"
                        />
                        {errors.label && (
                            <p className="mt-1 text-xs text-rose-600">{errors.label.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Code</label>
                        <input
                            {...register("code", {
                                pattern: {
                                    value: /^[a-z][a-z0-9_]{1,59}$/,
                                    message: "Lower case letters, numbers and underscores only",
                                },
                            })}
                            disabled={isEdit}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
                            placeholder={toCode(label ?? "") || "intraocular_pressure"}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            {isEdit
                                ? "Permanent — every recorded reading points at it. Rename above instead."
                                : "Permanent identifier. Derived from the name if left blank."}
                        </p>
                        {errors.code && (
                            <p className="mt-1 text-xs text-rose-600">{errors.code.message}</p>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Kind of value
                        </label>
                        <select
                            {...register("value_type")}
                            disabled={isEdit}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
                        >
                            {TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                            {isEdit
                                ? "Cannot change — every existing reading is stored in the column this chose."
                                : typeHint}
                        </p>
                    </div>

                    {isNumeric && (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Unit
                            </label>
                            <input
                                {...register("unit")}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                placeholder="mmHg, kg, °C…"
                            />
                        </div>
                    )}
                </div>

                {valueType === "choice" && (
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Options <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            {...register("choices")}
                            rows={4}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                            placeholder={"Alert\nVoice\nPain\nUnresponsive"}
                        />
                        <p className="mt-1 text-xs text-slate-500">One per line.</p>
                    </div>
                )}

                {isNumeric && (
                    <>
                        <fieldset className="rounded-xl border border-slate-200 p-3">
                            <legend className="px-1 text-sm font-medium text-slate-700">
                                Usual range
                            </legend>
                            <p className="mb-2 text-xs text-slate-500">
                                Readings outside this are <strong>highlighted</strong>, never
                                blocked — a dangerous value still has to be recordable. Leave blank
                                if there is no published range.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    {...register("min_normal")}
                                    type="number"
                                    step="any"
                                    placeholder="Low"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                />
                                <input
                                    {...register("max_normal")}
                                    type="number"
                                    step="any"
                                    placeholder="High"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                />
                            </div>
                        </fieldset>

                        <fieldset className="rounded-xl border border-slate-200 p-3">
                            <legend className="px-1 text-sm font-medium text-slate-700">
                                Impossible values
                            </legend>
                            <p className="mb-2 text-xs text-slate-500">
                                Readings outside this are <strong>rejected</strong> as typing
                                mistakes. Set these wide — a pulse of 4000 is a slip, but 190 is a
                                patient. A stored typo poisons every average taken from it
                                afterwards.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    {...register("min_allowed")}
                                    type="number"
                                    step="any"
                                    placeholder="Lowest possible"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                />
                                <input
                                    {...register("max_allowed")}
                                    type="number"
                                    step="any"
                                    placeholder="Highest possible"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                />
                            </div>
                        </fieldset>
                    </>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Display order
                        </label>
                        <input
                            type="number"
                            {...register("display_order", { valueAsNumber: true })}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                        />
                    </div>
                    {isEdit && !definition?.is_system && (
                        <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input type="checkbox" {...register("is_active")} className="rounded" />
                                In use
                            </label>
                        </div>
                    )}
                </div>

                {definition?.is_system && (
                    <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                        This is a core vital. Its name and ranges can be changed — normal ranges
                        differ by population, and a paediatric pulse range is not an adult one —
                        but it cannot be switched off, because other screens read the vitals column
                        it writes.
                    </p>
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
                        type="submit"
                        disabled={isSaving}
                        className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
                    >
                        {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add observation"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
