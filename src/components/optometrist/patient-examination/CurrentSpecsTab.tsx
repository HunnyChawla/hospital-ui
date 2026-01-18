"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Save, X, RotateCcw, Glasses, Check, ThumbsUp, ThumbsDown, Settings } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { CurrentSpecsRecord } from "@/types";

import { EyeValueInput, NumericStepper } from "../shared";
import { currentSpecsApi } from "@/services/currentSpecsApi";
import { handleError } from "@/utils/errorHandler";
import { useRefractionSettings } from "@/hooks/useRefractionSettings";
import { RefractionSettingsModal } from "./RefractionSettingsModal";

interface CurrentSpecsTabProps {
    patientId: string;
    visitId: string;
    optometristId: string;
    currentSpecsRecords: CurrentSpecsRecord[];
    loading: boolean;
    onRefresh: () => void;
}

interface CurrentSpecsFormData {
    od: {
        sph: number | null;
        cyl: number | null;
        axis: number | null;
        add: number | null;
    };
    os: {
        sph: number | null;
        cyl: number | null;
        axis: number | null;
        add: number | null;
    };
    lens_type: "SINGLE" | "BIFOCAL" | "PROGRESSIVE" | null;
    usage: "DISTANCE" | "NEAR" | "BOTH" | null;
    measured_by: "LENSOMETER" | "PATIENT_REPORTED" | "PRESCRIPTION" | null;
    is_comfortable: boolean | null;
    remarks: string;
}

const initialFormData: CurrentSpecsFormData = {
    od: { sph: null, cyl: null, axis: null, add: null },
    os: { sph: null, cyl: null, axis: null, add: null },
    lens_type: null,
    usage: null,
    measured_by: null,
    is_comfortable: null,
    remarks: "",
};

const LENS_TYPE_OPTIONS = [
    { value: "SINGLE", label: "Single Vision" },
    { value: "BIFOCAL", label: "Bifocal" },
    { value: "PROGRESSIVE", label: "Progressive" },
];

const USAGE_OPTIONS = [
    { value: "DISTANCE", label: "Distance Only" },
    { value: "NEAR", label: "Near Only" },
    { value: "BOTH", label: "Distance & Near" },
];

const MEASURED_BY_OPTIONS = [
    { value: "LENSOMETER", label: "Lensometer" },
    { value: "PATIENT_REPORTED", label: "Patient Reported" },
    { value: "PRESCRIPTION", label: "Prescription" },
];

export function CurrentSpecsTab({
    patientId,
    visitId,
    optometristId,
    currentSpecsRecords,
    loading,
    onRefresh,
}: CurrentSpecsTabProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<CurrentSpecsFormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [visitRecords, setVisitRecords] = useState<CurrentSpecsRecord[]>([]);

    // Settings Hook
    const {
        settings,
        updateSettings,
        isSettingsOpen: showSettings,
        setIsSettingsOpen: setShowSettings,
        spherePresets,
        cylinderPresets,
        axisPresets,
        addPowerPresets
    } = useRefractionSettings();

    const toNumberOrNull = (v: any): number | null => {
        if (v === null || v === undefined || v === "") return null;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isNaN(n) ? null : n;
    };

    // Fetch records for current visit
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!visitId) {
                if (mounted) setVisitRecords([]);
                return;
            }
            try {
                const res = await currentSpecsApi.list({ visit_id: visitId });
                if (mounted) setVisitRecords(res.items || []);
            } catch (e) {
                // Silently fail
            }
        })();
        return () => {
            mounted = false;
        };
    }, [visitId]);

    // Get current visit record
    const visitRecord = useMemo(() => {
        return visitRecords.find((r) => r.visit_id === visitId) ||
            (currentSpecsRecords || []).find((r) => r.visit_id === visitId);
    }, [visitRecords, currentSpecsRecords, visitId]);

    const hasExistingForVisit = !!visitRecord;

    // Pre-fill form when editing
    useEffect(() => {
        if (!visitId) {
            handleReset();
            return;
        }

        if (visitRecord) {
            setFormData({
                od: {
                    sph: toNumberOrNull(visitRecord.od_sph),
                    cyl: toNumberOrNull(visitRecord.od_cyl),
                    axis: toNumberOrNull(visitRecord.od_axis),
                    add: toNumberOrNull(visitRecord.od_add),
                },
                os: {
                    sph: toNumberOrNull(visitRecord.os_sph),
                    cyl: toNumberOrNull(visitRecord.os_cyl),
                    axis: toNumberOrNull(visitRecord.os_axis),
                    add: toNumberOrNull(visitRecord.os_add),
                },
                lens_type: visitRecord.lens_type ?? null,
                usage: visitRecord.usage ?? null,
                measured_by: visitRecord.measured_by ?? null,
                is_comfortable: visitRecord.is_comfortable ?? null,
                remarks: visitRecord.remarks ?? "",
            });
            setEditingId(visitRecord.id);
        } else {
            setFormData(initialFormData);
            setEditingId(null);
        }
    }, [visitId, visitRecord]);

    // Format refraction values for display
    const formatValue = (
        value: number | string | null | undefined,
        type: "sphere" | "cylinder" | "axis" | "add"
    ) => {
        if (value === null || value === undefined || value === "") return "—";
        const num = typeof value === "number" ? value : Number(value);
        if (Number.isNaN(num)) return `${value}`;
        if (type === "axis") return `${Math.round(num)}°`;
        return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
    };

    // Update form field
    const updateField = (
        eye: "od" | "os",
        field: keyof CurrentSpecsFormData["od"],
        value: number | string | null
    ) => {
        setFormData((prev) => ({
            ...prev,
            [eye]: {
                ...prev[eye],
                [field]: value,
            },
        }));
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[`${eye}_${field}`];
            return newErrors;
        });
    };

    // Reset form
    const handleReset = () => {
        setFormData(initialFormData);
        setErrors({});
        setEditingId(null);
    };

    // Validate form - for current specs, we don't require any fields
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        // No required fields for current specs - patient may not have any glasses
        setErrors(newErrors);
        return true;
    };

    // Submit form
    const handleSubmit = async () => {
        if (!visitId) {
            toast.error("No active visit found. Please select/start a visit before saving.");
            return;
        }
        if (!validateForm()) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);

        try {
            const requestData = {
                patient_id: patientId,
                optometrist_id: optometristId,
                visit_id: visitId,
                od: {
                    sph: formData.od.sph,
                    cyl: formData.od.cyl,
                    axis: formData.od.axis,
                    add: formData.od.add,
                },
                os: {
                    sph: formData.os.sph,
                    cyl: formData.os.cyl,
                    axis: formData.os.axis,
                    add: formData.os.add,
                },
                lens_type: formData.lens_type,
                usage: formData.usage,
                measured_by: formData.measured_by,
                is_comfortable: formData.is_comfortable,
                remarks: formData.remarks || null,
            };

            if (editingId) {
                await currentSpecsApi.update(editingId, requestData);
            } else {
                await currentSpecsApi.create(requestData);
            }

            toast.success("Current Specs saved");
            setIsAdding(false);
            handleReset();
            onRefresh();

            // Refresh local records
            try {
                const res = await currentSpecsApi.list({ visit_id: visitId });
                setVisitRecords(res.items || []);
            } catch (e) { }
        } catch (error) {
            handleError(error, {
                defaultMessage: "Failed to save current specs data",
                logError: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                        Current Specs / Glasses
                    </h3>
                    <p className="text-sm text-slate-600">
                        Record patient's existing spectacle prescription
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-violet-600 hover:to-purple-600 transition"
                        >
                            <Plus className="h-4 w-4" />
                            {hasExistingForVisit ? "Edit Current Specs" : "Add Current Specs"}
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        title="Configure Quick Buttons"
                    >
                        <Settings className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Current Visit Display - Only show when there's data for THIS visit */}
            {!isAdding && hasExistingForVisit && visitRecord && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-base font-semibold text-slate-900">
                            This Visit's Current Specs
                        </h4>
                        <div className="flex items-center gap-2">
                            {visitRecord.lens_type && (
                                <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700">
                                    {LENS_TYPE_OPTIONS.find(o => o.value === visitRecord.lens_type)?.label || visitRecord.lens_type}
                                </span>
                            )}
                            {visitRecord.is_comfortable !== null && (
                                <span className={clsx(
                                    "rounded-full px-3 py-1 text-sm font-medium flex items-center gap-1",
                                    visitRecord.is_comfortable
                                        ? "bg-green-100 text-green-700"
                                        : "bg-amber-100 text-amber-700"
                                )}>
                                    {visitRecord.is_comfortable ? (
                                        <><ThumbsUp className="h-3 w-3" /> Comfortable</>
                                    ) : (
                                        <><ThumbsDown className="h-3 w-3" /> Not Comfortable</>
                                    )}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* OD Display */}
                        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                <h5 className="font-semibold text-blue-900">OD (Right Eye)</h5>
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div>
                                        <p className="text-xs text-slate-500">SPH</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {formatValue(visitRecord.od_sph, "sphere")}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">CYL</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {formatValue(visitRecord.od_cyl, "cylinder")}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">AXIS</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {formatValue(visitRecord.od_axis, "axis")}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">ADD</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {formatValue(visitRecord.od_add, "add")}
                                        </p>
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
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div>
                                        <p className="text-xs text-slate-500">SPH</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {formatValue(visitRecord.os_sph, "sphere")}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">CYL</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {formatValue(visitRecord.os_cyl, "cylinder")}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">AXIS</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {formatValue(visitRecord.os_axis, "axis")}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">ADD</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {formatValue(visitRecord.os_add, "add")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    {(visitRecord.usage || visitRecord.measured_by || visitRecord.remarks) && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-sm">
                            {visitRecord.usage && (
                                <div>
                                    <p className="text-slate-500">Usage</p>
                                    <p className="font-medium text-slate-900">
                                        {USAGE_OPTIONS.find(o => o.value === visitRecord.usage)?.label || visitRecord.usage}
                                    </p>
                                </div>
                            )}
                            {visitRecord.measured_by && (
                                <div>
                                    <p className="text-slate-500">Measured By</p>
                                    <p className="font-medium text-slate-900">
                                        {MEASURED_BY_OPTIONS.find(o => o.value === visitRecord.measured_by)?.label || visitRecord.measured_by}
                                    </p>
                                </div>
                            )}
                            {visitRecord.remarks && (
                                <div className="col-span-3">
                                    <p className="text-slate-500">Remarks</p>
                                    <p className="font-medium text-slate-900">{visitRecord.remarks}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Form */}
            {isAdding && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* Form Header with Actions */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div className="flex items-center gap-2">
                            <Glasses className="h-5 w-5 text-violet-600" />
                            <h4 className="text-base font-semibold text-slate-900">
                                {editingId ? "Edit Current Specs" : "New Current Specs Entry"}
                            </h4>
                        </div>
                        <div className="flex items-center gap-2">
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
                        {/* Sphere */}
                        <EyeValueInput
                            label="Sphere (SPH)"
                            odValue={formData.od.sph}
                            osValue={formData.os.sph}
                            onODChange={(v) => updateField("od", "sph", v)}
                            onOSChange={(v) => updateField("os", "sph", v)}
                            step={0.25}
                            min={-30}
                            max={30}
                            unit="D"
                            presets={spherePresets}
                            odError={errors.od_sph}
                            osError={errors.os_sph}
                        />

                        {/* Cylinder */}
                        <EyeValueInput
                            label="Cylinder (CYL)"
                            odValue={formData.od.cyl}
                            osValue={formData.os.cyl}
                            onODChange={(v) => updateField("od", "cyl", v)}
                            onOSChange={(v) => updateField("os", "cyl", v)}
                            step={0.25}
                            min={-10}
                            max={0}
                            unit="D"
                            presets={cylinderPresets}
                        />

                        {/* Axis */}
                        <EyeValueInput
                            label="Axis"
                            odValue={formData.od.axis}
                            osValue={formData.os.axis}
                            onODChange={(v) => updateField("od", "axis", v)}
                            onOSChange={(v) => updateField("os", "axis", v)}
                            step={1}
                            min={0}
                            max={180}
                            unit="°"
                            presets={axisPresets}
                            odError={errors.od_axis}
                            osError={errors.os_axis}
                        />

                        {/* Add Power */}
                        <EyeValueInput
                            label="Add Power (Reading)"
                            odValue={formData.od.add}
                            osValue={formData.os.add}
                            onODChange={(v) => updateField("od", "add", v)}
                            onOSChange={(v) => updateField("os", "add", v)}
                            step={0.25}
                            min={0.5}
                            max={4}
                            unit="D"
                            presets={addPowerPresets}
                        />

                        {/* Additional Fields */}
                        <div className="border-t border-slate-200 pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Lens Type */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Lens Type
                                </label>
                                <select
                                    value={formData.lens_type || ""}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            lens_type: e.target.value as any || null,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                >
                                    <option value="">-- Select --</option>
                                    {LENS_TYPE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Usage */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Usage
                                </label>
                                <select
                                    value={formData.usage || ""}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            usage: e.target.value as any || null,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                >
                                    <option value="">-- Select --</option>
                                    {USAGE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Measured By */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Measured By
                                </label>
                                <select
                                    value={formData.measured_by || ""}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            measured_by: e.target.value as any || null,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                >
                                    <option value="">-- Select --</option>
                                    {MEASURED_BY_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Comfort Toggle */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Is Patient Comfortable with Current Glasses?
                            </label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFormData((prev) => ({ ...prev, is_comfortable: true }))
                                    }
                                    className={clsx(
                                        "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition",
                                        formData.is_comfortable === true
                                            ? "border-green-500 bg-green-50 text-green-700"
                                            : "border-slate-300 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <ThumbsUp className="h-4 w-4" />
                                    Yes, Comfortable
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFormData((prev) => ({ ...prev, is_comfortable: false }))
                                    }
                                    className={clsx(
                                        "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition",
                                        formData.is_comfortable === false
                                            ? "border-amber-500 bg-amber-50 text-amber-700"
                                            : "border-slate-300 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <ThumbsDown className="h-4 w-4" />
                                    No, Issues
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFormData((prev) => ({ ...prev, is_comfortable: null }))
                                    }
                                    className={clsx(
                                        "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition",
                                        formData.is_comfortable === null
                                            ? "border-slate-500 bg-slate-100 text-slate-700"
                                            : "border-slate-300 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    Not Applicable
                                </button>
                            </div>
                        </div>

                        {/* Remarks */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Remarks (optional)
                            </label>
                            <textarea
                                value={formData.remarks}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                                }
                                rows={2}
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                placeholder="Any additional notes about current glasses..."
                            />
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAdding(false);
                                    handleReset();
                                }}
                                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                            >
                                <X className="h-4 w-4" />
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-2 text-sm font-medium text-white shadow-sm hover:from-violet-600 hover:to-purple-600 transition disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save Current Specs
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isAdding && !hasExistingForVisit && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                    <Glasses className="mx-auto h-12 w-12 text-slate-400" />
                    <h4 className="mt-4 text-lg font-semibold text-slate-900">
                        No Current Specs Recorded
                    </h4>
                    <p className="mt-2 text-sm text-slate-600">
                        Click "Add Current Specs" to record the patient's existing glasses prescription.
                    </p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition"
                    >
                        <Plus className="h-4 w-4" />
                        Add Current Specs
                    </button>
                </div>
            )}

            {/* Quick Tips */}
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                <p className="text-sm text-violet-900">
                    <strong>Tips:</strong> Record the patient's current glasses prescription using a
                    lensometer or from their old prescription. Mark if the patient is comfortable
                    with their current glasses to help with new prescription decisions.
                </p>
            </div>
            {/* Settings Modal */}
            <RefractionSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                currentSettings={settings}
                onSave={updateSettings}
            />
        </div>
    );
}
