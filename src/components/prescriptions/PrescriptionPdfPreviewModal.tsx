"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    X,
    Printer,
    Download,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Loader2,
    AlertCircle,
    FileText,
    Check,
    SlidersHorizontal,
    RefreshCw,
} from "lucide-react";
import { prescriptionsApi } from "@/services/prescriptionsApi";
import { handleError } from "@/utils/errorHandler";

interface PrescriptionPdfPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    visitId?: string | null;
    prescriptionId?: string | null;
    patientName?: string | null;
    uhid?: string | null;
    initialSections?: string[];
}

const AVAILABLE_SECTIONS = [
    { key: "complaints", label: "Presenting Complaints" },
    { key: "symptoms", label: "Symptoms" },
    { key: "vision", label: "Vision & IOP" },
    { key: "refraction_dry", label: "Refraction (Dry)" },
    { key: "refraction_dilated", label: "Refraction (Dilated)" },
    { key: "glasses_rx", label: "Glasses Rx" },
    { key: "optical_specs", label: "Optical Specs" },
    { key: "vitals", label: "Vital Signs" },
    { key: "allergies", label: "Drug Allergies" },
    { key: "history", label: "Medical History" },
    { key: "diagnosis", label: "Diagnosis" },
    { key: "meds", label: "Medicines / Prescription" },
    { key: "tests", label: "Lab Investigations" },
    { key: "advice", label: "Advice" },
    { key: "plan", label: "Plan of Action" },
    { key: "surgeries", label: "Planned Procedures" },
    { key: "followup", label: "Follow-up" },
    { key: "remarks", label: "Remarks" },
    { key: "notes", label: "Notes" },
];

export function PrescriptionPdfPreviewModal({
    isOpen,
    onClose,
    visitId,
    prescriptionId,
    patientName,
    uhid,
    initialSections,
}: PrescriptionPdfPreviewModalProps) {
    const targetId = prescriptionId || visitId;
    const [loading, setLoading] = useState(true);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1.0);
    const [showSectionFilter, setShowSectionFilter] = useState(false);
    const [selectedSections, setSelectedSections] = useState<string[]>(
        initialSections || AVAILABLE_SECTIONS.map((s) => s.key)
    );
    const [isDownloading, setIsDownloading] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const objectUrlRef = useRef<string | null>(null);

    const cleanupObjectUrl = useCallback(() => {
        if (objectUrlRef.current) {
            window.URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, []);

    const fetchPdf = useCallback(
        async (sectionsToFilter?: string[]) => {
            if (!targetId) return;

            setLoading(true);
            setError(null);
            try {
                cleanupObjectUrl();

                const isAllSelected =
                    !sectionsToFilter ||
                    sectionsToFilter.length === 0 ||
                    sectionsToFilter.length === AVAILABLE_SECTIONS.length;

                const sectionsParam = isAllSelected ? undefined : sectionsToFilter;

                const blob = await prescriptionsApi.getPrintPdf(targetId, sectionsParam);
                const url = window.URL.createObjectURL(blob);
                objectUrlRef.current = url;
                setPdfUrl(url);
            } catch (err: any) {
                console.error("Failed to fetch prescription PDF:", err);
                const status = err?.response?.status;
                if (status === 404) {
                    setError("No prescription found for this visit/patient.");
                } else {
                    setError(err?.response?.data?.message || "Failed to load prescription PDF preview.");
                }
            } finally {
                setLoading(false);
            }
        },
        [targetId, cleanupObjectUrl]
    );

    useEffect(() => {
        if (isOpen && targetId) {
            fetchPdf(selectedSections);
        } else {
            cleanupObjectUrl();
            setPdfUrl(null);
            setError(null);
        }

        return () => {
            cleanupObjectUrl();
        };
    }, [isOpen, targetId, fetchPdf, cleanupObjectUrl]);

    const handlePrint = () => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.focus();
            iframeRef.current.contentWindow.print();
        } else if (pdfUrl) {
            const printWindow = window.open(pdfUrl);
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                };
            }
        }
    };

    const handleDownload = async () => {
        if (!targetId) return;
        try {
            setIsDownloading(true);
            const isAllSelected = selectedSections.length === AVAILABLE_SECTIONS.length;
            const sectionsParam = isAllSelected ? undefined : selectedSections;
            await prescriptionsApi.downloadPrintPdf(
                targetId,
                `Prescription-${uhid || targetId.slice(0, 8)}.pdf`,
                sectionsParam
            );
        } catch (err) {
            handleError(err, { defaultMessage: "Failed to download PDF", logError: true });
        } finally {
            setIsDownloading(false);
        }
    };

    const toggleSection = (key: string) => {
        setSelectedSections((prev) => {
            if (prev.includes(key)) {
                return prev.filter((k) => k !== key);
            } else {
                return [...prev, key];
            }
        });
    };

    const applySectionFilter = () => {
        fetchPdf(selectedSections);
        setShowSectionFilter(false);
    };

    const selectAllSections = () => {
        setSelectedSections(AVAILABLE_SECTIONS.map((s) => s.key));
    };

    const clearAllSections = () => {
        setSelectedSections(["diagnosis", "meds"]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-slate-100 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl h-[92vh] overflow-hidden border border-slate-300">
                {/* Header Bar */}
                <div className="bg-white px-6 py-3 border-b border-slate-200 flex items-center justify-between shadow-xs shrink-0 z-30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800 text-base">Prescription Print Preview</h3>
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded text-[10px] border border-emerald-200">
                                    Server PDF
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                                {patientName ? <span className="font-semibold text-slate-700">{patientName}</span> : "Patient"}{" "}
                                {uhid && <span className="text-slate-400">({uhid})</span>}
                            </p>
                        </div>
                    </div>

                    {/* Toolbar Controls */}
                    <div className="flex items-center gap-2">
                        {/* Zoom Controls */}
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 mr-2 text-slate-600">
                            <button
                                onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                                className="p-1 hover:bg-white rounded hover:text-slate-900 transition-all"
                                title="Zoom Out"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </button>
                            <span className="text-xs font-bold px-2 min-w-[44px] text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
                                className="p-1 hover:bg-white rounded hover:text-slate-900 transition-all"
                                title="Zoom In"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setZoom(1.0)}
                                className="p-1 hover:bg-white rounded hover:text-slate-900 transition-all ml-1 border-l border-slate-200"
                                title="Reset Zoom"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Section Filter Toggle */}
                        <button
                            onClick={() => setShowSectionFilter((v) => !v)}
                            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold transition-all ${
                                showSectionFilter || selectedSections.length < AVAILABLE_SECTIONS.length
                                    ? "bg-sky-50 border-sky-300 text-sky-700"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                            title="Filter Sections to Print"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden sm:inline">Sections</span>
                            {selectedSections.length < AVAILABLE_SECTIONS.length && (
                                <span className="bg-sky-600 text-white rounded-full px-1.5 py-0.2 text-[9px] font-bold">
                                    {selectedSections.length}
                                </span>
                            )}
                        </button>

                        {/* Refresh Button */}
                        <button
                            onClick={() => fetchPdf(selectedSections)}
                            disabled={loading}
                            className="p-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-xs disabled:opacity-50"
                            title="Reload PDF"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
                        </button>

                        {/* Download PDF Button */}
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading || loading || !pdfUrl}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all text-xs disabled:opacity-50"
                            title="Download PDF file"
                        >
                            {isDownloading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                            ) : (
                                <Download className="h-4 w-4 text-sky-600" />
                            )}
                            <span className="hidden sm:inline">Download</span>
                        </button>

                        {/* Print Button */}
                        <button
                            onClick={handlePrint}
                            disabled={loading || !pdfUrl}
                            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-all text-xs shadow-sm disabled:opacity-50"
                            title="Print Prescription"
                        >
                            <Printer className="h-4 w-4" />
                            <span>Print</span>
                        </button>

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex relative">
                    {/* Section Filter Sidebar */}
                    {showSectionFilter && (
                        <div className="w-72 bg-white border-r border-slate-200 flex flex-col z-20 shrink-0 shadow-lg animate-in slide-in-from-left-4 duration-200">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                                    Print Sections
                                </h4>
                                <div className="flex gap-2">
                                    <button
                                        onClick={selectAllSections}
                                        className="text-[10px] text-sky-600 hover:underline font-semibold"
                                    >
                                        All
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        onClick={clearAllSections}
                                        className="text-[10px] text-slate-500 hover:underline"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {AVAILABLE_SECTIONS.map((sec) => {
                                    const checked = selectedSections.includes(sec.key);
                                    return (
                                        <label
                                            key={sec.key}
                                            onClick={() => toggleSection(sec.key)}
                                            className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                                                checked
                                                    ? "bg-sky-50/70 text-sky-900 border border-sky-200"
                                                    : "bg-slate-50 text-slate-500 border border-slate-200/60 hover:bg-slate-100"
                                            }`}
                                        >
                                            <div
                                                className={`h-4 w-4 rounded flex items-center justify-center border transition-all ${
                                                    checked
                                                        ? "bg-sky-600 border-sky-600 text-white"
                                                        : "border-slate-300 bg-white"
                                                }`}
                                            >
                                                {checked && <Check className="h-3 w-3" />}
                                            </div>
                                            <span>{sec.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            <div className="p-3 border-t border-slate-100 bg-slate-50">
                                <button
                                    onClick={applySectionFilter}
                                    className="w-full py-2 bg-sky-600 text-white font-semibold rounded-lg text-xs hover:bg-sky-700 transition-all shadow-xs"
                                >
                                    Apply Filter &amp; Reload
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Canvas / PDF Area */}
                    <div className="flex-1 overflow-y-auto overflow-x-auto flex justify-center items-start p-6 bg-slate-300/70 custom-scrollbar">
                        {loading && (
                            <div className="my-auto flex flex-col items-center gap-3 bg-white p-8 rounded-2xl shadow-md border border-slate-200">
                                <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                                <p className="text-slate-600 font-semibold text-xs">Generating Prescription PDF...</p>
                            </div>
                        )}

                        {!loading && error && (
                            <div className="my-auto bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-slate-200">
                                <div className="h-14 w-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <AlertCircle className="h-7 w-7 text-amber-500" />
                                </div>
                                <h4 className="text-base font-bold text-slate-800">Prescription Unavailable</h4>
                                <p className="text-xs text-slate-500 mt-1.5">{error}</p>
                                <div className="flex gap-2 mt-5">
                                    <button
                                        onClick={() => fetchPdf(selectedSections)}
                                        className="flex-1 py-2 bg-sky-600 text-white font-semibold text-xs rounded-xl hover:bg-sky-700 transition-all"
                                    >
                                        Retry
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}

                        {!loading && !error && pdfUrl && (
                            <div
                                className="transition-transform duration-200 origin-top bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-300 shrink-0"
                                style={{
                                    width: `${Math.round(800 * zoom)}px`,
                                    height: `${Math.round(1130 * zoom)}px`,
                                    maxWidth: "100%",
                                }}
                            >
                                <iframe
                                    ref={iframeRef}
                                    src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                                    title="Prescription PDF Preview"
                                    className="w-full h-full border-0"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
