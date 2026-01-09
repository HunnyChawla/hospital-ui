"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
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
}: DoctorPrescriptionModalProps) {
    const [mounted, setMounted] = useState(false);
    const [summaryData, setSummaryData] = useState<PrescriptionDataResponse | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(true);

    // Template selection state - lifted up from form to allow sidebar to apply
    const [selectedTemplate, setSelectedTemplate] = useState<PrescriptionTemplate | null>(null);
    const [templateToEdit, setTemplateToEdit] = useState<PrescriptionTemplate | null>(null);

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

    // Handle template selection from sidebar
    const handleSelectTemplate = (template: PrescriptionTemplate) => {
        setSelectedTemplate(template);
    };

    // Clear template after it's been applied
    const handleTemplateApplied = () => {
        setSelectedTemplate(null);
    };

    // Handle initial edit request
    const handleEditTemplate = (template: PrescriptionTemplate) => {
        // First apply the template so the user sees the content
        setSelectedTemplate(template);
        // Then signal that we want to edit this template
        setTemplateToEdit(template);
    };

    const handleEditStarted = () => {
        setTemplateToEdit(null); // Clear after handoff
    };

    if (!mounted || !isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Create Prescription</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            <span className="font-medium">{patientName}</span>
                            {patientUhid && <span className="text-slate-400"> • {patientUhid}</span>}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* 3-Panel Content */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Section 1: History & Templates (15% width) */}
                <div className="w-[15%] min-w-[140px] max-w-[220px] border-r border-slate-200 bg-white overflow-y-auto">
                    <HistoryTemplateSection
                        patientId={patientId}
                        visitId={visitId}
                        doctorId={doctorId}
                        onSelectTemplate={handleSelectTemplate}
                        onEditTemplate={handleEditTemplate}
                    />
                </div>

                <div className="flex-1 w-[45%] border-r border-slate-200 overflow-y-auto bg-white">
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
                    />
                </div>

                {/* Section 3: Examination Summary (40% width) */}
                <div className="flex-1 w-[40%] overflow-y-auto bg-slate-50">
                    {loadingSummary ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-sky-500 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">Loading examination data...</p>
                            </div>
                        </div>
                    ) : summaryData ? (
                        <ExaminationSummarySection data={summaryData} />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-slate-500">No examination data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
