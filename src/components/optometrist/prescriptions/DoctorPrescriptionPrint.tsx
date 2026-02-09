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
    MapPin
} from "lucide-react";

import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";

interface DoctorPrescriptionPrintProps {
    prescription: OptometryPrescription;
    showHeader?: boolean; // When false, shows blank space for pre-printed letterhead
    doctorSignature?: string | null;
    visitData?: PrescriptionDataResponse | null;
    plannedSurgeries?: any[]; // Using any[] to avoid circular dependency issues if strict types are hard, but preferably PlannedSurgery[]
    visibleSections?: string[];
}

export const DoctorPrescriptionPrint = forwardRef<HTMLDivElement, DoctorPrescriptionPrintProps>(
    ({ prescription, showHeader = true, doctorSignature, visitData, plannedSurgeries, visibleSections }, ref) => {
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
        const formatVal = (val: string | number | null | undefined) => {
            if (val === 0 || val === "0") return "0";
            return val || "-";
        };

        // Determine layout density based on content length
        const medicineCount = prescription.medicine_items?.length || 0;
        const adviceCount = (prescription.advice_items?.length || 0) + (prescription.plan_of_action ? 1 : 0);
        const complaintsCount = visitData?.complaints?.length || 0;
        const surgeriesCount = plannedSurgeries?.length || 0;
        const visionTableVisible = !!(visitData?.vision || visitData?.iop) && (!visibleSections || visibleSections.includes("Vision"));
        const refractionVisible = !!visitData?.refraction && (!visibleSections || visibleSections.includes("Refraction"));
        const glassesRxVisible = (prescription.items?.length || 0) > 0 && (!visibleSections || visibleSections.includes("Glasses Rx"));
        const opticalSpecsVisible = !!(prescription.lens_type || prescription.vision_type || prescription.lens_material || (prescription.coatings && prescription.coatings.length > 0)) && (!visibleSections || visibleSections.includes("Optical Specs"));

        const totalItemsScore = medicineCount + adviceCount + complaintsCount + (surgeriesCount * 1.5) +
            (visionTableVisible ? 3 : 0) + (refractionVisible ? 3 : 0) + (glassesRxVisible ? 3 : 0) + (opticalSpecsVisible ? 2 : 0);

        // Threshold for applying compact layout
        const isCompact = totalItemsScore > 15; // Lowered threshold for compact
        const isExtremelyCompact = totalItemsScore > 25; // Lowered threshold for extreme

        const spacingClass = isExtremelyCompact ? "mb-0.5" : isCompact ? "mb-1" : "mb-4";
        const sectionFontClass = isExtremelyCompact ? "text-[10px]" : isCompact ? "text-xs" : "text-sm";
        const labelWidth = isCompact ? "w-24" : "w-32";
        const cellPadding = isExtremelyCompact ? "p-0.5" : "p-1";

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
                            overflow: visible !important;
                            display: block !important;
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
                    <div className="grid grid-cols-[100px_1fr]">
                        <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                            <MapPin className="h-2.5 w-2.5 text-slate-500" />
                            <span>Address</span>
                        </div>
                        <div className={cellPadding}>{visitData?.address || "-"}</div>
                    </div>
                </div>

                {/* Clinical Data Row */}
                <div className={`${spacingClass} space-y-1`}>
                    {/* Complaints */}
                    {(!visibleSections || visibleSections.includes("Presenting Complaint")) && (
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
                                            <li key={idx}>
                                                Both Eye: {c.complaint} {c.duration ? `[${c.duration}]` : ""}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span>-</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Symptoms */}
                    {(!visibleSections || visibleSections.includes("Symptoms")) && prescription.symptoms && prescription.symptoms.length > 0 && (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start mt-1">
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
                    )}

                    {/* Diagnosis */}
                    {(!visibleSections || visibleSections.includes("Diagnosis")) && (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start mt-1">
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
                    )}

                    {/* Vision Table */}
                    {visionTableVisible && (
                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start mt-1">
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
                                            <th className={`border border-slate-300 ${cellPadding}`} colSpan={3}>Distance Vision</th>
                                            <th className={`border border-slate-300 ${cellPadding}`} colSpan={2}>Near Vision</th>
                                            <th className={`border border-slate-300 ${cellPadding}`} colSpan={1}>IOP</th>
                                        </tr>
                                        <tr className="bg-slate-50 text-center text-[10px]">
                                            <th className={`border border-slate-300 ${cellPadding}`}>UCDVA</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>BCDVA</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>PH</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>UCNVA</th>
                                            <th className={`border border-slate-300 ${cellPadding}`}>BCNVA</th>
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
                                                {formatVal(visitData?.refraction?.od_distance_bcva || visitData?.refraction?.od_visual_acuity_corrected)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.vision?.od_ph_va)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.vision?.od_near_ucva)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.refraction?.od_near_bcva)}
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
                                                {formatVal(visitData?.refraction?.os_distance_bcva || visitData?.refraction?.os_visual_acuity_corrected)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.vision?.os_ph_va)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.vision?.os_near_ucva)}
                                            </td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                                {formatVal(visitData?.refraction?.os_near_bcva)}
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
                    )}
                </div>

                {/* Refraction Details */}
                {refractionVisible && (
                    <div className={`grid grid-cols-[120px_1fr] gap-2 ${spacingClass} items-start`}>
                        <div className="flex items-center gap-1.5 pr-2">
                            <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                <Compass className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                            </div>
                            <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                Refraction Details
                            </span>
                        </div>
                        <div>
                            <table className="w-full text-xs border-collapse border border-slate-300">
                                <thead>
                                    <tr className="bg-amber-50">
                                        <th className={`border border-slate-300 ${cellPadding} w-12`}>Eye</th>
                                        <th className={`border border-slate-300 ${cellPadding}`}>Sph</th>
                                        <th className={`border border-slate-300 ${cellPadding}`}>Cyl</th>
                                        <th className={`border border-slate-300 ${cellPadding}`}>Axis</th>
                                        <th className={`border border-slate-300 ${cellPadding}`}>Add</th>
                                        <th className={`border border-slate-300 ${cellPadding}`}>BCDVA</th>
                                        <th className={`border border-slate-300 ${cellPadding}`}>BCNVA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className={`border border-slate-300 ${cellPadding} font-bold text-center`}>Right</td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_sphere)}</td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_cylinder)}</td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                            {visitData?.refraction?.od_axis ? `${visitData.refraction.od_axis}°` : "-"}
                                        </td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_add_power)}</td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_distance_bcva)}</td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.od_near_bcva)}</td>
                                    </tr>
                                    <tr>
                                        <td className={`border border-slate-300 ${cellPadding} font-bold text-center`}>Left</td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_sphere)}</td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_cylinder)}</td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>
                                            {visitData?.refraction?.os_axis ? `${visitData.refraction.os_axis}°` : "-"}
                                        </td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_add_power)}</td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_distance_bcva)}</td>
                                        <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(visitData?.refraction?.os_near_bcva)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            {visitData?.refraction?.notes && (
                                <p className="mt-1 text-[10px] text-slate-500 italic text-left">
                                    Notes: {visitData.refraction.notes}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Additional Refraction Table (Glasses Prescription) if items exist */}
                {glassesRxVisible && (
                    <div className={`grid grid-cols-[120px_1fr] gap-2 ${spacingClass} items-start`}>
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
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.sphere)}</td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.cylinder)}</td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.axis)}</td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.add_power)}</td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.visual_acuity)}</td>
                                        </tr>
                                    ))}
                                    {prescription.items?.filter(i => i.eye === 'OS').map((item, idx) => (
                                        <tr key={`os-${idx}`}>
                                            <td className={`border border-slate-300 ${cellPadding} font-bold text-center`}>Left</td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.sphere)}</td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.cylinder)}</td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.axis)}</td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.add_power)}</td>
                                            <td className={`border border-slate-300 ${cellPadding} text-center`}>{formatVal(item.visual_acuity)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* PD Move to Glasses Rx context */}
                            {(prescription.pupillary_distance || visitData?.ar_data?.pupillary_distance) && (
                                <div className="flex gap-2 text-xs">
                                    <span className="text-slate-500 font-semibold">Pupillary Distance (PD):</span>
                                    <span className="font-medium">{prescription.pupillary_distance || visitData?.ar_data?.pupillary_distance} mm</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Optical Specifications */}
                {opticalSpecsVisible && (
                    <div className={`grid grid-cols-[120px_1fr] gap-2 ${spacingClass} items-start`}>
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
                )}


                {/* Prescription (Meds) */}
                {(!visibleSections || visibleSections.includes("Meds")) && (
                    <div className={`grid grid-cols-[120px_1fr] gap-2 ${spacingClass} items-start`}>
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
                                            <div className="font-bold flex gap-2 leading-tight text-sky-900 flex-wrap">
                                                <span>{idx + 1}. {med.medicine_name}</span>
                                                {med.generic_name && <span className="italic font-normal text-slate-500 text-[10px] mt-0.5">({med.generic_name})</span>}
                                            </div>
                                            <div className="pl-5 text-[10px] text-slate-600">
                                                {med.instructions && <span className="mr-2">({med.instructions})</span>}
                                                <span className="uppercase font-medium">
                                                    {med.frequency && `${med.frequency}, `}
                                                    {med.duration && `${med.duration}`}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span>-</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Advice & Lab Investigations */}
                <div className="space-y-1">
                    {/* Lab Investigations */}
                    {prescription.advice_items?.some(a => a.advice_type === "Lab Test") && (!visibleSections || visibleSections.includes("Lab Investigations")) && (
                        <div className={`grid grid-cols-[120px_1fr] gap-2 ${spacingClass} items-start break-inside-avoid`}>
                            <div className="flex items-center gap-1.5 pr-2">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <FlaskConical className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Lab Invest.
                                </span>
                            </div>
                            <div className={`${sectionFontClass} font-medium uppercase`}>
                                {prescription.advice_items
                                    .filter(a => a.advice_type === "Lab Test")
                                    .map(a => a.description)
                                    .join(", ")}
                            </div>
                        </div>
                    )}

                    {/* Actual Advice */}
                    {(prescription.advice_items?.some(a => a.advice_type !== "Lab Test") || prescription.plan_of_action) && (!visibleSections || visibleSections.includes("Advice")) && (
                        <div className={`grid grid-cols-[120px_1fr] gap-2 ${spacingClass} items-start`}>
                            <div className="flex items-center gap-1.5 pr-2">
                                <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                    <Info className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                                </div>
                                <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                    Advice
                                </span>
                            </div>
                            <div className={`${sectionFontClass} font-medium uppercase`}>
                                {[
                                    ...(prescription.plan_of_action ? [prescription.plan_of_action] : []),
                                    ...((prescription.advice_items || [])
                                        .filter(a => a.advice_type !== "Lab Test")
                                        .map(a => a.description))
                                ].join(", ")}
                            </div>
                        </div>
                    )}
                </div>

                {/* Planned Surgeries */}
                {(plannedSurgeries && plannedSurgeries.length > 0) && (!visibleSections || visibleSections.includes("Planned Surgery")) && (
                    <div className={`grid grid-cols-[120px_1fr] gap-2 ${spacingClass} items-start`}>
                        <div className="flex items-center gap-1.5 pr-2">
                            <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                <Stethoscope className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                            </div>
                            <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                Planned Surgery
                            </span>
                        </div>
                        <div className={sectionFontClass}>
                            <ul className="list-disc list-outside ml-4">
                                {plannedSurgeries.map((surgery, idx) => (
                                    <li key={idx} className="mb-1">
                                        <span className="font-medium">{surgery.surgery_name}</span>
                                        <span className="text-slate-600 ml-1">
                                            ({surgery.eye}) - Planned on {formatDate(surgery.planned_date)}
                                        </span>
                                        {surgery.notes && (
                                            <div className="text-xs text-slate-500 mt-0.5 italic">
                                                Note: {surgery.notes}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* FollowUp */}
                {(!visibleSections || visibleSections.includes("FollowUp")) && (
                    <div className={`grid grid-cols-[120px_1fr] gap-2 ${isCompact ? "mb-4" : "mb-8"} items-start break-inside-avoid`}>
                        <div className="flex items-center gap-1.5 pr-2">
                            <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                                <Calendar className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                            </div>
                            <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                                FollowUp
                            </span>
                        </div>
                        <div className={`${sectionFontClass} font-medium`}>
                            {prescription.followup_date ? (
                                <span>Review at {formatDate(prescription.followup_date)} (to confirm with reception) or earlier in case of any problem.</span>
                            ) : (
                                <span>-</span>
                            )}
                        </div>
                    </div>
                )}

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
