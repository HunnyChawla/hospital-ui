"use client";

import { Modal } from "@/components/common/Modal";
import { PrescriptionForm } from "./PrescriptionForm";
import { Prescription } from "@/services/prescriptionsApi";

interface PrescriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId?: string | null;
  appointmentId?: string | null;
  patientId: string;
  doctorId: string;
  onSuccess?: () => void;
  defaultPrescription?: {
    medicines: Array<{
      medicine_id: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string | null;
      quantity: number;
      unit: string;
    }>;
    diagnosis?: string | null;
    notes?: string | null;
  };
}

export function PrescriptionFormModal({
  isOpen,
  onClose,
  visitId,
  appointmentId,
  patientId,
  doctorId,
  onSuccess,
  defaultPrescription,
}: PrescriptionFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Prescription"
      size="xl"
    >
      <PrescriptionForm
        visitId={visitId}
        appointmentId={appointmentId}
        patientId={patientId}
        doctorId={doctorId}
        defaultPrescription={defaultPrescription}
        onSuccess={() => {
          onClose();
          onSuccess?.();
        }}
      />
    </Modal>
  );
}



