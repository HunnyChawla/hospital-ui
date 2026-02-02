"use client";

import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { CreateDiagnosisRequest, DiagnosisStatus, Diagnosis, UpdateDiagnosisRequest } from "@/services/diagnosesApi";
import { createDiagnosis, updateDiagnosis, fetchDiagnoses } from "@/redux/diagnosesSlice";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Plus, Save } from "lucide-react";

type DiagnosisFormProps = {
    onCreated?: () => void;
    tenantId?: string;
    initialData?: Diagnosis | null;
};

export function DiagnosisForm({ onCreated, tenantId, initialData }: DiagnosisFormProps) {
    const dispatch = useAppDispatch();
    const { lastQuery } = useAppSelector((s) => s.diagnoses);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CreateDiagnosisRequest>({
        defaultValues: {
            diagnosis_code: initialData?.diagnosis_code || "",
            diagnosis_name: initialData?.diagnosis_name || "",
            description: initialData?.description || "",
            category: initialData?.category || "",
            status: initialData?.status || "active",
            icd_10_code: initialData?.icd_10_code || "",
            icd_11_code: initialData?.icd_11_code || "",
        },
    });

    const onSubmit = async (values: CreateDiagnosisRequest) => {
        try {
            const payload: CreateDiagnosisRequest = {
                ...values,
                description: values.description?.trim() || undefined,
                category: values.category?.trim() || undefined,
                icd_10_code: values.icd_10_code?.trim() || undefined,
                icd_11_code: values.icd_11_code?.trim() || undefined,
            };

            if (initialData) {
                const updatePayload: UpdateDiagnosisRequest = payload;
                await dispatch(updateDiagnosis({ id: initialData.id, updates: updatePayload, tenantId })).unwrap();
                toast.success("Diagnosis updated successfully");
            } else {
                await dispatch(createDiagnosis({ diagnosis: payload, tenantId })).unwrap();
                toast.success("Diagnosis created successfully");
            }
            reset();
            onCreated?.();

            // Refresh the list with the last used filters
            dispatch(
                fetchDiagnoses(
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
            <label className="space-y-1">
                <span className="text-slate-600">
                    Diagnosis Code <span className="text-rose-500">*</span>
                </span>
                <input
                    type="text"
                    placeholder="D001"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("diagnosis_code", { required: "Diagnosis code is required" })}
                />
                {errors.diagnosis_code && (
                    <p className="text-xs text-rose-500">{errors.diagnosis_code.message}</p>
                )}
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">
                    Diagnosis Name <span className="text-rose-500">*</span>
                </span>
                <input
                    type="text"
                    placeholder="Diabetes Mellitus"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("diagnosis_name", { required: "Diagnosis name is required" })}
                />
                {errors.diagnosis_name && (
                    <p className="text-xs text-rose-500">{errors.diagnosis_name.message}</p>
                )}
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Category</span>
                <input
                    type="text"
                    placeholder="Endocrine"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("category")}
                />
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Status</span>
                <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("status")}
                >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">ICD-10 Code</span>
                <input
                    type="text"
                    placeholder="E11"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("icd_10_code")}
                />
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">ICD-11 Code</span>
                <input
                    type="text"
                    placeholder="5A14"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("icd_11_code")}
                />
            </label>

            <label className="col-span-2 space-y-1">
                <span className="text-slate-600">Description</span>
                <textarea
                    rows={2}
                    placeholder="Type 2 Diabetes Mellitus without complications"
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
                    {isSubmitting ? "Saving..." : initialData ? "Update Diagnosis" : "Create Diagnosis"}
                </button>
            </div>
        </form>
    );
}
