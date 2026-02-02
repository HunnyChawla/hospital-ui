"use client";

import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { CreateAdviceRequest, Advice, UpdateAdviceRequest } from "@/services/advicesApi";
import { createAdvice, updateAdvice, fetchAdvices } from "@/redux/advicesSlice";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Plus, Save } from "lucide-react";

type AdviceFormProps = {
    onCreated?: () => void;
    tenantId?: string;
    initialData?: Advice | null;
};

export function AdviceForm({ onCreated, tenantId, initialData }: AdviceFormProps) {
    const dispatch = useAppDispatch();
    const { lastQuery } = useAppSelector((s) => s.advices);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CreateAdviceRequest>({
        defaultValues: {
            advice_name: initialData?.advice_name || "",
            category: initialData?.category || "General",
            applicable_eye: initialData?.applicable_eye || null,
            is_post_op: initialData?.is_post_op || false,
            is_active: initialData?.is_active ?? true,
            description: initialData?.description || "",
        },
    });

    const category = watch("category");

    // Auto-set is_post_op if category is Post-Op
    // But user might want to override, so just initialization logic or maybe effect?
    // Let's keep it simple.

    const onSubmit = async (values: CreateAdviceRequest) => {
        try {
            const payload: CreateAdviceRequest = {
                ...values,
                description: values.description?.trim() || undefined,
                // Ensure applicable_eye is null if empty string (from select)
                applicable_eye: values.applicable_eye || null,
            };

            if (initialData) {
                const updatePayload: UpdateAdviceRequest = payload;
                await dispatch(updateAdvice({ id: initialData.id, updates: updatePayload, tenantId })).unwrap();
                toast.success("Advice updated successfully");
            } else {
                await dispatch(createAdvice({ advice: payload, tenantId })).unwrap();
                toast.success("Advice created successfully");
            }
            reset();
            onCreated?.();

            // Refresh the list with the last used filters
            dispatch(
                fetchAdvices(
                    lastQuery || {
                        page: 1,
                        page_size: 20,
                        status: "active",
                    }
                )
            );
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-3 text-sm p-1">
            <label className="space-y-1 col-span-2">
                <span className="text-slate-600">
                    Advice Name <span className="text-rose-500">*</span>
                </span>
                <input
                    type="text"
                    placeholder="e.g. Avoid rubbing eyes"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("advice_name", { required: "Advice name is required" })}
                />
                {errors.advice_name && (
                    <p className="text-xs text-rose-500">{errors.advice_name.message}</p>
                )}
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Category <span className="text-rose-500">*</span></span>
                <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("category", { required: "Category is required" })}
                >
                    <option value="General">General</option>
                    <option value="Post-Op">Post-Op</option>
                    <option value="Pre-Op">Pre-Op</option>
                    <option value="Infection">Infection</option>
                    <option value="Allergy">Allergy</option>
                </select>
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Applicable Eye</span>
                <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("applicable_eye")}
                >
                    <option value="">Any / None</option>
                    <option value="LEFT">Left</option>
                    <option value="RIGHT">Right</option>
                    <option value="BOTH">Both</option>
                </select>
            </label>

            <div className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        {...register("is_post_op")}
                    />
                    <span className="text-slate-600">Is Post-Op</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        {...register("is_active")}
                    />
                    <span className="text-slate-600">Active</span>
                </label>
            </div>

            <label className="col-span-2 space-y-1">
                <span className="text-slate-600">Description</span>
                <textarea
                    rows={2}
                    placeholder="Additional details..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("description")}
                />
            </label>

            <div className="col-span-2 flex justify-end">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-60"
                >
                    {initialData ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isSubmitting ? "Saving..." : initialData ? "Update Advice" : "Create Advice"}
                </button>
            </div>
        </form>
    );
}
