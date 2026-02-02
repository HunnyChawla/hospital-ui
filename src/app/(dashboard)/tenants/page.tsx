"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isPlatformOwner } from "@/utils/auth";
import { TenantTable } from "@/components/tenants/TenantTable";
import { TenantFormModal } from "@/components/tenants/TenantFormModal";
import { ShiftConfigModal } from "@/components/tenants/ShiftConfigModal";
import { CreateTenantUserModal } from "@/components/tenants/CreateTenantUserModal";
import { ExtendLicenseModal } from "@/components/tenants/ExtendLicenseModal";
import { Tenant, TenantStatus } from "@/services/tenantsApi";
import { Building2, CheckCircle, XCircle, AlertTriangle, LayoutGrid } from "lucide-react";

type StatusFilter = TenantStatus | "all";

export default function TenantsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>(undefined);
  const [showShiftConfigModal, setShowShiftConfigModal] = useState(false);
  const [shiftConfigTenant, setShiftConfigTenant] = useState<Tenant | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserTenant, setCreateUserTenant] = useState<Tenant | null>(null);
  const [showExtendLicenseModal, setShowExtendLicenseModal] = useState(false);
  const [extendLicenseTenant, setExtendLicenseTenant] = useState<Tenant | null>(null);

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

        {/* Status Filter Tabs */}
        <div className="mb-4 border-b border-slate-200">
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
        </div>

        <TenantTable
          statusFilter={selectedStatus === "all" ? undefined : selectedStatus}
          onEditClick={handleEditTenant}
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
