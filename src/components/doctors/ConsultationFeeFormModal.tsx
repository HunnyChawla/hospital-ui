"use client";

import { Modal } from "@/components/common/Modal";
import { ConsultationFeeForm } from "./ConsultationFeeForm";

interface ConsultationFeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
}

export function ConsultationFeeFormModal({ isOpen, onClose, doctorId }: ConsultationFeeFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Consultation Fees"
      size="xl"
    >
      <ConsultationFeeForm
        doctorId={doctorId}
        onSuccess={() => {
          onClose();
        }}
      />
    </Modal>
  );
}

