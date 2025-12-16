"use client";

import { Modal } from "@/components/common/Modal";
import { UserForm } from "./UserForm";
import { User } from "@/services/usersApi";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: User;
}

export function UserFormModal({ isOpen, onClose, defaultValues }: UserFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues ? "Edit User" : "Add New User"}
      size="lg"
    >
      <UserForm
        defaultValues={defaultValues}
        onSuccess={() => {
          onClose();
        }}
      />
    </Modal>
  );
}

