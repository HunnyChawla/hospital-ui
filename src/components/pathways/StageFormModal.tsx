"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import { Pathway, PathwayStage, StageType } from "@/services/pathwaysApi";
import { useAddStage, useUpdateStage } from "@/hooks/queries/usePathways";

interface StageFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    pathway: Pathway;
    /** Null adds a stage; a stage edits it. */
    stage?: PathwayStage | null;
}

interface FormValues {
    code: string;
    label: string;
    stage_type: StageType;
    assigned_role: string;
    is_initial: boolean;
    is_terminal: boolean;
    entry_from_codes: string[];
    entry_blocked_from_codes: string[];
    stamps_consultation_started: boolean;
    stamps_consultation_ended: boolean;
}

const STAGE_TYPES: { value: StageType; label: string; hint: string }[] = [
    { value: "waiting", label: "Waiting", hint: "Nobody is acting yet — the patient sits in a queue" },
    { value: "assisted", label: "Assisted", hint: "A nurse, optometrist or technician is working" },
    { value: "consultation", label: "Consultation", hint: "The doctor is with the patient" },
    { value: "procedure", label: "Procedure", hint: "A timed step that interrupts the flow" },
    { value: "terminal", label: "End", hint: "The visit is over" },
];

export function StageFormModal({ isOpen, onClose, pathway, stage }: StageFormModalProps) {
    const isEdit = !!stage;
    const addStage = useAddStage();
    const updateStage = useUpdateStage();

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>();

    useEffect(() => {
        if (!isOpen) return;
        reset({
            code: stage?.code ?? "",
            label: stage?.label ?? "",
            stage_type: stage?.stage_type ?? "waiting",
            assigned_role: stage?.assigned_role ?? "",
            is_initial: stage?.is_initial ?? false,
            is_terminal: stage?.is_terminal ?? false,
            entry_from_codes: stage?.entry_from_codes ?? [],
            entry_blocked_from_codes: stage?.entry_blocked_from_codes ?? [],
            stamps_consultation_started: stage?.stamps_consultation_started ?? false,
            stamps_consultation_ended: stage?.stamps_consultation_ended ?? false,
        });
    }, [isOpen, stage, reset]);

    const selectedType = watch("stage_type");
    const otherStages = pathway.stages.filter((s) => s.code !== stage?.code);

    const onSubmit = async (values: FormValues) => {
        const assignedRole = values.assigned_role.trim() || null;
        const entryFrom = values.entry_from_codes ?? [];
        const entryBlocked = values.entry_blocked_from_codes ?? [];

        if (isEdit && stage) {
            await updateStage.mutateAsync({
                pathwayId: pathway.id,
                stageCode: stage.code,
                data: {
                    label: values.label.trim(),
                    stage_type: values.stage_type,
                    assigned_role: assignedRole,
                    is_initial: values.is_initial,
                    is_terminal: values.is_terminal,
                    stamps_consultation_started: values.stamps_consultation_started,
                    stamps_consultation_ended: values.stamps_consultation_ended,
                    // An empty selection means "from anywhere", which is a clear
                    // rather than an empty list — the API distinguishes them.
                    ...(entryFrom.length
                        ? { entry_from_codes: entryFrom }
                        : { clear_entry_from: true }),
                    ...(entryBlocked.length
                        ? { entry_blocked_from_codes: entryBlocked }
                        : { clear_entry_blocked_from: true }),
                },
            });
        } else {
            await addStage.mutateAsync({
                pathwayId: pathway.id,
                data: {
                    code: values.code.trim(),
                    label: values.label.trim(),
                    stage_type: values.stage_type,
                    assigned_role: assignedRole,
                    is_initial: values.is_initial,
                    is_terminal: values.is_terminal,
                    entry_from_codes: entryFrom.length ? entryFrom : null,
                    entry_blocked_from_codes: entryBlocked.length ? entryBlocked : null,
                    stamps_consultation_started: values.stamps_consultation_started,
                    stamps_consultation_ended: values.stamps_consultation_ended,
                },
            });
        }
        onClose();
    };

    const isSaving = addStage.isPending || updateStage.isPending;
    const typeHint = STAGE_TYPES.find((t) => t.value === selectedType)?.hint;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit "${stage?.label}"` : "Add a stage"}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Name shown to staff <span className="text-rose-500">*</span>
                        </label>
                        <input
                            {...register("label", { required: "A name is required" })}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                            placeholder="Waiting for nurse"
                        />
                        {errors.label && (
                            <p className="mt-1 text-xs text-rose-600">{errors.label.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Code {!isEdit && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                            {...register("code", {
                                required: isEdit ? false : "A code is required",
                                pattern: {
                                    value: /^[a-z][a-z0-9_]{1,63}$/,
                                    message: "Lower case letters, numbers and underscores only",
                                },
                            })}
                            disabled={isEdit}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
                            placeholder="awaiting_nurse"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            {isEdit
                                ? "Codes never change — they are the status stored on every visit and the strings the waiting-room screens ask for. Rename above instead."
                                : "Permanent. It becomes the status stored on every visit that reaches this stage."}
                        </p>
                        {errors.code && (
                            <p className="mt-1 text-xs text-rose-600">{errors.code.message}</p>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Kind of step
                        </label>
                        <select
                            {...register("stage_type")}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                        >
                            {STAGE_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        {typeHint && <p className="mt-1 text-xs text-slate-500">{typeHint}</p>}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Who handles it
                        </label>
                        <input
                            {...register("assigned_role")}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                            placeholder="nurse, optometrist, doctor…"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Decides whose panel this stage appears on. Leave blank for none.
                        </p>
                    </div>
                </div>

                <fieldset className="rounded-xl border border-slate-200 p-3">
                    <legend className="px-1 text-sm font-medium text-slate-700">
                        Where it sits in the flow
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex items-start gap-2 text-sm text-slate-700">
                            <input type="checkbox" {...register("is_initial")} className="mt-1 rounded" />
                            <span>
                                Patients can start here
                                <span className="block text-xs text-slate-500">
                                    A pathway needs at least one of these before it can be turned on
                                </span>
                            </span>
                        </label>
                        <label className="flex items-start gap-2 text-sm text-slate-700">
                            <input type="checkbox" {...register("is_terminal")} className="mt-1 rounded" />
                            <span>
                                The visit is finished here
                                <span className="block text-xs text-slate-500">
                                    Without one, a patient could enter and never leave
                                </span>
                            </span>
                        </label>
                    </div>
                </fieldset>

                {otherStages.length > 0 && (
                    <fieldset className="rounded-xl border border-slate-200 p-3">
                        <legend className="px-1 text-sm font-medium text-slate-700">
                            Entry rules
                        </legend>
                        <p className="mb-3 text-xs text-slate-500">
                            Leave both empty to allow arriving from any stage. Real flows are not a
                            straight line — a patient marked absent can come back, and a dilation
                            detour rejoins later — so these are rules, not an order.
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                    Only reachable from
                                </label>
                                <select
                                    multiple
                                    {...register("entry_from_codes")}
                                    className="h-28 w-full rounded-xl border border-slate-200 px-2 py-1 text-sm outline-none focus:border-sky-400"
                                >
                                    {otherStages.map((s) => (
                                        <option key={s.code} value={s.code}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                    Never reachable from
                                </label>
                                <select
                                    multiple
                                    {...register("entry_blocked_from_codes")}
                                    className="h-28 w-full rounded-xl border border-slate-200 px-2 py-1 text-sm outline-none focus:border-sky-400"
                                >
                                    {otherStages.map((s) => (
                                        <option key={s.code} value={s.code}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-slate-500">
                                    Checked first — a blocked stage stays blocked even if it is also
                                    listed on the left.
                                </p>
                            </div>
                        </div>
                    </fieldset>
                )}

                <fieldset className="rounded-xl border border-slate-200 p-3">
                    <legend className="px-1 text-sm font-medium text-slate-700">
                        Consultation timing
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                {...register("stamps_consultation_started")}
                                className="rounded"
                            />
                            Starts the consultation clock
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                {...register("stamps_consultation_ended")}
                                className="rounded"
                            />
                            Stops the consultation clock
                        </label>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        These drive the waiting-time estimates patients see, so they should mark the
                        stages where the doctor actually starts and finishes.
                    </p>
                </fieldset>

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
                        {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add stage"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
