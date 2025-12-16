"use client";

import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { LabBookingForm } from "./LabBookingForm";
import { PatientFormModal } from "@/components/patients/PatientFormModal";

interface LabBookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientId?: string;
}

export function LabBookingFormModal({ isOpen, onClose, defaultPatientId }: LabBookingFormModalProps) {
  const [showPatientModal, setShowPatientModal] = useState(false);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create Lab Test Booking"
        size="lg"
      >
        <LabBookingForm
          defaultPatientId={defaultPatientId}
          onSuccess={() => {
            onClose();
          }}
          onOpenPatientModal={() => setShowPatientModal(true)}
        />
      </Modal>

      <PatientFormModal
        isOpen={showPatientModal}
        onClose={() => setShowPatientModal(false)}
      />
    </>
  );
}

