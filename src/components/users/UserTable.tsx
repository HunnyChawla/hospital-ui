"use client";

import { useEffect, useState, useCallback } from "react";
import { usersApi, User, UserRole } from "@/services/usersApi";
import { formatDate } from "@/utils/format";
import { Edit2 } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";

interface UserTableProps {
  onUserClick?: (userId: string) => void;
  onEditClick?: (user: User) => void;
  roleFilter?: UserRole;
}

export function UserTable({ onUserClick, onEditClick, roleFilter }: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersApi.list({
        page: 1,
        page_size: 100,
        role: roleFilter,
      });
      setUsers(response.items);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
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
    <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left uppercase tracking-wide text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Last Login</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {users.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                No users found
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick?.(user);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

