"use client";

import { Modal } from "@/components/common/Modal";
import { ServiceForm } from "./ServiceForm";
import { Service } from "@/services/servicesApi";

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: Service;
}

export function ServiceFormModal({ isOpen, onClose, defaultValues }: ServiceFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues ? "Edit Service" : "Add New Service"}
      size="lg"
    >
      <ServiceForm
        defaultValues={defaultValues}
        onSuccess={() => {
          onClose();
        }}
      />
    </Modal>
  );
}

