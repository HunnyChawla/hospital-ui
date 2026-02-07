"use client";

import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { AppointmentForm } from "./AppointmentForm";
import { PatientFormModal } from "@/components/patients/PatientFormModal";

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientId?: string;
}

export function AppointmentFormModal({ isOpen, onClose, defaultPatientId }: AppointmentFormModalProps) {
  const [showPatientModal, setShowPatientModal] = useState(false);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create Appointment"
        size="lg"
        closeOnOutsideClick={false}
      >
        <AppointmentForm
          defaultPatientId={defaultPatientId}
          hidePatientSearch={false}
          showDropdownSearch={true}
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

