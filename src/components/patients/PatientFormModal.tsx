"use client";

import { Modal } from "@/components/common/Modal";
import { PatientForm } from "./PatientForm";
import { Patient } from "@/types";

interface InitialAbhaData {
  profile: any;
  sessionKey: string;
  aadhaarNumber?: string;
}

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: Patient;
  initialAbhaData?: InitialAbhaData | null;
  onSuccess?: (patient?: Patient) => void;
}

export function PatientFormModal({ isOpen, onClose, defaultValues, initialAbhaData, onSuccess }: PatientFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues ? "Edit Patient" : "Add New Patient"}
      size="lg"
      closeOnOutsideClick={false}
      contentClassName="scrollbar-hide"
    >
      <PatientForm
        defaultValues={defaultValues}
        initialAbhaData={initialAbhaData}
        onSuccess={(patient) => {
          onSuccess?.(patient);
          onClose();
        }}
      />
    </Modal>
  );
}

