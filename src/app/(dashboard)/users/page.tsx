"use client";

import { useState } from "react";
import { UserTable } from "@/components/users/UserTable";
import { UserFormModal } from "@/components/users/UserFormModal";
import { User, UserRole } from "@/services/usersApi";
import { Users2, UserCog, Stethoscope, HeartPulse, ClipboardList, Eye } from "lucide-react";

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");

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

  const roles: Array<{ value: UserRole | "all"; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { value: "all", label: "All", icon: Users2 },
    { value: "admin", label: "Admin", icon: UserCog },
    { value: "doctor", label: "Doctor", icon: Stethoscope },
    { value: "nurse", label: "Nurse", icon: HeartPulse },
    { value: "receptionist", label: "Receptionist", icon: ClipboardList },
    { value: "optometrist", label: "Optometrist", icon: Eye },
  ];

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

        {/* Role Filter Tabs */}
        <div className="mb-4 border-b border-slate-200">
          <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`
                    flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors
                    ${
                      selectedRole === role.value
                        ? "border-sky-500 text-sky-600"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {role.label}
                </button>
              );
            })}
          </nav>
        </div>

        <UserTable 
          onEditClick={handleEditUser} 
          roleFilter={selectedRole === "all" ? undefined : selectedRole}
        />
      </div>

      <UserFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        defaultValues={selectedUser}
      />
    </div>
  );
}
