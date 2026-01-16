"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save, Eye, X, RotateCcw, Plus, Copy } from "lucide-react";
import { VisionRecord, CreateVisionRequest } from "@/types";
import { useAppDispatch } from "@/redux/hooks";
import { addVisionRecord } from "@/redux/optometryDataSlice";
import clsx from "clsx";

// Import shared components
import { VASelector } from "../shared";
import { VisionHistorySection } from "./VisionHistorySection";

interface VisionTabProps {
    patientId: string;
    visitId: string;
    optometristId: string;
    visionRecords: VisionRecord[];
    loading?: boolean;
    onRefresh: () => void;
}

interface VisionFormValues {
    // Right Eye (OD)
    od_ucva_distance: string;
    od_ph_va: string;
    od_va_with_current_specs: string;
    od_bcva_distance: string;
    od_near_ucva: string;
    od_near_with_current_specs: string;
    od_near_bcva: string;

    // Left Eye (OS)
    os_ucva_distance: string;
    os_ph_va: string;
    os_va_with_current_specs: string;
    os_bcva_distance: string;
    os_near_ucva: string;
    os_near_with_current_specs: string;
    os_near_bcva: string;

    notes: string;
}

const initialFormData: VisionFormValues = {
    od_ucva_distance: "",
    od_ph_va: "",
    od_va_with_current_specs: "",
    od_bcva_distance: "",
    od_near_ucva: "",
    od_near_with_current_specs: "",
    od_near_bcva: "",
    os_ucva_distance: "",
    os_ph_va: "",
    os_va_with_current_specs: "",
    os_bcva_distance: "",
    os_near_ucva: "",
    os_near_with_current_specs: "",
    os_near_bcva: "",
    notes: "",
};

// Near vision quick select values
const NEAR_VA_OPTIONS = ["N5", "N6", "N8", "N10", "N12", "N14", "N18", "N24", "N36", "N48"];

export function VisionTab({
    patientId,
    visitId,
    optometristId,
    visionRecords,
    loading = false,
    onRefresh,
}: VisionTabProps) {
    const dispatch = useAppDispatch();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Get the record for this visit
    const currentVisitRecord = useMemo(
        () => visionRecords.find((r) => r.visit_id === visitId),
        [visionRecords, visitId]
    );

    const hasExistingForVisit = !!currentVisitRecord;

    const { register, handleSubmit, reset, setValue, watch } = useForm<VisionFormValues>({
        defaultValues: initialFormData,
    });

    const formValues = watch();

    // Populate form when record loads or when starting to edit
    useEffect(() => {
        if (!visitId) {
            reset(initialFormData);
            return;
        }

        if (currentVisitRecord) {
            setValue("od_ucva_distance", currentVisitRecord.od_ucva_distance || "");
            setValue("od_ph_va", currentVisitRecord.od_ph_va || "");
            setValue("od_va_with_current_specs", currentVisitRecord.od_va_with_current_specs || "");
            setValue("od_bcva_distance", currentVisitRecord.od_bcva_distance || "");
            setValue("od_near_ucva", currentVisitRecord.od_near_ucva || "");
            setValue("od_near_with_current_specs", currentVisitRecord.od_near_with_current_specs || "");
            setValue("od_near_bcva", currentVisitRecord.od_near_bcva || "");
            setValue("os_ucva_distance", currentVisitRecord.os_ucva_distance || "");
            setValue("os_ph_va", currentVisitRecord.os_ph_va || "");
            setValue("os_va_with_current_specs", currentVisitRecord.os_va_with_current_specs || "");
            setValue("os_bcva_distance", currentVisitRecord.os_bcva_distance || "");
            setValue("os_near_ucva", currentVisitRecord.os_near_ucva || "");
            setValue("os_near_with_current_specs", currentVisitRecord.os_near_with_current_specs || "");
            setValue("os_near_bcva", currentVisitRecord.os_near_bcva || "");
            setValue("notes", currentVisitRecord.notes || "");
        } else {
            reset(initialFormData);
        }
    }, [currentVisitRecord, visitId, setValue, reset]);

    const handleReset = () => {
        reset(initialFormData);
    };

    const copyODtoOS = () => {
        setValue("os_ucva_distance", formValues.od_ucva_distance);
        setValue("os_ph_va", formValues.od_ph_va);
        setValue("os_va_with_current_specs", formValues.od_va_with_current_specs);
        setValue("os_bcva_distance", formValues.od_bcva_distance);
        setValue("os_near_ucva", formValues.od_near_ucva);
        setValue("os_near_with_current_specs", formValues.od_near_with_current_specs);
        setValue("os_near_bcva", formValues.od_near_bcva);
        toast.success("Copied OD values to OS");
    };

    const onSubmit = async (data: VisionFormValues) => {
        if (!visitId) {
            toast.error("No active visit found. Please select/start a visit before saving vision data.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: CreateVisionRequest = {
                patient_id: patientId,
                visit_id: visitId,
                optometrist_id: optometristId,
                ...data,
            };

            // API handles upsert based on visit_id
            await dispatch(addVisionRecord({ data: payload })).unwrap();

            toast.success("Vision record saved successfully");
            setIsEditing(false);
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to save vision record");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format VA value for display
    const formatVA = (value: string | null | undefined) => {
        return value || "—";
    };

    // Near VA Quick Select Component
    const NearVAQuickSelect = ({
        value,
        onChange,
        label,
        colorScheme = "neutral",
    }: {
        value: string;
        onChange: (val: string) => void;
        label: string;
        colorScheme?: "blue" | "green" | "neutral";
    }) => {
        const colors = {
            blue: {
                quickSelect: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200",
                quickSelectActive: "bg-blue-600 text-white border-blue-600",
            },
            green: {
                quickSelect: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
                quickSelectActive: "bg-green-600 text-white border-green-600",
            },
            neutral: {
                quickSelect: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
                quickSelectActive: "bg-sky-600 text-white border-sky-600",
            },
        };
        const c = colors[colorScheme];

        return (
            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">{label}</label>
                <div className="flex flex-wrap gap-1">
                    {NEAR_VA_OPTIONS.slice(0, 6).map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onChange(opt)}
                            className={clsx(
                                "rounded-md border px-2 py-1 text-xs font-medium transition",
                                value === opt ? c.quickSelectActive : c.quickSelect
                            )}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                        Vision / Visual Acuity
                    </h3>
                    <p className="text-sm text-slate-600">
                        Record distance and near visual acuity for both eyes
                    </p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-teal-600 transition"
                    >
                        <Plus className="h-4 w-4" />
                        {hasExistingForVisit ? "Edit Vision" : "Add Vision"}
                    </button>
                )}
            </div>

            {/* This Visit's Vision - Only show if data exists for current visit */}
            {!isEditing && hasExistingForVisit && currentVisitRecord && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h4 className="mb-4 text-base font-semibold text-slate-900">
                        This Visit's Vision
                    </h4>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* OD Display */}
                        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                <h5 className="font-semibold text-blue-900">OD (Right Eye)</h5>
                            </div>
                            <div className="space-y-3">
                                {/* Distance Vision */}
                                <div>
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Distance</p>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-slate-500">UCVA</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.od_ucva_distance)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">PH</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.od_ph_va)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">W/Specs</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.od_va_with_current_specs)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">BCVA</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.od_bcva_distance)}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Near Vision */}
                                <div className="border-t border-blue-200 pt-2">
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Near</p>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-slate-500">UCNVA</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.od_near_ucva)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">W/Specs</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.od_near_with_current_specs)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">BCNVA</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.od_near_bcva)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* OS Display */}
                        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                                <h5 className="font-semibold text-green-900">OS (Left Eye)</h5>
                            </div>
                            <div className="space-y-3">
                                {/* Distance Vision */}
                                <div>
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Distance</p>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-slate-500">UCVA</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.os_ucva_distance)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">PH</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.os_ph_va)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">W/Specs</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.os_va_with_current_specs)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">BCVA</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.os_bcva_distance)}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Near Vision */}
                                <div className="border-t border-green-200 pt-2">
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Near</p>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-slate-500">UCNVA</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.os_near_ucva)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">W/Specs</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.os_near_with_current_specs)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">BCNVA</p>
                                            <p className="text-lg font-bold text-slate-900">{formatVA(currentVisitRecord.os_near_bcva)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {currentVisitRecord.notes && (
                        <div className="mt-4 rounded-lg bg-slate-50 p-3">
                            <p className="text-sm text-slate-600">
                                <span className="font-medium">Notes:</span> {currentVisitRecord.notes}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Vision Form */}
            {isEditing && (
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        {/* Form Header with Actions */}
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Eye className="h-5 w-5 text-sky-600" />
                                <h4 className="text-base font-semibold text-slate-900">
                                    {hasExistingForVisit ? "Edit Vision Entry" : "New Vision Entry"}
                                </h4>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={copyODtoOS}
                                    className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                                >
                                    <Copy className="h-3 w-3" />
                                    Copy OD → OS
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Reset
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Distance Vision Section */}
                            <div>
                                <h5 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wider">
                                    Distance Vision
                                </h5>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* OD Distance */}
                                    <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                                            <span className="text-xs font-semibold text-blue-700">OD (Right Eye)</span>
                                        </div>
                                        <VASelector
                                            label="UCVA (Uncorrected)"
                                            value={formValues.od_ucva_distance || null}
                                            onChange={(v) => setValue("od_ucva_distance", v)}
                                            colorScheme="blue"
                                        />
                                        <VASelector
                                            label="Pinhole (PH)"
                                            value={formValues.od_ph_va || null}
                                            onChange={(v) => setValue("od_ph_va", v)}
                                            colorScheme="blue"
                                        />
                                        <VASelector
                                            label="With Current Specs"
                                            value={formValues.od_va_with_current_specs || null}
                                            onChange={(v) => setValue("od_va_with_current_specs", v)}
                                            colorScheme="blue"
                                        />
                                        <VASelector
                                            label="BCVA (Best Corrected)"
                                            value={formValues.od_bcva_distance || null}
                                            onChange={(v) => setValue("od_bcva_distance", v)}
                                            colorScheme="blue"
                                        />
                                    </div>

                                    {/* OS Distance */}
                                    <div className="space-y-4 rounded-lg border border-green-200 bg-green-50/50 p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                            <span className="text-xs font-semibold text-green-700">OS (Left Eye)</span>
                                        </div>
                                        <VASelector
                                            label="UCVA (Uncorrected)"
                                            value={formValues.os_ucva_distance || null}
                                            onChange={(v) => setValue("os_ucva_distance", v)}
                                            colorScheme="green"
                                        />
                                        <VASelector
                                            label="Pinhole (PH)"
                                            value={formValues.os_ph_va || null}
                                            onChange={(v) => setValue("os_ph_va", v)}
                                            colorScheme="green"
                                        />
                                        <VASelector
                                            label="With Current Specs"
                                            value={formValues.os_va_with_current_specs || null}
                                            onChange={(v) => setValue("os_va_with_current_specs", v)}
                                            colorScheme="green"
                                        />
                                        <VASelector
                                            label="BCVA (Best Corrected)"
                                            value={formValues.os_bcva_distance || null}
                                            onChange={(v) => setValue("os_bcva_distance", v)}
                                            colorScheme="green"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Near Vision Section */}
                            <div className="border-t border-slate-200 pt-6">
                                <h5 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wider">
                                    Near Vision
                                </h5>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* OD Near */}
                                    <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                                            <span className="text-xs font-semibold text-blue-700">OD (Right Eye)</span>
                                        </div>
                                        <NearVAQuickSelect
                                            label="UCNVA (Uncorrected Near)"
                                            value={formValues.od_near_ucva}
                                            onChange={(v) => setValue("od_near_ucva", v)}
                                            colorScheme="blue"
                                        />
                                        <NearVAQuickSelect
                                            label="Near with Current Specs"
                                            value={formValues.od_near_with_current_specs}
                                            onChange={(v) => setValue("od_near_with_current_specs", v)}
                                            colorScheme="blue"
                                        />
                                        <NearVAQuickSelect
                                            label="BCNVA (Best Corrected Near)"
                                            value={formValues.od_near_bcva}
                                            onChange={(v) => setValue("od_near_bcva", v)}
                                            colorScheme="blue"
                                        />
                                    </div>

                                    {/* OS Near */}
                                    <div className="space-y-4 rounded-lg border border-green-200 bg-green-50/50 p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                            <span className="text-xs font-semibold text-green-700">OS (Left Eye)</span>
                                        </div>
                                        <NearVAQuickSelect
                                            label="UCNVA (Uncorrected Near)"
                                            value={formValues.os_near_ucva}
                                            onChange={(v) => setValue("os_near_ucva", v)}
                                            colorScheme="green"
                                        />
                                        <NearVAQuickSelect
                                            label="Near with Current Specs"
                                            value={formValues.os_near_with_current_specs}
                                            onChange={(v) => setValue("os_near_with_current_specs", v)}
                                            colorScheme="green"
                                        />
                                        <NearVAQuickSelect
                                            label="BCNVA (Best Corrected Near)"
                                            value={formValues.os_near_bcva}
                                            onChange={(v) => setValue("os_near_bcva", v)}
                                            colorScheme="green"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="border-t border-slate-200 pt-6">
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Notes (optional)
                                </label>
                                <textarea
                                    {...register("notes")}
                                    rows={2}
                                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    placeholder="Any observations regarding vision or visual acuity..."
                                />
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        handleReset();
                                    }}
                                    className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                                >
                                    <X className="h-4 w-4" />
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || loading}
                                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-teal-600 transition disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Save Vision Record
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            {/* Empty State */}
            {!isEditing && !hasExistingForVisit && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                    <Eye className="mx-auto h-12 w-12 text-slate-400" />
                    <h4 className="mt-4 text-lg font-semibold text-slate-900">
                        No Vision Recorded
                    </h4>
                    <p className="mt-2 text-sm text-slate-600">
                        Click "Add Vision" to record distance and near visual acuity for both eyes.
                    </p>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition"
                    >
                        <Plus className="h-4 w-4" />
                        Add Vision
                    </button>
                </div>
            )}

            {/* Vision History - Last 5 Visits */}
            {!isEditing && (
                <VisionHistorySection
                    patientId={patientId}
                    currentVisitId={visitId}
                />
            )}

            {/* Quick Tips */}
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm text-sky-900">
                    <strong>Tips:</strong> Use the quick-select buttons for common visual acuity values.
                    The "Copy OD → OS" button copies all right eye values to left eye when both eyes are similar.
                    Distance vision uses Snellen notation (6/6, 6/9, etc.) while near vision uses N-notation (N5, N6, etc.).
                </p>
            </div>
        </div>
    );
}
