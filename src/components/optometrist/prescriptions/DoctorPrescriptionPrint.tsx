"use client";

import React, { forwardRef } from "react";
import type { OptometryPrescription } from "@/types";
import { PrintHeader } from "@/components/common/PrintHeader";
import { useTenant } from "@/hooks/useTenant";

interface DoctorPrescriptionPrintProps {
    prescription: OptometryPrescription;
    showHeader?: boolean; // When false, shows blank space for pre-printed letterhead
}

export const DoctorPrescriptionPrint = forwardRef<HTMLDivElement, DoctorPrescriptionPrintProps>(
    ({ prescription, showHeader = true }, ref) => {
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

        return (
            <div ref={ref} className="p-8 bg-white text-black print:p-4 font-sans max-w-4xl mx-auto">
                {/* Header Section - Configurable */}
                {showHeader ? (
                    <PrintHeader tenant={tenant} documentType="Eye Prescription" />
                ) : (
                    /* Blank space for pre-printed letterhead - approximately same height as header */
                    <div className="h-32 mb-6" />
                )}

                {/* Prescription Number & Date Row */}
                <div className="flex justify-between items-center border-b border-slate-300 pb-3 mb-4">
                    <div>
                        <p className="text-[10px] text-slate-600">Prescription No.</p>
                        <p className="text-sm font-bold text-slate-900">{prescription.prescription_number}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-600">Date</p>
                        <p className="text-sm font-bold text-slate-900">{formatDate(prescription.created_at)}</p>
                    </div>
                </div>

                {/* Patient Details */}
                <div className="mb-4">
                    <h2 className="text-sm font-bold text-slate-900 border-b border-slate-300 pb-1 mb-2">
                        Patient Information
                    </h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                        <div>
                            <span className="text-slate-600">Patient Name: </span>
                            <span className="font-semibold text-slate-900">{prescription.patient_name}</span>
                        </div>
                        <div>
                            <span className="text-slate-600">UHID: </span>
                            <span className="font-semibold text-slate-900">{prescription.patient_id?.slice(0, 8) || "-"}</span>
                        </div>
                        <div>
                            <span className="text-slate-600">Visit ID: </span>
                            <span className="font-semibold text-slate-900">{prescription.visit_id?.slice(0, 8) || "-"}</span>
                        </div>
                        {prescription.doctor_name && (
                            <div>
                                <span className="text-slate-600">Doctor: </span>
                                <span className="font-semibold text-slate-900">{prescription.doctor_name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Diagnosis */}
                {prescription.diagnosis && (
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-900 mb-1">Diagnosis</h3>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{prescription.diagnosis}</p>
                    </div>
                )}

                {/* Optical Prescription Table */}
                {(prescription.items?.length > 0 || prescription.lens_type || prescription.pupillary_distance) && (
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-300 pb-1 mb-2">
                            Glasses Prescription
                        </h3>

                        <table className="w-full text-xs border-collapse border border-slate-300 mb-3">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="border border-slate-300 p-1.5 text-left w-16">Eye</th>
                                    <th className="border border-slate-300 p-1.5 text-center">Sph</th>
                                    <th className="border border-slate-300 p-1.5 text-center">Cyl</th>
                                    <th className="border border-slate-300 p-1.5 text-center">Axis</th>
                                    <th className="border border-slate-300 p-1.5 text-center">Add</th>
                                    <th className="border border-slate-300 p-1.5 text-center">VA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Right Eye (OD) */}
                                {prescription.items?.filter(i => i.eye === 'OD').map(item => (
                                    <tr key={item.id}>
                                        <td className="border border-slate-300 p-1.5 font-bold">RE (OD)</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.sphere || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.cylinder || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.axis || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.add_power || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.visual_acuity || "-"}</td>
                                    </tr>
                                ))}
                                {/* Left Eye (OS) */}
                                {prescription.items?.filter(i => i.eye === 'OS').map(item => (
                                    <tr key={item.id}>
                                        <td className="border border-slate-300 p-1.5 font-bold">LE (OS)</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.sphere || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.cylinder || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.axis || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.add_power || "-"}</td>
                                        <td className="border border-slate-300 p-1.5 text-center">{item.visual_acuity || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-2 rounded">
                            {prescription.lens_type && (
                                <div><span className="font-semibold">Lens Type:</span> {prescription.lens_type}</div>
                            )}
                            {prescription.lens_material && (
                                <div><span className="font-semibold">Material:</span> {prescription.lens_material}</div>
                            )}
                            {prescription.coatings && prescription.coatings.length > 0 && (
                                <div className="col-span-2"><span className="font-semibold">Coatings:</span> {prescription.coatings.join(", ")}</div>
                            )}
                            {prescription.pupillary_distance && (
                                <div><span className="font-semibold">IPD:</span> {prescription.pupillary_distance} mm</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Medicines (Rx) */}
                {prescription.medicine_items && prescription.medicine_items.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-300 pb-1 mb-2 flex items-center gap-2">
                            <span className="text-base">Rx</span> Medicines
                        </h3>
                        <div className="space-y-2">
                            {prescription.medicine_items.map((med, idx) => (
                                <div key={med.id || idx} className="rounded border border-slate-200 bg-slate-50 p-2">
                                    <p className="font-semibold text-slate-900 text-sm">
                                        {idx + 1}. {med.medicine_name}
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 text-xs mt-1">
                                        {med.dosage && (
                                            <div><span className="text-slate-600">Dosage:</span> {med.dosage}</div>
                                        )}
                                        {med.frequency && (
                                            <div><span className="text-slate-600">Frequency:</span> {med.frequency}</div>
                                        )}
                                        {med.duration && (
                                            <div><span className="text-slate-600">Duration:</span> {med.duration}</div>
                                        )}
                                    </div>
                                    {med.instructions && (
                                        <p className="text-xs text-slate-500 italic mt-1">{med.instructions}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Advice / Plan */}
                {(prescription.advice_items && prescription.advice_items.length > 0 || prescription.plan_of_action) && (
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-300 pb-1 mb-2">
                            Advice & Plan
                        </h3>

                        {prescription.plan_of_action && (
                            <div className="mb-2">
                                <p className="text-xs font-semibold text-slate-700">Plan of Action:</p>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-2 rounded">{prescription.plan_of_action}</p>
                            </div>
                        )}

                        {prescription.advice_items && prescription.advice_items.length > 0 && (
                            <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                                {prescription.advice_items.map((advice, idx) => (
                                    <li key={advice.id || idx}>
                                        <span className="font-medium">{advice.advice_type}:</span> {advice.description}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {prescription.remarks && (
                            <div className="mt-2 text-xs">
                                <span className="font-semibold">Remarks:</span> {prescription.remarks}
                            </div>
                        )}
                    </div>
                )}

                {/* Follow Up */}
                {prescription.followup_date && (
                    <div className="mb-6 text-xs p-2 border border-slate-200 rounded inline-block">
                        <span className="font-semibold">Follow Up:</span> {formatDate(prescription.followup_date)}
                    </div>
                )}

                {/* Doctor Signature Section */}
                <div className="mt-8 border-t border-slate-300 pt-4">
                    <div className="flex justify-between items-end">
                        <div className="text-[10px] text-slate-500">
                            <p>Generated on {new Date().toLocaleString("en-IN")}</p>
                            <p className="mt-1">This is a computer-generated prescription.</p>
                        </div>
                        <div className="text-center w-48">
                            <div className="h-12 border-b border-slate-400 mb-1"></div>
                            <p className="text-sm font-semibold text-slate-900">{prescription.doctor_name}</p>
                            <p className="text-[10px] text-slate-600">Doctor's Signature</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

DoctorPrescriptionPrint.displayName = "DoctorPrescriptionPrint";
