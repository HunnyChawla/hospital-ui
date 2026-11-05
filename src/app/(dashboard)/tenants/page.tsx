"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isPlatformOwner } from "@/utils/auth";
import { TenantTable } from "@/components/tenants/TenantTable";
import { TenantFormModal } from "@/components/tenants/TenantFormModal";
import { ShiftConfigModal } from "@/components/tenants/ShiftConfigModal";
import { CreateTenantUserModal } from "@/components/tenants/CreateTenantUserModal";
import { ExtendLicenseModal } from "@/components/tenants/ExtendLicenseModal";
import { TenantPlanModal } from "@/components/tenants/TenantPlanModal";
import { Tenant, TenantStatus } from "@/services/tenantsApi";
import { Building2, CheckCircle, XCircle, AlertTriangle, LayoutGrid, Search, X } from "lucide-react";

type StatusFilter = TenantStatus | "all";

export default function TenantsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>(undefined);
  const [showShiftConfigModal, setShowShiftConfigModal] = useState(false);
  const [shiftConfigTenant, setShiftConfigTenant] = useState<Tenant | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserTenant, setCreateUserTenant] = useState<Tenant | null>(null);
  const [showExtendLicenseModal, setShowExtendLicenseModal] = useState(false);
  const [extendLicenseTenant, setExtendLicenseTenant] = useState<Tenant | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planTenant, setPlanTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (!isPlatformOwner()) {
      router.push("/");
      return;
    }
    setAuthorized(true);
  }, [router]);

  const handleAddTenant = () => {
    setSelectedTenant(undefined);
    setShowFormModal(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowFormModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setSelectedTenant(undefined);
  };

  const handleShiftConfigClick = (tenant: Tenant) => {
    setShiftConfigTenant(tenant);
    setShowShiftConfigModal(true);
  };

  const handleCloseShiftConfigModal = () => {
    setShowShiftConfigModal(false);
    setShiftConfigTenant(null);
  };

  const handleCreateUserClick = (tenant: Tenant) => {
    setCreateUserTenant(tenant);
    setShowCreateUserModal(true);
  };

  const handleCloseCreateUserModal = () => {
    setShowCreateUserModal(false);
    setCreateUserTenant(null);
  };

  const handleExtendLicenseClick = (tenant: Tenant) => {
    setExtendLicenseTenant(tenant);
    setShowExtendLicenseModal(true);
  };

  const handleCloseExtendLicenseModal = () => {
    setShowExtendLicenseModal(false);
    setExtendLicenseTenant(null);
  };

  const handlePlanConfigClick = (tenant: Tenant) => {
    setPlanTenant(tenant);
    setShowPlanModal(true);
  };

  const handleClosePlanModal = () => {
    setShowPlanModal(false);
    setPlanTenant(null);
  };

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-500">Checking authorization...</p>
      </div>
    );
  }

  const statusFilters: Array<{
    value: StatusFilter;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { value: "all", label: "All", icon: LayoutGrid },
    { value: "active", label: "Active", icon: CheckCircle },
    { value: "inactive", label: "Inactive", icon: XCircle },
    { value: "suspended", label: "Suspended", icon: AlertTriangle },
  ];

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">Tenant Management</p>
              <p className="text-xs text-slate-500">
                Manage hospitals and their configurations
              </p>
            </div>
          </div>
          <button
            onClick={handleAddTenant}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
          >
            Add Tenant
          </button>
        </div>

        {/* Status Filter Tabs & Search Bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
          <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {statusFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.value}
                  onClick={() => setSelectedStatus(filter.value)}
                  className={`
                    flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors
                    ${
                      selectedStatus === filter.value
                        ? "border-sky-500 text-sky-600"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {filter.label}
                </button>
              );
            })}
          </nav>

          {/* Search Input Box */}
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, subdomain, email, phone..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <TenantTable
          statusFilter={selectedStatus === "all" ? undefined : selectedStatus}
          search={debouncedSearchQuery}
          onClearSearch={() => setSearchQuery("")}
          onEditClick={handleEditTenant}
          onPlanConfigClick={handlePlanConfigClick}
          onShiftConfigClick={handleShiftConfigClick}
          onCreateUserClick={handleCreateUserClick}
          onExtendLicenseClick={handleExtendLicenseClick}
        />
      </div>

      <TenantFormModal
        isOpen={showFormModal}
        onClose={handleCloseFormModal}
        defaultValues={selectedTenant}
      />

      {planTenant && (
        <TenantPlanModal
          isOpen={showPlanModal}
          onClose={handleClosePlanModal}
          tenant={planTenant}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent("tenant-updated", { detail: { tenantId: planTenant.id } }));
          }}
        />
      )}

      {shiftConfigTenant && (
        <ShiftConfigModal
          isOpen={showShiftConfigModal}
          onClose={handleCloseShiftConfigModal}
          tenantId={shiftConfigTenant.id}
          tenantName={shiftConfigTenant.name}
        />
      )}

      {createUserTenant && (
        <CreateTenantUserModal
          isOpen={showCreateUserModal}
          onClose={handleCloseCreateUserModal}
          tenantId={createUserTenant.id}
          tenantName={createUserTenant.name}
        />
      )}

      {extendLicenseTenant && (
        <ExtendLicenseModal
          isOpen={showExtendLicenseModal}
          onClose={handleCloseExtendLicenseModal}
          tenant={extendLicenseTenant}
        />
      )}
    </div>
  );
}
