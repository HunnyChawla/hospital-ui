"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    X,
    Loader2,
    GripVertical,
    PanelLeft,
    PanelRight,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useFullscreenContainer } from "@/context/FullscreenContainerContext";
import { OptometristVisitResponse, optometristVisitsApi } from "@/services/optometristVisitsApi";
import { DilationTimer } from "./DilationTimer";
import { PrescriptionFormSection } from "./PrescriptionFormSection";
import { HistoryTemplateSection } from "./HistoryTemplateSection";
import { ExaminationSummarySection } from "./ExaminationSummarySection";
import { HistoryPrescriptionModal } from "./HistoryPrescriptionModal";
import { prescriptionDataApi, PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import { handleError } from "@/utils/errorHandler";
import type { PrescriptionTemplate } from "@/services/prescriptionTemplatesApi";
import { Footer } from "@/components/layout/Footer";

interface DoctorPrescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    patientName: string;
    patientUhid?: string;
    visitId: string;
    optometristId: string;
    doctorId: string;
    doctorName?: string;
    onPrescriptionCreated?: () => void;
    isCompleted?: boolean;
}

export function DoctorPrescriptionModal({
    isOpen,
    onClose,
    patientId,
    patientName,
    patientUhid,
    visitId,
    optometristId,
    doctorId,
    doctorName,
    onPrescriptionCreated,
    isCompleted = false,
}: DoctorPrescriptionModalProps) {

    const [visitData, setVisitData] = useState<OptometristVisitResponse>();
    const [mounted, setMounted] = useState(false);
    const { tenant, logoDataUrl } = useTenant();
    const [summaryData, setSummaryData] = useState<PrescriptionDataResponse | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(true);

    // Template selection state
    const [selectedTemplate, setSelectedTemplate] = useState<PrescriptionTemplate | null>(null);
    const [templateToEdit, setTemplateToEdit] = useState<PrescriptionTemplate | null>(null);
    const [selectedHistoryVisitId, setSelectedHistoryVisitId] = useState<string | null>(null);

    // Resizable Layout State
    // Default: Left 15%, Right 32% (Reduced by 20% from 40% -> 0.4 * 0.8 = 0.32)
    const [leftPanelWidth, setLeftPanelWidth] = useState(15);
    const [rightPanelWidth, setRightPanelWidth] = useState(32);

    // Collapse State
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);

    // Previous widths to restore after expanding
    const prevLeftWidthRef = useRef(15);
    const prevRightWidthRef = useRef(32);

    // Resizing Refs
    const isResizingLeft = useRef(false);
    const isResizingRight = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const loadVisitData = async () => {
        try {
            const data = await optometristVisitsApi.getById(visitId);
            setVisitData(data);
        } catch (error) {
            console.error("Failed to load visit data:", error);
        }
    };

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = "hidden";
        loadVisitData();
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [visitId]);

    const handleStartDilation = async (minutes: number) => {
        try {
            await optometristVisitsApi.startDilation(visitId, minutes);
            await loadVisitData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleCompleteDilation = async () => {
        try {
            await optometristVisitsApi.completeDilation(visitId);
            await loadVisitData();
        } catch (error) {
            console.error(error);
        }
    };

    // Fetch examination summary data
    useEffect(() => {
        if (isOpen && patientId) {
            setLoadingSummary(true);
            prescriptionDataApi
                .getPrescriptionData(patientId, visitId)
                .then((data) => {
                    setSummaryData(data);
                })
                .catch((error) => {
                    handleError(error, {
                        defaultMessage: "Failed to load examination data",
                        logError: true,
                    });
                })
                .finally(() => {
                    setLoadingSummary(false);
                });
        }
    }, [isOpen, patientId, visitId]);

    // Refresh summary data after edits (refraction/IOP)
    const refreshSummaryData = useCallback(async () => {
        try {
            const data = await prescriptionDataApi.getPrescriptionData(patientId, visitId);
            setSummaryData(data);
        } catch (error) {
            handleError(error, { defaultMessage: "Failed to refresh examination data" });
        }
    }, [patientId, visitId]);

    // Resize Handlers
    const startResizingLeft = useCallback(() => {
        isResizingLeft.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const startResizingRight = useCallback(() => {
        isResizingRight.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const stopResizing = useCallback(() => {
        isResizingLeft.current = false;
        isResizingRight.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizingLeft.current && !isResizingRight.current) return;
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width;

        // Calculate new percentages
        if (isResizingLeft.current) {
            const newLeftWidth = ((e.clientX - containerRect.left) / containerWidth) * 100;
            // Min 10%, Max 30% for left
            if (newLeftWidth >= 5 && newLeftWidth <= 40) {
                setLeftPanelWidth(newLeftWidth);
                if (newLeftWidth > 2) setIsLeftCollapsed(false);
            }
        }

        if (isResizingRight.current) {
            const newRightWidth = ((containerRect.right - e.clientX) / containerWidth) * 100;
            // Min 10%, Max 50% for right
            if (newRightWidth >= 10 && newRightWidth <= 60) {
                setRightPanelWidth(newRightWidth);
                if (newRightWidth > 2) setIsRightCollapsed(false);
            }
        }
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [handleMouseMove, stopResizing]);

    // Collapse Toggles
    const toggleLeftPanel = () => {
        if (isLeftCollapsed) {
            setLeftPanelWidth(prevLeftWidthRef.current);
            setIsLeftCollapsed(false);
        } else {
            prevLeftWidthRef.current = leftPanelWidth;
            setLeftPanelWidth(0);
            setIsLeftCollapsed(true);
        }
    };

    const toggleRightPanel = () => {
        if (isRightCollapsed) {
            setRightPanelWidth(prevRightWidthRef.current);
            setIsRightCollapsed(false);
        } else {
            prevRightWidthRef.current = rightPanelWidth;
            setRightPanelWidth(0);
            setIsRightCollapsed(true);
        }
    };

    // Calculate Middle Panel Width
    // 100% - Left - Right
    // Note: We use style={{ flex: '0 0 {width}%' }} logic

    // Template handlers
    const handleSelectTemplate = (template: PrescriptionTemplate) => setSelectedTemplate(template);
    const handleTemplateApplied = () => setSelectedTemplate(null);
    const handleEditTemplate = (template: PrescriptionTemplate) => {
        setSelectedTemplate(template);
        setTemplateToEdit(template);
    };
    const handleEditStarted = () => setTemplateToEdit(null);

    const { containerRef: fullscreenRef } = useFullscreenContainer();
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalTarget(fullscreenRef?.current || document.body);
    }, [fullscreenRef, mounted]);

    if (!mounted || !isOpen || !portalTarget) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm z-30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {logoDataUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={logoDataUrl}
                                alt="Logo"
                                className="h-12 w-12 object-contain"
                            />
                        )}
                        <div>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-xl font-bold text-slate-900">{tenant?.name || "Hospital"}</h2>
                                <span className="text-sm font-medium text-slate-500">
                                    | {isCompleted ? "Prescription View" : "Create Prescription"}
                                </span>
                            </div>
                            <p className="text-xs text-slate-600">
                                <span className="font-medium">{patientName}</span>
                                {patientUhid && <span className="text-slate-400"> • {patientUhid}</span>}
                            </p>
                        </div>

                        {!isCompleted && visitData && (
                            <DilationTimer
                                visitId={visitId}
                                visitData={visitData}
                                onStartDilation={handleStartDilation}
                                onCompleteDilation={handleCompleteDilation}
                            />
                        )}
                        {/* Panel Toggles in Header for Quick Access - Improved UI */}
                        <div className="flex items-center bg-slate-100/50 p-1 rounded-lg border border-slate-200 ml-6 gap-0.5">
                            <button
                                onClick={toggleLeftPanel}
                                className={`flex items-center justify-center p-1.5 rounded-md transition-all duration-200 ${!isLeftCollapsed
                                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                                title={isLeftCollapsed ? "Show History Panel" : "Hide History Panel"}
                            >
                                <PanelLeft className="h-4 w-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button
                                onClick={toggleRightPanel}
                                className={`flex items-center justify-center p-1.5 rounded-md transition-all duration-200 ${!isRightCollapsed
                                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                                title={isRightCollapsed ? "Show Exam Summary Panel" : "Hide Exam Summary Panel"}
                            >
                                <PanelRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* 3-Panel Content */}
            <div
                ref={containerRef}
                className="flex flex-1 min-h-0 overflow-hidden relative"
            >
                {/* LEFT PANEL: History & Templates */}
                {!isLeftCollapsed && (
                    <div
                        style={{ width: `${leftPanelWidth}%` }}
                        className="relative h-full border-r border-slate-200 bg-white flex flex-col group min-w-[200px]"
                    >
                        <div className="flex items-center justify-between p-2 border-b border-slate-100 bg-slate-50/50">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">History</span>
                            <button
                                onClick={toggleLeftPanel}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-hide">
                            <HistoryTemplateSection
                                patientId={patientId}
                                visitId={visitId}
                                doctorId={doctorId}
                                onSelectTemplate={handleSelectTemplate}
                                onEditTemplate={handleEditTemplate}
                                onViewHistory={(id) => setSelectedHistoryVisitId(id)}
                            />
                        </div>
                    </div>
                )}

                {/* LEFT RESIZER */}
                {!isLeftCollapsed && (
                    <div
                        onMouseDown={startResizingLeft}
                        className="w-1 bg-slate-100 hover:bg-blue-400 cursor-col-resize z-20 flex items-center justify-center transition-colors hover:delay-75 group"
                    >
                        <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-white transition-colors" />
                    </div>
                )}

                {/* MIDDLE PANEL: Main Form */}
                <div className="flex-1 overflow-y-auto bg-white min-w-[400px] scrollbar-hide">
                    <PrescriptionFormSection
                        patientId={patientId}
                        visitId={visitId}
                        optometristId={optometristId}
                        doctorId={doctorId}
                        doctorName={doctorName}
                        onClose={onClose}
                        onPrescriptionCreated={onPrescriptionCreated}
                        examinationData={summaryData}
                        templateToApply={selectedTemplate}
                        onTemplateApplied={handleTemplateApplied}
                        templateToEdit={templateToEdit}
                        onEditStarted={handleEditStarted}
                        readOnly={isCompleted}
                    />
                </div>

                {/* RIGHT RESIZER */}
                {!isRightCollapsed && (
                    <div
                        onMouseDown={startResizingRight}
                        className="w-1 bg-slate-100 hover:bg-blue-400 cursor-col-resize z-20 flex items-center justify-center transition-colors hover:delay-75 group"
                    >
                        <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-white transition-colors" />
                    </div>
                )}

                {/* RIGHT PANEL: Examination Summary */}
                {!isRightCollapsed && (
                    <div
                        style={{ width: `${rightPanelWidth}%` }}
                        className="relative h-full border-l border-slate-200 bg-slate-50 flex flex-col min-w-[300px]"
                    >
                        <div className="flex items-center justify-between p-2 border-b border-slate-200 bg-white">
                            <button
                                onClick={toggleRightPanel}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pr-1">Exam Summary</span>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-hide">
                            {loadingSummary ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-sky-500 mx-auto mb-2" />
                                        <p className="text-sm text-slate-500">Loading data...</p>
                                    </div>
                                </div>
                            ) : summaryData ? (
                                <ExaminationSummarySection
                                    data={summaryData}
                                    patientId={patientId}
                                    visitId={visitId}
                                    optometristId={optometristId}
                                    onDataChange={refreshSummaryData}
                                    isReadOnly={isCompleted}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm text-slate-500">No data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {selectedHistoryVisitId && (
                <HistoryPrescriptionModal
                    isOpen={!!selectedHistoryVisitId}
                    onClose={() => setSelectedHistoryVisitId(null)}
                    visitId={selectedHistoryVisitId}
                    patientId={patientId}
                />
            )}

            {/* Branding Footer */}
            <div className="flex-shrink-0">
                <Footer noSidebar isFixed={false} />
            </div>
        </div>,
        portalTarget
    );
}
