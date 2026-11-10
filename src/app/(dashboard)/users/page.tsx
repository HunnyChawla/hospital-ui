"use client";

import { useState, useEffect } from "react";
import { UserTable, StaffMetrics } from "@/components/users/UserTable";
import { UserFormModal } from "@/components/users/UserFormModal";
import { User, UserRole, UserStatus } from "@/services/usersApi";
import {
  Users2,
  UserCog,
  Stethoscope,
  HeartPulse,
  ClipboardList,
  Eye,
  FlaskConical,
  Pill,
  UserPlus,
  Search,
  X,
  CheckCircle2,
  UserX,
  Users,
  RotateCcw,
} from "lucide-react";

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<UserStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const [metrics, setMetrics] = useState<StaffMetrics>({
    total: 0,
    active: 0,
    inactive: 0,
    clinical: 0,
  });

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setSelectedRole("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters =
    selectedRole !== "all" || selectedStatus !== "all" || searchQuery.trim().length > 0;

  const roles: Array<{
    value: UserRole | "all";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { value: "all", label: "All Roles", icon: Users2 },
    { value: "admin", label: "Admin", icon: UserCog },
    { value: "doctor", label: "Doctor", icon: Stethoscope },
    { value: "nurse", label: "Nurse", icon: HeartPulse },
    { value: "pharmacist", label: "Pharmacist", icon: Pill },
    { value: "pharmacy_manager", label: "Pharmacy Manager", icon: Pill },
    { value: "receptionist", label: "Receptionist", icon: ClipboardList },
    { value: "optometrist", label: "Optometrist", icon: Eye },
    { value: "examiner", label: "Examiner", icon: ClipboardList },
    { value: "lab_technician", label: "Lab Technician", icon: FlaskConical },
  ];

  return (
    <div className="space-y-4">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. Header Section                                            */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight sm:text-xl">
                Staff Management
              </h1>
              <p className="text-xs text-slate-500">
                Manage hospital personnel, access permissions, cabins, and user accounts
              </p>
            </div>
          </div>

          <button
            onClick={handleAddUser}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition hover:shadow-lg hover:brightness-105 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            <span>Add Staff Member</span>
          </button>
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 2. Overview KPI Metric Cards                                 */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {/* Total Staff */}
          <div
            onClick={() => {
              setSelectedRole("all");
              setSelectedStatus("all");
            }}
            className={`cursor-pointer rounded-xl border p-3 transition-all hover:border-sky-300 hover:shadow-sm ${
              selectedRole === "all" && selectedStatus === "all"
                ? "border-sky-300 bg-sky-50/50"
                : "border-slate-100 bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Total Staff
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <Users className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-1 text-xl font-bold text-slate-900">{metrics.total}</p>
            <p className="text-[11px] text-slate-500 truncate">All registered personnel</p>
          </div>

          {/* Active Accounts */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "active" ? "all" : "active")}
            className={`cursor-pointer rounded-xl border p-3 transition-all hover:border-emerald-300 hover:shadow-sm ${
              selectedStatus === "active"
                ? "border-emerald-300 bg-emerald-50/50"
                : "border-slate-100 bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Active Staff
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-1 text-xl font-bold text-emerald-700">{metrics.active}</p>
            <p className="text-[11px] text-slate-500 truncate">Ready & authorized</p>
          </div>

          {/* Inactive Accounts */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "inactive" ? "all" : "inactive")}
            className={`cursor-pointer rounded-xl border p-3 transition-all hover:border-amber-300 hover:shadow-sm ${
              selectedStatus === "inactive"
                ? "border-amber-300 bg-amber-50/50"
                : "border-slate-100 bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Inactive
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <UserX className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-1 text-xl font-bold text-amber-700">{metrics.inactive}</p>
            <p className="text-[11px] text-slate-500 truncate">Deactivated or locked</p>
          </div>

          {/* Clinical Staff */}
          <div
            onClick={() => {
              // Quick jump to clinical role
              if (selectedRole === "doctor") {
                setSelectedRole("nurse");
              } else {
                setSelectedRole("doctor");
              }
            }}
            className={`cursor-pointer rounded-xl border p-3 transition-all hover:border-teal-300 hover:shadow-sm ${
              selectedRole === "doctor" || selectedRole === "nurse"
                ? "border-teal-300 bg-teal-50/50"
                : "border-slate-100 bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Clinical Roles
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                <Stethoscope className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-1 text-xl font-bold text-teal-700">{metrics.clinical}</p>
            <p className="text-[11px] text-slate-500 truncate">Doctors, nurses, lab</p>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. Search & Filters Bar                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or cabin..."
              className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter & Reset */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as UserStatus | "all")}
              className="min-h-[42px] rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                title="Reset all filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 4. Role Filter Tabs (Horizontally Scrollable, No Scrollbar) */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="border-t border-slate-100 pt-3">
          <div
            className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-hide [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Role filters"
          >
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`
                    flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all
                    ${
                      isSelected
                        ? "bg-sky-500 text-white shadow-sm shadow-sky-500/20"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                    }
                  `}
                >
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-slate-500"}`} />
                  <span>{role.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 5. Staff Table / Mobile Cards Component                     */}
        {/* ──────────────────────────────────────────────────────────── */}
        <UserTable
          onEditClick={handleEditUser}
          roleFilter={selectedRole === "all" ? undefined : selectedRole}
          statusFilter={selectedStatus === "all" ? undefined : selectedStatus}
          search={debouncedSearchQuery}
          onClearFilters={handleClearFilters}
          onMetricsUpdate={setMetrics}
        />
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 6. Add/Edit Staff Modal                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <UserFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        defaultValues={selectedUser}
      />
    </div>
  );
}
