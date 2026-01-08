"use client";

import { useState } from "react";
import { FileEdit, Loader2 } from "lucide-react";
import { DoctorPrescriptionModal } from "./DoctorPrescriptionModal";

interface CreatePrescriptionButtonProps {
    patientId: string;
    patientName: string;
    patientUhid?: string;
    visitId: string;
    optometristId: string;
    doctorId: string;
    doctorName?: string;
    onPrescriptionCreated?: () => void;
}

export function CreatePrescriptionButton({
    patientId,
    patientName,
    patientUhid,
    visitId,
    optometristId,
    doctorId,
    doctorName,
    onPrescriptionCreated,
}: CreatePrescriptionButtonProps) {
    const [showModal, setShowModal] = useState(false);

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
                <FileEdit className="h-4 w-4" />
                Create Prescription
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
                />
            )}
        </>
    );
}
