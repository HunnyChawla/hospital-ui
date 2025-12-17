"use client";

import { Modal } from "@/components/common/Modal";
import { BedForm } from "./BedForm";
import { Bed } from "@/services/bedsApi";

interface BedFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: Bed;
}

export function BedFormModal({ isOpen, onClose, defaultValues }: BedFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues ? "Edit Bed" : "Create Bed"}
      size="md"
    >
      <BedForm defaultValues={defaultValues} onSuccess={onClose} />
    </Modal>
  );
}


