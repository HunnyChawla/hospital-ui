"use client";

import { ReactNode } from "react";
import { Plus, Edit3, Check, Circle, AlertCircle } from "lucide-react";
import clsx from "clsx";

export type SummaryStatus = "empty" | "partial" | "complete";

interface CompactDataSummaryProps {
    id: string;
    title: string;
    icon: ReactNode;
    status: SummaryStatus;
    statusText?: string;
    summary?: ReactNode;
    onEdit: () => void;
    colorScheme?: "sky" | "emerald" | "amber" | "purple" | "rose" | "blue" | "green" | "violet";
}

const colorSchemes = {
    sky: {
        bg: "bg-sky-50/50",
        border: "border-sky-200/80",
        borderHover: "hover:border-sky-300",
        icon: "text-sky-500",
        iconBg: "bg-sky-50",
        title: "text-slate-700",
        buttonBg: "bg-sky-50 hover:bg-sky-100",
        buttonBorder: "border-sky-200 hover:border-sky-300",
        buttonText: "text-sky-600",
    },
    blue: {
        bg: "bg-blue-50/50",
        border: "border-blue-200/80",
        borderHover: "hover:border-blue-300",
        icon: "text-blue-500",
        iconBg: "bg-blue-50",
        title: "text-slate-700",
        buttonBg: "bg-blue-50 hover:bg-blue-100",
        buttonBorder: "border-blue-200 hover:border-blue-300",
        buttonText: "text-blue-600",
    },
    emerald: {
        bg: "bg-emerald-50/50",
        border: "border-emerald-200/80",
        borderHover: "hover:border-emerald-300",
        icon: "text-emerald-500",
        iconBg: "bg-emerald-50",
        title: "text-slate-700",
        buttonBg: "bg-emerald-50 hover:bg-emerald-100",
        buttonBorder: "border-emerald-200 hover:border-emerald-300",
        buttonText: "text-emerald-600",
    },
    green: {
        bg: "bg-green-50/50",
        border: "border-green-200/80",
        borderHover: "hover:border-green-300",
        icon: "text-green-500",
        iconBg: "bg-green-50",
        title: "text-slate-700",
        buttonBg: "bg-green-50 hover:bg-green-100",
        buttonBorder: "border-green-200 hover:border-green-300",
        buttonText: "text-green-600",
    },
    amber: {
        bg: "bg-amber-50/50",
        border: "border-amber-200/80",
        borderHover: "hover:border-amber-300",
        icon: "text-amber-500",
        iconBg: "bg-amber-50",
        title: "text-slate-700",
        buttonBg: "bg-amber-50 hover:bg-amber-100",
        buttonBorder: "border-amber-200 hover:border-amber-300",
        buttonText: "text-amber-600",
    },
    purple: {
        bg: "bg-purple-50/50",
        border: "border-purple-200/80",
        borderHover: "hover:border-purple-300",
        icon: "text-purple-500",
        iconBg: "bg-purple-50",
        title: "text-slate-700",
        buttonBg: "bg-purple-50 hover:bg-purple-100",
        buttonBorder: "border-purple-200 hover:border-purple-300",
        buttonText: "text-purple-600",
    },
    rose: {
        bg: "bg-rose-50/50",
        border: "border-rose-200/80",
        borderHover: "hover:border-rose-300",
        icon: "text-rose-500",
        iconBg: "bg-rose-50",
        title: "text-slate-700",
        buttonBg: "bg-rose-50 hover:bg-rose-100",
        buttonBorder: "border-rose-200 hover:border-rose-300",
        buttonText: "text-rose-600",
    },
    violet: {
        bg: "bg-violet-50/50",
        border: "border-violet-200/80",
        borderHover: "hover:border-violet-300",
        icon: "text-violet-500",
        iconBg: "bg-violet-50",
        title: "text-slate-700",
        buttonBg: "bg-violet-50 hover:bg-violet-100",
        buttonBorder: "border-violet-200 hover:border-violet-300",
        buttonText: "text-violet-600",
    },
};

const statusConfig = {
    empty: {
        badge: "bg-slate-100 text-slate-600",
        icon: Circle,
        text: "Not filled",
    },
    partial: {
        badge: "bg-amber-100 text-amber-700",
        icon: AlertCircle,
        text: "Partial",
    },
    complete: {
        badge: "bg-emerald-100 text-emerald-700",
        icon: Check,
        text: "Complete",
    },
};

export function CompactDataSummary({
    id,
    title,
    icon,
    status,
    statusText,
    summary,
    onEdit,
    colorScheme = "sky",
}: CompactDataSummaryProps) {
    const colors = colorSchemes[colorScheme];
    const statusStyle = statusConfig[status];
    const StatusIcon = statusStyle.icon;

    const hasData = status !== "empty";
    const buttonText = hasData ? "Edit" : "Fill";
    const ButtonIcon = hasData ? Edit3 : Plus;

    return (
        <div
            id={id}
            className={clsx(
                "rounded-xl border bg-white shadow-sm overflow-hidden transition-all duration-300",
                colors.border,
                colors.borderHover,
                "hover:shadow-md group"
            )}
        >
            {/* Header Row */}
            <div
                className={clsx(
                    "flex items-center justify-between px-4 py-3",
                    "bg-gradient-to-r from-white to-slate-50/80"
                )}
            >
                <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className={clsx("rounded-lg p-2", colors.iconBg, colors.icon)}>
                        {icon}
                    </div>

                    {/* Title & Status */}
                    <div>
                        <h4 className={clsx("text-sm font-semibold", colors.title)}>
                            {title}
                        </h4>
                        <div
                            className={clsx(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium mt-1",
                                statusStyle.badge
                            )}
                        >
                            <StatusIcon className="h-3 w-3" />
                            <span>{statusText || statusStyle.text}</span>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={onEdit}
                    className={clsx(
                        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all border",
                        colors.buttonBg,
                        colors.buttonBorder,
                        colors.buttonText,
                        "hover:shadow-sm active:scale-95"
                    )}
                >
                    <ButtonIcon className="h-4 w-4" />
                    <span>{buttonText}</span>
                </button>
            </div>

            {/* Summary Content - Only shown if data exists */}
            {hasData && summary && (
                <div className={clsx("px-4 py-3 border-t", colors.border, colors.bg)}>
                    {summary}
                </div>
            )}
        </div>
    );
}

// =====================
// Data Summary Renderers
// =====================

// Vision Summary
export function VisionSummary({ record }: { record: any }) {
    if (!record) return null;

    const formatVA = (value: string | null | undefined) => value || "—";

    return (
        <div className="grid grid-cols-2 gap-4 text-sm">
            {/* OD Summary */}
            <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                    <span className="font-medium text-blue-900">OD:</span>
                    <span className="ml-2 text-slate-600">
                        {formatVA(record.od_ucva_distance)}
                        {record.od_ph_va && ` (PH: ${record.od_ph_va})`}
                    </span>
                </div>
            </div>
            {/* OS Summary */}
            <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 flex-shrink-0" />
                <div>
                    <span className="font-medium text-green-900">OS:</span>
                    <span className="ml-2 text-slate-600">
                        {formatVA(record.os_ucva_distance)}
                        {record.os_ph_va && ` (PH: ${record.os_ph_va})`}
                    </span>
                </div>
            </div>
        </div>
    );
}

// Complaints Summary
export function ComplaintsSummary({ complaints }: { complaints: any[] }) {
    if (!complaints || complaints.length === 0) return null;

    // Helper to extract eye abbreviation from complaint text
    const getEyeAbbreviation = (complaintText: string | undefined | null): string | null => {
        if (!complaintText) return null;
        const match = complaintText.match(/\((RE|LE|BE|GE)\)/);
        return match ? match[1] : null;
    };

    // Helper to get eye badge color
    const getEyeBadgeColor = (eye: string) => {
        const eyeUpper = eye.toUpperCase();
        if (eyeUpper.includes("RE")) return "bg-blue-600 text-white";
        if (eyeUpper.includes("LE")) return "bg-green-600 text-white";
        if (eyeUpper.includes("BE")) return "bg-purple-600 text-white";
        if (eyeUpper.includes("GE")) return "bg-slate-600 text-white";
        return "bg-slate-600 text-white";
    };

    return (
        <div className="flex flex-wrap gap-2">
            {complaints.slice(0, 4).map((c, i) => {
                const eyeAbbr = getEyeAbbreviation(c.complaint);
                const complaintTextOnly = c.complaint
                    ? c.complaint.replace(/\s*\((RE|LE|BE|GE)\)\s*$/, "").trim()
                    : "Unknown";

                return (
                    <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700 border border-sky-200"
                    >
                        {complaintTextOnly}
                        {eyeAbbr && (
                            <span className={clsx(
                                "inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px] font-bold",
                                getEyeBadgeColor(eyeAbbr)
                            )}>
                                {eyeAbbr}
                            </span>
                        )}
                    </span>
                );
            })}
            {complaints.length > 4 && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    +{complaints.length - 4} more
                </span>
            )}
        </div>
    );
}

// AR Data Summary
export function ARDataSummary({ record }: { record: any }) {
    if (!record) return null;

    const formatValue = (v: number | string | null | undefined) => {
        if (v == null || v === "") return "—";
        const num = typeof v === "number" ? v : parseFloat(String(v));
        if (isNaN(num)) return String(v);
        return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
    };

    return (
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                    <span className="font-medium text-blue-900">OD:</span>
                    <span className="ml-2 text-slate-600">
                        Sph {formatValue(record.od_sphere)} / Cyl {formatValue(record.od_cylinder)}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 flex-shrink-0" />
                <div>
                    <span className="font-medium text-green-900">OS:</span>
                    <span className="ml-2 text-slate-600">
                        Sph {formatValue(record.os_sphere)} / Cyl {formatValue(record.os_cylinder)}
                    </span>
                </div>
            </div>
        </div>
    );
}

// Refraction Summary
export function RefractionSummary({ record }: { record: any }) {
    if (!record) return null;

    const formatValue = (v: number | string | null | undefined) => {
        if (v == null || v === "") return "—";
        const num = typeof v === "number" ? v : parseFloat(String(v));
        if (isNaN(num)) return String(v);
        return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
    };

    // Handle different record structures
    const odSphere = record.od?.sphere ?? record.od_sphere;
    const odCyl = record.od?.cylinder ?? record.od_cylinder;
    const odDistBCVA = record.od?.distance_bcva ?? record.od_distance_bcva;
    const odNearBCVA = record.od?.near_bcva ?? record.od_near_bcva;

    const osSphere = record.os?.sphere ?? record.os_sphere;
    const osCyl = record.os?.cylinder ?? record.os_cylinder;
    const osDistBCVA = record.os?.distance_bcva ?? record.os_distance_bcva;
    const osNearBCVA = record.os?.near_bcva ?? record.os_near_bcva;

    return (
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                    <span className="font-medium text-blue-900">OD:</span>
                    <div className="ml-2 space-y-0.5">
                        <div className="text-slate-600">
                            Sph {formatValue(odSphere)} / Cyl {formatValue(odCyl)}
                        </div>
                        {(odDistBCVA || odNearBCVA) && (
                            <div className="text-[11px] text-teal-600 font-medium whitespace-nowrap">
                                {odDistBCVA && `DB: ${odDistBCVA}`} {odNearBCVA && `NB: ${odNearBCVA}`}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 flex-shrink-0" />
                <div>
                    <span className="font-medium text-green-900">OS:</span>
                    <div className="ml-2 space-y-0.5">
                        <div className="text-slate-600">
                            Sph {formatValue(osSphere)} / Cyl {formatValue(osCyl)}
                        </div>
                        {(osDistBCVA || osNearBCVA) && (
                            <div className="text-[11px] text-teal-600 font-medium whitespace-nowrap">
                                {osDistBCVA && `DB: ${osDistBCVA}`} {osNearBCVA && `NB: ${osNearBCVA}`}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// IOP Summary
export function IOPSummary({ record }: { record: any }) {
    if (!record) return null;

    const formatPressure = (v: number | string | null | undefined) => {
        if (v == null) return "—";
        const num = typeof v === "number" ? v : parseFloat(v);
        return isNaN(num) ? "—" : `${num} mmHg`;
    };

    return (
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                    <span className="font-medium text-blue-900">OD:</span>
                    <span className="ml-2 text-slate-600">{formatPressure(record.od_pressure)}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 flex-shrink-0" />
                <div>
                    <span className="font-medium text-green-900">OS:</span>
                    <span className="ml-2 text-slate-600">{formatPressure(record.os_pressure)}</span>
                </div>
            </div>
        </div>
    );
}

// Ophthalmic History Summary
export function OphthalmicHistorySummary({ surgeries }: { surgeries: any[] }) {
    if (!surgeries || surgeries.length === 0) return null;

    // Helper to format eye display
    const formatEye = (eye: string) => {
        if (eye === "OD") return "RE";
        if (eye === "OS") return "LE";
        if (eye === "OU") return "BE";
        return eye;
    };

    return (
        <div className="flex flex-wrap gap-2">
            {surgeries.slice(0, 3).map((s, i) => (
                <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-200"
                >
                    {s.surgery_name || s.surgery_type || s.surgeryType || "Unknown Surgery"} ({formatEye(s.eye)})
                </span>
            ))}
            {surgeries.length > 3 && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    +{surgeries.length - 3} more
                </span>
            )}
        </div>
    );
}

// Drug Allergies Summary
export function DrugAllergiesSummary({ allergies }: { allergies: any[] }) {
    if (!allergies || allergies.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {allergies.slice(0, 4).map((a, i) => (
                <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-200"
                >
                    {a.drug_name} - {a.reaction}
                </span>
            ))}
            {allergies.length > 4 && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    +{allergies.length - 4} more
                </span>
            )}
        </div>
    );
}

// Medical History Summary
export function MedicalHistorySummary({ conditions }: { conditions: any[] }) {
    if (!conditions || conditions.length === 0) return null;

    // Mapping of condition names to display labels
    const conditionLabels: Record<string, string> = {
        diabetes: "Diabetes Mellitus",
        hypertension: "Hypertension",
        heart_disease: "Heart Disease",
        thyroid_disorder: "Thyroid Disorder",
        asthma: "Asthma",
        tuberculosis: "Tuberculosis",
        kidney_disease: "Kidney Disease",
        liver_disease: "Liver Disease",
        cancer: "Cancer",
        hiv_aids: "HIV/AIDS",
    };

    // Helper to format condition name
    const formatConditionName = (condition: any): string => {
        const conditionName = condition.condition_name || condition.name || "";
        // Check if we have a predefined label
        if (conditionLabels[conditionName]) {
            return conditionLabels[conditionName];
        }
        // Otherwise, format the name: replace underscores with spaces and capitalize each word
        return conditionName
            .split("_")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
    };

    return (
        <div className="flex flex-wrap gap-2">
            {conditions.slice(0, 4).map((c, i) => (
                <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200"
                >
                    {formatConditionName(c)}
                </span>
            ))}
            {conditions.length > 4 && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    +{conditions.length - 4} more
                </span>
            )}
        </div>
    );
}

// Current Specs Summary
export function CurrentSpecsSummary({ record }: { record: any }) {
    if (!record) return null;

    const formatValue = (v: number | string | null | undefined) => {
        if (v == null || v === "") return "—";
        const num = typeof v === "number" ? v : parseFloat(String(v));
        if (isNaN(num)) return String(v);
        return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
    };

    return (
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                    <span className="font-medium text-blue-900">OD:</span>
                    <span className="ml-2 text-slate-600">
                        Sph {formatValue(record.od_sph)} / Cyl {formatValue(record.od_cyl)}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 flex-shrink-0" />
                <div>
                    <span className="font-medium text-green-900">OS:</span>
                    <span className="ml-2 text-slate-600">
                        Sph {formatValue(record.os_sph)} / Cyl {formatValue(record.os_cyl)}
                    </span>
                </div>
            </div>
        </div>
    );
}

// Merged Vision & Refraction Summary
export function MergedVisionSummary({
    visionRecord,
    arRecord,
    refractionRecord,
    specsRecord,
}: {
    visionRecord: any;
    arRecord: any;
    refractionRecord: any;
    specsRecord: any;
}) {
    const formatVA = (value: string | null | undefined) => value || "—";
    const formatValue = (v: number | string | null | undefined) => {
        if (v == null || v === "") return "—";
        const num = typeof v === "number" ? v : parseFloat(String(v));
        if (isNaN(num)) return String(v);
        return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
    };

    const hasVision = !!visionRecord;
    const hasAR = arRecord && (arRecord.od_sphere != null || arRecord.os_sphere != null);
    const hasRef = refractionRecord && (
        (refractionRecord.od?.sphere != null || refractionRecord.od_sphere != null) ||
        (refractionRecord.os?.sphere != null || refractionRecord.os_sphere != null)
    );
    const hasSpecs = specsRecord && (specsRecord.od_sph != null || specsRecord.os_sph != null);

    return (
        <div className="space-y-2 text-xs">
            {hasVision && (
                <div className="pb-1.5 border-b border-dashed border-slate-200/50">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Vision (UCVA)</span>
                    <div className="flex justify-between">
                        <span className="text-slate-600"><span className="font-medium text-blue-900">OD:</span> {formatVA(visionRecord.od_ucva_distance)}</span>
                        <span className="text-slate-600"><span className="font-medium text-green-900">OS:</span> {formatVA(visionRecord.os_ucva_distance)}</span>
                    </div>
                </div>
            )}
            
            {hasRef && (
                <div className="pb-1.5 border-b border-dashed border-slate-200/50">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Subjective Refraction</span>
                    <div className="flex justify-between">
                        <span className="text-slate-600">
                            <span className="font-medium text-blue-900">OD:</span> Sph {formatValue(refractionRecord.od?.sphere ?? refractionRecord.od_sphere)} / Cyl {formatValue(refractionRecord.od?.cylinder ?? refractionRecord.od_cylinder)}
                        </span>
                        <span className="text-slate-600">
                            <span className="font-medium text-green-900">OS:</span> Sph {formatValue(refractionRecord.os?.sphere ?? refractionRecord.os_sphere)} / Cyl {formatValue(refractionRecord.os?.cylinder ?? refractionRecord.os_cylinder)}
                        </span>
                    </div>
                </div>
            )}

            {hasAR && (
                <div className="pb-1.5 border-b border-dashed border-slate-200/50">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">AR Data (Auto-Refraction)</span>
                    <div className="flex justify-between">
                        <span className="text-slate-600">
                            <span className="font-medium text-blue-900">OD:</span> Sph {formatValue(arRecord.od_sphere)} / Cyl {formatValue(arRecord.od_cylinder)}
                        </span>
                        <span className="text-slate-600">
                            <span className="font-medium text-green-900">OS:</span> Sph {formatValue(arRecord.os_sphere)} / Cyl {formatValue(arRecord.os_cylinder)}
                        </span>
                    </div>
                </div>
            )}

            {hasSpecs && (
                <div>
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Presenting Specs (POG)</span>
                    <div className="flex justify-between">
                        <span className="text-slate-600">
                            <span className="font-medium text-blue-900">OD:</span> Sph {formatValue(specsRecord.od_sph)} / Cyl {formatValue(specsRecord.od_cyl)}
                        </span>
                        <span className="text-slate-600">
                            <span className="font-medium text-green-900">OS:</span> Sph {formatValue(specsRecord.os_sph)} / Cyl {formatValue(specsRecord.os_cyl)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
