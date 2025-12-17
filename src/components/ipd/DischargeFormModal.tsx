"use client";

import { Modal } from "@/components/common/Modal";
import { DischargeForm } from "./DischargeForm";
import { DischargeRequest } from "@/services/admissionsApi";

interface DischargeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
  onSubmit: (admissionId: string, dischargeData: DischargeRequest) => Promise<void>;
}

export function DischargeFormModal({ isOpen, onClose, admissionId, onSubmit }: DischargeFormModalProps) {
  const handleSubmit = async (data: DischargeRequest) => {
    await onSubmit(admissionId, data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Discharge Patient"
      size="lg"
    >
      <DischargeForm
        onSuccess={onClose}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}

