"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchAllRolePermissions,
  updateRolePermissions,
} from "@/redux/permissionsSlice";
import {
  ALL_ROLES,
  ROLE_LABELS,
  CATEGORY_LABELS,
} from "@/constants/screens";
import { screensApi, ScreenResponse } from "@/services/screensApi";
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
  const [defaultScreen, setDefaultScreen] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Screens state
  const [screens, setScreens] = useState<ScreenResponse[]>([]);
  const [screensLoading, setScreensLoading] = useState(true);
  const [screensError, setScreensError] = useState<string | null>(null);

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

  // Fetch screens from API
  useEffect(() => {
    const loadScreens = async () => {
      try {
        setScreensLoading(true);
        const data = await screensApi.list();
        // Sort by display_order
        const sortedData = data.sort((a, b) => a.display_order - b.display_order);
        setScreens(sortedData);
        setScreensError(null);
      } catch (error) {
        setScreensError("Failed to load screens");
        console.error("Error loading screens:", error);
      } finally {
        setScreensLoading(false);
      }
    };
    loadScreens();
  }, []);

  useEffect(() => {
    dispatch(fetchAllRolePermissions());
  }, [dispatch]);

  // Initialize edited permissions and default screen when role changes or data loads
  useEffect(() => {
    // Safety check: ensure allRolePermissions is an array
    if (!Array.isArray(allRolePermissions)) return;

    const rolePerms = allRolePermissions.find((rp) => rp.role === selectedRole);
    if (rolePerms && Array.isArray(rolePerms.permissions)) {
      const enabledPaths = rolePerms.permissions
        .filter((p) => p.is_enabled)
        .map((p) => p.screen_path);
      setEditedPermissions(new Set(enabledPaths));

      // Find default screen
      const defaultPerm = rolePerms.permissions.find((p) => p.is_default);
      setDefaultScreen(defaultPerm ? defaultPerm.screen_path : null);

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
        // If we're removing the default screen, unset it
        if (defaultScreen === screenPath) {
          setDefaultScreen(null);
        }
      } else {
        newSet.add(screenPath);
      }
      return newSet;
    });
    setHasChanges(true);
  };

  const handleSetDefault = (e: React.MouseEvent, screenPath: string) => {
    e.stopPropagation(); // Prevent toggling permission when clicking default icon

    // Can only set default if screen is enabled
    if (!editedPermissions.has(screenPath)) return;

    if (defaultScreen === screenPath) {
      // Unset if already default
      setDefaultScreen(null);
    } else {
      setDefaultScreen(screenPath);
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await dispatch(
        updateRolePermissions({
          role: selectedRole,
          screenPaths: Array.from(editedPermissions),
          defaultScreenPath: defaultScreen || undefined,
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

  // Group screens by category dynamically
  const screensByCategory = useMemo(() => {
    return screens.reduce((acc, screen) => {
      const category = screen.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(screen);
      return acc;
    }, {} as Record<string, ScreenResponse[]>);
  }, [screens]);

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
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${selectedRole === role
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
        Click the star icon to set a screen as the <strong>Default Screen</strong> (landing page) for this role.
      </p>

      {/* Error message for screens */}
      {screensError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 mb-4">
          {screensError}
        </div>
      )}

      {/* Permissions Grid */}
      {(adminLoading || screensLoading) ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : screens.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No screens available
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
                    const isDefault = defaultScreen === screen.path;

                    return (
                      <button
                        key={screen.path}
                        onClick={() => togglePermission(screen.path)}
                        className={`group relative flex items-center justify-between rounded-xl border p-3 transition ${isEnabled
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                          }`}
                      >
                        <span className="text-sm font-medium text-slate-700">
                          {screen.label}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Default Screen Toggle */}
                          {isEnabled && (
                            <div
                              role="button"
                              onClick={(e) => handleSetDefault(e, screen.path)}
                              title={isDefault ? "Default Screen" : "Set as Default Screen"}
                              className={`p-1 rounded-full transition-colors ${isDefault
                                ? "text-amber-500 bg-amber-100"
                                : "text-slate-300 hover:text-amber-400 hover:bg-amber-50"
                                }`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill={isDefault ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-star"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            </div>
                          )}

                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full ${isEnabled ? "bg-emerald-500 text-white" : "bg-slate-300 text-white"
                              }`}
                          >
                            {isEnabled ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </span>
                        </div>
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
