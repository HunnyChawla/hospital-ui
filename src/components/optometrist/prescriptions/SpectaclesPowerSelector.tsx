"use client";

import React from "react";
import {
    Glasses,
    CheckCircle2,
    EyeOff,
    Sun,
    Sparkles,
    History,
    Lock,
} from "lucide-react";
import type { OptometryPrescriptionItem } from "@/types";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";

export type SpecsPrescriptionSource = "dry" | "dilated" | "current_glass" | "none";

interface SpectaclesPowerSelectorProps {
    selectedSource: SpecsPrescriptionSource;
    onSelectSource: (source: SpecsPrescriptionSource) => void;
    examinationData?: PrescriptionDataResponse | null;
    specsItems: OptometryPrescriptionItem[];
    readOnly?: boolean;
}

const hasValue = (v: any) => v !== null && v !== undefined && v !== "";

const formatVal = (val: any, isDiopter: boolean = false): string => {
    if (val === null || val === undefined || val === "") return "-";
    const num = typeof val === "number" ? val : parseFloat(String(val));
    if (isNaN(num)) return String(val);
    return isDiopter && num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
};

export function SpectaclesPowerSelector({
    selectedSource,
    onSelectSource,
    examinationData,
    specsItems,
    readOnly = false,
}: SpectaclesPowerSelectorProps) {
    const refr = examinationData?.refraction;
    const currentSpecsRecord = Array.isArray(examinationData?.current_specs)
        ? examinationData.current_specs[0]
        : examinationData?.current_specs;
    const vision = examinationData?.vision;

    const hasDryData = refr ? [
        refr.od_sphere, refr.os_sphere,
        refr.od_cylinder, refr.os_cylinder
    ].some(hasValue) : false;

    const hasDilatedData = refr ? [
        refr.od_dilated_sphere, refr.os_dilated_sphere,
        refr.od_dilated_cylinder, refr.os_dilated_cylinder
    ].some(hasValue) : false;

    const hasCurrentData = currentSpecsRecord ? [
        currentSpecsRecord.od_sph, currentSpecsRecord.os_sph,
        currentSpecsRecord.od_cyl, currentSpecsRecord.os_cyl
    ].some(hasValue) : false;

    const dryOdVa = refr?.od_distance_bcva || refr?.od_visual_acuity_corrected;
    const dryOsVa = refr?.os_distance_bcva || refr?.os_visual_acuity_corrected;
    const dilatedOdVa = refr?.od_dilated_visual_acuity;
    const dilatedOsVa = refr?.os_dilated_visual_acuity;
    const currentOdVa = vision?.od_va_with_current_specs;
    const currentOsVa = vision?.os_va_with_current_specs;

    const options: Array<{
        id: SpecsPrescriptionSource;
        title: string;
        tag: string;
        icon: React.ComponentType<{ className?: string }>;
        isAvailable: boolean;
        renderDetails: () => React.ReactNode;
    }> = [
        {
            id: "none",
            title: "None",
            tag: "Omit Power",
            icon: EyeOff,
            isAvailable: true,
            renderDetails: () => (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100/80">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        Do not print spectacles power or raw refraction tables on the prescription.
                    </p>
                </div>
            ),
        },
        {
            id: "dry",
            title: "Dry Refraction",
            tag: "Manifest",
            icon: Sun,
            isAvailable: hasDryData,
            renderDetails: () => hasDryData ? (
                <div className="mt-2.5 pt-2 border-t border-slate-100/80 space-y-1.5">
                    {/* OD */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200">OD</span>
                            <span className="text-slate-800 font-semibold">
                                {formatVal(refr?.od_sphere, true)} / {formatVal(refr?.od_cylinder, true)}
                                {hasValue(refr?.od_axis) && ` × ${refr?.od_axis}°`}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-sans">
                            {hasValue(refr?.od_add_power) && (
                                <span className="text-sky-700 font-semibold font-mono">+{parseFloat(String(refr?.od_add_power)).toFixed(2)}</span>
                            )}
                            {dryOdVa && <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-mono text-[9px]">{dryOdVa}</span>}
                        </div>
                    </div>
                    {/* OS */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200">OS</span>
                            <span className="text-slate-800 font-semibold">
                                {formatVal(refr?.os_sphere, true)} / {formatVal(refr?.os_cylinder, true)}
                                {hasValue(refr?.os_axis) && ` × ${refr?.os_axis}°`}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-sans">
                            {hasValue(refr?.os_add_power) && (
                                <span className="text-teal-700 font-semibold font-mono">+{parseFloat(String(refr?.os_add_power)).toFixed(2)}</span>
                            )}
                            {dryOsVa && <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-mono text-[9px]">{dryOsVa}</span>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-2.5 pt-2 border-t border-slate-100/80">
                    <p className="text-[11px] text-slate-400 italic">Not recorded in examination</p>
                </div>
            ),
        },
        {
            id: "dilated",
            title: "Dilated Refraction",
            tag: "Cycloplegic",
            icon: Sparkles,
            isAvailable: hasDilatedData,
            renderDetails: () => hasDilatedData ? (
                <div className="mt-2.5 pt-2 border-t border-slate-100/80 space-y-1.5">
                    {/* OD */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200">OD</span>
                            <span className="text-slate-800 font-semibold">
                                {formatVal(refr?.od_dilated_sphere, true)} / {formatVal(refr?.od_dilated_cylinder, true)}
                                {hasValue(refr?.od_dilated_axis) && ` × ${refr?.od_dilated_axis}°`}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-sans">
                            {hasValue(refr?.od_add_power) && (
                                <span className="text-sky-700 font-semibold font-mono">+{parseFloat(String(refr?.od_add_power)).toFixed(2)}</span>
                            )}
                            {dilatedOdVa && <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-mono text-[9px]">{dilatedOdVa}</span>}
                        </div>
                    </div>
                    {/* OS */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200">OS</span>
                            <span className="text-slate-800 font-semibold">
                                {formatVal(refr?.os_dilated_sphere, true)} / {formatVal(refr?.os_dilated_cylinder, true)}
                                {hasValue(refr?.os_dilated_axis) && ` × ${refr?.os_dilated_axis}°`}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-sans">
                            {hasValue(refr?.os_add_power) && (
                                <span className="text-teal-700 font-semibold font-mono">+{parseFloat(String(refr?.os_add_power)).toFixed(2)}</span>
                            )}
                            {dilatedOsVa && <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-mono text-[9px]">{dilatedOsVa}</span>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-2.5 pt-2 border-t border-slate-100/80">
                    <p className="text-[11px] text-slate-400 italic">Not recorded in examination</p>
                </div>
            ),
        },
        {
            id: "current_glass",
            title: "Current Glasses",
            tag: "POG / Habitual",
            icon: History,
            isAvailable: hasCurrentData,
            renderDetails: () => hasCurrentData ? (
                <div className="mt-2.5 pt-2 border-t border-slate-100/80 space-y-1.5">
                    {/* OD */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200">OD</span>
                            <span className="text-slate-800 font-semibold">
                                {formatVal(currentSpecsRecord?.od_sph, true)} / {formatVal(currentSpecsRecord?.od_cyl, true)}
                                {hasValue(currentSpecsRecord?.od_axis) && ` × ${currentSpecsRecord?.od_axis}°`}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-sans">
                            {hasValue(currentSpecsRecord?.od_add) && (
                                <span className="text-sky-700 font-semibold font-mono">+{parseFloat(String(currentSpecsRecord?.od_add)).toFixed(2)}</span>
                            )}
                            {currentOdVa && <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-mono text-[9px]">{currentOdVa}</span>}
                        </div>
                    </div>
                    {/* OS */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200">OS</span>
                            <span className="text-slate-800 font-semibold">
                                {formatVal(currentSpecsRecord?.os_sph, true)} / {formatVal(currentSpecsRecord?.os_cyl, true)}
                                {hasValue(currentSpecsRecord?.os_axis) && ` × ${currentSpecsRecord?.os_axis}°`}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-sans">
                            {hasValue(currentSpecsRecord?.os_add) && (
                                <span className="text-teal-700 font-semibold font-mono">+{parseFloat(String(currentSpecsRecord?.os_add)).toFixed(2)}</span>
                            )}
                            {currentOsVa && <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-mono text-[9px]">{currentOsVa}</span>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-2.5 pt-2 border-t border-slate-100/80">
                    <p className="text-[11px] text-slate-400 italic">Not recorded in examination</p>
                </div>
            ),
        },
    ];

    const selectedOption = options.find((opt) => opt.id === selectedSource);

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5 space-y-4">
            {/* Header / Sub-Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-200/80 pb-3.5">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-500/20">
                        <Glasses className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                                Spectacle Prescription Power
                            </h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100/80 text-sky-800 border border-sky-200">
                                Select 1 to print
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                            Only the chosen power is printed on the patient&apos;s spectacle prescription slip.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {readOnly ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                            <Lock className="h-3 w-3 text-slate-400" />
                            Finalized / Read-Only
                        </span>
                    ) : selectedSource !== "none" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 animate-in fade-in duration-150">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Auto-Saved to Rx
                        </span>
                    ) : null}
                </div>
            </div>

            {/* 4 Interactive Choice Cards */}
            <div
                role="radiogroup"
                aria-label="Spectacle Prescription Power Source"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
            >
                {options.map((option) => {
                    const isSelected = selectedSource === option.id;
                    const isDisabled = !option.isAvailable || readOnly;
                    const Icon = option.icon;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            disabled={isDisabled}
                            onClick={() => onSelectSource(option.id)}
                            className={`group relative text-left p-3.5 rounded-xl border-2 transition-all duration-150 flex flex-col justify-between ${
                                isDisabled
                                    ? "border-slate-200 bg-slate-100/70 text-slate-400 cursor-not-allowed opacity-65"
                                    : isSelected
                                    ? "border-sky-600 bg-sky-50/70 shadow-xs ring-2 ring-sky-500/20 cursor-pointer"
                                    : "border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50/50 text-slate-800 cursor-pointer"
                            }`}
                        >
                            {/* Card Top Row: Radio, Title & Badges */}
                            <div>
                                <div className="flex items-center justify-between gap-1.5 mb-1">
                                    <div className="flex items-center gap-2">
                                        {/* Custom Styled Radio Button */}
                                        <div
                                            className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                isSelected
                                                    ? "border-sky-600 bg-sky-600"
                                                    : isDisabled
                                                    ? "border-slate-300 bg-slate-200/50"
                                                    : "border-slate-300 bg-white group-hover:border-sky-400"
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold tracking-tight ${
                                            isSelected ? "text-sky-950 font-extrabold" : "text-slate-800"
                                        }`}>
                                            {option.title}
                                        </span>
                                    </div>

                                    {/* Status or Tag Badge */}
                                    {isSelected ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-sky-600 text-white px-1.5 py-0.5 rounded-md shadow-2xs">
                                            <CheckCircle2 className="h-2.5 w-2.5" />
                                            Active
                                        </span>
                                    ) : !option.isAvailable ? (
                                        <span className="text-[9px] font-medium text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                                            Empty
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded group-hover:bg-sky-50 group-hover:text-sky-700 transition-colors">
                                            {option.tag}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 ml-6">
                                    <Icon className="h-3 w-3 shrink-0 text-slate-400" />
                                    <span>{option.tag}</span>
                                </div>
                            </div>

                            {/* Card Details / Micro Summary */}
                            {option.renderDetails()}
                        </button>
                    );
                })}
            </div>

            {/* Live Values Table for Selected Power */}
            {selectedSource !== "none" ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Power Values Ready for Prescription Slip:
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                                {selectedOption?.title || selectedSource}
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                            Will appear in official Glasses Rx section
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse border border-slate-200 text-center">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-700 font-semibold">
                                    <th className="border border-slate-200 py-2 px-3 text-left">Eye</th>
                                    <th className="border border-slate-200 py-2 px-3">Sphere (SPH)</th>
                                    <th className="border border-slate-200 py-2 px-3">Cylinder (CYL)</th>
                                    <th className="border border-slate-200 py-2 px-3">Axis</th>
                                    <th className="border border-slate-200 py-2 px-3">Add Power</th>
                                    <th className="border border-slate-200 py-2 px-3">BCVA / VA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { key: "OD", label: "Right Eye (OD)", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
                                    { key: "OS", label: "Left Eye (OS)", badgeClass: "bg-teal-50 text-teal-700 border-teal-200" },
                                ].map(({ key, label, badgeClass }) => {
                                    const item = specsItems.find(
                                        (i) => i.eye === key || (key === "OD" ? i.eye === "RE" : i.eye === "LE")
                                    );
                                    return (
                                        <tr key={key} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="border border-slate-200 py-2 px-3 text-left">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${badgeClass}`}>
                                                    {label}
                                                </span>
                                            </td>
                                            <td className="border border-slate-200 py-2 px-3 font-mono font-semibold text-slate-900">
                                                {formatVal(item?.sphere, true)}
                                            </td>
                                            <td className="border border-slate-200 py-2 px-3 font-mono font-semibold text-slate-900">
                                                {formatVal(item?.cylinder, true)}
                                            </td>
                                            <td className="border border-slate-200 py-2 px-3 font-mono font-medium text-slate-800">
                                                {item?.axis ? `${item.axis}°` : "-"}
                                            </td>
                                            <td className="border border-slate-200 py-2 px-3 font-mono font-semibold text-sky-700">
                                                {formatVal(item?.add_power, true)}
                                            </td>
                                            <td className="border border-slate-200 py-2 px-3 font-mono font-medium text-slate-800">
                                                {item?.visual_acuity || "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5 max-w-md mx-auto">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/70 text-slate-500">
                            <EyeOff className="h-4 w-4" />
                        </div>
                        <p className="text-xs text-slate-700 font-semibold">
                            Spectacles Power Omitted
                        </p>
                        <p className="text-[11px] text-slate-500 leading-normal">
                            No spectacles power will be printed on this prescription. Click on <span className="font-semibold text-slate-700">Dry Refraction</span>, <span className="font-semibold text-slate-700">Dilated Refraction</span>, or <span className="font-semibold text-slate-700">Current Glasses</span> above if you wish to include spectacle power.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
