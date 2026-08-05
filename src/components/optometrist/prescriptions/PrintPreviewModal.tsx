"use client";

import React, { useState, useRef, useMemo } from "react";
import {
    X, Printer, Loader2, CheckCircle, FileText, Layout, ZoomIn, ZoomOut, RotateCcw, Monitor,
    Columns, MessageSquare, Activity, Eye, Compass, Glasses, Layers, Pill, FlaskConical, Info,
    Stethoscope, Calendar, GripVertical, ChevronUp, ChevronDown, ClipboardCheck,
    PanelTop, PanelLeft, PanelRight, Ban, Building2, AlignLeft, AlignCenter, AlignRight,
    Undo2, AlertTriangle,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { DoctorPrescriptionPrint } from "./DoctorPrescriptionPrint";
import type { OptometryPrescription, PlannedSurgery } from "@/types";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import { Footer } from "@/components/layout/Footer";
import { usePrescriptionPrintLayout } from "@/hooks/queries/usePrintLayout";
import {
    A4_HEIGHT_MM,
    A4_WIDTH_MM,
    DEFAULT_BAND_SIZE_MM,
    type HeaderAlign,
    type HeaderPosition,
} from "@/types/printLayout";
import { buildReactToPrintPageStyle } from "@/utils/printLayout";
import { isPlatformOwner } from "@/utils/auth";

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

/** Clinical + signature sections the user can show/hide. */
const ALL_SECTIONS = [
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
    "Signature Placeholder",
];

/** Clinical sections only — these are the reorderable ones. */
const DEFAULT_CONTENT_SECTIONS = [
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
];

/** "None" is not a HeaderPosition — it disables the band entirely. */
type LetterheadChoice = HeaderPosition | "none";

const POSITION_OPTIONS: {
    value: LetterheadChoice;
    label: string;
    hint: string;
    icon: React.ElementType;
}[] = [
    { value: "top", label: "Top", hint: "Across the top", icon: PanelTop },
    { value: "left", label: "Left", hint: "Left margin band", icon: PanelLeft },
    { value: "right", label: "Right", hint: "Right margin band", icon: PanelRight },
    { value: "none", label: "None", hint: "No letterhead", icon: Ban },
];

const ALIGN_OPTIONS: { value: HeaderAlign; icon: React.ElementType; label: string }[] = [
    { value: "left", icon: AlignLeft, label: "Left" },
    { value: "center", icon: AlignCenter, label: "Center" },
    { value: "right", icon: AlignRight, label: "Right" },
];

export function PrintPreviewModal({
    isOpen,
    onClose,
    prescription,
    visitData,
    doctorSignature,
    plannedSurgeries = [],
    showHeader,
    onFinalize,
}: PrintPreviewModalProps) {
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [zoom, setZoom] = useState(0.9);
    const printRef = useRef<HTMLDivElement>(null);

    const {
        layout,
        updateLayout,
        resetToHospitalDefault,
        saveAsHospitalDefault,
        isSaving,
        hasSessionOverride,
        validationError,
        isHospitalDefault,
    } = usePrescriptionPrintLayout();

    // Refs for drag and drop
    const dragItemIndex = useRef<number | null>(null);
    const dragOverItemIndex = useRef<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

    // `null` in the config means "everything", which the UI renders as all-checked.
    const visibleSections = layout.visible_sections ?? ALL_SECTIONS;
    const contentOrder = useMemo(() => {
        const saved = layout.section_order;
        if (!saved) return DEFAULT_CONTENT_SECTIONS;
        const valid = saved.filter((s) => DEFAULT_CONTENT_SECTIONS.includes(s));
        const missing = DEFAULT_CONTENT_SECTIONS.filter((s) => !valid.includes(s));
        return [...valid, ...missing];
    }, [layout.section_order]);

    // The caller may still force the header off for a one-off print.
    const effectiveLayout = useMemo(
        () =>
            showHeader === undefined ? layout : { ...layout, header_enabled: showHeader },
        [layout, showHeader]
    );

    const letterheadChoice: LetterheadChoice = effectiveLayout.header_enabled
        ? effectiveLayout.header_position
        : "none";

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Prescription_${prescription.patient_name || prescription.visit_id || "Print"}`,
        pageStyle: buildReactToPrintPageStyle(effectiveLayout),
        onBeforePrint: async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
        },
    });

    const toggleSection = (section: string) => {
        const next = visibleSections.includes(section)
            ? visibleSections.filter(s => s !== section)
            : [...visibleSections, section];
        updateLayout({ visible_sections: next });
    };

    const setLetterheadPosition = (choice: LetterheadChoice) => {
        if (choice === "none") {
            updateLayout({ header_enabled: false });
            return;
        }
        updateLayout({
            header_enabled: true,
            header_position: choice,
            // Snap the band to a sensible size for the new edge, unless the user
            // already sized it for that orientation.
            band_size_mm:
                (choice === "top") === (effectiveLayout.header_position === "top")
                    ? effectiveLayout.band_size_mm
                    : DEFAULT_BAND_SIZE_MM[choice],
            // A side band is normally pre-printed on every sheet; a top one is not.
            repeat_on_every_page: choice !== "top",
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

    /** Swap two entries of the full order, addressed via the filtered view. */
    const swapInOrder = (itemA: string, itemB: string) => {
        const next = [...contentOrder];
        const idx1 = next.indexOf(itemA);
        const idx2 = next.indexOf(itemB);
        if (idx1 !== -1 && idx2 !== -1) {
            next[idx1] = itemB;
            next[idx2] = itemA;
        }
        updateLayout({ section_order: next });
    };

    const moveSectionUp = (filteredIndex: number) => {
        if (filteredIndex === 0) return;
        swapInOrder(filteredContentOrder[filteredIndex], filteredContentOrder[filteredIndex - 1]);
    };

    const moveSectionDown = (filteredIndex: number) => {
        if (filteredIndex === filteredContentOrder.length - 1) return;
        swapInOrder(filteredContentOrder[filteredIndex], filteredContentOrder[filteredIndex + 1]);
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

        const item1 = filteredContentOrder[dragItemIndex.current];
        const item2 = filteredContentOrder[dragOverItemIndex.current];

        const next = [...contentOrder];
        const idx1 = next.indexOf(item1);
        const idx2 = next.indexOf(item2);
        if (idx1 !== -1 && idx2 !== -1) {
            next.splice(idx1, 1);
            const newIdx2 = next.indexOf(item2);
            next.splice(newIdx2, 0, item1);
        }
        updateLayout({ section_order: next });

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

    // Only admins and platform owners may change the hospital-wide default; the
    // backend enforces this too, this just avoids offering a button that 403s.
    const canManageHospitalDefault =
        typeof window !== "undefined" &&
        (isPlatformOwner() || localStorage.getItem("role") === "admin");

    if (!isOpen) return null;

    const isSideBand = effectiveLayout.header_enabled && effectiveLayout.header_position !== "top";

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
                                                <span>Finalize &amp; Print</span>
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

                    {/* Configuration Sidebar */}
                    <div className="w-[300px] bg-white border-r border-slate-200 flex flex-col z-20 shrink-0">
                        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">

                            {/* Letterhead position + geometry */}
                            <div className="mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Layout className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Letterhead</h4>
                                </div>

                                <p className="text-[10px] text-slate-500 mb-2 leading-snug">
                                    Choose which edge the hospital details occupy. Content is
                                    re-flowed to start after it.
                                </p>

                                <div className="grid grid-cols-4 gap-1.5 mb-3">
                                    {POSITION_OPTIONS.map(({ value, label, hint, icon: Icon }) => {
                                        const active = letterheadChoice === value;
                                        return (
                                            <button
                                                key={value}
                                                onClick={() => setLetterheadPosition(value)}
                                                title={hint}
                                                className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-all ${
                                                    active
                                                        ? "bg-sky-50 border-sky-300 text-sky-700 shadow-2xs"
                                                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {effectiveLayout.header_enabled && (
                                    <>
                                        {/* Rendered vs reserved */}
                                        <div className="space-y-1.5 mb-3">
                                            {([
                                                {
                                                    value: "rendered" as const,
                                                    title: "Print letterhead",
                                                    desc: "We print the hospital name, logo and address",
                                                },
                                                {
                                                    value: "reserved" as const,
                                                    title: "Leave blank",
                                                    desc: "Reserve the space for pre-printed stationery",
                                                },
                                            ]).map(opt => {
                                                const active = effectiveLayout.header_mode === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => updateLayout({ header_mode: opt.value })}
                                                        className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all ${
                                                            active
                                                                ? "bg-sky-50 border-sky-200"
                                                                : "bg-white border-slate-200 hover:bg-slate-50"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-3.5 w-3.5 rounded-full border-2 shrink-0 ${
                                                                active ? "border-sky-600 bg-sky-600" : "border-slate-300"
                                                            }`} />
                                                            <span className={`text-xs font-semibold ${active ? "text-sky-800" : "text-slate-600"}`}>
                                                                {opt.title}
                                                            </span>
                                                        </div>
                                                        <p className="text-[9px] text-slate-500 mt-0.5 pl-5.5 leading-snug">{opt.desc}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Band size */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                                    {isSideBand ? "Band width" : "Band height"}
                                                </label>
                                                <span className="text-[10px] font-bold text-sky-700 tabular-nums">
                                                    {effectiveLayout.band_size_mm} mm
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={10}
                                                max={90}
                                                step={1}
                                                value={effectiveLayout.band_size_mm}
                                                onChange={(e) => updateLayout({ band_size_mm: Number(e.target.value) })}
                                                className="w-full accent-sky-600"
                                            />
                                            <p className="text-[9px] text-slate-400 mt-0.5">
                                                Content area: {Math.round(
                                                    A4_WIDTH_MM
                                                    - effectiveLayout.margins_mm.left
                                                    - effectiveLayout.margins_mm.right
                                                    - (isSideBand ? effectiveLayout.band_size_mm : 0)
                                                )}mm wide
                                            </p>
                                        </div>

                                        {/* Repeat on every page */}
                                        <button
                                            onClick={() => updateLayout({ repeat_on_every_page: !effectiveLayout.repeat_on_every_page })}
                                            className="w-full flex items-start gap-2 px-2.5 py-2 mb-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-left"
                                        >
                                            <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 mt-px ${
                                                effectiveLayout.repeat_on_every_page ? "bg-sky-600" : "border border-slate-300"
                                            }`}>
                                                {effectiveLayout.repeat_on_every_page && <CheckCircle className="h-3 w-3 text-white" />}
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-slate-700">Repeat on every page</span>
                                                <p className="text-[9px] text-slate-500 leading-snug">
                                                    Keep the band on page 2 onwards for multi-page prescriptions
                                                </p>
                                            </div>
                                        </button>

                                        {effectiveLayout.header_mode === "rendered" && (
                                            <>
                                                {/* Alignment */}
                                                <div className="mb-3">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                                                        Alignment
                                                    </label>
                                                    <div className="flex gap-1">
                                                        {ALIGN_OPTIONS.map(({ value, icon: Icon, label }) => {
                                                            const active = effectiveLayout.header_align === value;
                                                            return (
                                                                <button
                                                                    key={value}
                                                                    onClick={() => updateLayout({ header_align: value })}
                                                                    title={label}
                                                                    className={`flex-1 flex items-center justify-center py-1.5 rounded-md border transition-all ${
                                                                        active
                                                                            ? "bg-sky-50 border-sky-300 text-sky-700"
                                                                            : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
                                                                    }`}
                                                                >
                                                                    <Icon className="h-3.5 w-3.5" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Field toggles */}
                                                <div className="space-y-1">
                                                    {([
                                                        { key: "show_logo" as const, label: "Logo" },
                                                        { key: "show_address" as const, label: "Address" },
                                                        { key: "show_contact" as const, label: "Phone / email / website" },
                                                        { key: "show_divider" as const, label: "Divider rule" },
                                                    ]).map(({ key, label }) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => updateLayout({ [key]: !effectiveLayout[key] })}
                                                            className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 transition-all"
                                                        >
                                                            <div className={`h-3.5 w-3.5 rounded flex items-center justify-center shrink-0 ${
                                                                effectiveLayout[key] ? "bg-sky-600" : "border border-slate-300"
                                                            }`}>
                                                                {effectiveLayout[key] && <CheckCircle className="h-2.5 w-2.5 text-white" />}
                                                            </div>
                                                            <span className="text-[11px] font-medium text-slate-600">{label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                {validationError && (
                                    <div className="mt-3 flex gap-2 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-200">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-px" />
                                        <p className="text-[10px] text-amber-800 leading-snug">{validationError}</p>
                                    </div>
                                )}
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
                                    onClick={() => updateLayout({ visible_sections: ALL_SECTIONS })}
                                    className="flex-1 py-2 text-[10px] font-bold text-sky-600 hover:bg-sky-50 rounded-md transition-all uppercase tracking-wider text-center"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => updateLayout({ visible_sections: [] })}
                                    className="flex-1 py-2 text-[10px] font-bold text-slate-400 hover:bg-slate-50 rounded-md transition-all uppercase tracking-wider text-center"
                                >
                                    Deselect
                                </button>
                            </div>
                        </div>

                        {/* Sidebar Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
                            {/* Hospital default controls */}
                            {canManageHospitalDefault && (
                                <button
                                    onClick={() => saveAsHospitalDefault()}
                                    disabled={isSaving || !!validationError}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold text-[11px] hover:bg-slate-50 transition-all disabled:opacity-50"
                                    title="Apply this layout to every prescription printed by this hospital"
                                >
                                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5 text-slate-500" />}
                                    <span>Save as hospital default</span>
                                </button>
                            )}
                            {hasSessionOverride && (
                                <button
                                    onClick={resetToHospitalDefault}
                                    className="w-full flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all uppercase tracking-wider"
                                >
                                    <Undo2 className="h-3 w-3" />
                                    <span>Reset to {isHospitalDefault ? "built-in" : "hospital"} layout</span>
                                </button>
                            )}

                            <div className="flex items-center gap-2 pt-1 text-[10px] font-medium text-slate-400 px-1 uppercase tracking-tighter">
                                <Monitor className="h-3 w-3" />
                                <span>{hasSessionOverride ? "Local changes (not saved for hospital)" : "Preview mode active"}</span>
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

                    {/* Centered Preview Canvas */}
                    <div className="flex-1 flex justify-center bg-slate-200/50 relative overflow-auto custom-scrollbar">

                        <div className="w-full mx-auto flex flex-col items-center py-16">

                            {/* Layout Indicator Overlay (Only visible in preview) */}
                            <div className="w-full flex justify-between items-center mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 select-none">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                                    <span>Workspace Boundary</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>A4 &bull; {letterheadChoice === "none" ? "No letterhead" : `${letterheadChoice} letterhead`}</span>
                                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                                </div>
                            </div>

                            {/*
                              * A real A4 sheet (210 x 297mm) rather than a fixed pixel
                              * width, so the preview mirrors the print geometry — a
                              * side band consumes the same proportion on screen as
                              * it does on paper.
                              */}
                            <div
                                style={{
                                    width: `${A4_WIDTH_MM}mm`,
                                    minHeight: `${A4_HEIGHT_MM}mm`,
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                className="relative bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-200"
                            >
                                <div className="select-none">
                                    <div ref={printRef} className="print-content origin-top">
                                        <DoctorPrescriptionPrint
                                            prescription={prescription}
                                            visitData={visitData}
                                            doctorSignature={doctorSignature}
                                            plannedSurgeries={plannedSurgeries}
                                            layout={effectiveLayout}
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
