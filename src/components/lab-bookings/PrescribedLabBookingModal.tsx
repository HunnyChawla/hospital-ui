"use client";

import { Modal } from "@/components/common/Modal";
import { PrescribedLabBookingPanel } from "./PrescribedLabBookingPanel";

interface PrescribedLabBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  patientId: string;
  patientName?: string;
  onBookingCreated?: () => void;
}

export function PrescribedLabBookingModal({
  isOpen,
  onClose,
  visitId,
  patientId,
  patientName,
  onBookingCreated,
}: PrescribedLabBookingModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Book Prescribed Lab Tests"
      size="lg"
    >
      <div className="py-2">
        <PrescribedLabBookingPanel
          visitId={visitId}
          patientId={patientId}
          patientName={patientName}
          onSuccess={() => {
            onBookingCreated?.();
            onClose();
          }}
        />
      </div>
    </Modal>
  );
}
