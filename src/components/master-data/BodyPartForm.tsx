"use client";

import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
    CreateBodyPartRequest,
    BodyPart,
    BodyPartLaterality,
    UpdateBodyPartRequest,
} from "@/services/bodyPartsApi";
import { createBodyPart, updateBodyPart, fetchBodyParts } from "@/redux/bodyPartsSlice";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Plus, Save } from "lucide-react";

const KNOWN_DEPARTMENTS = [
    "Ophthalmology",
    "Orthopedics",
    "ENT",
    "General Surgery",
    "Cardiology",
    "Gynaecology",
    "Urology",
    "Neurosurgery",
    "Dental",
];

type BodyPartFormValues = CreateBodyPartRequest & { is_active_str: "true" | "false" };

type BodyPartFormProps = {
    onCreated?: () => void;
    tenantId?: string;
    initialData?: BodyPart | null;
    knownDepartments?: string[];
};

export function BodyPartForm({ onCreated, tenantId, initialData, knownDepartments }: BodyPartFormProps) {
    const dispatch = useAppDispatch();
    const { lastQuery } = useAppSelector((s) => s.bodyParts);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<BodyPartFormValues>({
        defaultValues: {
            code: initialData?.code || "",
            name: initialData?.name || "",
            department: initialData?.department || "",
            laterality: initialData?.laterality || "na",
            group_code: initialData?.group_code || "",
            description: initialData?.description || "",
            is_active_str: initialData ? (initialData.is_active ? "true" : "false") : "true",
            sort_order: initialData?.sort_order ?? 0,
        },
    });

    const departmentOptions = Array.from(
        new Set([...(knownDepartments || []), ...KNOWN_DEPARTMENTS])
    ).sort();

    const onSubmit = async (values: BodyPartFormValues) => {
        try {
            const payload: CreateBodyPartRequest = {
                name: values.name,
                code: values.code,
                department: values.department,
                laterality: values.laterality as BodyPartLaterality,
                group_code: values.group_code?.trim() || undefined,
                description: values.description?.trim() || undefined,
                is_active: values.is_active_str === "true",
                sort_order: Number(values.sort_order) || 0,
            };

            if (initialData) {
                const updatePayload: UpdateBodyPartRequest = payload;
                await dispatch(updateBodyPart({ id: initialData.id, updates: updatePayload, tenantId })).unwrap();
                toast.success("Body part updated successfully");
            } else {
                await dispatch(createBodyPart({ bodyPart: payload, tenantId })).unwrap();
                toast.success("Body part created successfully");
            }
            onCreated?.();

            dispatch(
                fetchBodyParts(
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
            <label className="space-y-1">
                <span className="text-slate-600">
                    Name <span className="text-rose-500">*</span>
                </span>
                <input
                    type="text"
                    placeholder="Right Knee"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("name", { required: "Name is required" })}
                />
                {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">
                    Short Code <span className="text-rose-500">*</span>
                </span>
                <input
                    type="text"
                    placeholder="KNEE_RIGHT"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("code", { required: "Short code is required" })}
                />
                {errors.code && <p className="text-xs text-rose-500">{errors.code.message}</p>}
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">
                    Department <span className="text-rose-500">*</span>
                </span>
                <input
                    type="text"
                    list="body-part-departments"
                    placeholder="Orthopedics"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("department", { required: "Department is required" })}
                />
                <datalist id="body-part-departments">
                    {departmentOptions.map((dept) => (
                        <option key={dept} value={dept} />
                    ))}
                </datalist>
                {errors.department && <p className="text-xs text-rose-500">{errors.department.message}</p>}
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Laterality</span>
                <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("laterality")}
                >
                    <option value="na">Not applicable</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="bilateral">Bilateral / Both</option>
                </select>
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Group Code</span>
                <input
                    type="text"
                    placeholder="KNEE (groups Right/Left/Both)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("group_code")}
                />
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Sort Order</span>
                <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("sort_order")}
                />
            </label>

            <label className="space-y-1">
                <span className="text-slate-600">Status</span>
                <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
                    {...register("is_active_str")}
                >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>
            </label>

            <label className="col-span-2 space-y-1">
                <span className="text-slate-600">Description</span>
                <textarea
                    rows={2}
                    placeholder="Optional notes about this body part"
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
                    {isSubmitting ? "Saving..." : initialData ? "Update Body Part" : "Create Body Part"}
                </button>
            </div>
        </form>
    );
}
