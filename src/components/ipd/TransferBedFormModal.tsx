"use client";

import { Modal } from "@/components/common/Modal";
import { TransferBedForm } from "./TransferBedForm";
import { TransferBedRequest } from "@/services/admissionsApi";

interface TransferBedFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
  currentBedId: string;
  onSubmit: (admissionId: string, transferData: TransferBedRequest) => Promise<void>;
}

export function TransferBedFormModal({ isOpen, onClose, admissionId, currentBedId, onSubmit }: TransferBedFormModalProps) {
  const handleSubmit = async (data: TransferBedRequest) => {
    await onSubmit(admissionId, data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Bed"
      size="lg"
    >
      <TransferBedForm
        currentBedId={currentBedId}
        onSuccess={onClose}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}

