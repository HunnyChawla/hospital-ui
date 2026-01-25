"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchUserPermissions,
  updateUserPermissions,
  clearSelectedUserPermissions,
  fetchUsersWithPermissions,
} from "@/redux/permissionsSlice";
import { Modal } from "@/components/common/Modal";
import {
  AVAILABLE_SCREENS,
  ROLE_LABELS,
  CATEGORY_LABELS,
  getScreensByCategory,
} from "@/constants/screens";
import { toast } from "sonner";
import { Check, X, Save, Lock } from "lucide-react";
import { UserRole } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";

// Screens that only platform owner can modify permissions for
const PLATFORM_OWNER_ONLY_SCREENS = ["/tenants"];

interface UserPermissionModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserPermissionModal({ userId, isOpen, onClose }: UserPermissionModalProps) {
  const dispatch = useAppDispatch();
  const { selectedUserPermissions, userDetailLoading, updating, error } = useAppSelector(
    (state) => state.permissions
  );
  const { isPlatformOwner } = usePermissions();
  const [additionalScreens, setAdditionalScreens] = useState<Set<string>>(new Set());
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
    if (isOpen && userId) {
      dispatch(fetchUserPermissions({ userId }));
    }
    return () => {
      dispatch(clearSelectedUserPermissions());
    };
  }, [dispatch, userId, isOpen]);

  // Initialize additional screens when user permissions load
  useEffect(() => {
    if (selectedUserPermissions) {
      setAdditionalScreens(new Set(selectedUserPermissions.additional_screens));
      setHasChanges(false);
    }
  }, [selectedUserPermissions]);

  const toggleAdditionalScreen = (screenPath: string) => {
    // Can't toggle role-based screens
    if (selectedUserPermissions?.role_screens.includes(screenPath)) return;
    // Can't toggle restricted screens for non-platform-owners
    if (!canModifyScreen(screenPath)) return;

    setAdditionalScreens((prev) => {
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
        updateUserPermissions({
          userId,
          additionalScreens: Array.from(additionalScreens),
        })
      ).unwrap();
      toast.success("User permissions updated successfully");
      setHasChanges(false);
      // Refresh the users list to update the count
      dispatch(fetchUsersWithPermissions());
    } catch {
      toast.error("Failed to update user permissions");
    }
  };

  const handleClose = () => {
    onClose();
  };

  const screensByCategory = getScreensByCategory();

  const isScreenFromRole = (screenPath: string) => {
    return selectedUserPermissions?.role_screens.includes(screenPath) || false;
  };

  const isScreenEnabled = (screenPath: string) => {
    return isScreenFromRole(screenPath) || additionalScreens.has(screenPath);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Manage User Permissions" size="lg">
      {userDetailLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : selectedUserPermissions ? (
        <div className="space-y-6">
          {/* User Info */}
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {selectedUserPermissions.user_name}
                </h3>
                <p className="text-sm text-slate-500">
                  Role:{" "}
                  <span className="font-medium text-slate-700">
                    {ROLE_LABELS[selectedUserPermissions.role as UserRole] ||
                      selectedUserPermissions.role}
                  </span>
                </p>
              </div>
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

          <p className="text-sm text-slate-500">
            Screens with a <Lock className="inline h-3 w-3" /> icon are part of the user&apos;s role
            and cannot be removed. Toggle additional screens to grant extra access.
          </p>

          {/* Permissions Grid */}
          <div className="space-y-4">
            {Object.entries(screensByCategory).map(([category, screens]) => (
              <div key={category} className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {screens.map((screen) => {
                    const fromRole = isScreenFromRole(screen.path);
                    const enabled = isScreenEnabled(screen.path);
                    const isRestricted = isRestrictedScreen(screen.path);
                    const canModify = canModifyScreen(screen.path);
                    const isDisabled = fromRole || !canModify;

                    return (
                      <button
                        key={screen.path}
                        onClick={() => toggleAdditionalScreen(screen.path)}
                        disabled={isDisabled}
                        title={!canModify ? "Only Platform Owner can modify this permission" : undefined}
                        className={`flex items-center justify-between rounded-lg border p-2.5 text-left transition ${
                          enabled
                            ? fromRole
                              ? "border-sky-200 bg-sky-50 cursor-default"
                              : "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        } ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          {fromRole && <Lock className="h-3 w-3 text-sky-500" />}
                          {isRestricted && !isPlatformOwner && !fromRole && (
                            <Lock className="h-3 w-3 text-slate-400" />
                          )}
                          <span className="text-sm font-medium text-slate-700">
                            {screen.label}
                          </span>
                        </div>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full ${
                            enabled
                              ? fromRole
                                ? "bg-sky-500 text-white"
                                : "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          {enabled ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500">
                <Check className="h-2.5 w-2.5 text-white" />
              </span>
              <span>From Role</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-2.5 w-2.5 text-white" />
              </span>
              <span>Additional</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200">
                <X className="h-2.5 w-2.5 text-slate-400" />
              </span>
              <span>No Access</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500">Failed to load user permissions.</div>
      )}
    </Modal>
  );
}
