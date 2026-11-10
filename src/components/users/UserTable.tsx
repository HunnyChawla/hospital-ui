"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usersApi, User, UserRole, UserStatus } from "@/services/usersApi";
import { formatDate } from "@/utils/format";
import {
  Edit2,
  ChevronLeft,
  ChevronRight,
  Key,
  Mail,
  Calendar,
  Clock,
  DoorClosed,
  User as UserIcon,
  Users,
  SearchX,
  Stethoscope,
  HeartPulse,
  UserCog,
  Pill,
  ClipboardList,
  Eye,
  FlaskConical,
  ShieldAlert,
} from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { ResetPasswordModal } from "@/components/password/ResetPasswordModal";
import { ROLE_LABELS } from "@/constants/screens";

export interface StaffMetrics {
  total: number;
  active: number;
  inactive: number;
  clinical: number;
}

interface UserTableProps {
  onUserClick?: (userId: string) => void;
  onEditClick?: (user: User) => void;
  roleFilter?: UserRole;
  statusFilter?: UserStatus;
  search?: string;
  onClearFilters?: () => void;
  onMetricsUpdate?: (metrics: StaffMetrics) => void;
}

export function UserTable({
  onUserClick,
  onEditClick,
  roleFilter,
  statusFilter,
  search,
  onClearFilters,
  onMetricsUpdate,
}: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  // Check if current user can reset passwords (admin or platform_owner)
  const canResetPassword =
    typeof window !== "undefined" &&
    ["admin", "platform_owner"].includes(localStorage.getItem("role") || "");

  // Fetch metrics across the full staff directory
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await usersApi.list({ page: 1, page_size: 200 });
      if (response && response.items) {
        const totalCount = response.total;
        let activeCount = 0;
        let inactiveCount = 0;
        let clinicalCount = 0;
        const clinicalRoles = new Set([
          "doctor",
          "nurse",
          "optometrist",
          "lab_technician",
          "pharmacist",
        ]);

        response.items.forEach((u) => {
          if (u.status === "active") activeCount++;
          if (u.status === "inactive") inactiveCount++;
          if (clinicalRoles.has(u.role)) clinicalCount++;
        });

        onMetricsUpdate?.({
          total: totalCount,
          active: activeCount,
          inactive: inactiveCount,
          clinical: clinicalCount,
        });
      }
    } catch {
      // Non-blocking metrics retrieval
    }
  }, [onMetricsUpdate]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersApi.list({
        page: currentPage,
        page_size: pageSize,
        role: roleFilter,
        status: statusFilter,
        search: search?.trim() || undefined,
      });
      setUsers(response.items);
      setTotalPages(response.total_pages);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, roleFilter, statusFilter, search]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when any filter or search changes
  }, [roleFilter, statusFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Listen for user creation/update events to refresh list and stats
  useEffect(() => {
    const handleUserCreated = () => {
      fetchUsers();
      fetchMetrics();
    };

    window.addEventListener("user:created", handleUserCreated);
    return () => {
      window.removeEventListener("user:created", handleUserCreated);
    };
  }, [fetchUsers, fetchMetrics]);

  // Helper for initials
  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Role visual styling & icon
  const getRoleConfig = (role: UserRole) => {
    switch (role) {
      case "admin":
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-200/80",
          avatarBg: "bg-purple-100 text-purple-800 ring-purple-200",
          icon: UserCog,
        };
      case "doctor":
        return {
          bg: "bg-sky-50 text-sky-700 border-sky-200/80",
          avatarBg: "bg-sky-100 text-sky-800 ring-sky-200",
          icon: Stethoscope,
        };
      case "nurse":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          avatarBg: "bg-emerald-100 text-emerald-800 ring-emerald-200",
          icon: HeartPulse,
        };
      case "receptionist":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200/80",
          avatarBg: "bg-amber-100 text-amber-800 ring-amber-200",
          icon: ClipboardList,
        };
      case "optometrist":
        return {
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
          avatarBg: "bg-indigo-100 text-indigo-800 ring-indigo-200",
          icon: Eye,
        };
      case "examiner":
        return {
          bg: "bg-teal-50 text-teal-700 border-teal-200/80",
          avatarBg: "bg-teal-100 text-teal-800 ring-teal-200",
          icon: ClipboardList,
        };
      case "pharmacist":
        return {
          bg: "bg-teal-50 text-teal-700 border-teal-200/80",
          avatarBg: "bg-teal-100 text-teal-800 ring-teal-200",
          icon: Pill,
        };
      case "pharmacy_manager":
        return {
          bg: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
          avatarBg: "bg-cyan-100 text-cyan-800 ring-cyan-200",
          icon: Pill,
        };
      case "lab_technician":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200/80",
          avatarBg: "bg-rose-100 text-rose-800 ring-rose-200",
          icon: FlaskConical,
        };
      case "platform_owner":
        return {
          bg: "bg-violet-50 text-violet-700 border-violet-200/80",
          avatarBg: "bg-violet-100 text-violet-800 ring-violet-200",
          icon: ShieldAlert,
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          avatarBg: "bg-slate-100 text-slate-700 ring-slate-200",
          icon: UserIcon,
        };
    }
  };

  const hasActiveFilters = Boolean(roleFilter || statusFilter || search?.trim());

  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonRow rows={6} />
      </div>
    );
  }

  return (
    <>
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. Mobile Card View (screens < 768px)                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="block md:hidden space-y-3">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 text-slate-400 mb-3">
              <SearchX className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No staff members found</p>
            <p className="mt-1 text-xs text-slate-500">
              {hasActiveFilters
                ? "No users match your active search or filters."
                : "No staff members recorded in the system yet."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 active:scale-95"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          users.map((user) => {
            const roleConfig = getRoleConfig(user.role);
            const RoleIcon = roleConfig.icon;
            const initials = getInitials(user.full_name);

            return (
              <div
                key={user.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all active:scale-[0.99] space-y-3.5"
                onClick={() => (onEditClick ? onEditClick(user) : onUserClick?.(user.id))}
              >
                {/* Header: Avatar, Name, Role & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm ring-1 ${roleConfig.avatarBg}`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {user.full_name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${roleConfig.bg}`}
                        >
                          <RoleIcon className="h-3 w-3 shrink-0" />
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0">
                    {user.status === "active" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200/60">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        </span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                        <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Grid (2 Columns) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Email */}
                  <div className="col-span-2 flex items-center gap-2 rounded-xl bg-slate-50/80 px-3 py-2 text-slate-700">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>

                  {/* Cabin */}
                  <div className="flex items-center gap-1.5 rounded-xl bg-slate-50/80 px-2.5 py-2 text-slate-700">
                    <DoorClosed className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {user.cabin ? `Cabin: ${user.cabin}` : "No Cabin"}
                    </span>
                  </div>

                  {/* Last Login */}
                  <div className="flex items-center gap-1.5 rounded-xl bg-slate-50/80 px-2.5 py-2 text-slate-700">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {user.last_login_at ? formatDate(user.last_login_at) : "Never logged in"}
                    </span>
                  </div>
                </div>

                {/* Mobile Action Buttons (Full-Width Touch Targets >= 44px) */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick?.(user);
                    }}
                    className="flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition active:bg-sky-100"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Details
                  </button>
                  {canResetPassword && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setResetPasswordUser(user);
                      }}
                      className="flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition active:bg-amber-100"
                    >
                      <Key className="h-3.5 w-3.5" />
                      Reset Password
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. Desktop Table View (screens >= 768px)                    */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50/80 text-left uppercase tracking-wide text-xs text-slate-500 font-semibold">
            <tr>
              <th className="px-5 py-3.5">Staff Member</th>
              <th className="px-4 py-3.5">Role</th>
              <th className="px-4 py-3.5">Cabin</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Joined Date</th>
              <th className="px-4 py-3.5">Last Login</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-2">
                    <SearchX className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">No staff members found</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {hasActiveFilters
                      ? "Try clearing your filters or refining your search terms."
                      : "No staff users registered for this hospital."}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={onClearFilters}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-100"
                    >
                      Clear all filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const roleConfig = getRoleConfig(user.role);
                const RoleIcon = roleConfig.icon;
                const initials = getInitials(user.full_name);

                return (
                  <tr
                    key={user.id}
                    onClick={() => (onEditClick ? onEditClick(user) : onUserClick?.(user.id))}
                    className="cursor-pointer hover:bg-sky-50/40 transition-colors group"
                  >
                    {/* User Identity */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ring-1 ${roleConfig.avatarBg}`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role Pill */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${roleConfig.bg}`}
                      >
                        <RoleIcon className="h-3.5 w-3.5 shrink-0" />
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>

                    {/* Cabin */}
                    <td className="px-4 py-3.5 text-slate-700">
                      {user.cabin ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          <DoorClosed className="h-3 w-3 text-slate-500" />
                          {user.cabin}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Status Pill with Pulsing Dot */}
                    <td className="px-4 py-3.5">
                      {user.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          </span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Created At */}
                    <td className="px-4 py-3.5 text-slate-600 text-xs">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3.5 text-slate-600 text-xs">
                      {user.last_login_at ? (
                        <span className="flex items-center gap-1 text-slate-700">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {formatDate(user.last_login_at)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Never</span>
                      )}
                    </td>

                    {/* Desktop Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canResetPassword && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setResetPasswordUser(user);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            title="Reset Password"
                            aria-label={`Reset password for ${user.full_name}`}
                          >
                            <Key className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditClick?.(user);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                          title="Edit Staff Member"
                          aria-label={`Edit ${user.full_name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. Responsive Pagination                                     */}
      {/* ──────────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-600 text-center sm:text-left">
            Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, total)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{total}</span> staff
          </div>

          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex min-h-[36px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            {/* Desktop page buttons */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
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
                    className={`min-h-[36px] min-w-[2.25rem] rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                      currentPage === pageNum
                        ? "bg-sky-500 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Mobile compact page indicator */}
            <span className="sm:hidden px-2 text-xs font-medium text-slate-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex min-h-[36px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <ResetPasswordModal
          isOpen={!!resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          userId={resetPasswordUser.id}
          userName={resetPasswordUser.full_name}
        />
      )}
    </>
  );
}
