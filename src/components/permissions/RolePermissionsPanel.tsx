"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchAllRolePermissions,
  updateRolePermissions,
} from "@/redux/permissionsSlice";
import {
  AVAILABLE_SCREENS,
  ALL_ROLES,
  ROLE_LABELS,
  CATEGORY_LABELS,
  getScreensByCategory,
} from "@/constants/screens";
import { toast } from "sonner";
import { Shield, Check, X, Save, RefreshCw } from "lucide-react";
import { UserRole } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";

// Screens that only platform owner can modify permissions for
const PLATFORM_OWNER_ONLY_SCREENS = ["/tenants"];

export function RolePermissionsPanel() {
  const dispatch = useAppDispatch();
  const { allRolePermissions, adminLoading, updating, error } = useAppSelector(
    (state) => state.permissions
  );
  const { isPlatformOwner } = usePermissions();
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [editedPermissions, setEditedPermissions] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Check if a screen can only be modified by platform owner
  const isRestrictedScreen = (screenPath: string) => {
    return PLATFORM_OWNER_ONLY_SCREENS.includes(screenPath);
  };

  // Check if current user can modify a screen's permission
  const canModifyScreen = (screenPath: string) => {
    if (isRestrictedScreen(screenPath)) {
      return isPlatformOwner;
    }
    return true;
  };

  useEffect(() => {
    dispatch(fetchAllRolePermissions());
  }, [dispatch]);

  // Initialize edited permissions when role changes or data loads
  useEffect(() => {
    // Safety check: ensure allRolePermissions is an array
    if (!Array.isArray(allRolePermissions)) return;

    const rolePerms = allRolePermissions.find((rp) => rp.role === selectedRole);
    if (rolePerms && Array.isArray(rolePerms.permissions)) {
      const enabledPaths = rolePerms.permissions
        .filter((p) => p.is_enabled)
        .map((p) => p.screen_path);
      setEditedPermissions(new Set(enabledPaths));
      setHasChanges(false);
    }
  }, [selectedRole, allRolePermissions]);

  const togglePermission = (screenPath: string) => {
    // Don't allow toggling restricted screens for non-platform-owners
    if (!canModifyScreen(screenPath)) return;

    setEditedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(screenPath)) {
        newSet.delete(screenPath);
      } else {
        newSet.add(screenPath);
      }
      return newSet;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await dispatch(
        updateRolePermissions({
          role: selectedRole,
          screenPaths: Array.from(editedPermissions),
        })
      ).unwrap();
      toast.success(`Permissions updated for ${ROLE_LABELS[selectedRole]}`);
      setHasChanges(false);
    } catch {
      toast.error("Failed to update permissions");
    }
  };

  const handleRefresh = () => {
    dispatch(fetchAllRolePermissions());
  };

  const screensByCategory = getScreensByCategory();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-sky-500" />
          <h2 className="text-xl font-semibold text-slate-900">Role Permissions</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={adminLoading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${adminLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={updating}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {updating ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      {/* Role Selector */}
      <div className="flex gap-2 flex-wrap">
        {ALL_ROLES.filter((role) => role !== "platform_owner").map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              selectedRole === role
                ? "bg-sky-500 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        Configure which screens the <strong>{ROLE_LABELS[selectedRole]}</strong> role can access by default.
        Platform Owner always has access to all screens.
      </p>

      {/* Permissions Grid */}
      {adminLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(screensByCategory).map(([category, screens]) => (
            <div key={category} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-4 font-semibold text-slate-700">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {screens
                  .filter((screen) => canModifyScreen(screen.path))
                  .map((screen) => {
                    const isEnabled = editedPermissions.has(screen.path);

                    return (
                      <button
                        key={screen.path}
                        onClick={() => togglePermission(screen.path)}
                        className={`flex items-center justify-between rounded-xl border p-3 transition ${
                          isEnabled
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-700">
                          {screen.label}
                        </span>
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full ${
                            isEnabled ? "bg-emerald-500 text-white" : "bg-slate-300 text-white"
                          }`}
                        >
                          {isEnabled ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
