"use client";

import { useEffect, useState, useCallback } from "react";
import { usersApi, User, UserRole } from "@/services/usersApi";
import { formatDate } from "@/utils/format";
import { Edit2, ChevronLeft, ChevronRight, Key } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { ResetPasswordModal } from "@/components/password/ResetPasswordModal";

interface UserTableProps {
  onUserClick?: (userId: string) => void;
  onEditClick?: (user: User) => void;
  roleFilter?: UserRole;
}

export function UserTable({ onUserClick, onEditClick, roleFilter }: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  // Check if current user can reset passwords (admin or platform_owner)
  const canResetPassword = typeof window !== "undefined" &&
    ["admin", "platform_owner"].includes(localStorage.getItem("role") || "");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersApi.list({
        page: currentPage,
        page_size: pageSize,
        role: roleFilter,
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
  }, [currentPage, pageSize, roleFilter]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Listen for user creation events to refresh the list
  useEffect(() => {
    const handleUserCreated = () => {
      fetchUsers();
    };

    window.addEventListener("user:created", handleUserCreated);
    return () => {
      window.removeEventListener("user:created", handleUserCreated);
    };
  }, [fetchUsers]);

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-purple-50 text-purple-700";
      case "doctor":
        return "bg-sky-50 text-sky-700";
      case "nurse":
        return "bg-emerald-50 text-emerald-700";
      case "receptionist":
        return "bg-amber-50 text-amber-700";
      case "optometrist":
        return "bg-indigo-50 text-indigo-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-rose-50 text-rose-700";
  };

  if (loading) {
    return <SkeletonRow rows={5} />;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left uppercase tracking-wide text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Cabin</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No staff found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="cursor-pointer hover:bg-sky-50/50 transition"
                  onClick={() => onUserClick?.(user.id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{user.full_name}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill px-2 py-0.5 text-xs font-normal ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {user.cabin || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill px-2 py-0.5 text-xs font-normal ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {user.last_login_at ? formatDate(user.last_login_at) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canResetPassword && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setResetPasswordUser(user);
                          }}
                          className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-amber-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-amber-600"
                          style={{ width: "2rem" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.width = "auto";
                            e.currentTarget.style.paddingLeft = "0.75rem";
                            e.currentTarget.style.paddingRight = "0.75rem";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.width = "2rem";
                            e.currentTarget.style.paddingLeft = "0.5rem";
                            e.currentTarget.style.paddingRight = "0.5rem";
                          }}
                          title="Reset Password"
                        >
                          <Key className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Reset Password</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClick?.(user);
                        }}
                        className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                        style={{ width: "2rem" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.width = "auto";
                          e.currentTarget.style.paddingLeft = "0.75rem";
                          e.currentTarget.style.paddingRight = "0.75rem";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.width = "2rem";
                          e.currentTarget.style.paddingLeft = "0.5rem";
                          e.currentTarget.style.paddingRight = "0.5rem";
                        }}
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4 shrink-0" />
                        <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Edit</span>
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
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(currentPage * pageSize, total)}
              </span>{" "}
              of <span className="font-semibold text-slate-900">{total}</span> staff
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
                      className={`min-w-[2.5rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${currentPage === pageNum
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

