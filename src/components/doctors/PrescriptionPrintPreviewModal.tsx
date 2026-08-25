"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import {
    X, Printer, Loader2, CheckCircle, FileText, Layout, ZoomIn, ZoomOut, RotateCcw, Monitor,
    Columns, MessageSquare, Activity, FlaskConical, Info,
    Stethoscope, Calendar, GripVertical, ChevronUp, ChevronDown, ClipboardCheck,
    PanelTop, PanelLeft, PanelRight, Ban, Building2, AlignLeft, AlignCenter, AlignRight,
    Undo2, AlertTriangle, Pill, Download, Target, History,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { PrescriptionPrint } from "./PrescriptionPrint";
import { prescriptionsApi, type PrescriptionResponse } from "@/services/prescriptionsApi";
import type { PlannedSurgery } from "@/types";
import { Footer } from "@/components/layout/Footer";
import { usePrescriptionPrintLayout } from "@/hooks/queries/usePrintLayout";
import { patientsApi } from "@/services/patientsApi";
import { opdVisitsApi } from "@/services/opdVisitsApi";
import { doctorsApi } from "@/services/doctorsApi";
import { vitalSignsApi } from "@/services/vitalSignsApi";
import { complaintsApi } from "@/services/complaintsApi";
import { drugAllergyApi } from "@/services/drugAllergyApi";
import { medicalHistoryApi } from "@/services/medicalHistoryApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import {
    A4_HEIGHT_MM,
    A4_WIDTH_MM,
    DEFAULT_BAND_SIZE_MM,
    type HeaderAlign,
    type HeaderPosition,
} from "@/types/printLayout";
import { buildReactToPrintPageStyle } from "@/utils/printLayout";
import { isPlatformOwner } from "@/utils/auth";

interface PrescriptionPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    prescription: PrescriptionResponse;
    doctorSignature?: string | null;
    plannedSurgeries?: PlannedSurgery[];
    showHeader?: boolean;
    onFinalize?: (printAfter?: boolean) => Promise<void>;
}

const ALL_SECTIONS = [
    "complaints",
    "vitals",
    "allergies",
    "history",
    "diagnosis",
    "medicines",
    "tests",
    "advice",
    "plan",
    "remarks",
    "surgeries",
    "notes",
    "followup",
    "Digital Signature",
    "Signature Placeholder",
];

const DEFAULT_CONTENT_SECTIONS = [
    "complaints",
    "vitals",
    "allergies",
    "history",
    "diagnosis",
    "medicines",
    "tests",
    "advice",
    "plan",
    "remarks",
    "surgeries",
    "notes",
    "followup",
];

const SECTION_LABELS: Record<string, string> = {
    complaints: "Presenting Complaints",
    vitals: "Vital Signs",
    allergies: "Drug Allergies",
    history: "Medical History",
    diagnosis: "Diagnosis",
    medicines: "Medicines",
    tests: "Lab Investigations",
    advice: "Advice",
    plan: "Plan of Action",
    remarks: "Remarks",
    surgeries: "Planned Procedures",
    notes: "Notes",
    followup: "Follow-up",
};

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

export function PrescriptionPrintPreviewModal({
    isOpen,
    onClose,
    prescription,
    doctorSignature,
    plannedSurgeries = [],
    showHeader,
    onFinalize,
}: PrescriptionPrintPreviewModalProps) {
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [zoom, setZoom] = useState(0.9);
    const printRef = useRef<HTMLDivElement>(null);
    const [visitData, setVisitData] = useState<any | null>(null);
    const [patientData, setPatientData] = useState<any>(null);
    const [doctorData, setDoctorData] = useState<any>(null);
    const [activeSignature, setActiveSignature] = useState<string | null>(doctorSignature || null);
    const [activeSurgeries, setActiveSurgeries] = useState<PlannedSurgery[]>(plannedSurgeries);

    const handleDownloadPdf = async () => {
        try {
            setIsDownloadingPdf(true);
            await prescriptionsApi.downloadPdf(
                prescription.id,
                `Prescription-${prescription.prescription_number || prescription.id.slice(0, 8)}.pdf`
            );
        } catch (err) {
            console.error("Failed to download prescription PDF:", err);
            handlePrint();
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    useEffect(() => {
        if (isOpen && prescription.patient_id) {
            Promise.all([
                patientsApi.getById(prescription.patient_id).catch(() => null),
                prescription.visit_id ? opdVisitsApi.getById(prescription.visit_id).catch(() => null) : Promise.resolve(null),
                prescription.doctor_id ? doctorsApi.getById(prescription.doctor_id).catch(() => null) : Promise.resolve(null),
                prescription.doctor_id && !doctorSignature ? doctorsApi.getSignature(prescription.doctor_id).catch(() => null) : Promise.resolve(null),
                prescription.visit_id ? vitalSignsApi.list({ patient_id: prescription.patient_id, visit_id: prescription.visit_id }).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
                prescription.visit_id ? complaintsApi.list({ patient_id: prescription.patient_id, visit_id: prescription.visit_id }).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
                drugAllergyApi.list({ patient_id: prescription.patient_id }).catch(() => ({ items: [] })),
                medicalHistoryApi.get(prescription.patient_id).catch(() => null),
                prescription.visit_id ? plannedSurgeriesApi.list({ visit_id: prescription.visit_id }).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
            ]).then(([patientRes, visitRes, doctorRes, sigRes, vitalsRes, complaintsRes, allergiesRes, medHistoryRes, surgeriesRes]) => {
                const patientFullName =
                    [patientRes?.first_name, patientRes?.last_name].filter(Boolean).join(" ") ||
                    (patientRes as any)?.name ||
                    prescription.patient_name;

                if (patientRes) {
                    setPatientData({
                        ...patientRes,
                        name: patientFullName,
                    });
                }
                if (doctorRes) setDoctorData(doctorRes);
                if (sigRes?.signature) setActiveSignature(sigRes.signature);
                if (surgeriesRes?.items && surgeriesRes.items.length > 0) {
                    setActiveSurgeries(surgeriesRes.items);
                }

                setVisitData({
                    patient_id: prescription.patient_id,
                    name: patientFullName,
                    uhid: patientRes?.uhid || (patientRes as any)?.healthId || null,
                    date_of_birth: patientRes?.date_of_birth || null,
                    gender: patientRes?.gender || null,
                    mobile: patientRes?.mobile || null,
                    address: patientRes?.address || [patientRes?.city, patientRes?.state].filter(Boolean).join(", ") || null,
                    category: patientRes?.category || "General",
                    visit_id: prescription.visit_id,
                    visit_number: visitRes?.visit_number || prescription.visit_number || null,
                    checked_in_at: visitRes?.checked_in_at || prescription.created_at,
                    chief_complaint: visitRes?.chief_complaint || null,
                    complaints: complaintsRes?.items?.map((c: any) => c.complaint) || [],
                    vital_signs: vitalsRes?.items || [],
                    vitals: vitalsRes?.items?.[0] || null,
                    drug_allergies: allergiesRes?.items || [],
                    allergies: allergiesRes?.items || [],
                    medical_conditions: medHistoryRes || null,
                    medical_history: medHistoryRes || null,
                });
            }).catch((err) => {
                console.error("Failed to fetch prescription encounter details:", err);
            });
        }
    }, [isOpen, prescription.patient_id, prescription.visit_id, prescription.doctor_id, doctorSignature]);

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

    const dragItemIndex = useRef<number | null>(null);
    const dragOverItemIndex = useRef<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

    const visibleSections = layout.visible_sections ?? ALL_SECTIONS;
    const contentOrder = useMemo(() => {
        const saved = layout.section_order;
        if (!saved) return DEFAULT_CONTENT_SECTIONS;
        const valid = saved.filter((s) => DEFAULT_CONTENT_SECTIONS.includes(s));
        const missing = DEFAULT_CONTENT_SECTIONS.filter((s) => !valid.includes(s));
        return [...valid, ...missing];
    }, [layout.section_order]);

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
            band_size_mm:
                (choice === "top") === (effectiveLayout.header_position === "top")
                    ? effectiveLayout.band_size_mm
                    : DEFAULT_BAND_SIZE_MM[choice],
            repeat_on_every_page: choice !== "top",
        });
    };

    const filteredContentOrder = contentOrder.filter(section => {
        let hasData = true;
        if (section === "diagnosis") hasData = !!(prescription.diagnosis);
        if (section === "medicines") hasData = !!(prescription.items?.length);
        if (section === "tests") hasData = !!(prescription.advice_items?.some((a: any) => a.advice_type === "lab-test"));
        if (section === "advice") hasData = !!(prescription.advice_items?.some((a: any) => a.advice_type !== "lab-test") || prescription.plan_of_action);
        if (section === "notes") hasData = !!(prescription.notes);
        if (section === "followup") hasData = !!(prescription.followup_date);
        return hasData;
    });

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

    const canManageHospitalDefault =
        typeof window !== "undefined" &&
        (isPlatformOwner() || localStorage.getItem("role") === "admin");

    if (!isOpen) return null;

    const isSideBand = effectiveLayout.header_enabled && effectiveLayout.header_position !== "top";

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-slate-50 w-[80vw] h-full md:h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 md:rounded-xl shadow-2xl border border-slate-200">

                {/* Header */}
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
                        {/* Zoom */}
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
                                                    setIsFinalizing(true);
                                                    onFinalize(false).finally(() => setIsFinalizing(false));
                                                }}
                                                disabled={isFinalizing}
                                                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-all text-xs shadow-sm disabled:opacity-50"
                                            >
                                                {isFinalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                <span>Finalize Only</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsFinalizing(true);
                                                    onFinalize(true).then(() => {
                                                        setTimeout(() => handlePrint(), 100);
                                                    }).finally(() => setIsFinalizing(false));
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

                            <button
                                onClick={handleDownloadPdf}
                                disabled={isDownloadingPdf}
                                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all text-xs shadow-2xs disabled:opacity-50"
                                title="Download server-rendered PDF"
                            >
                                {isDownloadingPdf ? <Loader2 className="h-4 w-4 animate-spin text-sky-600" /> : <Download className="h-4 w-4 text-sky-600" />}
                                <span>Download PDF</span>
                            </button>

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

                {/* Print Layout Configurations Sidebar + Canvas */}
                <div className="flex-1 overflow-hidden flex relative animate-in fade-in duration-200">

                    {/* Left Settings Sidebar */}
                    <div className="w-[300px] bg-white border-r border-slate-200 flex flex-col z-20 shrink-0">
                        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">

                            {/* Letterhead Settings */}
                            <div className="mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Layout className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Letterhead</h4>
                                </div>

                                <p className="text-[10px] text-slate-500 mb-2 leading-snug">
                                    Choose where the hospital details occupy the sheet.
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
                                        <div className="space-y-1.5 mb-3">
                                            {([
                                                {
                                                    value: "rendered" as const,
                                                    title: "Print letterhead",
                                                    desc: "We print hospital details, logo and address",
                                                },
                                                {
                                                    value: "reserved" as const,
                                                    title: "Leave blank",
                                                    desc: "Reserve space for pre-printed stationery",
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

                                        {/* Band sizing */}
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
                                        </div>

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
                                                    Keep letterhead space on subsequent pages
                                                </p>
                                            </div>
                                        </button>

                                        {effectiveLayout.header_mode === "rendered" && (
                                            <>
                                                {/* Header alignment */}
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

                                                <div className="space-y-1">
                                                    {([
                                                        { key: "show_logo" as const, label: "Logo" },
                                                        { key: "show_address" as const, label: "Address" },
                                                        { key: "show_contact" as const, label: "Phone / email / website" },
                                                        { key: "show_divider" as const, label: "Divider line" },
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

                            {/* Section Visibility & Re-ordering */}
                            <div className="mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Columns className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sections (Drag to Reorder)</h4>
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
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <div
                                                        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1"
                                                        title="Drag to reorder"
                                                    >
                                                        <GripVertical className="h-3.5 w-3.5" />
                                                    </div>

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
                                                            {section === "complaints" && <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "vitals" && <Activity className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "allergies" && <AlertTriangle className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "history" && <History className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "diagnosis" && <ClipboardCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "medicines" && <Pill className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "tests" && <FlaskConical className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "advice" && <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "plan" && <Target className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "remarks" && <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "surgeries" && <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "notes" && <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            {section === "followup" && <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                                            <span className="text-xs font-semibold">{SECTION_LABELS[section] || section}</span>
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

                            {/* Section Selection Buttons */}
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

                        {/* Sidebar Action Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
                            {canManageHospitalDefault && (
                                <button
                                    onClick={() => saveAsHospitalDefault()}
                                    disabled={isSaving || !!validationError}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold text-[11px] hover:bg-slate-50 transition-all disabled:opacity-50"
                                    title="Save as Hospital Default Layout"
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
                                    <span>Reset to default layout</span>
                                </button>
                            )}

                            <button
                                onClick={() => handlePrint()}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-md active:scale-[0.98]"
                            >
                                <Printer className="h-4 w-4" />
                                Print Document
                            </button>
                        </div>
                    </div>

                    {/* Live Preview Container */}
                    <div className="flex-1 flex justify-center bg-slate-200/50 relative overflow-auto custom-scrollbar">
                        <div className="w-full mx-auto flex flex-col items-center py-16">
                            <div className="w-full flex justify-between items-center mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 select-none px-12 max-w-[210mm]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                                    <span>Workspace Boundary</span>
                                </div>
                                <div>
                                    <span>A4 &bull; {letterheadChoice === "none" ? "No letterhead" : `${letterheadChoice} letterhead`}</span>
                                </div>
                            </div>

                            <div
                                style={{
                                    width: `${A4_WIDTH_MM}mm`,
                                    minHeight: `${A4_HEIGHT_MM}mm`,
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                className="relative bg-white shadow-xl border border-slate-200"
                            >
                                <div className="select-none">
                                    <div ref={printRef} className="print-content origin-top">
                                        <PrescriptionPrint
                                            prescription={prescription}
                                            layout={effectiveLayout}
                                            doctorSignature={activeSignature || doctorSignature}
                                            patient={patientData}
                                            doctor={doctorData}
                                            visitData={visitData}
                                            plannedSurgeries={activeSurgeries.length > 0 ? activeSurgeries : plannedSurgeries}
                                        />
                                    </div>
                                </div>
                                <div className="absolute inset-0 border border-slate-200 pointer-events-none opacity-20" />
                            </div>

                            <p className="mt-12 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] flex items-center gap-3">
                                <span className="w-8 h-px bg-slate-300" />
                                End of Document Preview
                                <span className="w-8 h-px bg-slate-300" />
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
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
