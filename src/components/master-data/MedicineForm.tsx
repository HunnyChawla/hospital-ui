"use client";

import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { CreateMedicineRequest, Medicine, UpdateMedicineRequest } from "@/services/medicinesApi";
import { createMedicine, updateMedicine, fetchMedicines } from "@/redux/medicinesSlice";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Plus, Save } from "lucide-react";

type MedicineFormProps = {
    onCreated?: () => void;
    tenantId?: string;
    initialData?: Medicine | null;
};

export function MedicineForm({ onCreated, tenantId, initialData }: MedicineFormProps) {
    const dispatch = useAppDispatch();
    const { lastQuery } = useAppSelector((s) => s.medicines);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CreateMedicineRequest>({
        defaultValues: {
            name: initialData?.name || "",
            generic_name: initialData?.generic_name || "",
            manufacturer: initialData?.manufacturer || "",
            dosage_form: initialData?.dosage_form || "",
            strength: initialData?.strength || "",
            default_dosage: initialData?.default_dosage || "",
            default_frequency: initialData?.default_frequency || "",
            default_duration: initialData?.default_duration || "",
            default_instructions: initialData?.default_instructions || "",
            is_active: initialData?.is_active ?? true,
        },
    });

    const onSubmit = async (values: CreateMedicineRequest) => {
        try {
            const payload: CreateMedicineRequest = {
                name: values.name.trim(),
                generic_name: values.generic_name?.trim() || null,
                manufacturer: values.manufacturer?.trim() || null,
                dosage_form: values.dosage_form?.trim() || null,
                strength: values.strength?.trim() || null,
                default_dosage: values.default_dosage?.trim() || null,
                default_frequency: values.default_frequency?.trim() || null,
                default_duration: values.default_duration?.trim() || null,
                default_instructions: values.default_instructions?.trim() || null,
                is_active: values.is_active,
            };

            if (initialData) {
                const updatePayload: UpdateMedicineRequest = payload;
                await dispatch(updateMedicine({ id: initialData.id, updates: updatePayload, tenantId })).unwrap();
                toast.success("Medicine updated successfully");
            } else {
                await dispatch(createMedicine({ medicine: payload, tenantId })).unwrap();
                toast.success("Medicine created successfully");
            }
            reset();
            onCreated?.();

            // Refresh the list
            dispatch(
                fetchMedicines(
                    lastQuery || {
                        page: 1,
                        page_size: 20,
                        is_active: true,
                        include_global: false,
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
                    Medicine Name <span className="text-rose-500">*</span>
                </span>
                <input
                    type="text"
                    placeholder="e.g. Paracetamol 500mg"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("name", { required: "Medicine name is required" })}
                />
                {errors.name && (
                    <p className="text-xs text-rose-500">{errors.name.message}</p>
                )}
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Generic Name</span>
                <input
                    type="text"
                    placeholder="e.g. Paracetamol"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("generic_name")}
                />
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Manufacturer</span>
                <input
                    type="text"
                    placeholder="e.g. GSK"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("manufacturer")}
                />
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Dosage Form</span>
                <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("dosage_form")}
                >
                    <option value="">Select Form</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Drops">Drops</option>
                    <option value="Cream">Cream</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Gel">Gel</option>
                    <option value="Suspension">Suspension</option>
                    <option value="Powder">Powder</option>
                    <option value="Spray">Spray</option>
                    <option value="Solution">Solution</option>
                    <option value="Lotion">Lotion</option>
                    <option value="Patch">Patch</option>
                    <option value="Suppository">Suppository</option>
                </select>
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Strength</span>
                <input
                    type="text"
                    placeholder="e.g. 500mg, 10ml"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("strength")}
                />
            </label>

            <h3 className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">
                Prescription Defaults (Autofill)
            </h3>

            <label className="space-y-1">
                <span className="text-slate-600">Default Dosage</span>
                <input
                    type="text"
                    placeholder="e.g. 1 tablet"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("default_dosage")}
                />
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Default Frequency</span>
                <input
                    type="text"
                    placeholder="e.g. twice daily"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("default_frequency")}
                />
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Default Duration</span>
                <input
                    type="text"
                    placeholder="e.g. 5 days"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("default_duration")}
                />
            </label>

            <div className="flex items-center gap-2 py-2 pl-2">
                <label className="flex items-center gap-2 cursor-pointer mt-5">
                    <input
                        type="checkbox"
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        {...register("is_active")}
                    />
                    <span className="text-slate-600">Active</span>
                </label>
            </div>

            <label className="col-span-2 space-y-1">
                <span className="text-slate-600">Default Instructions</span>
                <textarea
                    rows={2}
                    placeholder="e.g. Take after food"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("default_instructions")}
                />
            </label>

            <div className="col-span-2 flex justify-end mt-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-60"
                >
                    {initialData ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isSubmitting ? "Saving..." : initialData ? "Update Medicine" : "Create Medicine"}
                </button>
            </div>
        </form>
    );
}
