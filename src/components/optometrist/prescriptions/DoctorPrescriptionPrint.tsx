"use client";

import React, { forwardRef } from "react";
import type { OptometryPrescription } from "@/types";
import { PrintHeader } from "@/components/common/PrintHeader";
import { useTenant } from "@/hooks/useTenant";

import {
    MessageSquare,
    Activity,
    ClipboardCheck,
    Eye,
    Compass,
    Glasses,
    Layers,
    Pill,
    FlaskConical,
    Info,
    Stethoscope,
    Calendar,
    Hash,
    User,
    UserRound,
    MapPin,
    Phone
} from "lucide-react";

import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";

interface DoctorPrescriptionPrintProps {
    prescription: OptometryPrescription;
    showHeader?: boolean; // When false, shows blank space for pre-printed letterhead
    doctorSignature?: string | null;
    visitData?: PrescriptionDataResponse | null;
    plannedSurgeries?: any[]; // Using any[] to avoid circular dependency issues if strict types are hard, but preferably PlannedSurgery[]
    visibleSections?: string[];
    sectionOrder?: string[];
}

export const DoctorPrescriptionPrint = forwardRef<HTMLDivElement, DoctorPrescriptionPrintProps>(
    ({ prescription, showHeader = true, doctorSignature, visitData, plannedSurgeries, visibleSections, sectionOrder }, ref) => {
        const { tenant } = useTenant();

        // Helper to format date
        const formatDate = (dateStr?: string | null) => {
            if (!dateStr) return "";
            return new Date(dateStr).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        };

        const formatTime = (dateStr?: string | null) => {
            if (!dateStr) return "";
            return new Date(dateStr).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
            });
        };

        // Helper to formatting values
        const formatVal = (val: string | number | null | undefined, isDiopter: boolean = false) => {
            if (val === null || val === undefined || val === "") return "-";
            if (!isDiopter) return val;
            const num = typeof val === "number" ? val : parseFloat(String(val));
            if (isNaN(num)) return String(val);
            return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
        };

        // Determine layout density based on content length
        const medicineCount = prescription.medicine_items?.length || 0;
        const adviceCount = (prescription.advice_items?.length || 0) + (prescription.plan_of_action ? 1 : 0);
        const complaintsCount = visitData?.complaints?.length || 0;
        const surgeriesCount = plannedSurgeries?.length || 0;
        const visionTableVisible = !!(visitData?.vision || visitData?.iop) && (!visibleSections || visibleSections.includes("Vision"));
        const refractionDryVisible = !!(visitData?.refraction?.od_sphere || visitData?.refraction?.os_sphere) && (!visibleSections || visibleSections.includes("Refraction (Dry)"));
        const refractionDilatedVisible = !!(visitData?.refraction?.od_dilated_sphere || visitData?.refraction?.os_dilated_sphere) && (!visibleSections || visibleSections.includes("Refraction (Dilated)"));
        const glassesRxVisible = (prescription.items?.length || 0) > 0 && (!visibleSections || visibleSections.includes("Glasses Rx"));
        const opticalSpecsVisible = !!(prescription.lens_type || prescription.vision_type || prescription.lens_material || (prescription.coatings && prescription.coatings.length > 0)) && (!visibleSections || visibleSections.includes("Optical Specs"));

        const totalItemsScore = medicineCount + adviceCount + complaintsCount + (surgeriesCount * 1.5) +
            (visionTableVisible ? 3 : 0) + (refractionDryVisible ? 3 : 0) + (refractionDilatedVisible ? 3 : 0) + (glassesRxVisible ? 3 : 0) + (opticalSpecsVisible ? 2 : 0);

        // Threshold for applying compact layout
        const isCompact = totalItemsScore > 15; // Lowered threshold for compact
        const isExtremelyCompact = totalItemsScore > 25; // Lowered threshold for extreme

        const spacingClass = isExtremelyCompact ? "mb-0.5" : isCompact ? "mb-1" : "mb-4";
        const sectionFontClass = isExtremelyCompact ? "text-[10px]" : isCompact ? "text-xs" : "text-sm";
        const labelWidth = isCompact ? "w-24" : "w-32";
        const cellPadding = isExtremelyCompact ? "p-0.5" : "p-1";

        const renderSection = (sectionName: string) => {
            switch (sectionName) {
                case "Presenting Complaint":
                    return (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                            <div className="flex items-center gap-1.5 pr-2">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <MessageSquare className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Presenting Complaint
                                </span>
                            </div>
                            <div className="text-xs text-left">
                                {visitData?.complaints && visitData.complaints.length > 0 ? (
                                    <ul className="list-none m-0 p-0">
                                        {visitData.complaints.map((c, idx) => (
                                            <li key={idx} className="font-medium text-slate-900">
                                                {c.complaint} {c.severity ? `[${c.severity}]` : ""} {c.duration ? `— ${c.duration}` : ""} {c.notes ? `(${c.notes})` : ""}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span>-</span>
                                )}
                                {visitData?.medical_conditions && visitData.medical_conditions.length > 0 && (
                                    <div className="mt-1 pt-1 border-t border-slate-200/80 text-[11px] text-slate-700">
                                        <span className="font-bold text-slate-900">Systemic Medical History: </span>
                                        {visitData.medical_conditions.map(m => `${m.condition_name}${m.duration ? ` (${m.duration})` : ""}${m.remarks ? ` [${m.remarks}]` : ""}`).join("; ")}
                                    </div>
                                )}
                                {visitData?.ophthalmic_history && visitData.ophthalmic_history.length > 0 && (
                                    <div className="mt-1 text-[11px] text-slate-700">
                                        <span className="font-bold text-slate-900">Past Ocular History: </span>
                                        {visitData.ophthalmic_history.map(h => `${h.surgery_name} (${h.eye})${h.surgery_date ? ` on ${h.surgery_date}` : ""}`).join("; ")}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                case "Symptoms":
                    return prescription.symptoms && prescription.symptoms.length > 0 ? (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                            <div className="flex items-center gap-1.5 pr-2">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <Activity className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Symptoms
                                </span>
                            </div>
                            <div className="text-xs text-left">
                                <p className="font-medium uppercase">
                                    {prescription.symptoms.map(s => s.symptom_name).join(", ")}
                                </p>
                            </div>
                        </div>
                    ) : null;
                case "Diagnosis":
                    return (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                            <div className="flex items-center gap-1.5 pr-2">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <ClipboardCheck className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Diagnosis
                                </span>
                            </div>
                            <div className="text-xs text-left">
                                {prescription.diagnosis ? (
                                    <p className="uppercase font-medium">{prescription.diagnosis}</p>
                                ) : (
                                    <span>-</span>
                                )}
                            </div>
                        </div>
                    );
                case "Vision":
                    return visionTableVisible ? (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                            <div className="flex items-center gap-1.5 pr-2 pt-1">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <Eye className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Vision
                                </span>
                            </div>
                            <div>
                                <table className="w-full text-xs border-collapse border border-slate-300">
                                    <thead>
                                        <tr className="bg-sky-50/50 text-center">
                                            <th className={`border border-slate-300 ${cellPadding} w-12`} rowSpan={2}>Eye</th>
                                            <th className={`border border-slate-300 ${cellPadding}`} colSpan={2}>Distance Vision</th>
                                            <th className={`border border-slate-300 ${cellPadding}`} colSpan={1}>Near Vision</th>
                                            <th className={`border border-slate-300 ${cellPadding}`} colSpan={1}>IOP</th>
                                        </tr>
                                        <tr className="bg-slate-50 text-center text-[10px]">
                                            <th className={`border border-slate-300 ${cellPadding}`}>UCVA</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>PH</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>UCVA</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>mmHg</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Right Eye */}
                                        <tr>
                                            <td className={`border border-slate-300 ${cellPadding} font-bold text-center`}>Right</td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.vision?.od_ucva_distance || visitData?.refraction?.od_visual_acuity_uncorrected)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.vision?.od_ph_va)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.vision?.od_near_ucva)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.iop?.od_pressure)}
                                            </td>
                                        </tr>
                                        {/* Left Eye */}
                                        <tr>
                                            <td className={`border border-slate-300 ${cellPadding} font-bold text-center`}>Left</td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.vision?.os_ucva_distance || visitData?.refraction?.os_visual_acuity_uncorrected)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.vision?.os_ph_va)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.vision?.os_near_ucva)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.iop?.os_pressure)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                {visitData?.iop?.measurement_method && (
                                    <p className="text-[10px] text-slate-500 mt-1 text-right">
                                        IOP Method: {visitData.iop.measurement_method} ({formatTime(visitData.iop.measurement_time)})
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : null;
                case "Refraction (Dry)":
                    return refractionDryVisible ? (
                        <>
                            <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                                <div className="flex items-center gap-1.5 pr-2">
                                    <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                        <Compass className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                    </div>
                                    <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                        Refraction (Dry)
                                    </span>
                                </div>
                                <div>
                                    <table className="w-full text-xs border-collapse border border-slate-300">
                                        <thead>
                                            <tr className="bg-amber-50/50">
                                                <th className={`border border-slate-300 ${cellPadding} w-12`}>Eye</th>
                                                <th className={`border border-slate-300 ${cellPadding}`}>Sph</th>
                                                <th className={`border border-slate-300 ${cellPadding}`}>Cyl</th>
                                                <th className={`border border-slate-300 ${cellPadding}`}>Axis</th>
                                                <th className={`border border-slate-300 ${cellPadding}`}>BCVA (Dist)</th>
                                                <th className={`border border-slate-300 ${cellPadding}`}>Add</th>
                                                <th className={`border border-slate-300 ${cellPadding}`}>BCVA (Near)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className={`border border-slate-300 ${cellPadding} font-bold text-center`}>Right</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_sphere, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_cylinder, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                    {visitData?.refraction?.od_axis ? `${visitData.refraction.od_axis}°` : "-"}
                                                </td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_distance_bcva || visitData?.refraction?.od_visual_acuity_corrected)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_add_power, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_near_bcva)}</td>
                                            </tr>
                                            <tr>
                                                <td className={`border border-slate-300 ${cellPadding} font-bold text-center`}>Left</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_sphere, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_cylinder, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                    {visitData?.refraction?.os_axis ? `${visitData.refraction.os_axis}°` : "-"}
                                                </td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_distance_bcva || visitData?.refraction?.os_visual_acuity_corrected)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_add_power, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_near_bcva)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            {visitData?.refraction?.notes && !refractionDilatedVisible && (
                                <div className="grid grid-cols-[120px_1fr] gap-2 items-start mt-1">
                                    <div className="w-full"></div>
                                    <p className="text-[10px] text-slate-500 italic text-left">
                                        Refraction Notes: {visitData.refraction.notes}
                                    </p>
                                </div>
                            )}
                        </>
                    ) : null;
                case "Refraction (Dilated)":
                    return refractionDilatedVisible ? (
                        <>
                            <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                                <div className="flex items-center gap-1.5 pr-2">
                                    <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                        <Compass className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                    </div>
                                    <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                        Refraction (Dilated)
                                    </span>
                                </div>
                                <div>
                                    <table className="w-full text-xs border-collapse border border-slate-300">
                                        <thead>
                                            <tr className="bg-teal-50/50">
                                                <th className={`border border-slate-300 ${cellPadding} w-12`}>Eye</th>
                                                <th className={`border border-slate-300 ${cellPadding}`}>Sph</th>
                                                <th className={`border border-slate-300 ${cellPadding}`}>Cyl</th>
                                                <th className={`border border-slate-300 ${cellPadding}`}>Axis</th>
                                                <th className={`border border-slate-300 ${cellPadding}`}>BCVA (Dist)</th>
                                                <th className={`border border-slate-300 ${cellPadding}`}>PH</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className={`border border-slate-300 ${cellPadding} font-bold text-center`}>Right</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_dilated_sphere, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_dilated_cylinder, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                    {visitData?.refraction?.od_dilated_axis ? `${visitData.refraction.od_dilated_axis}°` : "-"}
                                                </td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_dilated_visual_acuity)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_dilated_pinhole)}</td>
                                            </tr>
                                            <tr>
                                                <td className={`border border-slate-300 ${cellPadding} font-bold text-center`}>Left</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_dilated_sphere, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_dilated_cylinder, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                    {visitData?.refraction?.os_dilated_axis ? `${visitData.refraction.os_dilated_axis}°` : "-"}
                                                </td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_dilated_visual_acuity)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_dilated_pinhole)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            {visitData?.refraction?.notes && (
                                <div className="grid grid-cols-[120px_1fr] gap-2 items-start mt-1">
                                    <div className="w-full"></div>
                                    <p className="text-[10px] text-slate-500 italic text-left">
                                        Refraction Notes: {visitData.refraction.notes}
                                    </p>
                                </div>
                            )}
                        </>
                    ) : null;
                case "Glasses Rx":
                    return glassesRxVisible ? (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                            <div className="flex items-center gap-1.5 pr-2">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <Glasses className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Glasses Rx
                                </span>
                            </div>
                            <div className="space-y-2">
                                <table className="w-full text-xs border-collapse border border-slate-300">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className={`border border-slate-300 ${cellPadding} w-12`}>Eye</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>Sph</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>Cyl</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>Axis</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>Add</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>VA</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {prescription.items?.filter(i => i.eye === 'OD').map((item, idx) => (
                                            <tr key={`od-${idx}`}>
                                                <td className={`border border-slate-300 ${cellPadding} font-bold text-center`}>Right</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.sphere, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.cylinder, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.axis)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.add_power, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.visual_acuity)}</td>
                                            </tr>
                                        ))}
                                        {prescription.items?.filter(i => i.eye === 'OS').map((item, idx) => (
                                            <tr key={`os-${idx}`}>
                                                <td className={`border border-slate-300 ${cellPadding} font-bold text-center`}>Left</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.sphere, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.cylinder, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.axis)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.add_power, true)}</td>
                                                <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.visual_acuity)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(prescription.pupillary_distance || visitData?.ar_data?.pupillary_distance) && (
                                    <div className="flex gap-2 text-xs">
                                        <span className="text-slate-500 font-semibold">Pupillary Distance (PD):</span>
                                        <span className="font-medium">{prescription.pupillary_distance || visitData?.ar_data?.pupillary_distance} mm</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null;
                case "Optical Specs":
                    return opticalSpecsVisible ? (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                            <div className="flex items-center gap-1.5 pr-2">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <Layers className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Optical Specs
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                {prescription.vision_type && (
                                    <div className="flex gap-1">
                                        <span className="text-slate-500 whitespace-nowrap">Vision:</span>
                                        <span className="font-medium uppercase truncate">{prescription.vision_type}</span>
                                    </div>
                                )}
                                {prescription.lens_type && (
                                    <div className="flex gap-1">
                                        <span className="text-slate-500 whitespace-nowrap">Lens:</span>
                                        <span className="font-medium uppercase truncate">{prescription.lens_type}</span>
                                    </div>
                                )}
                                {prescription.lens_material && (
                                    <div className="flex gap-1">
                                        <span className="text-slate-500 whitespace-nowrap">Material:</span>
                                        <span className="font-medium uppercase truncate">{prescription.lens_material}</span>
                                    </div>
                                )}
                                {prescription.coatings && prescription.coatings.length > 0 && (
                                    <div className="flex gap-1">
                                        <span className="text-slate-500 whitespace-nowrap">Coatings:</span>
                                        <span className="font-medium uppercase truncate" title={prescription.coatings.join(", ")}>
                                            {prescription.coatings.join(", ")}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null;
                case "Meds":
                    return (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                            <div className="flex items-center gap-1.5 pr-2 pt-1">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <Pill className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Prescription
                                </span>
                            </div>
                            <div>
                                {prescription.medicine_items && prescription.medicine_items.length > 0 ? (
                                    <div className={`${isCompact ? "space-y-1" : "space-y-2"}`}>
                                        {prescription.medicine_items.map((med, idx) => (
                                            <div key={idx} className={sectionFontClass}>
                                                <div className="font-bold flex gap-2 leading-tight text-sky-900 flex-wrap items-center">
                                                    <span>{idx + 1}. {med.medicine_name}</span>
                                                    {med.applicable_eye && med.applicable_eye !== 'NA' && (
                                                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-bold ml-1">
                                                            {med.applicable_eye === 'BOTH' ? 'BOTH EYES' : med.applicable_eye}
                                                        </span>
                                                    )}
                                                    {med.generic_name && <span className="italic font-normal text-slate-500 text-[10px] mt-0.5">({med.generic_name})</span>}
                                                </div>
                                                <div className="pl-5 text-[10px] text-slate-600">
                                                    {med.tapering_steps && med.tapering_steps.length > 0 ? (
                                                        <div className="mt-1 bg-purple-50/30 border border-purple-100/50 rounded-md p-2 max-w-md">
                                                            <span className="text-[9px] font-bold text-purple-800 uppercase block mb-1">📉 Tapering Dose Schedule:</span>
                                                            <div className="space-y-1">
                                                                {med.tapering_steps.map((step, sIdx) => (
                                                                    <div key={sIdx} className="text-[9px] text-slate-700">
                                                                        <span className="font-bold text-purple-950">Step {sIdx + 1}: </span>
                                                                        <span>{step.dosage || med.dosage || ""}</span>
                                                                        {step.frequency && <span> • {step.frequency}</span>}
                                                                        {step.duration && <span> • {step.duration}</span>}
                                                                        {step.instructions && <span className="italic text-slate-500"> ({step.instructions})</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {med.instructions && <span className="mr-2">({med.instructions})</span>}
                                                            <span className="uppercase font-medium">
                                                                {med.frequency && `${med.frequency}, `}
                                                                {med.duration && `${med.duration}`}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span>-</span>
                                )}
                            </div>
                        </div>
                    );
                case "Lab Investigations":
                    return prescription.advice_items?.some(a => a.advice_type === "Lab Test" || a.advice_type === "lab-test") ? (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                            <div className="flex items-center gap-1.5 pr-2">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <FlaskConical className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Lab Invest.
                                </span>
                            </div>
                            <div className={`${sectionFontClass} font-medium uppercase text-xs text-left`}>
                                {prescription.advice_items
                                    .filter(a => a.advice_type === "Lab Test" || a.advice_type === "lab-test")
                                    .map(a => {
                                        const metaKeys = a.prescription_metadata ? Object.keys(a.prescription_metadata) : [];
                                        const metaStr = metaKeys.length > 0 
                                            ? ` (${metaKeys.map(k => `${k}: ${a.prescription_metadata?.[k]}`).join(", ")})`
                                            : "";
                                        return `${a.description}${metaStr}`;
                                    })
                                    .join(", ")}
                            </div>
                        </div>
                    ) : null;
                case "Advice":
                    return (prescription.advice_items?.some(a => a.advice_type !== "Lab Test" && a.advice_type !== "lab-test") || prescription.plan_of_action || prescription.remarks || prescription.notes) ? (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                            <div className="flex items-center gap-1.5 pr-2">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <Info className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Advice
                                </span>
                            </div>
                            <div className={`${sectionFontClass} font-medium text-xs text-left space-y-1`}>
                                {[
                                    ...(prescription.plan_of_action ? [prescription.plan_of_action] : []),
                                    ...((prescription.advice_items || [])
                                        .filter(a => a.advice_type !== "Lab Test" && a.advice_type !== "lab-test")
                                        .map(a => a.description)),
                                    ...(prescription.remarks ? [`Remarks: ${prescription.remarks}`] : []),
                                    ...(prescription.notes ? [`Notes: ${prescription.notes}`] : [])
                                ].map((item, idx) => (
                                    <div key={idx} className="uppercase font-medium">{item}</div>
                                ))}
                            </div>
                        </div>
                    ) : null;
                case "Planned Surgery": {
                    const validSurgeries = (plannedSurgeries || []).filter((s: any) =>
                        s.status !== "cancelled" &&
                        s.status !== "cancelled_by_patient" &&
                        s.status !== "cancelled_by_hospital"
                    );
                    return validSurgeries.length > 0 ? (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                            <div className="flex items-center gap-1.5 pr-2">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <Stethoscope className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Advised Surgery
                                </span>
                            </div>
                            <div className={sectionFontClass}>
                                <ul className="list-disc list-outside ml-4 text-xs text-left">
                                    {validSurgeries.map((surgery: any, idx: number) => {
                                        const locationStr = surgery.anatomy_site_name
                                            ? `${surgery.anatomy_site_name} (${surgery.anatomy_site_short_code || surgery.eye})`
                                            : surgery.eye;
                                        const isCompleted = surgery.status === "completed";
                                        return (
                                            <li key={idx} className="mb-1">
                                                <span className="font-bold text-slate-900">{surgery.surgery_name}</span>
                                                <span className="text-slate-700 font-medium ml-1">
                                                    — {locationStr}
                                                </span>
                                                {surgery.urgency && surgery.urgency !== "elective" && (
                                                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider">
                                                        {surgery.urgency}
                                                    </span>
                                                )}
                                                {surgery.notes && (
                                                    <div className="text-xs text-slate-500 mt-0.5 italic">
                                                        Note: {surgery.notes}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    ) : null;
                }
                case "FollowUp":
                    return (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                            <div className="flex items-center gap-1.5 pr-2">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <Calendar className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    FollowUp
                                </span>
                            </div>
                            <div className={`${sectionFontClass} font-medium text-xs text-left`}>
                                {prescription.followup_date ? (
                                    <span>Review at {formatDate(prescription.followup_date)} (to confirm with reception) or earlier in case of any problem.</span>
                                ) : (
                                    <span>-</span>
                                )}
                            </div>
                        </div>
                    );
                default:
                    return null;
            }
        };

        return (
            <div
                ref={ref}
                className="prescription-print-container bg-white text-black font-sans mx-auto text-sm print:m-0 print:p-0"
                style={{
                    width: '100%',
                    maxWidth: '850px',
                    padding: '1.5rem',
                }}
            >

                {/* Print-specific style block injected directly to ensure priority */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page {
                            size: A4;
                            margin: 0; /* Control via padding */
                        }
                        .prescription-print-container {
                            width: 210mm !important;
                            min-height: 297mm !important;
                            padding: 10mm 15mm 25mm 15mm !important;
                            margin: 0 !important;
                            max-width: none !important;
                            height: auto !important;
                            overflow: hidden !important;
                            display: block !important;
                            position: relative !important;
                        }
                        .break-inside-avoid {
                            break-inside: avoid !important;
                            page-break-inside: avoid !important;
                        }
                    }
                `}} />
                {/* Header Section - Configurable */}
                {showHeader ? (
                    <PrintHeader tenant={tenant} documentType="" />
                ) : (
                    /* Blank space for pre-printed letterhead - approximately same height as header */
                    <div className={`${isExtremelyCompact ? "h-16" : isCompact ? "h-20" : "h-32"} mb-2`} />
                )}

                {/* Document Status Badge (Right aligned, if Draft) */}
                {prescription.status !== "finalized" && (
                    <div className="mb-1 flex justify-end">
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-700 font-medium rounded text-[10px] border border-slate-300/80">
                            <span className="font-semibold text-slate-600">Prescription Status:</span>{" "}
                            <span className="font-bold text-slate-900">Draft</span>{" "}
                            <span className="text-[9px] text-slate-500 italic font-normal">(not finalized)</span>
                        </span>
                    </div>
                )}

                {/* Patient Details Section - Matches the Box style in image */}
                <div className={`${isCompact ? "mb-1" : "mb-4"} border border-slate-400 text-[10px] font-medium`}>
                    <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-300">
                        <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                            <Hash className="h-2.5 w-2.5 text-slate-500" />
                            <span>UHID No</span>
                        </div>
                        <div className={`${cellPadding} font-bold border-r border-slate-300`}>{visitData?.uhid || prescription.patient_id?.slice(0, 8) || "-"}</div>
                        <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                            <UserRound className="h-2.5 w-2.5 text-slate-500" />
                            <span>Consultant</span>
                        </div>
                        <div className={`${cellPadding} font-bold`}>{prescription.doctor_name}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-300">
                        <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                            <User className="h-2.5 w-2.5 text-slate-500" />
                            <span>Patient Name</span>
                        </div>
                        <div className={`${cellPadding} font-bold border-r border-slate-300 text-sky-900`}>{prescription.patient_name}</div>
                        <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                            <Stethoscope className="h-2.5 w-2.5 text-slate-500" />
                            <span>Optometrist</span>
                        </div>
                        <div className={`${cellPadding} font-bold`}>{prescription.optometrist_name || "-"}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-300">
                        <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                            <Hash className="h-2.5 w-2.5 text-slate-500" />
                            <span>OPD No.</span>
                        </div>
                        <div className={`${cellPadding} border-r border-slate-300`}>{visitData?.visit_number || prescription.visit_id?.slice(0, 8) || "-"}</div>
                        <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                            <Calendar className="h-2.5 w-2.5 text-slate-500" />
                            <span>Date</span>
                        </div>
                        <div className={cellPadding}>{formatDate(visitData?.checked_in_at || prescription.created_at)} {formatTime(visitData?.checked_in_at || prescription.created_at)}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-300">
                        <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                            <MapPin className="h-2.5 w-2.5 text-slate-500" />
                            <span>Address</span>
                        </div>
                        <div className={`${cellPadding} border-r border-slate-300`}>{visitData?.address || "-"}</div>
                        <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                            <User className="h-2.5 w-2.5 text-slate-500" />
                            <span>Category</span>
                        </div>
                        <div className={`${cellPadding} font-bold`}>{(visitData as any)?.category || (visitData as any)?.patient_category || "-"}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr_100px_1fr]">
                        <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                            <Phone className="h-2.5 w-2.5 text-slate-500" />
                            <span>Mobile No.</span>
                        </div>
                        <div className={`${cellPadding} font-bold border-r border-slate-300`}>{visitData?.mobile || "-"}</div>
                        <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                            <span></span>
                        </div>
                        <div className={`${cellPadding}`}></div>
                    </div>

                </div>

                {/* Dynamic Content Sections */}
                {(() => {
                    const order = sectionOrder || [
                        "Presenting Complaint",
                        "Symptoms",
                        "Vision",
                        "Refraction (Dry)",
                        "Refraction (Dilated)",
                        "Glasses Rx",
                        "Optical Specs",
                        "Diagnosis",
                        "Meds",
                        "Lab Investigations",
                        "Advice",
                        "Planned Surgery",
                        "FollowUp"
                    ];

                    const visibleOrderedSections = order.filter(sectionName => {
                        if (visibleSections && !visibleSections.includes(sectionName)) return false;
                        
                        // Check if section actually has data to render
                        if (sectionName === "Presenting Complaint") return !!(visitData?.complaints?.length);
                        if (sectionName === "Symptoms") return !!(prescription.symptoms?.length);
                        if (sectionName === "Vision") return visionTableVisible;
                        if (sectionName === "Refraction (Dry)") return refractionDryVisible;
                        if (sectionName === "Refraction (Dilated)") return refractionDilatedVisible;
                        if (sectionName === "Glasses Rx") return glassesRxVisible;
                        if (sectionName === "Optical Specs") return opticalSpecsVisible;
                        if (sectionName === "Diagnosis") return !!(prescription.diagnosis);
                        if (sectionName === "Meds") return !!(prescription.medicine_items?.length);
                        if (sectionName === "Lab Investigations") return !!(prescription.advice_items?.some((a: any) => a.advice_type === "Lab Test" || a.advice_type === "lab-test"));
                        if (sectionName === "Advice") return !!(prescription.advice_items?.some((a: any) => a.advice_type !== "Lab Test" && a.advice_type !== "lab-test") || prescription.plan_of_action);
                        if (sectionName === "Planned Surgery") return !!(plannedSurgeries?.some((s: any) => s.status !== "cancelled" && s.status !== "cancelled_by_patient" && s.status !== "cancelled_by_hospital"));
                        if (sectionName === "FollowUp") return !!(prescription.followup_date);
                        return false;
                    });

                    return visibleOrderedSections.map((sectionName, index) => {
                        const isLastSection = index === visibleOrderedSections.length - 1;
                        const sectionMargin = sectionName === "FollowUp" && isLastSection 
                            ? (isCompact ? "mb-4" : "mb-8") 
                            : spacingClass;

                        const content = renderSection(sectionName);
                        if (!content) return null;

                        return (
                            <div key={sectionName} className={`${sectionMargin} break-inside-avoid`}>
                                {content}
                            </div>
                        );
                    });
                })()}

                {/* Footer Signature & Branding */}
                <div className={`flex justify-between items-end ${isExtremelyCompact ? "mt-2" : isCompact ? "mt-4" : "mt-6"} pt-2 border-t border-slate-300 break-inside-avoid gap-4`}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-medium flex-1">
                        <div className="whitespace-nowrap">
                            Issued Date & Time : {formatDate(prescription.created_at)} {formatTime(prescription.created_at)}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium italic tracking-wider whitespace-nowrap">
                            Powered by <span className="text-slate-500 font-bold not-italic">Technesian Cura</span> &bull; <span className="text-slate-400">Revolutionizing Hospital Management</span> &bull; <span className="text-sky-700/70 not-italic">www.technesian.com</span>
                        </div>
                    </div>
                    {(!visibleSections || visibleSections.includes("Digital Signature") || visibleSections.includes("Signature Placeholder")) && (
                        <div className="text-center w-48 shrink-0">
                            <div className={`${isCompact ? "h-12" : "h-16"} flex items-end justify-center mb-1`}>
                                {doctorSignature && (!visibleSections || visibleSections.includes("Digital Signature")) ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        key={doctorSignature}
                                        src={doctorSignature}
                                        alt={`Signature of ${prescription.doctor_name || "Doctor"}`}
                                        title={`Signature of ${prescription.doctor_name || "Doctor"}`}
                                        className={`${isCompact ? "max-h-12" : "max-h-16"} w-auto object-contain transition-opacity duration-300`}
                                        onError={(e) => {
                                            console.error("Signature image failed to load");
                                            e.currentTarget.style.display = 'none';
                                            // Fallback if image fails - only show if placeholder is allowed
                                            if (!visibleSections || visibleSections.includes("Signature Placeholder")) {
                                                const parent = e.currentTarget.parentElement;
                                                if (parent && !parent.querySelector('.signature-fallback')) {
                                                    const fallback = document.createElement('div');
                                                    fallback.className = 'border-b border-dashed border-slate-300 w-full h-8 signature-fallback';
                                                    parent.appendChild(fallback);
                                                }
                                            }
                                        }}
                                    />
                                ) : (!visibleSections || visibleSections.includes("Signature Placeholder")) ? (
                                    <div className="border-b border-dashed border-slate-300 w-full h-8" />
                                ) : (
                                    <div className="h-8" /> /* Empty space to maintain layout if neither is selected but section is */
                                )}
                            </div>
                            <div className="font-bold text-xs uppercase text-slate-900">{prescription.doctor_name || "Medical Officer"}</div>
                            <div className="text-[10px] text-slate-500 font-medium">Doctor&apos;s Signature</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
);

DoctorPrescriptionPrint.displayName = "DoctorPrescriptionPrint";
