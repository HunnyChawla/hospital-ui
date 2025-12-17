"use client";

import { Modal } from "@/components/common/Modal";
import { WardForm } from "./WardForm";
import { Ward } from "@/services/wardsApi";

interface WardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: Ward;
}

export function WardFormModal({ isOpen, onClose, defaultValues }: WardFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues ? "Edit Ward" : "Create Ward"}
      size="md"
    >
      <WardForm defaultValues={defaultValues} onSuccess={onClose} />
    </Modal>
  );
}


