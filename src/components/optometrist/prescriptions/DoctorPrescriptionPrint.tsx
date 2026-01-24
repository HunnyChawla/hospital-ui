"use client";

import React, { forwardRef } from "react";
import type { OptometryPrescription } from "@/types";
import { PrintHeader } from "@/components/common/PrintHeader";
import { useTenant } from "@/hooks/useTenant";

import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";

interface DoctorPrescriptionPrintProps {
    prescription: OptometryPrescription;
    showHeader?: boolean; // When false, shows blank space for pre-printed letterhead
    doctorSignature?: string | null;
    visitData?: PrescriptionDataResponse | null;
    plannedSurgeries?: any[]; // Using any[] to avoid circular dependency issues if strict types are hard, but preferably PlannedSurgery[]
}

export const DoctorPrescriptionPrint = forwardRef<HTMLDivElement, DoctorPrescriptionPrintProps>(
    ({ prescription, showHeader = true, doctorSignature, visitData, plannedSurgeries }, ref) => {
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

        return (
            <div ref={ref} className="p-8 bg-white text-black print:p-4 font-sans max-w-4xl mx-auto text-sm">
                {/* Header Section - Configurable */}
                {showHeader ? (
                    <PrintHeader tenant={tenant} documentType="" />
                ) : (
                    /* Blank space for pre-printed letterhead - approximately same height as header */
                    <div className="h-32 mb-6" />
                )}

                {/* Patient Details Section - Matches the Box style in image */}
                <div className="border border-slate-400 mb-4 text-xs font-medium">
                    <div className="grid grid-cols-[100px_1fr] border-b border-slate-300">
                        <div className="bg-slate-100 p-1 font-semibold border-r border-slate-300">UHID No</div>
                        <div className="p-1 font-bold">{visitData?.uhid || prescription.patient_id?.slice(0, 8) || "-"}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-300">
                        <div className="bg-slate-100 p-1 font-semibold border-r border-slate-300">Patient Name</div>
                        <div className="p-1 font-bold border-r border-slate-300">{prescription.patient_name}</div>
                        <div className="bg-slate-100 p-1 font-semibold border-r border-slate-300">Address</div>
                        <div className="p-1">-</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr]">
                        <div className="bg-slate-100 p-1 font-semibold border-r border-slate-300">OPD No.</div>
                        <div className="p-1">{visitData?.visit_number || prescription.visit_id?.slice(0, 8) || "-"}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr]">
                        <div className="bg-slate-100 p-1 font-semibold border-r border-slate-300">Consultant</div>
                        <div className="p-1">{prescription.doctor_name}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr]">
                        <div className="bg-slate-100 p-1 font-semibold border-r border-slate-300">Optometrist</div>
                        <div className="p-1">{prescription.optometrist_name || "-"}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr]">
                        <div className="bg-slate-100 p-1 font-semibold border-r border-slate-300">Date</div>
                        <div className="p-1">{formatDate(prescription.created_at)} {formatTime(prescription.created_at)}</div>
                    </div>
                </div>

                {/* Clinical Data Row */}
                <div className="mb-4 space-y-2">
                    {/* Complaints */}
                    <div className="grid grid-cols-[150px_1fr] gap-2">
                        <div className="font-semibold text-slate-700">Presenting Complaint</div>
                        <div>
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



                    {/* Vision Table */}
                    <div className="grid grid-cols-[150px_1fr] gap-2 items-start mt-2">
                        <div className="font-semibold text-slate-700 pt-2">Vision</div>
                        <div>
                            <table className="w-full text-xs border-collapse border border-slate-300">
                                <thead>
                                    <tr className="bg-slate-100 text-center">
                                        <th className="border border-slate-300 p-1 w-12" rowSpan={2}>Eye</th>
                                        <th className="border border-slate-300 p-1" colSpan={3}>Distance Vision</th>
                                        <th className="border border-slate-300 p-1" colSpan={2}>Near Vision</th>
                                        <th className="border border-slate-300 p-1" colSpan={1}>IOP</th>
                                    </tr>
                                    <tr className="bg-slate-50 text-center text-[10px]">
                                        <th className="border border-slate-300 p-1">UCDVA</th>
                                        <th className="border border-slate-300 p-1">BCDVA</th>
                                        <th className="border border-slate-300 p-1">PH</th>
                                        <th className="border border-slate-300 p-1">UCNVA</th>
                                        <th className="border border-slate-300 p-1">BCNVA</th>
                                        <th className="border border-slate-300 p-1">mmHg</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Right Eye */}
                                    <tr>
                                        <td className="border border-slate-300 p-1 font-bold text-center">Right</td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {formatVal(visitData?.vision?.od_ucva_distance || visitData?.refraction?.od_visual_acuity_uncorrected)}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {formatVal(visitData?.vision?.od_bcva_distance || visitData?.refraction?.od_visual_acuity_corrected)}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {formatVal(visitData?.vision?.od_ph_va)}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {formatVal(visitData?.vision?.od_near_ucva)}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {formatVal(visitData?.vision?.od_near_bcva)}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {formatVal(visitData?.iop?.od_pressure)}
                                        </td>
                                    </tr>
                                    {/* Left Eye */}
                                    <tr>
                                        <td className="border border-slate-300 p-1 font-bold text-center">Left</td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {formatVal(visitData?.vision?.os_ucva_distance || visitData?.refraction?.os_visual_acuity_uncorrected)}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {formatVal(visitData?.vision?.os_bcva_distance || visitData?.refraction?.os_visual_acuity_corrected)}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {formatVal(visitData?.vision?.os_ph_va)}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {formatVal(visitData?.vision?.os_near_ucva)}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {formatVal(visitData?.vision?.os_near_bcva)}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">
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
                </div>

                {/* Refraction Details */}
                {visitData?.refraction && (
                    <div className="grid grid-cols-[150px_1fr] gap-2 mb-4">
                        <div className="font-semibold text-slate-700">Refraction Details</div>
                        <div>
                            <table className="w-full text-xs border-collapse border border-slate-300">
                                <thead>
                                    <tr className="bg-amber-50">
                                        <th className="border border-slate-300 p-1 w-12">Eye</th>
                                        <th className="border border-slate-300 p-1">Sph</th>
                                        <th className="border border-slate-300 p-1">Cyl</th>
                                        <th className="border border-slate-300 p-1">Axis</th>
                                        <th className="border border-slate-300 p-1">Add</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-slate-300 p-1 font-bold text-center">Right</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(visitData.refraction.od_sphere)}</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(visitData.refraction.od_cylinder)}</td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {visitData.refraction.od_axis ? `${visitData.refraction.od_axis}°` : "-"}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(visitData.refraction.od_add_power)}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 p-1 font-bold text-center">Left</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(visitData.refraction.os_sphere)}</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(visitData.refraction.os_cylinder)}</td>
                                        <td className="border border-slate-300 p-1 text-center">
                                            {visitData.refraction.os_axis ? `${visitData.refraction.os_axis}°` : "-"}
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(visitData.refraction.os_add_power)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            {visitData.refraction.notes && (
                                <p className="mt-1 text-[10px] text-slate-500 italic">
                                    Notes: {visitData.refraction.notes}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Additional Refraction Table (Glasses Prescription) if items exist */}
                {(prescription.items?.length > 0) && (
                    <div className="grid grid-cols-[150px_1fr] gap-2 mb-4">
                        <div className="font-semibold text-slate-700">Glasses Rx</div>
                        <table className="w-full text-xs border-collapse border border-slate-300">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="border border-slate-300 p-1 w-12">Eye</th>
                                    <th className="border border-slate-300 p-1">Sph</th>
                                    <th className="border border-slate-300 p-1">Cyl</th>
                                    <th className="border border-slate-300 p-1">Axis</th>
                                    <th className="border border-slate-300 p-1">Add</th>
                                    <th className="border border-slate-300 p-1">VA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prescription.items?.filter(i => i.eye === 'OD').map((item, idx) => (
                                    <tr key={`od-${idx}`}>
                                        <td className="border border-slate-300 p-1 font-bold text-center">Right</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(item.sphere)}</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(item.cylinder)}</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(item.axis)}</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(item.add_power)}</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(item.visual_acuity)}</td>
                                    </tr>
                                ))}
                                {prescription.items?.filter(i => i.eye === 'OS').map((item, idx) => (
                                    <tr key={`os-${idx}`}>
                                        <td className="border border-slate-300 p-1 font-bold text-center">Left</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(item.sphere)}</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(item.cylinder)}</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(item.axis)}</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(item.add_power)}</td>
                                        <td className="border border-slate-300 p-1 text-center">{formatVal(item.visual_acuity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Diagnosis */}
                <div className="grid grid-cols-[150px_1fr] gap-2 mb-4 items-start">
                    <div className="font-semibold text-slate-700">Diagnosis</div>
                    <div className="text-sm border-b border-slate-200 pb-1 w-full">
                        {prescription.diagnosis ? (
                            <p className="whitespace-pre-wrap uppercase font-medium">{prescription.diagnosis}</p>
                        ) : (
                            <span>-</span>
                        )}
                    </div>
                </div>

                {/* Prescription (Meds) */}
                <div className="grid grid-cols-[150px_1fr] gap-2 mb-4 items-start">
                    <div className="font-semibold text-slate-700 pt-1">Prescription</div>
                    <div>
                        {prescription.medicine_items && prescription.medicine_items.length > 0 ? (
                            <div className="space-y-3">
                                {prescription.medicine_items.map((med, idx) => (
                                    <div key={idx} className="text-sm">
                                        <div className="font-bold flex gap-2">
                                            <span>{idx + 1}.</span>
                                            <span>{med.medicine_name}</span>
                                        </div>
                                        <div className="pl-5 text-xs text-slate-600 mt-0.5">
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

                {/* Advice */}
                <div className="grid grid-cols-[150px_1fr] gap-2 mb-4 items-start">
                    <div className="font-semibold text-slate-700">Advice</div>
                    <div className="text-sm">
                        {(prescription.advice_items && prescription.advice_items.length > 0 || prescription.plan_of_action) ? (
                            <ul className="list-disc list-outside ml-4">
                                {prescription.plan_of_action && (
                                    <li className="mb-1">{prescription.plan_of_action}</li>
                                )}
                                {prescription.advice_items?.map((advice, idx) => (
                                    <li key={idx} className="uppercase">
                                        {advice.description}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <span>-</span>
                        )}
                    </div>
                </div>

                {/* Planned Surgeries */}
                {(plannedSurgeries && plannedSurgeries.length > 0) && (
                    <div className="grid grid-cols-[150px_1fr] gap-2 mb-4 items-start">
                        <div className="font-semibold text-slate-700">Planned Surgery</div>
                        <div className="text-sm">
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
                <div className="grid grid-cols-[150px_1fr] gap-2 mb-8 items-start">
                    <div className="font-semibold text-slate-700">FollowUp</div>
                    <div className="text-sm font-medium">
                        {prescription.followup_date ? (
                            <span>Review at {formatDate(prescription.followup_date)} (to confirm with reception) or earlier in case of any problem.</span>
                        ) : (
                            <span>-</span>
                        )}
                    </div>
                </div>

                {/* Footer Signature */}
                <div className="flex justify-between items-end mt-12 pt-4 border-t border-slate-300">
                    <div className="text-[10px] text-slate-500">
                        Issued Date & Time : {formatDate(prescription.created_at)} {formatTime(prescription.created_at)}
                    </div>
                    <div className="text-center w-48">
                        <div className="h-12 flex items-end justify-center mb-1">
                            {doctorSignature ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={doctorSignature}
                                    alt="Signature"
                                    className="max-h-12 object-contain"
                                />
                            ) : null}
                        </div>
                        <div className="font-bold text-sm uppercase">{prescription.doctor_name}</div>
                    </div>
                </div>
            </div>
        );
    }
);

DoctorPrescriptionPrint.displayName = "DoctorPrescriptionPrint";
