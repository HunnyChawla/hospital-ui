"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import { Department } from "@/services/departmentsApi";
import { useCreateDepartment, useUpdateDepartment } from "@/hooks/queries/useDepartments";
import { usePathways } from "@/hooks/queries/usePathways";

interface DepartmentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Null creates; a department edits it. */
    department?: Department | null;
}

interface FormValues {
    name: string;
    code: string;
    description: string;
    pathway_id: string;
    display_order: number;
    is_active: boolean;
    needs_review: boolean;
}

/** Sentinel for "no pathway", because a select cannot hold null. */
const FOLLOW_DEFAULT = "";

export function DepartmentFormModal({ isOpen, onClose, department }: DepartmentFormModalProps) {
    const isEdit = !!department;
    const { data: pathways } = usePathways();
    const createDepartment = useCreateDepartment();
    const updateDepartment = useUpdateDepartment();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>();

    useEffect(() => {
        if (!isOpen) return;
        reset({
            name: department?.name ?? "",
            code: department?.code ?? "",
            description: department?.description ?? "",
            pathway_id: department?.pathway_id ?? FOLLOW_DEFAULT,
            display_order: department?.display_order ?? 0,
            is_active: department?.is_active ?? true,
            needs_review: department?.needs_review ?? false,
        });
    }, [isOpen, department, reset]);

    // Only active pathways can be attached; the backend refuses the rest, and
    // offering a choice that will be rejected is worse than not offering it.
    const selectablePathways = (pathways ?? []).filter((p) => p.is_active);
    const defaultPathway = (pathways ?? []).find((p) => p.is_default);

    const onSubmit = async (values: FormValues) => {
        const description = values.description.trim() || null;

        if (isEdit && department) {
            const clearPathway = values.pathway_id === FOLLOW_DEFAULT && !!department.pathway_id;
            await updateDepartment.mutateAsync({
                id: department.id,
                data: {
                    name: values.name.trim(),
                    description,
                    display_order: Number(values.display_order),
                    is_active: values.is_active,
                    // Clearing the review flag is the point of editing a migrated
                    // department, so a rename implies it has been looked at.
                    needs_review: false,
                    ...(clearPathway
                        ? { clear_pathway: true }
                        : values.pathway_id !== FOLLOW_DEFAULT
                          ? { pathway_id: values.pathway_id }
                          : {}),
                },
            });
        } else {
            await createDepartment.mutateAsync({
                name: values.name.trim(),
                code: values.code.trim() || undefined,
                description,
                display_order: Number(values.display_order),
                is_active: values.is_active,
                pathway_id: values.pathway_id === FOLLOW_DEFAULT ? null : values.pathway_id,
            });
        }
        onClose();
    };

    const isSaving = createDepartment.isPending || updateDepartment.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit ${department?.name}` : "Add Department"}
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                        {...register("name", { required: "A name is required" })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                        placeholder="Ophthalmology"
                    />
                    {errors.name && (
                        <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
                    )}
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Code</label>
                    <input
                        {...register("code")}
                        disabled={isEdit}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="Derived from the name if left blank"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        {isEdit
                            ? "The code cannot change — pathways and configuration point at it. Renaming is safe."
                            : "A stable identifier. Configuration points at it, so it never changes afterwards."}
                    </p>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Clinical pathway
                    </label>
                    <select
                        {...register("pathway_id")}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                    >
                        <option value={FOLLOW_DEFAULT}>
                            {defaultPathway
                                ? `Follow the hospital default (${defaultPathway.name})`
                                : "Follow the hospital default"}
                        </option>
                        {selectablePathways.map((pathway) => (
                            <option key={pathway.id} value={pathway.id}>
                                {pathway.name}
                            </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                        The steps a patient moves through in this department. Following the
                        default means this department changes with it; choosing one pins it.
                    </p>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Description
                    </label>
                    <textarea
                        {...register("description")}
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                    />
                </div>

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
                    <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" {...register("is_active")} className="rounded" />
                            Active
                        </label>
                    </div>
                </div>

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
                        {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add department"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
