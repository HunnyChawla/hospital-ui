"use client";

import { Modal } from "@/components/common/Modal";
import { DoctorForm } from "./DoctorForm";
import { Doctor } from "@/services/doctorsApi";

interface DoctorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: Doctor;
}

export function DoctorFormModal({ isOpen, onClose, defaultValues }: DoctorFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues ? "Edit Doctor" : "Add New Doctor"}
      size="lg"
    >
      <DoctorForm
        defaultValues={defaultValues}
        onSuccess={() => {
          onClose();
        }}
      />
    </Modal>
  );
}

