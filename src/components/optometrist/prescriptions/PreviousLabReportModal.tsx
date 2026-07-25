"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, FlaskConical, AlertCircle, Calendar, Lock, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { labBookingsApi } from "@/services/labBookingsApi";
import type { LabBooking } from "@/services/labBookingsApi";
import type { LabTestResultItem } from "@/types";
import { NormalRangeIndicator } from "@/components/doctors/shared/NormalRangeIndicator";
import { TestReportPrint } from "@/components/lab-technician/TestReportPrint";
import { MRDImage } from "@/components/lab-technician/TestResultsForm";
import { handleError } from "@/utils/errorHandler";

interface PreviousLabReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: LabBooking | null;
}

export function PreviousLabReportModal({
    isOpen,
    onClose,
    booking,
}: PreviousLabReportModalProps) {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<LabTestResultItem[]>([]);

    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const printReportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handlePrintReport = useReactToPrint({
        contentRef: printReportRef,
        documentTitle: booking ? `LabReport_${booking.booking_number}` : "Lab_Report",
    });

    useEffect(() => {
        if (isOpen && booking) {
            fetchResults();
        } else {
            setPreviewImageUrl(null);
        }
    }, [isOpen, booking]);

    const fetchResults = async () => {
        if (!booking) return;
        setLoading(true);
        try {
            const data = await labBookingsApi.getResults(booking.id);
            setResults(data);
        } catch (error) {
            handleError(error, {
                defaultMessage: "Failed to load lab results",
                logError: true,
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !booking || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] border border-slate-200">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                    <div>
                        <div className="flex items-center gap-2">
                            <FlaskConical className="h-5 w-5 text-emerald-600" />
                            <h3 className="font-bold text-slate-800 text-lg">
                                Lab Report: {booking.booking_number}
                            </h3>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1 font-medium text-slate-600">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(booking.scheduled_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </span>
                            <span>•</span>
                            <span className="capitalize font-semibold text-slate-600">
                                Priority: {booking.priority}
                            </span>
                            {booking.sample_id && (
                                <>
                                    <span>•</span>
                                    <span className="font-mono text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md">
                                        Sample ID: {booking.sample_id}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="no-print rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="report-body-scroll flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                            <p className="text-sm text-slate-500 font-medium italic">Fetching report parameters...</p>
                        </div>
                    ) : booking.status !== "completed" ? (
                        <div className="text-center py-10 px-6 bg-amber-50/60 rounded-2xl border border-amber-200/80 my-2">
                            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                                <Lock className="h-6 w-6 text-amber-600" />
                            </div>
                            <h4 className="font-bold text-amber-950 text-base">Report is not published yet</h4>
                            <p className="text-xs text-amber-850 max-w-sm mx-auto mt-1.5 leading-relaxed">
                                The laboratory team has not finalized and published the results for booking{" "}
                                <span className="font-mono font-bold text-amber-950">{booking.booking_number}</span> yet.
                            </p>
                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-amber-300 text-xs font-semibold text-amber-900 shadow-sm">
                                <span>Current Status:</span>
                                <span className="capitalize font-bold text-amber-700">{booking.status.replace(/_/g, " ")}</span>
                            </div>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-6">
                            {results.map((testItem) => (
                                <div key={testItem.booking_item_id} className="space-y-3">
                                    <div className="px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 rounded-xl border border-emerald-100 flex items-center justify-between">
                                        <span className="font-bold text-sm text-emerald-950">{testItem.test_name}</span>
                                        <span className="text-xs text-emerald-850 bg-white border border-emerald-100 px-2 py-0.5 rounded font-mono font-medium">{testItem.test_code}</span>
                                    </div>

                                    <div className="space-y-3 pl-1">
                                        {testItem.results.map((parameter) => (
                                            <div
                                                key={parameter.id}
                                                className={`p-4 rounded-xl border transition hover:shadow-md ${
                                                    parameter.is_abnormal
                                                        ? "bg-rose-50/40 border-rose-200"
                                                        : "bg-white border-slate-250/70 shadow-sm"
                                                }`}
                                            >
                                                {parameter.is_abnormal && (
                                                    <div className="mb-2 flex justify-end">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                                            <AlertCircle className="h-3 w-3 text-rose-600" /> Out of Reference Range
                                                        </span>
                                                    </div>
                                                )}
                                                {parameter.parameter_type === "image" ? (
                                                    <div className="space-y-2">
                                                        <p className="font-semibold text-xs text-slate-800">{parameter.parameter_name}</p>
                                                        <div className="h-44 w-full overflow-hidden flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 p-2">
                                                            <MRDImage documentId={parameter.result_value} clickable className="max-h-full max-w-full object-contain rounded" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <NormalRangeIndicator
                                                            label={parameter.parameter_name}
                                                            value={parameter.result_numeric ?? parameter.result_value}
                                                            normalMin={parameter.normal_min}
                                                            normalMax={parameter.normal_max}
                                                            unit={parameter.unit || ""}
                                                            size="md"
                                                        />
                                                        {parameter.normal_text && (
                                                            <p className="mt-2 text-xs text-slate-550">
                                                                Reference Normal: <span className="font-medium text-slate-700">{parameter.normal_text}</span>
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                                {parameter.notes && (
                                                    <p className="mt-1 text-xs italic text-slate-500">
                                                        Technician Note: {parameter.notes}
                                                    </p>
                                                )}
                                                {parameter.verified_at && (
                                                    <p className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                                        ✓ Verified on {new Date(parameter.verified_at).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <AlertCircle className="mx-auto h-12 w-12 text-slate-300 animate-bounce" />
                            <h4 className="font-bold text-slate-800 mt-2">No Parameters Found</h4>
                            <p className="text-xs text-slate-500 mt-1">This report is published but contains no parameters.</p>
                        </div>
                    )}

                </div>

                {/* Modal Footer */}
                <div className="no-print px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => handlePrintReport()}
                        className="px-4 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 text-sm font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-sky-200"
                    >
                        <Printer className="h-4 w-4" /> Print Report
                    </button>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                        Close Report
                    </button>
                </div>
            </div>

            {/* Lightbox Modal for Full Photo Preview */}
            {previewImageUrl && (
                <div className="no-print fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
                        <button
                            onClick={() => setPreviewImageUrl(null)}
                            className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewImageUrl}
                            alt="Diagnostic Full View"
                            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10"
                        />
                    </div>
                </div>
            )}

            {/* Hidden Printable Report for react-to-print (bypasses parent modal clipping) */}
            {booking && (
                <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
                    <div ref={printReportRef} className="print-content">
                        <TestReportPrint
                            booking={booking}
                            patientName={(booking as any).patient_name || booking.patient_id || "Patient"}
                            patientMobile={(booking as any).patient_mobile || ""}
                            testResults={results.map((r) => ({
                                test: {
                                    id: r.booking_item_id,
                                    lab_test_id: r.booking_item_id,
                                    test_name: r.test_name,
                                    test_code: r.test_code,
                                    price: 0,
                                    is_prescribed: true,
                                },
                                results: r.results.map((p) => ({
                                    id: p.id,
                                    booking_item_id: r.booking_item_id,
                                    parameter_id: p.id,
                                    parameter_name: p.parameter_name,
                                    parameter_code: p.parameter_name,
                                    unit: p.unit || "",
                                    result_value: p.result_value || "",
                                    result_numeric: p.result_numeric,
                                    is_abnormal: Boolean(p.is_abnormal),
                                    normal_min: p.normal_min,
                                    normal_max: p.normal_max,
                                    normal_text: p.normal_text,
                                    notes: p.notes,
                                    verified_by: p.verified_by,
                                    verified_at: p.verified_at,
                                    created_by: "",
                                    created_at: "",
                                    updated_at: "",
                                    section_name: p.section_name || null,
                                    parameter_type: p.parameter_type || "number",
                                })),
                            }))}
                        />
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
