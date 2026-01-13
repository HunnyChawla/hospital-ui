"use client";

import { useEffect, useState, useCallback } from "react";
import { tenantsApi, Tenant, TenantStatus } from "@/services/tenantsApi";
import { formatDate } from "@/utils/format";
import {
  Edit2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Clock,
  UserPlus,
  CalendarClock,
} from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface TenantTableProps {
  statusFilter?: TenantStatus;
  onEditClick?: (tenant: Tenant) => void;
  onShiftConfigClick?: (tenant: Tenant) => void;
  onCreateUserClick?: (tenant: Tenant) => void;
  onExtendLicenseClick?: (tenant: Tenant) => void;
}

export function TenantTable({
  statusFilter,
  onEditClick,
  onShiftConfigClick,
  onCreateUserClick,
  onExtendLicenseClick,
}: TenantTableProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [logoUrls, setLogoUrls] = useState<Record<string, string>>({});

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const response = await tenantsApi.list({
        page: currentPage,
        page_size: pageSize,
        status: statusFilter,
      });
      setTenants(response.items);
      setTotalPages(response.total_pages);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
      setTenants([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter]);

  // Fetch logos for tenants
  useEffect(() => {
    const fetchLogos = async () => {
      for (const tenant of tenants) {
        if (tenant.logo && !logoUrls[tenant.id]) {
          try {
            const blob = await tenantsApi.getLogo(tenant.id);
            const url = URL.createObjectURL(blob);
            setLogoUrls((prev) => ({ ...prev, [tenant.id]: url }));
          } catch {
            // Logo fetch failed, ignore
          }
        }
      }
    };
    if (tenants.length > 0) {
      fetchLogos();
    }
  }, [tenants, logoUrls]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(logoUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [logoUrls]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Listen for tenant update events to refresh the list
  useEffect(() => {
    const handleTenantUpdated = () => {
      fetchTenants();
    };

    window.addEventListener("tenant:updated", handleTenantUpdated);
    return () => {
      window.removeEventListener("tenant:updated", handleTenantUpdated);
    };
  }, [fetchTenants]);

  const handleStatusChange = async (tenantId: string, newStatus: TenantStatus) => {
    try {
      await tenantsApi.update(tenantId, { status: newStatus });
      toast.success("Status updated successfully");
      window.dispatchEvent(new CustomEvent("tenant:updated"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const getStatusColor = (status: TenantStatus) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-700";
      case "inactive":
        return "bg-slate-50 text-slate-700";
      case "suspended":
        return "bg-rose-50 text-rose-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getPlanColor = (plan: string | null) => {
    switch (plan) {
      case "premium":
        return "bg-amber-50 text-amber-700";
      case "standard":
        return "bg-sky-50 text-sky-700";
      case "basic":
        return "bg-slate-50 text-slate-700";
      default:
        return "bg-slate-50 text-slate-500";
    }
  };

  const getLicenseStatusColor = (licenseDate: string | null) => {
    if (!licenseDate) return "text-slate-500";

    const expiry = new Date(licenseDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return "text-rose-600 font-semibold";
    if (daysUntilExpiry <= 30) return "text-amber-600 font-semibold";
    return "text-emerald-600";
  };

  if (loading) {
    return <SkeletonRow rows={5} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left uppercase tracking-wide text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3">Logo</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Subdomain</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">License Expiry</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {tenants.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                No tenants found
              </td>
            </tr>
          ) : (
            tenants.map((tenant) => (
              <tr
                key={tenant.id}
                className="hover:bg-sky-50/50 transition"
              >
                <td className="px-4 py-3">
                  {logoUrls[tenant.id] ? (
                    <img
                      src={logoUrls[tenant.id]}
                      alt={`${tenant.name} logo`}
                      className="h-10 w-10 rounded-lg object-contain border border-slate-100"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{tenant.name}</p>
                  {tenant.city && (
                    <p className="text-xs text-slate-500">{tenant.city}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    {tenant.subdomain}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={tenant.status}
                    onChange={(e) => handleStatusChange(tenant.id, e.target.value as TenantStatus)}
                    className={`rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium ${getStatusColor(tenant.status)}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`pill px-2 py-0.5 text-xs font-normal ${getPlanColor(tenant.plan)}`}>
                    {tenant.plan || "No plan"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={getLicenseStatusColor(tenant.license_valid_till)}>
                    {tenant.license_valid_till
                      ? formatDate(tenant.license_valid_till)
                      : "Not set"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDate(tenant.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClick?.(tenant);
                      }}
                      className="flex items-center justify-center rounded-lg bg-sky-500 p-2 text-white transition hover:bg-sky-600"
                      title="Edit tenant"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExtendLicenseClick?.(tenant);
                      }}
                      className="flex items-center justify-center rounded-lg bg-amber-500 p-2 text-white transition hover:bg-amber-600"
                      title="Extend license"
                    >
                      <CalendarClock className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShiftConfigClick?.(tenant);
                      }}
                      className="flex items-center justify-center rounded-lg bg-purple-500 p-2 text-white transition hover:bg-purple-600"
                      title="Shift configuration"
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateUserClick?.(tenant);
                      }}
                      className="flex items-center justify-center rounded-lg bg-emerald-500 p-2 text-white transition hover:bg-emerald-600"
                      title="Create user"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border-t border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, total)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{total}</span> tenants
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[2.5rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      currentPage === pageNum
                        ? "bg-sky-500 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
