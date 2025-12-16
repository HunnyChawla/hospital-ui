"use client";

import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { OpdForm } from "./OpdForm";
import { PatientFormModal } from "@/components/patients/PatientFormModal";

interface OpdFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientId?: string;
}

export function OpdFormModal({ isOpen, onClose, defaultPatientId }: OpdFormModalProps) {
  const [showPatientModal, setShowPatientModal] = useState(false);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create OPD Visit (Walk-in)"
        size="lg"
      >
        <OpdForm
          defaultPatientId={defaultPatientId}
          hidePatientSearch={false}
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

