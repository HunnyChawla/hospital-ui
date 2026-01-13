"use client";

import { Modal } from "@/components/common/Modal";
import { TenantForm } from "./TenantForm";
import { Tenant } from "@/services/tenantsApi";

interface TenantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: Tenant;
}

export function TenantFormModal({ isOpen, onClose, defaultValues }: TenantFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues ? "Edit Tenant" : "Add New Tenant"}
      size="lg"
    >
      <TenantForm
        defaultValues={defaultValues}
        onSuccess={() => {
          onClose();
        }}
      />
    </Modal>
  );
}
