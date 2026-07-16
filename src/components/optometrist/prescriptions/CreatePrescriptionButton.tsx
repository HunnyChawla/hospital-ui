"use client";

import { useState, useEffect } from "react";
import { FileEdit, Loader2, Eye } from "lucide-react";
import { DoctorPrescriptionModal } from "./DoctorPrescriptionModal";
import { optometryPrescriptionApi } from "@/services/optometryPrescriptionApi";

interface CreatePrescriptionButtonProps {
    patientId: string;
    patientName: string;
    patientUhid?: string;
    patientCategory?: string;
    visitId: string;
    optometristId: string;
    doctorId: string;
    doctorName?: string;
    onPrescriptionCreated?: () => void;
    isCompleted?: boolean;
}

export function CreatePrescriptionButton({
    patientId,
    patientName,
    patientUhid,
    patientCategory,
    visitId,
    optometristId,
    doctorId,
    doctorName,
    onPrescriptionCreated,
    isCompleted = false,
}: CreatePrescriptionButtonProps) {

    const [showModal, setShowModal] = useState(false);
    const [hasFinalizedPrescription, setHasFinalizedPrescription] = useState(false);

    useEffect(() => {
        const checkPrescription = async () => {
            if (!patientId || !visitId) return;
            try {
                const response = await optometryPrescriptionApi.list({
                    patient_id: patientId,
                    visit_id: visitId,
                    page_size: 1
                });

                if (response.items && response.items.length > 0) {
                    const prescription = response.items[0];
                    if (prescription.status === 'finalized') {
                        setHasFinalizedPrescription(true);
                    }
                }
            } catch (error) {
                console.error("Failed to check prescription status", error);
            }
        };

        checkPrescription();
    }, [patientId, visitId]);

    const handleClick = () => {
        if (!patientId) {
            return;
        }
        setShowModal(true);
    };

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                disabled={!patientId}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isCompleted || hasFinalizedPrescription ? <Eye className="h-4 w-4" /> : <FileEdit className="h-4 w-4" />}
                {isCompleted || hasFinalizedPrescription ? "View Prescription" : "Create Prescription"}
            </button>

            {showModal && (
                <DoctorPrescriptionModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    patientId={patientId}
                    patientName={patientName}
                    patientUhid={patientUhid}
                    visitId={visitId}
                    optometristId={optometristId}
                    doctorId={doctorId}
                    doctorName={doctorName}
                    onPrescriptionCreated={onPrescriptionCreated}
                    isCompleted={isCompleted}
                />
            )}
        </>
    );
}
