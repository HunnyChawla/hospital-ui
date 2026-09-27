"use client";

import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
    CreateVaccineMasterRequest,
    UpdateVaccineMasterRequest,
    VaccineMaster,
} from "@/services/vaccinesApi";
import { createVaccine, updateVaccine, fetchVaccines } from "@/redux/vaccinesSlice";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { isPlatformOwner } from "@/utils/auth";
import { Save, Plus, Globe, Building2, Syringe, Shield, Thermometer, Calendar } from "lucide-react";

const VACCINE_TYPES = [
    "Live Attenuated",
    "Inactivated",
    "Toxoid",
    "Subunit / Conjugate",
    "Recombinant / VLP",
    "mRNA",
    "Viral Vector",
    "Polysaccharide",
    "Combination",
];

const COMMON_ROUTES = [
    "Intramuscular",
    "Subcutaneous",
    "Oral",
    "Intradermal",
    "Intranasal",
];

const COMMON_SITES = [
    "Left upper arm (deltoid)",
    "Right upper arm (deltoid)",
    "Anterolateral aspect of mid-thigh (Left)",
    "Anterolateral aspect of mid-thigh (Right)",
    "Oral cavity",
    "Nasal cavity",
];

type VaccineFormValues = {
    code: string;
    name: string;
    short_name: string;
    vaccine_type: string;
    disease: string;
    description: string;
    route: string;
    administration_site: string;
    dose_volume: string;
    dose_unit: string;
    doses_required: string;
    minimum_age_days: string;
    maximum_age_days: string;
    minimum_interval_days: string;
    storage_min_temp: string;
    storage_max_temp: string;
    schedule_hint: string;
    is_active: boolean;
    is_global: boolean;
};

type VaccineFormProps = {
    onSuccess?: () => void;
    tenantId?: string;
    initialData?: VaccineMaster | null;
};

export function VaccineForm({ onSuccess, tenantId, initialData }: VaccineFormProps) {
    const dispatch = useAppDispatch();
    const { lastQuery } = useAppSelector((s) => s.vaccines);
    const isPlatformOwnerUser = isPlatformOwner();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<VaccineFormValues>({
        defaultValues: {
            code: initialData?.code || "",
            name: initialData?.name || "",
            short_name: initialData?.short_name || "",
            vaccine_type: initialData?.vaccine_type || "",
            disease: initialData?.disease || "",
            description: initialData?.description || "",
            route: initialData?.route || "Intramuscular",
            administration_site: initialData?.administration_site || "",
            dose_volume: initialData?.dose_volume !== null && initialData?.dose_volume !== undefined ? String(initialData.dose_volume) : "0.5",
            dose_unit: initialData?.dose_unit || "mL",
            doses_required: initialData?.doses_required ? String(initialData.doses_required) : "1",
            minimum_age_days: initialData?.minimum_age_days !== null && initialData?.minimum_age_days !== undefined ? String(initialData.minimum_age_days) : "",
            maximum_age_days: initialData?.maximum_age_days !== null && initialData?.maximum_age_days !== undefined ? String(initialData.maximum_age_days) : "",
            minimum_interval_days: initialData?.minimum_interval_days !== null && initialData?.minimum_interval_days !== undefined ? String(initialData.minimum_interval_days) : "",
            storage_min_temp: initialData?.storage_min_temp !== null && initialData?.storage_min_temp !== undefined ? String(initialData.storage_min_temp) : "2.0",
            storage_max_temp: initialData?.storage_max_temp !== null && initialData?.storage_max_temp !== undefined ? String(initialData.storage_max_temp) : "8.0",
            schedule_hint: initialData?.schedule_hint || "",
            is_active: initialData ? initialData.is_active : true,
            is_global: initialData ? initialData.tenant_id === null : false,
        },
    });

    const onSubmit = async (values: VaccineFormValues) => {
        try {
            const payload: CreateVaccineMasterRequest = {
                code: values.code.trim(),
                name: values.name.trim(),
                short_name: values.short_name?.trim() || undefined,
                vaccine_type: values.vaccine_type?.trim() || undefined,
                disease: values.disease?.trim() || undefined,
                description: values.description?.trim() || undefined,
                route: values.route?.trim() || undefined,
                administration_site: values.administration_site?.trim() || undefined,
                dose_volume: values.dose_volume ? parseFloat(values.dose_volume) : undefined,
                dose_unit: values.dose_unit?.trim() || "mL",
                doses_required: values.doses_required ? parseInt(values.doses_required, 10) : undefined,
                minimum_age_days: values.minimum_age_days ? parseInt(values.minimum_age_days, 10) : undefined,
                maximum_age_days: values.maximum_age_days ? parseInt(values.maximum_age_days, 10) : undefined,
                minimum_interval_days: values.minimum_interval_days ? parseInt(values.minimum_interval_days, 10) : undefined,
                storage_min_temp: values.storage_min_temp ? parseFloat(values.storage_min_temp) : undefined,
                storage_max_temp: values.storage_max_temp ? parseFloat(values.storage_max_temp) : undefined,
                schedule_hint: values.schedule_hint?.trim() || undefined,
                is_active: values.is_active,
            };

            if (initialData) {
                const updatePayload: UpdateVaccineMasterRequest = payload;
                await dispatch(
                    updateVaccine({
                        id: initialData.id,
                        updates: updatePayload,
                        tenantId: values.is_global ? undefined : (tenantId || undefined),
                    })
                ).unwrap();
                toast.success("Vaccine updated successfully");
            } else {
                await dispatch(
                    createVaccine({
                        vaccine: payload,
                        isGlobal: values.is_global,
                        tenantId: values.is_global ? undefined : (tenantId || undefined),
                    })
                ).unwrap();
                toast.success("Vaccine created successfully");
            }

            onSuccess?.();
            dispatch(
                fetchVaccines(
                    lastQuery || {
                        page: 1,
                        page_size: 20,
                        is_active: true,
                        tenant_id: tenantId || undefined,
                    }
                )
            );
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-sm p-1 max-h-[80vh] overflow-y-auto pr-1">
            {/* Scope selection for Platform Owner */}
            {isPlatformOwnerUser && !initialData && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Globe className="h-5 w-5 text-sky-600 shrink-0" />
                        <div>
                            <p className="font-semibold text-slate-800 text-xs sm:text-sm">Create as Global Master Data</p>
                            <p className="text-xs text-slate-500">Global vaccines are accessible across all hospitals</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            {...register("is_global")}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                </div>
            )}

            {/* SECTION 1: Identification */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <Shield className="h-4 w-4 text-sky-600" />
                    <h4 className="font-semibold text-slate-800 text-sm">Vaccine Identification</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                            Vaccine Code <span className="text-rose-500">*</span>
                        </label>
                        <input
                            {...register("code", { required: "Code is required" })}
                            placeholder="e.g. BCG, HEPB, MMR"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                        {errors.code && <p className="text-xs text-rose-500 mt-1">{errors.code.message}</p>}
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                            Full Vaccine Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            {...register("name", { required: "Name is required" })}
                            placeholder="e.g. Bacillus Calmette–Guérin (BCG)"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                        {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Short Name / Alias</label>
                        <input
                            {...register("short_name")}
                            placeholder="e.g. BCG, Hep B"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Target Disease(s)</label>
                        <input
                            {...register("disease")}
                            placeholder="e.g. Tuberculosis, Hepatitis B, Polio"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Vaccine Classification</label>
                        <input
                            {...register("vaccine_type")}
                            list="vaccine-types-list"
                            placeholder="e.g. Live Attenuated, Inactivated, Toxoid"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                        <datalist id="vaccine-types-list">
                            {VACCINE_TYPES.map((t) => (
                                <option key={t} value={t} />
                            ))}
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Clinical Schedule Hint</label>
                        <input
                            {...register("schedule_hint")}
                            placeholder="e.g. At birth, 6, 10, 14 weeks"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Description & Indications</label>
                    <textarea
                        {...register("description")}
                        rows={2}
                        placeholder="Clinical notes, indications, protective efficacy..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
                    />
                </div>
            </div>

            {/* SECTION 2: Administration */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <Syringe className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-semibold text-slate-800 text-sm">Administration Details</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Route</label>
                        <input
                            {...register("route")}
                            list="routes-list"
                            placeholder="e.g. Intramuscular, Oral"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                        <datalist id="routes-list">
                            {COMMON_ROUTES.map((r) => (
                                <option key={r} value={r} />
                            ))}
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Administration Site</label>
                        <input
                            {...register("administration_site")}
                            list="sites-list"
                            placeholder="e.g. Left upper arm, Anterolateral thigh"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                        <datalist id="sites-list">
                            {COMMON_SITES.map((s) => (
                                <option key={s} value={s} />
                            ))}
                        </datalist>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Dose Volume</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register("dose_volume")}
                            placeholder="0.5"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Dose Unit</label>
                        <select
                            {...register("dose_unit")}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 bg-white"
                        >
                            <option value="mL">mL</option>
                            <option value="drops">drops</option>
                            <option value="doses">doses</option>
                            <option value="vial">vial</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Doses Required</label>
                        <input
                            type="number"
                            min="1"
                            {...register("doses_required")}
                            placeholder="1"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Min Interval (Days)</label>
                        <input
                            type="number"
                            min="0"
                            {...register("minimum_interval_days")}
                            placeholder="e.g. 28"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>
                </div>
            </div>

            {/* SECTION 3: Scheduling & Storage */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <h4 className="font-semibold text-slate-800 text-sm">Age Limits & Cold Chain Storage</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Min Age (Days)</label>
                        <input
                            type="number"
                            min="0"
                            {...register("minimum_age_days")}
                            placeholder="0 (Birth)"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Max Age (Days)</label>
                        <input
                            type="number"
                            min="0"
                            {...register("maximum_age_days")}
                            placeholder="e.g. 365"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Min Temp (°C)</label>
                        <input
                            type="number"
                            step="0.1"
                            {...register("storage_min_temp")}
                            placeholder="2.0"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Max Temp (°C)</label>
                        <input
                            type="number"
                            step="0.1"
                            {...register("storage_max_temp")}
                            placeholder="8.0"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>
                </div>
            </div>

            {/* SECTION 4: Status Toggle */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">Active Status</span>
                    <span className="text-xs text-slate-500">(Inactive vaccines won't appear in routine clinical selection)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        {...register("is_active")}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
                >
                    {initialData ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isSubmitting ? "Saving..." : initialData ? "Update Vaccine" : "Add Vaccine"}
                </button>
            </div>
        </form>
    );
}
