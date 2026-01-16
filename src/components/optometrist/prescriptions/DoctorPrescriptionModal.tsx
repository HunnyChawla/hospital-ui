"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    X,
    Loader2,
    GripVertical,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
} from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { PrescriptionFormSection } from "./PrescriptionFormSection";
import { HistoryTemplateSection } from "./HistoryTemplateSection";
import { ExaminationSummarySection } from "./ExaminationSummarySection";
import { prescriptionDataApi, PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import { handleError } from "@/utils/errorHandler";
import type { PrescriptionTemplate } from "@/services/prescriptionTemplatesApi";

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
    const [mounted, setMounted] = useState(false);
    const { tenant, logoDataUrl } = useTenant();
    const [summaryData, setSummaryData] = useState<PrescriptionDataResponse | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(true);

    // Template selection state
    const [selectedTemplate, setSelectedTemplate] = useState<PrescriptionTemplate | null>(null);
    const [templateToEdit, setTemplateToEdit] = useState<PrescriptionTemplate | null>(null);

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

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

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

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm z-10">
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

                        {/* Panel Toggles in Header for Quick Access */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 ml-4">
                            <button
                                onClick={toggleLeftPanel}
                                className={`p-1 rounded transition ${isLeftCollapsed ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-200' : 'text-blue-600 bg-white shadow-sm'}`}
                                title={isLeftCollapsed ? "Show History" : "Hide History"}
                            >
                                <PanelLeftOpen className="h-4 w-4" />
                            </button>
                            <button
                                onClick={toggleRightPanel}
                                className={`p-1 rounded transition ${isRightCollapsed ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-200' : 'text-blue-600 bg-white shadow-sm'}`}
                                title={isRightCollapsed ? "Show Exam Summary" : "Hide Exam Summary"}
                            >
                                <PanelRightOpen className="h-4 w-4 transform rotate-180" />
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
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">History</span>
                            <button
                                onClick={toggleLeftPanel}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                            >
                                <PanelLeftClose className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <HistoryTemplateSection
                                patientId={patientId}
                                visitId={visitId}
                                doctorId={doctorId}
                                onSelectTemplate={handleSelectTemplate}
                                onEditTemplate={handleEditTemplate}
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
                <div className="flex-1 overflow-y-auto bg-white min-w-[400px]">
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
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                            >
                                <PanelRightClose className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam Summary</span>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loadingSummary ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-sky-500 mx-auto mb-2" />
                                        <p className="text-sm text-slate-500">Loading data...</p>
                                    </div>
                                </div>
                            ) : summaryData ? (
                                <ExaminationSummarySection data={summaryData} />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm text-slate-500">No data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
