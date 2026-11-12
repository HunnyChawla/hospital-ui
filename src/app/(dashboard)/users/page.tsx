"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { UserTable, StaffMetrics } from "@/components/users/UserTable";
import { UserFormModal } from "@/components/users/UserFormModal";
import { TenantSelector } from "@/components/tenants/TenantSelector";
import { User, UserRole, UserStatus } from "@/services/usersApi";
import { Tenant } from "@/services/tenantsApi";
import { isPlatformOwner } from "@/utils/auth";
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
  Building2,
  ArrowLeft,
  Shield,
} from "lucide-react";

function UsersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlTenantId = searchParams.get("tenant_id") || "";

  const [mounted, setMounted] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(urlTenantId);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelectedTenantId(urlTenantId);
    setSelectedTenant((prev) => {
      if (prev && prev.id === urlTenantId) {
        return prev;
      }
      return null;
    });
    if (!urlTenantId) {
      setMetrics({ total: 0, active: 0, inactive: 0, clinical: 0 });
    }
  }, [urlTenantId]);

  const platformOwner = mounted ? isPlatformOwner() : false;
  const effectiveTenantId = platformOwner ? selectedTenantId || undefined : undefined;
  const canQueryStaff = mounted && (!platformOwner || Boolean(selectedTenantId));

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectTenant = (tenant: Tenant) => {
    if (tenant.id !== selectedTenantId) {
      setMetrics({ total: 0, active: 0, inactive: 0, clinical: 0 });
      setSelectedUser(undefined);
    }
    setSelectedTenantId(tenant.id);
    setSelectedTenant(tenant);
    router.replace(`/users?tenant_id=${tenant.id}`, { scroll: false });
  };

  const handleAddUser = () => {
    if (platformOwner && !selectedTenantId) return;
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
    { value: "counsellor", label: "Counsellor", icon: Users2 },
    ...(platformOwner
      ? [{ value: "platform_owner" as const, label: "Platform Owner", icon: Shield }]
      : []),
  ];

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl border border-slate-200/90 bg-white" />
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200/90 bg-white" />
      </div>
    );
  }

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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight sm:text-xl">
                  {platformOwner ? "Tenant Staff Directory" : "Staff Management"}
                </h1>
                {platformOwner && selectedTenant && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                    <Building2 className="h-3 w-3" />
                    {selectedTenant.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {platformOwner
                  ? selectedTenant
                    ? `Viewing and managing staff accounts for ${selectedTenant.name} (${selectedTenant.subdomain})`
                    : "Select a hospital tenant below to view and manage its staff accounts"
                  : "Manage hospital personnel, access permissions, cabins, and user accounts"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {platformOwner && (
              <Link
                href="/tenants"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>Back to Tenants</span>
              </Link>
            )}
            <button
              onClick={handleAddUser}
              disabled={platformOwner && !selectedTenantId}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition hover:shadow-lg hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>

        {platformOwner && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <TenantSelector
              selectedTenantId={selectedTenantId}
              onSelectTenant={handleSelectTenant}
              onTenantResolved={setSelectedTenant}
              label="Selected Hospital Tenant"
            />
          </div>
        )}

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
              <option value="suspended">Suspended Only</option>
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
        {canQueryStaff ? (
          <UserTable
            tenantId={effectiveTenantId}
            tenantName={platformOwner ? selectedTenant?.name : undefined}
            onEditClick={handleEditUser}
            roleFilter={selectedRole === "all" ? undefined : selectedRole}
            statusFilter={selectedStatus === "all" ? undefined : selectedStatus}
            search={debouncedSearchQuery}
            onClearFilters={handleClearFilters}
            onMetricsUpdate={setMetrics}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900">
              Select a Hospital Tenant
            </h2>
            <p className="mt-1 max-w-md text-xs sm:text-sm text-slate-500">
              Choose a hospital from the Tenant Selector above, or navigate from the{" "}
              <Link href="/tenants" className="font-semibold text-sky-600 hover:underline">
                Tenants
              </Link>{" "}
              directory to inspect and manage its staff members.
            </p>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 6. Add/Edit Staff Modal                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <UserFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        defaultValues={selectedUser}
        tenantId={effectiveTenantId}
        tenantName={platformOwner ? selectedTenant?.name : undefined}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-2xl border border-slate-200/90 bg-white" />
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200/90 bg-white" />
        </div>
      }
    >
      <UsersPageContent />
    </Suspense>
  );
}
