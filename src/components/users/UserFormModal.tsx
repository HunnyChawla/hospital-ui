"use client";

import { Modal } from "@/components/common/Modal";
import { UserForm } from "./UserForm";
import { User } from "@/services/usersApi";
import { UserPlus, UserCog } from "lucide-react";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: User;
  tenantId?: string;
  tenantName?: string;
}

export function UserFormModal({
  isOpen,
  onClose,
  defaultValues,
  tenantId,
  tenantName,
}: UserFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-sm">
            {defaultValues ? <UserCog className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 md:text-lg">
              {defaultValues ? "Edit Staff Member" : "Add New Staff Member"}
            </h2>
            <p className="text-xs text-slate-500">
              {defaultValues
                ? `Update profile, cabin, and status for ${defaultValues.full_name}`
                : tenantName
                  ? `Create a new account in ${tenantName}`
                  : "Create a new hospital clinical or administrative account"}
            </p>
          </div>
        </div>
      }
      size="md"
    >
      <UserForm
        defaultValues={defaultValues}
        tenantId={tenantId}
        tenantName={tenantName}
        onSuccess={() => {
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
