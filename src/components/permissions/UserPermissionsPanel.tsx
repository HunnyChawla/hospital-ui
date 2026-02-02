"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchUsersWithPermissions } from "@/redux/permissionsSlice";
import { Users, RefreshCw, Shield, Search } from "lucide-react";
import { UserPermissionModal } from "./UserPermissionModal";
import { ROLE_LABELS } from "@/constants/screens";
import { UserRole } from "@/types";
import { usersApi, User } from "@/services/usersApi";

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function UserPermissionsPanel() {
  const dispatch = useAppDispatch();
  const { usersWithPermissions, error: permissionsError } = useAppSelector(
    (state) => state.permissions
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query to avoid too many API calls
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Create a map of user permissions for quick lookup
  const permissionsMap = useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(usersWithPermissions)) {
      usersWithPermissions.forEach((u) => {
        map.set(u.user_id, u.additional_screens_count);
      });
    }
    return map;
  }, [usersWithPermissions]);

  // Fetch users from /users API
  const fetchUsers = async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersApi.list({
        search: search || undefined,
        page_size: 100, // Get more users
      });
      setUsers(response.items);
    } catch (err) {
      setError("Failed to fetch users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users when component mounts or search query changes
  useEffect(() => {
    fetchUsers(debouncedSearch);
  }, [debouncedSearch]);

  // Fetch permissions data on mount to get additional_screens_count
  useEffect(() => {
    dispatch(fetchUsersWithPermissions({}));
  }, [dispatch]);

  const handleRefresh = () => {
    fetchUsers(debouncedSearch);
    dispatch(fetchUsersWithPermissions({}));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-sky-500" />
          <h2 className="text-xl font-semibold text-slate-900">User Permissions</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Grant additional screen access to individual users beyond their role defaults.
        Click on a user to manage their extra permissions.
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search users by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {users.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {searchQuery ? "No users found matching your search." : "No users found."}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Role
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                    Extra Screens
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const additionalScreensCount = permissionsMap.get(user.id) || 0;
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{user.full_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {ROLE_LABELS[user.role as UserRole] || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {additionalScreensCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <Shield className="h-3 w-3" />
                            {additionalScreensCount}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedUserId(user.id)}
                          className="rounded-lg bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-600 transition hover:bg-sky-100"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {(error || permissionsError) && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {error || permissionsError}
        </div>
      )}

      {/* User Permission Modal */}
      {selectedUserId && (
        <UserPermissionModal
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
