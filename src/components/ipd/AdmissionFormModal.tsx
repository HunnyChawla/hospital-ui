"use client";

import { Modal } from "@/components/common/Modal";
import { AdmissionForm } from "./AdmissionForm";

interface AdmissionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientId?: string;
}

export function AdmissionFormModal({ isOpen, onClose, defaultPatientId }: AdmissionFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admit Patient"
      size="lg"
    >
      <AdmissionForm
        defaultPatientId={defaultPatientId}
        showDropdownSearch={true}
        onSuccess={onClose}
      />
    </Modal>
  );
}


