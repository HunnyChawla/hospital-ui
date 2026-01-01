"use client";

import { Modal } from "@/components/common/Modal";
import { PrescriptionForm } from "./PrescriptionForm";

interface PrescriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  patientId: string;
  doctorId: string;
  onSuccess?: () => void;
}

export function PrescriptionFormModal({
  isOpen,
  onClose,
  visitId,
  patientId,
  doctorId,
  onSuccess,
}: PrescriptionFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Prescription"
      size="full"
    >
      <PrescriptionForm
        visitId={visitId}
        patientId={patientId}
        doctorId={doctorId}
        onSuccess={() => {
          onClose();
          onSuccess?.();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
