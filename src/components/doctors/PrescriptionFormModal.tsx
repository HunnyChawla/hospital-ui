"use client";

import { Modal } from "@/components/common/Modal";
import { PrescriptionForm } from "./PrescriptionForm";
import { LockedWhenFinalised } from "@/components/health-record/LockedWhenFinalised";

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
      <LockedWhenFinalised
        episodeType="opd_visit"
        sourceId={visitId}
        reason="This visit has been finalised. Its prescription is frozen and a version recorded — reopen the visit to change it."
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
      </LockedWhenFinalised>
    </Modal>
  );
}
