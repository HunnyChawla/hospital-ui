"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/common/Modal";
import { useCreatePathway, usePathways } from "@/hooks/queries/usePathways";

interface PathwayFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (pathwayId: string) => void;
}

interface FormValues {
    name: string;
    code: string;
    description: string;
    copy_stages_from: string;
}

/** Slug a display name the way the backend's code pattern expects. */
function toCode(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 63);
}

export function PathwayFormModal({ isOpen, onClose, onCreated }: PathwayFormModalProps) {
    const { data: pathways } = usePathways();
    const createPathway = useCreatePathway();

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>();

    useEffect(() => {
        if (!isOpen) return;
        reset({ name: "", code: "", description: "", copy_stages_from: "standard" });
    }, [isOpen, reset]);

    const name = watch("name");
    const derivedCode = toCode(name ?? "");

    const onSubmit = async (values: FormValues) => {
        const pathway = await createPathway.mutateAsync({
            name: values.name.trim(),
            code: values.code.trim() || derivedCode,
            description: values.description.trim() || null,
            copy_stages_from: values.copy_stages_from || undefined,
        });
        onCreated?.(pathway.id);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New pathway" size="md">
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                        {...register("name", { required: "A name is required" })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                        placeholder="Physiotherapy flow"
                    />
                    {errors.name && (
                        <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
                    )}
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Code</label>
                    <input
                        {...register("code", {
                            pattern: {
                                value: /^[a-z][a-z0-9_]{1,63}$/,
                                message: "Lower case letters, numbers and underscores only",
                            },
                        })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-sky-400"
                        placeholder={derivedCode || "physiotherapy_flow"}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Permanent identifier. Derived from the name if left blank.
                    </p>
                    {errors.code && (
                        <p className="mt-1 text-xs text-rose-600">{errors.code.message}</p>
                    )}
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Start from
                    </label>
                    <select
                        {...register("copy_stages_from")}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                    >
                        {(pathways ?? []).map((pathway) => (
                            <option key={pathway.code} value={pathway.code}>
                                Copy the stages from “{pathway.name}”
                            </option>
                        ))}
                        <option value="">Start empty</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                        Copying is almost always the right choice — an empty pathway has no way in
                        or out and cannot be turned on until you add both.
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
                        disabled={createPathway.isPending}
                        className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
                    >
                        {createPathway.isPending ? "Creating…" : "Create pathway"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
