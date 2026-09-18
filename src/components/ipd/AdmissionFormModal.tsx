"use client";

import { Modal } from "@/components/common/Modal";
import { AdmissionForm } from "./AdmissionForm";

interface AdmissionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientId?: string;
  defaultDoctorId?: string;
  defaultVisitId?: string;
  defaultReason?: string;
}

export function AdmissionFormModal({
  isOpen,
  onClose,
  defaultPatientId,
  defaultDoctorId,
  defaultVisitId,
  defaultReason,
}: AdmissionFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admit Patient"
      size="lg"
    >
      <AdmissionForm
        defaultPatientId={defaultPatientId}
        defaultDoctorId={defaultDoctorId}
        defaultVisitId={defaultVisitId}
        defaultReason={defaultReason}
        showDropdownSearch={true}
        onSuccess={onClose}
      />
    </Modal>
  );
}


