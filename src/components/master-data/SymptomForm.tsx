"use client";

import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
    CreateSymptomRequest,
    Symptom,
    UpdateSymptomRequest,
    SymptomCategory,
    ApplicableEye,
} from "@/services/symptomsApi";
import { createSymptom, updateSymptom, fetchSymptoms } from "@/redux/symptomsSlice";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Plus, Save } from "lucide-react";

type SymptomFormProps = {
    onCreated?: () => void;
    tenantId?: string;
    initialData?: Symptom | null;
};

const SYMPTOM_CATEGORIES: SymptomCategory[] = ["Visual", "Pain", "Redness", "Discharge", "Neuro"];
const APPLICABLE_EYES: ApplicableEye[] = ["NA", "LEFT", "RIGHT", "BOTH"];

export function SymptomForm({ onCreated, tenantId, initialData }: SymptomFormProps) {
    const dispatch = useAppDispatch();
    const { lastQuery } = useAppSelector((s) => s.symptoms);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CreateSymptomRequest>({
        defaultValues: {
            symptom_name: initialData?.symptom_name || "",
            category: initialData?.category || "Visual",
            description: initialData?.description || "",
            is_eye_specific: initialData?.is_eye_specific || false,
            applicable_eye: initialData?.applicable_eye || "NA",
            display_order: initialData?.display_order || undefined,
        },
    });

    const isEyeSpecific = watch("is_eye_specific");

    const onSubmit = async (values: CreateSymptomRequest) => {
        try {
            const payload: CreateSymptomRequest = {
                ...values,
                description: values.description?.trim() || undefined,
                display_order: values.display_order || undefined,
            };

            if (initialData) {
                const updatePayload: UpdateSymptomRequest = payload;
                await dispatch(updateSymptom({ id: initialData.id, updates: updatePayload, tenantId })).unwrap();
                toast.success("Symptom updated successfully");
            } else {
                await dispatch(createSymptom({ symptom: payload, tenantId })).unwrap();
                toast.success("Symptom created successfully");
            }
            reset();
            onCreated?.();

            // Refresh the list with the last used filters
            dispatch(
                fetchSymptoms(
                    lastQuery || {
                        page: 1,
                        page_size: 20,
                        is_active: true,
                    }
                )
            );
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-3 text-sm p-1">
            <label className="col-span-2 space-y-1">
                <span className="text-slate-600">
                    Symptom Name <span className="text-rose-500">*</span>
                </span>
                <input
                    type="text"
                    placeholder="Blurred Vision"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("symptom_name", { required: "Symptom name is required" })}
                />
                {errors.symptom_name && (
                    <p className="text-xs text-rose-500">{errors.symptom_name.message}</p>
                )}
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">
                    Category <span className="text-rose-500">*</span>
                </span>
                <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("category", { required: "Category is required" })}
                >
                    {SYMPTOM_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
                {errors.category && (
                    <p className="text-xs text-rose-500">{errors.category.message}</p>
                )}
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Display Order</span>
                <input
                    type="number"
                    placeholder="1"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("display_order", { valueAsNumber: true })}
                />
            </label>

            <label className="col-span-2 space-y-1">
                <span className="text-slate-600">Description</span>
                <textarea
                    rows={2}
                    placeholder="Difficulty seeing clearly at distance or near"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("description")}
                />
            </label>

            <label className="col-span-2 flex items-center gap-2">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    {...register("is_eye_specific")}
                />
                <span className="text-sm text-slate-700">Is Eye Specific</span>
            </label>

            {isEyeSpecific && (
                <label className="col-span-2 space-y-1">
                    <span className="text-slate-600">Applicable Eye</span>
                    <select
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                        {...register("applicable_eye")}
                    >
                        {APPLICABLE_EYES.map((eye) => (
                            <option key={eye} value={eye}>
                                {eye}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            <div className="col-span-2 flex justify-end">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-60"
                >
                    {initialData ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isSubmitting ? "Saving..." : initialData ? "Update Symptom" : "Create Symptom"}
                </button>
            </div>
        </form>
    );
}
