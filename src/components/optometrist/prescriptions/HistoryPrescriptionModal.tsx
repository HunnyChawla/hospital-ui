"use client";

import React from "react";
import { PrescriptionPdfPreviewModal } from "@/components/prescriptions/PrescriptionPdfPreviewModal";

interface HistoryPrescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    visitId: string;
    patientId?: string;
}

export function HistoryPrescriptionModal({
    isOpen,
    onClose,
    visitId,
}: HistoryPrescriptionModalProps) {
    if (!isOpen) return null;

    return (
        <PrescriptionPdfPreviewModal
            isOpen={isOpen}
            onClose={onClose}
            visitId={visitId}
        />
    );
}
