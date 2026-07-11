"use client";

import React from "react";
import { PrintHeader } from "@/components/common/PrintHeader";
import { useTenant } from "@/hooks/useTenant";
import type { DischargeSummaryPrintResponse } from "@/types/dayCare";

interface DischargeSummaryPrintProps {
    data: DischargeSummaryPrintResponse;
    doctorSignature?: string | null;
}

export const DischargeSummaryPrint = ({ data, doctorSignature }: DischargeSummaryPrintProps) => {
        const { tenant } = useTenant();

        return (
            <div
                className="prescription-print-container bg-white text-black font-sans mx-auto text-sm print:m-0 print:p-0"
                style={{
                    width: '100%',
                    maxWidth: '850px',
                    padding: '1.5rem',
                }}
            >
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page {
                            size: A4;
                            margin: 0;
                        }
                        .prescription-print-container {
                            width: 210mm !important;
                            min-height: 297mm !important;
                            padding: 10mm 15mm !important;
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

                <div className="mb-2">
                    <PrintHeader tenant={tenant} documentType="" />
                </div>

                <div className="border border-black mt-2">
                    <div className="text-center font-bold text-sm border-b border-black py-1 tracking-wider uppercase bg-slate-50">
                        DISCHARGE SUMMARY
                    </div>
                    
                    {/* Top Patient Info */}
                    <div className="grid grid-cols-2 text-xs border-b border-black divide-x divide-black">
                        <div className="p-2 space-y-1">
                            <div className="grid grid-cols-[130px_1fr]"><span className="font-bold">Patient Name</span><span className="font-semibold">: {data.patient_info?.name || "-"}</span></div>
                            <div className="grid grid-cols-[130px_1fr]"><span className="font-bold">Age / Sex</span><span className="font-semibold">: {data.patient_info?.age ? `${data.patient_info.age} / ` : ""}{data.patient_info?.gender || "-"}</span></div>
                            <div className="grid grid-cols-[130px_1fr]"><span className="font-bold">Date of Discharge</span><span className="font-semibold">: {data.admission_info?.discharge_date || "-"}</span></div>
                            <div className="grid grid-cols-[130px_1fr]"><span className="font-bold">Consultant Name</span><span className="font-semibold">: {data.admission_info?.consultant_name || "-"}</span></div>
                        </div>
                        <div className="p-2 space-y-1">
                            <div className="grid grid-cols-[110px_1fr]"><span className="font-bold">UHID No.</span><span className="font-semibold">: {data.patient_info?.uhid || "-"}</span></div>
                            <div className="grid grid-cols-[110px_1fr]"><span className="font-bold">Admission Date</span><span className="font-semibold">: {data.admission_info?.admission_date || "-"}</span></div>
                            <div className="grid grid-cols-[110px_1fr]"><span className="font-bold">Category</span><span className="font-semibold">: {data.admission_info?.category || "General"}</span></div>
                            <div className="grid grid-cols-[110px_1fr]"><span className="font-bold">Mobile</span><span className="font-semibold">: {data.patient_info?.mobile || "-"}</span></div>
                            <div className="grid grid-cols-[110px_1fr_1fr] pt-2">
                                <span></span>
                                <span className="font-bold">RE : <span className="font-medium">{data.right_eye_details?.vision || ""}</span></span>
                                <span className="font-bold">LE : <span className="font-medium">{data.left_eye_details?.vision || ""}</span></span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Diagnosis & Complaints */}
                    <div className="p-2 text-xs border-b border-black space-y-2 pb-3">
                        <div className="grid grid-cols-[180px_1fr]"><span className="font-bold uppercase">DIAGNOSIS :-</span><span className="uppercase font-semibold">{data.clinical_details?.diagnosis || "-"}</span></div>
                        <div className="grid grid-cols-[180px_1fr]"><span className="font-bold uppercase">CHIEF COMPLAINTS :-</span><span className="uppercase font-semibold">{data.clinical_details?.chief_complaints || "-"}</span></div>
                    </div>

                    {/* Systemic History */}
                    <div className="p-2 text-xs border-b border-black space-y-2 pb-3">
                        <div className="font-bold uppercase mb-2">Systemic History :-</div>
                        <div className="grid grid-cols-[200px_1fr] mb-2"><span className="font-bold uppercase">REASON FOR ADMISSION :-</span><span className="uppercase font-semibold">{data.clinical_details?.reason_for_admission || "-"}</span></div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="grid grid-cols-[80px_1fr]"><span className="font-bold uppercase">RBS:-</span><span className="uppercase font-semibold">{data.clinical_details?.systemic_history?.rbs || "-"}</span></div>
                                <div className="grid grid-cols-[80px_1fr]"><span className="font-bold uppercase">BP :-</span><span className="uppercase font-semibold">{data.clinical_details?.systemic_history?.bp || "-"}</span></div>
                                <div className="grid grid-cols-[80px_1fr]"><span className="font-bold uppercase">HCV:-</span><span className="uppercase font-semibold">{data.clinical_details?.systemic_history?.hcv || "-"}</span></div>
                                <div className="grid grid-cols-[80px_1fr]"><span className="font-bold uppercase">HIV I & II:-</span><span className="uppercase font-semibold">{data.clinical_details?.systemic_history?.hiv || "-"}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Procedure Details */}
                    <div className="p-2 text-xs space-y-3 pb-4 border-b border-black">
                        <div className="grid grid-cols-[200px_1fr]"><span className="font-bold uppercase">PROCEDURE :-</span><span className="uppercase font-semibold">{data.procedure_details?.procedure_name || "-"}</span></div>
                        <div className="grid grid-cols-[200px_1fr]"><span className="font-bold uppercase">Reason For GVP :-</span><span className="uppercase font-semibold">{data.procedure_details?.reason_for_gvp || "-"}</span></div>
                        <div className="grid grid-cols-[200px_1fr]"><span className="font-bold uppercase">CONDITION ON DISCHARGE :-</span><span className="uppercase font-semibold">{data.procedure_details?.condition_on_discharge || "-"}</span></div>
                        <div className="grid grid-cols-[200px_1fr]"><span className="font-bold uppercase">Hospital Stay :-</span><span className="uppercase font-semibold">{data.procedure_details?.hospital_stay || "-"}</span></div>
                        <div className="grid grid-cols-[200px_1fr]"><span className="font-bold uppercase">Medicine Administered :-</span><span className="uppercase font-semibold">{data.procedure_details?.medicine_administered || "-"}</span></div>
                    </div>

                    {/* Medications Table */}
                    <div className="p-2 text-xs">
                        <div className="font-bold uppercase mb-4 mt-2 border-b-2 border-slate-800 pb-1">MEDICATIONS :-</div>
                        
                        {data.medications && data.medications.length > 0 ? (
                            <div className="space-y-3">
                                {data.medications.map((med, idx) => (
                                    <div key={idx} className="text-sm">
                                        <div className="font-bold flex gap-2 leading-tight text-slate-900 flex-wrap items-center">
                                            <span>{idx + 1}. {med.name}</span>
                                            {med.dose && (
                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 text-slate-700 font-bold ml-1">
                                                    {med.dose}
                                                </span>
                                            )}
                                        </div>
                                        <div className="pl-5 text-xs text-slate-700 mt-1">
                                            {med.instructions && <span className="mr-2 font-semibold">({med.instructions})</span>}
                                            <span className="uppercase font-medium">
                                                {med.frequency && `${med.frequency}, `}
                                                {med.duration && `${med.duration}`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center italic text-slate-500 py-4">No medications prescribed</div>
                        )}
                        
                        {/* Some empty space at bottom of table like in image */}
                        <div className="h-2"></div>
                    </div>
                </div>

                {/* Signature Box */}
                <div className="mt-6 flex justify-end break-inside-avoid px-8">
                    <div className="text-center w-64 text-indigo-900/90 font-bold uppercase leading-snug">
                        <div className="h-12 flex items-end justify-center mb-1">
                            {doctorSignature ? (
                                <img
                                    src={doctorSignature}
                                    alt="Doctor Signature"
                                    className="max-h-12 max-w-full object-contain"
                                />
                            ) : (
                                <div className="border-b border-dashed border-slate-300 w-full h-6" />
                            )}
                        </div>
                        <div className="text-xs">DR. {data.admission_info?.consultant_name?.replace(/^Dr\.?\s*/i, '') || "DOCTOR"}</div>
                        <div className="text-[10px] text-slate-700">M.B.B.S. DNB</div>
                        <div className="text-[10px] text-slate-700">CONSULTANT OPHTHALMOLOGIST</div>
                    </div>
                </div>

            </div>
        );
    }
