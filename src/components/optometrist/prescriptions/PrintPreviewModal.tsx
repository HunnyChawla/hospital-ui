"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Printer, Loader2, CheckCircle, FileText, Layout, ZoomIn, ZoomOut, RotateCcw, Monitor, Settings2, Columns, MessageSquare, Activity, Eye, Compass, Glasses, Layers, ClipboardCheck, Pill, FlaskConical, Info, Stethoscope, Calendar, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { DoctorPrescriptionPrint } from "./DoctorPrescriptionPrint";
import type { OptometryPrescription, PlannedSurgery } from "@/types";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import { Footer } from "@/components/layout/Footer";

const STORAGE_KEY = "prescription_print_preferences";

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    prescription: OptometryPrescription;
    visitData?: PrescriptionDataResponse | null;
    doctorSignature?: string | null;
    plannedSurgeries?: PlannedSurgery[];
    showHeader?: boolean;
    onFinalize?: (printAfter?: boolean) => Promise<void>;
}

export function PrintPreviewModal({
    isOpen,
    onClose,
    prescription,
    visitData,
    doctorSignature,
    plannedSurgeries = [],
    showHeader = true,
    onFinalize,
}: PrintPreviewModalProps) {
    const [isFinalizing, setIsFinalizing] = useState(false);
    const allSections = [
        "Header",
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
        "FollowUp",
        "Digital Signature",
        "Signature Placeholder"
    ];

    const defaultContentSections = [
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

    const [visibleSections, setVisibleSections] = useState<string[]>(allSections);
    const [contentOrder, setContentOrder] = useState<string[]>(defaultContentSections);

    // Refs for drag and drop
    const dragItemIndex = useRef<number | null>(null);
    const dragOverItemIndex = useRef<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

    // Load preferences from local storage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    // Filter to ensure we only load sections that actually exist in the current version
                    const validSections = parsed.filter(s => allSections.includes(s));
                    setVisibleSections(validSections);
                }
            }

            const savedOrder = localStorage.getItem("prescription_section_order");
            if (savedOrder) {
                const parsedOrder = JSON.parse(savedOrder);
                if (Array.isArray(parsedOrder)) {
                    const validOrder = parsedOrder.filter(s => defaultContentSections.includes(s));
                    const missing = defaultContentSections.filter(s => !validOrder.includes(s));
                    setContentOrder([...validOrder, ...missing]);
                }
            }
        } catch (e) {
            console.error("Failed to load print preferences:", e);
        }
    }, []);

    const [zoom, setZoom] = useState(0.9);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Prescription_${prescription.patient_name || prescription.visit_id || "Print"}`,
        pageStyle: `
            @page {
                size: A4;
                margin: 10mm;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
            }
        `,
        onBeforePrint: async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
        },
    });

    const toggleSection = (section: string) => {
        setVisibleSections(prev => {
            const next = prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section];

            // Save to local storage
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch (e) {
                console.error("Failed to save print preferences:", e);
            }

            return next;
        });
    };

    const hasValue = (v: any) => v !== null && v !== undefined && v !== "";

    // Filtered list of content sections that have data (visible to user in sidebar)
    const filteredContentOrder = contentOrder.filter(section => {
        let hasData = true;
        if (section === "Presenting Complaint") hasData = !!(visitData?.complaints?.length);
        if (section === "Symptoms") hasData = !!(prescription.symptoms?.length);
        if (section === "Vision") hasData = !!(visitData?.vision || visitData?.iop);
        if (section === "Refraction (Dry)") {
            hasData = visitData?.refraction ? [
                visitData.refraction.od_sphere, visitData.refraction.os_sphere,
                visitData.refraction.od_cylinder, visitData.refraction.os_cylinder,
                visitData.refraction.od_axis, visitData.refraction.os_axis,
                visitData.refraction.od_add_power, visitData.refraction.os_add_power,
                visitData.refraction.od_prism, visitData.refraction.os_prism,
                visitData.refraction.od_visual_acuity_uncorrected, visitData.refraction.os_visual_acuity_uncorrected,
                visitData.refraction.od_visual_acuity_corrected, visitData.refraction.os_visual_acuity_corrected,
                visitData.refraction.od_distance_bcva, visitData.refraction.os_distance_bcva,
                visitData.refraction.od_near_bcva, visitData.refraction.os_near_bcva
            ].some(hasValue) : false;
        }
        if (section === "Refraction (Dilated)") {
            hasData = visitData?.refraction ? [
                visitData.refraction.od_dilated_sphere, visitData.refraction.os_dilated_sphere,
                visitData.refraction.od_dilated_cylinder, visitData.refraction.os_dilated_cylinder,
                visitData.refraction.od_dilated_axis, visitData.refraction.os_dilated_axis,
                visitData.refraction.od_dilated_visual_acuity, visitData.refraction.os_dilated_visual_acuity,
                visitData.refraction.od_dilated_pinhole, visitData.refraction.os_dilated_pinhole
            ].some(hasValue) : false;
        }
        if (section === "Glasses Rx") hasData = !!(prescription.items?.length);
        if (section === "Optical Specs") hasData = !!(prescription.lens_type || prescription.vision_type || prescription.lens_material || (prescription.coatings && prescription.coatings.length > 0));
        if (section === "Diagnosis") hasData = !!(prescription.diagnosis);
        if (section === "Meds") hasData = !!(prescription.medicine_items?.length);
        if (section === "Lab Investigations") hasData = !!(prescription.advice_items?.some((a: any) => a.advice_type === "Lab Test" || a.advice_type === "lab-test"));
        if (section === "Advice") hasData = !!(prescription.advice_items?.some((a: any) => a.advice_type !== "Lab Test" && a.advice_type !== "lab-test") || prescription.plan_of_action);
        if (section === "Planned Surgery") hasData = !!(plannedSurgeries?.length);
        if (section === "FollowUp") hasData = !!(prescription.followup_date);
        return hasData;
    });

    const moveSectionUp = (filteredIndex: number) => {
        if (filteredIndex === 0) return;
        const item1 = filteredContentOrder[filteredIndex];
        const item2 = filteredContentOrder[filteredIndex - 1];
        
        setContentOrder(prev => {
            const next = [...prev];
            const idx1 = next.indexOf(item1);
            const idx2 = next.indexOf(item2);
            if (idx1 !== -1 && idx2 !== -1) {
                next[idx1] = item2;
                next[idx2] = item1;
            }
            localStorage.setItem("prescription_section_order", JSON.stringify(next));
            return next;
        });
    };

    const moveSectionDown = (filteredIndex: number) => {
        if (filteredIndex === filteredContentOrder.length - 1) return;
        const item1 = filteredContentOrder[filteredIndex];
        const item2 = filteredContentOrder[filteredIndex + 1];
        
        setContentOrder(prev => {
            const next = [...prev];
            const idx1 = next.indexOf(item1);
            const idx2 = next.indexOf(item2);
            if (idx1 !== -1 && idx2 !== -1) {
                next[idx1] = item2;
                next[idx2] = item1;
            }
            localStorage.setItem("prescription_section_order", JSON.stringify(next));
            return next;
        });
    };

    const handleDragStart = (filteredIndex: number) => {
        dragItemIndex.current = filteredIndex;
    };

    const handleDragOver = (e: React.DragEvent, filteredIndex: number) => {
        e.preventDefault();
        dragOverItemIndex.current = filteredIndex;
        if (draggedOverIndex !== filteredIndex) {
            setDraggedOverIndex(filteredIndex);
        }
    };

    const handleDrop = () => {
        if (dragItemIndex.current === null || dragOverItemIndex.current === null) return;
        if (dragItemIndex.current === dragOverItemIndex.current) {
            dragItemIndex.current = null;
            dragOverItemIndex.current = null;
            setDraggedOverIndex(null);
            return;
        }

        const item1 = filteredContentOrder[dragItemIndex.current!];
        const item2 = filteredContentOrder[dragOverItemIndex.current!];

        setContentOrder(prev => {
            const next = [...prev];
            const idx1 = next.indexOf(item1);
            const idx2 = next.indexOf(item2);
            if (idx1 !== -1 && idx2 !== -1) {
                next.splice(idx1, 1);
                const newIdx2 = next.indexOf(item2);
                next.splice(newIdx2, 0, item1);
            }
            localStorage.setItem("prescription_section_order", JSON.stringify(next));
            return next;
        });

        dragItemIndex.current = null;
        dragOverItemIndex.current = null;
        setDraggedOverIndex(null);
    };

    const handleDragEnd = () => {
        dragItemIndex.current = null;
        dragOverItemIndex.current = null;
        setDraggedOverIndex(null);
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.05, 1.5));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.05, 0.5));
    const handleResetZoom = () => setZoom(0.9);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-slate-50 w-[80vw] h-full md:h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 md:rounded-xl shadow-2xl border border-slate-200">

                {/* Formal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white z-30">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                            <Printer className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 leading-none flex items-center gap-2">
                                <span>Prescription Print Preview</span>
                                {prescription.status !== 'finalized' && (
                                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-md tracking-wider">
                                        Draft Preview
                                    </span>
                                )}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium tracking-wide">
                                Patient: <span className="text-slate-700">{prescription.patient_name || "Ref: " + prescription.visit_id}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Zoom Controls */}
                        <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5">
                            <button onClick={handleZoomOut} className="p-1.5 hover:bg-white rounded transition-all text-slate-500 hover:text-sky-600" title="Zoom Out">
                                <ZoomOut className="h-4 w-4" />
                            </button>
                            <span className="px-3 text-[11px] font-bold text-slate-600 min-w-[50px] text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button onClick={handleZoomIn} className="p-1.5 hover:bg-white rounded transition-all text-slate-500 hover:text-sky-600" title="Zoom In">
                                <ZoomIn className="h-4 w-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1" />
                            <button onClick={handleResetZoom} className="p-1.5 hover:bg-white rounded transition-all text-slate-400 hover:text-slate-600" title="Reset Zoom">
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            {prescription.status !== 'finalized' && (
                                <>
                                    <button
                                        onClick={() => handlePrint()}
                                        className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all text-xs shadow-2xs"
                                        title="Print a draft preview copy without finalizing"
                                    >
                                        <Printer className="h-4 w-4 text-slate-500" />
                                        <span>Print Draft</span>
                                    </button>

                                    {onFinalize && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    if (onFinalize) {
                                                        setIsFinalizing(true);
                                                        onFinalize(false).finally(() => setIsFinalizing(false));
                                                    }
                                                }}
                                                disabled={isFinalizing}
                                                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-all text-xs shadow-sm disabled:opacity-50"
                                            >
                                                {isFinalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                <span>Finalize Only</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    if (onFinalize) {
                                                        setIsFinalizing(true);
                                                        onFinalize(true).then(() => {
                                                            setTimeout(() => handlePrint(), 100);
                                                        }).finally(() => setIsFinalizing(false));
                                                    }
                                                }}
                                                disabled={isFinalizing}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all text-xs shadow-md disabled:opacity-50"
                                            >
                                                {isFinalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                                <span>Finalize & Print</span>
                                            </button>
                                        </>
                                    )}
                                </>
                            )}

                            {prescription.status === 'finalized' && (
                                <button
                                    onClick={() => handlePrint()}
                                    className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-all text-xs shadow-sm"
                                >
                                    <Printer className="h-4 w-4" />
                                    <span>Print Document</span>
                                </button>
                            )}

                            <div className="w-px h-6 bg-slate-200 mx-1" />

                            <button
                                onClick={onClose}
                                className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex relative">

                    {/* Floating-style Configuration Sidebar (Collapsible feel, but fixed for now) */}
                    <div className="w-[300px] bg-white border-r border-slate-200 flex flex-col z-20 shrink-0">
                        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                            {/* Document Layout Section */}
                            <div className="mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Layout className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Layout</h4>
                                </div>
                                <button
                                    onClick={() => toggleSection("Header")}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                                        visibleSections.includes("Header")
                                            ? 'bg-sky-50 border-sky-100 text-sky-700 font-medium'
                                            : 'bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`h-4 w-4 rounded flex items-center justify-center transition-all ${
                                            visibleSections.includes("Header") ? 'bg-sky-600' : 'border border-slate-300'
                                        }`}>
                                            {visibleSections.includes("Header") && <CheckCircle className="h-3 w-3 text-white" />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Layout className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                                            <span className="text-xs font-semibold">Print Header / Letterhead</span>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Clinical Sections Reordering list */}
                            <div className="mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Columns className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinical Sections (Drag to Reorder)</h4>
                                </div>
                                <div className="space-y-2">
                                    {filteredContentOrder.map((section, index) => {
                                        const isSelected = visibleSections.includes(section);
                                        return (
                                            <div
                                                key={section}
                                                draggable
                                                onDragStart={() => handleDragStart(index)}
                                                onDragOver={(e) => handleDragOver(e, index)}
                                                onDrop={handleDrop}
                                                onDragEnd={handleDragEnd}
                                                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg border transition-all duration-200 bg-white ${
                                                    draggedOverIndex === index 
                                                        ? 'border-sky-500 bg-sky-50/30 shadow-sm' 
                                                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                                }`}
                                            >
                                                {/* Left Controls: Drag Handle + Arrows */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <div 
                                                        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1" 
                                                        title="Drag to reorder"
                                                    >
                                                        <GripVertical className="h-3.5 w-3.5" />
                                                    </div>
                                                    
                                                    {/* Up / Down Arrow buttons */}
                                                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            disabled={index === 0}
                                                            onClick={(e) => { e.stopPropagation(); moveSectionUp(index); }}
                                                            className="p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 disabled:pointer-events-none"
                                                            title="Move Up"
                                                        >
                                                            <ChevronUp className="h-3 w-3" />
                                                        </button>
                                                        <button 
                                                            disabled={index === filteredContentOrder.length - 1}
                                                            onClick={(e) => { e.stopPropagation(); moveSectionDown(index); }}
                                                            className="p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 disabled:pointer-events-none"
                                                            title="Move Down"
                                                        >
                                                            <ChevronDown className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Right Side Toggle */}
                                                <button
                                                    onClick={() => toggleSection(section)}
                                                    className={`flex-1 flex items-center justify-between pl-2 py-1 rounded transition-all ${
                                                        isSelected ? 'text-sky-700' : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 text-left">
                                                        <div className={`h-4 w-4 rounded flex items-center justify-center transition-all shrink-0 ${
                                                            isSelected ? 'bg-sky-600 text-white' : 'border border-slate-300'
                                                        }`}>
                                                            {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {section === "Presenting Complaint" && <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "Symptoms" && <Activity className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "Vision" && <Eye className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "Refraction (Dry)" && <Compass className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "Refraction (Dilated)" && <Compass className="h-3.5 w-3.5 text-teal-600 shrink-0" />}
                                                            {section === "Glasses Rx" && <Glasses className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "Optical Specs" && <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "Diagnosis" && <ClipboardCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "Meds" && <Pill className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "Lab Investigations" && <FlaskConical className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "Advice" && <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "Planned Surgery" && <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "FollowUp" && <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            <span className="text-xs font-semibold">{section}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Signatures Section */}
                            <div className="mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signatures</h4>
                                </div>
                                <div className="space-y-2">
                                    {doctorSignature && (
                                        <button
                                            onClick={() => toggleSection("Digital Signature")}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                                                visibleSections.includes("Digital Signature")
                                                    ? 'bg-sky-50 border-sky-100 text-sky-700 font-medium'
                                                    : 'bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`h-4 w-4 rounded flex items-center justify-center transition-all shrink-0 ${
                                                    visibleSections.includes("Digital Signature") ? 'bg-sky-600' : 'border border-slate-300'
                                                }`}>
                                                    {visibleSections.includes("Digital Signature") && <CheckCircle className="h-3 w-3 text-white" />}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                    <span className="text-xs font-semibold">Digital Signature</span>
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => toggleSection("Signature Placeholder")}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                                            visibleSections.includes("Signature Placeholder")
                                                ? 'bg-sky-50 border-sky-100 text-sky-700 font-medium'
                                                : 'bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`h-4 w-4 rounded flex items-center justify-center transition-all shrink-0 ${
                                                visibleSections.includes("Signature Placeholder") ? 'bg-sky-600' : 'border border-slate-300'
                                            }`}>
                                                {visibleSections.includes("Signature Placeholder") && <CheckCircle className="h-3 w-3 text-white" />}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Layout className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="text-xs font-semibold">Signature Placeholder</span>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setVisibleSections(allSections)}
                                    className="flex-1 py-2 text-[10px] font-bold text-sky-600 hover:bg-sky-50 rounded-md transition-all uppercase tracking-wider text-center"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => setVisibleSections([])}
                                    className="flex-1 py-2 text-[10px] font-bold text-slate-400 hover:bg-slate-50 rounded-md transition-all uppercase tracking-wider text-center"
                                >
                                    Deselect
                                </button>
                            </div>
                        </div>

                        {/* Sidebar Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-3 text-[10px] font-medium text-slate-400 px-1 uppercase tracking-tighter">
                                <Monitor className="h-3 w-3" />
                                <span>Preview mode active</span>
                            </div>
                            <button
                                onClick={() => handlePrint()}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-md active:scale-[0.98]"
                            >
                                <Printer className="h-4 w-4" />
                                Print Document
                            </button>
                        </div>
                    </div>

                    {/* Centered Preview Canvas (The requested 80% middle layout) */}
                    <div className="flex-1 flex justify-center bg-slate-200/50 relative overflow-auto custom-scrollbar">

                        {/* THE MIDDLE 80% CONTAINER - Consists of margins and centered content */}
                        <div className="w-full mx-auto flex flex-col items-center py-16">

                            {/* Layout Indicator Overlay (Only visible in preview) */}
                            <div className="w-full flex justify-between items-center mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 select-none">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                                    <span>Workspace Boundary</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>Print Boundary</span>
                                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                                </div>
                            </div>

                            {/* The Actual Scalable Paper Area */}
                            <div
                                style={{
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                className="relative bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-200"
                            >
                                <div className="p-0 select-none">
                                    {/* Wrapping for Print */}
                                    <div ref={printRef} className="print-content origin-top min-w-[800px]">
                                        <DoctorPrescriptionPrint
                                            prescription={prescription}
                                            visitData={visitData}
                                            doctorSignature={doctorSignature}
                                            plannedSurgeries={plannedSurgeries}
                                            showHeader={visibleSections.includes("Header")}
                                            visibleSections={visibleSections}
                                            sectionOrder={contentOrder}
                                        />
                                    </div>
                                </div>

                                {/* A4 Edge Indicator overlay (Subtle) */}
                                <div className="absolute inset-0 border border-slate-200 pointer-events-none opacity-20" />
                            </div>

                            <p className="mt-12 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] flex items-center gap-3">
                                <span className="w-8 h-px bg-slate-300" />
                                End of Document Preview
                                <span className="w-8 h-px bg-slate-300" />
                            </p>
                        </div>

                        {/* Centered watermark feel or branding (Optional background element) */}
                        <div className="fixed inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center -z-10">
                            <h1 className="text-[20vw] font-black text-slate-900 select-none">PREVIEW</h1>
                        </div>
                    </div>
                </div>

                {/* Branding Footer */}
                <div className="flex-shrink-0 bg-white border-t border-slate-200">
                    <Footer noSidebar isFixed={false} />
                </div>

                <style jsx global>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 8px;
                        height: 8px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: #f1f5f9;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 4px;
                        border: 2px solid #f1f5f9;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #94a3b8;
                    }
                `}</style>
            </div>
        </div>
    );
}
