"use client";

import { Modal } from "@/components/common/Modal";
import { PatientForm } from "./PatientForm";
import { Patient } from "@/types";

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: Patient;
}

export function PatientFormModal({ isOpen, onClose, defaultValues }: PatientFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues ? "Edit Patient" : "Add New Patient"}
      size="lg"
    >
      <PatientForm
        defaultValues={defaultValues}
        onSuccess={() => {
          onClose();
        }}
      />
    </Modal>
  );
}

