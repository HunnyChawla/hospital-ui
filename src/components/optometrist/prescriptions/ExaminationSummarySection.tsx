"use client";

import React from "react";
import {
    Eye,
    AlertCircle,
    FileText,
    Activity,
    Pill,
    Stethoscope
} from "lucide-react";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import { EditableRefractionCard } from "./EditableRefractionCard";
import { EditableIOPCard } from "./EditableIOPCard";
import { EditableVisionCard } from "./EditableVisionCard";

interface ExaminationSummarySectionProps {
    data: PrescriptionDataResponse;
    patientId: string;
    visitId: string;
    optometristId: string;
    onDataChange?: () => void;
    isReadOnly?: boolean;
}

export function ExaminationSummarySection({
    data,
    patientId,
    visitId,
    optometristId,
    onDataChange,
    isReadOnly = false,
}: ExaminationSummarySectionProps) {
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "";
        const year = date.getFullYear();
        const month = date.getMonth();
        if (date.getDate() === 1 && month === 0) {
            return String(year);
        }
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDiopter = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined || val === "") return "—";
        const num = typeof val === "number" ? val : parseFloat(String(val));
        if (isNaN(num)) return String(val);
        return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                <Stethoscope className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Examination Summary</h3>
            </div>

            {/* Chief Complaints */}
            {data.complaints && data.complaints.length > 0 && (
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                        <h4 className="font-semibold text-slate-900">Chief Complaints</h4>
                    </div>
                    <div className="space-y-2">
                        {data.complaints.map((complaint) => (
                            <div key={complaint.id} className="rounded bg-slate-50 p-2.5">
                                <p className="font-medium text-slate-800">{complaint.complaint}</p>
                                <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                    <span>Severity: <span className="font-medium capitalize">{complaint.severity}</span></span>
                                    <span>Duration: <span className="font-medium">{complaint.duration}</span></span>
                                </div>
                                {complaint.notes && (
                                    <p className="text-xs text-slate-600 mt-1">{complaint.notes}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Auto Refraction Data */}
            {data.ar_data && (
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <h4 className="font-semibold text-slate-900">Auto Refraction (AR)</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded bg-blue-50 p-3 space-y-3">
                            <p className="text-xs font-semibold text-blue-700 border-b border-blue-100 pb-1">OD (Right Eye)</p>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Dry AR</p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Sphere:</span>
                                        <span className="font-medium">{formatDiopter(data.ar_data.od_sphere)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Cylinder:</span>
                                        <span className="font-medium">{formatDiopter(data.ar_data.od_cylinder)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Axis:</span>
                                        <span className="font-medium">{data.ar_data.od_axis ? `${data.ar_data.od_axis}°` : "—"}</span>
                                    </div>
                                </div>
                            </div>
                            {(data.ar_data.od_wet_sphere || data.ar_data.od_wet_cylinder || data.ar_data.od_wet_axis) && (
                                <div>
                                    <p className="text-[10px] font-semibold text-purple-700 uppercase mb-1">Wet AR (Dilated)</p>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Sphere:</span>
                                            <span className="font-medium">{formatDiopter(data.ar_data.od_wet_sphere)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Cylinder:</span>
                                            <span className="font-medium">{formatDiopter(data.ar_data.od_wet_cylinder)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Axis:</span>
                                            <span className="font-medium">{data.ar_data.od_wet_axis ? `${data.ar_data.od_wet_axis}°` : "—"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="rounded bg-green-50 p-3 space-y-3">
                            <p className="text-xs font-semibold text-green-700 border-b border-green-100 pb-1">OS (Left Eye)</p>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Dry AR</p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Sphere:</span>
                                        <span className="font-medium">{formatDiopter(data.ar_data.os_sphere)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Cylinder:</span>
                                        <span className="font-medium">{formatDiopter(data.ar_data.os_cylinder)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Axis:</span>
                                        <span className="font-medium">{data.ar_data.os_axis ? `${data.ar_data.os_axis}°` : "—"}</span>
                                    </div>
                                </div>
                            </div>
                            {(data.ar_data.os_wet_sphere || data.ar_data.os_wet_cylinder || data.ar_data.os_wet_axis) && (
                                <div>
                                    <p className="text-[10px] font-semibold text-purple-700 uppercase mb-1">Wet AR (Dilated)</p>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Sphere:</span>
                                            <span className="font-medium">{formatDiopter(data.ar_data.os_wet_sphere)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Cylinder:</span>
                                            <span className="font-medium">{formatDiopter(data.ar_data.os_wet_cylinder)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Axis:</span>
                                            <span className="font-medium">{data.ar_data.os_wet_axis ? `${data.ar_data.os_wet_axis}°` : "—"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {data.ar_data.pupillary_distance && (
                        <div className="mt-2 text-sm text-center text-slate-600">
                            PD: <span className="font-medium">{data.ar_data.pupillary_distance} mm</span>
                        </div>
                    )}
                </section>
            )}

            {/* Refraction - Editable */}
            <EditableRefractionCard
                data={data.refraction}
                patientId={patientId}
                visitId={visitId}
                optometristId={optometristId}
                onSave={onDataChange || (() => {})}
                isReadOnly={isReadOnly}
            />

            {/* IOP - Editable */}
            <EditableIOPCard
                data={data.iop}
                patientId={patientId}
                visitId={visitId}
                optometristId={optometristId}
                onSave={onDataChange || (() => {})}
                isReadOnly={isReadOnly}
            />

            {/* Vision - Editable */}
            <EditableVisionCard
                data={data.vision}
                patientId={patientId}
                visitId={visitId}
                optometristId={optometristId}
                onSave={onDataChange || (() => {})}
                isReadOnly={isReadOnly}
            />

            {/* Medical Conditions */}
            {data.medical_conditions && data.medical_conditions.length > 0 && (
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Activity className="h-4 w-4 text-amber-600" />
                        <h4 className="font-semibold text-slate-900">Medical History</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.medical_conditions.map((condition) => (
                            <span
                                key={condition.id}
                                className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"
                            >
                                {condition.condition_name.replace(/_/g, " ")}
                                {condition.is_controlled && " (Controlled)"}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* Drug Allergies */}
            {data.drug_allergies && data.drug_allergies.length > 0 && (
                <section className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Pill className="h-4 w-4 text-rose-600" />
                        <h4 className="font-semibold text-rose-900">Drug Allergies</h4>
                    </div>
                    <div className="space-y-2">
                        {data.drug_allergies.map((allergy) => (
                            <div key={allergy.id} className="rounded bg-white p-2 border border-rose-200">
                                <p className="font-medium text-slate-800">{allergy.drug_name}</p>
                                <div className="flex gap-4 text-xs text-slate-500 mt-0.5">
                                    <span>Reaction: {allergy.reaction}</span>
                                    <span className="capitalize">Severity: {allergy.severity}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Ophthalmic History */}
            {data.ophthalmic_history && data.ophthalmic_history.length > 0 && (
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Eye className="h-4 w-4 text-sky-600" />
                        <h4 className="font-semibold text-slate-900">Ophthalmic Surgery History</h4>
                    </div>
                    <div className="space-y-2">
                        {data.ophthalmic_history.map((history) => (
                            <div key={history.id} className="rounded bg-slate-50 p-2.5">
                                <p className="font-medium text-slate-800">{history.surgery_name}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                                    <span>Eye: {history.eye}</span>
                                    {history.surgery_date && formatDate(history.surgery_date) && (
                                        <span>Date: {formatDate(history.surgery_date)}</span>
                                    )}
                                    {history.surgeon_name && (
                                        <span>Surgeon: {history.surgeon_name}</span>
                                    )}
                                    {history.hospital_name && (
                                        <span>Hospital: {history.hospital_name}</span>
                                    )}
                                </div>
                                {history.complications && history.complications !== "None" && (
                                    <p className="text-xs text-rose-600 mt-1">Complications: {history.complications}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* No Data State - Show only when ALL sections are empty */}
            {!data.complaints?.length && !data.ar_data && !data.refraction && !data.iop && !data.vision && !data.medical_conditions?.length && !data.drug_allergies?.length && !data.ophthalmic_history?.length && (
                <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No examination data recorded yet</p>
                </div>
            )}
        </div>
    );
}
