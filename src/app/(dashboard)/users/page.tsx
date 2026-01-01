"use client";

import { useState } from "react";
import { UserTable } from "@/components/users/UserTable";
import { UserFormModal } from "@/components/users/UserFormModal";
import { User } from "@/services/usersApi";

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(undefined);
  };

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Staff Management</p>
            <p className="text-xs text-slate-500">Manage hospital staff and user accounts</p>
          </div>
          <button
            onClick={handleAddUser}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
          >
            Add User
          </button>
        </div>
        <UserTable onEditClick={handleEditUser} />
      </div>

      <UserFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        defaultValues={selectedUser}
      />
    </div>
  );
}
