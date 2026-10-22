"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Globe,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  apiPermissionsApi,
  ApiPermissionFilters,
} from "@/services/apiPermissionsApi";
import { ApiPermissionItem } from "@/types";

interface RoleDef {
  key: string;
  label: string;
  shortLabel: string;
}

const MANAGED_ROLES: RoleDef[] = [
  { key: "admin", label: "Admin", shortLabel: "Admin" },
  { key: "doctor", label: "Doctor", shortLabel: "Doc" },
  { key: "nurse", label: "Nurse", shortLabel: "Nurse" },
  { key: "receptionist", label: "Receptionist", shortLabel: "Recept" },
  { key: "optometrist", label: "Optometrist", shortLabel: "Optom" },
  { key: "examiner", label: "Examiner", shortLabel: "Exam" },
  { key: "lab_technician", label: "Lab Technician", shortLabel: "Lab" },
  { key: "counsellor", label: "Counsellor", shortLabel: "Couns" },
];

const METHOD_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  POST: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  PUT: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  DELETE: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  PATCH: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
};

export function ApiPermissionsManager() {
  const [endpoints, setEndpoints] = useState<ApiPermissionItem[]>([]);
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Local state for modified permissions: id -> { allowed_roles, is_public }
  const [dirtyMap, setDirtyMap] = useState<
    Record<string, { allowed_roles: string[]; is_public: boolean }>
  >({});

  // Filters
  const [search, setSearch] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string>("ALL");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");

  // Fetch list from backend
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const filters: ApiPermissionFilters = {};
      if (selectedMethod !== "ALL") filters.http_method = selectedMethod;
      if (selectedModule !== "ALL") filters.module_tag = selectedModule;
      if (selectedRoleFilter !== "ALL") filters.role = selectedRoleFilter;
      if (search.trim()) filters.search = search.trim();

      const res = await apiPermissionsApi.list(filters);
      setEndpoints(res.endpoints);
      setAvailableModules(res.available_modules);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load permissions";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, selectedMethod, selectedModule, selectedRoleFilter]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Sync from codebase routes
  const handleSyncRoutes = async () => {
    try {
      setSyncing(true);
      const res = await apiPermissionsApi.syncRoutes();
      toast.success(
        `Routes synchronized: ${res.new_endpoints_added} new added, ${res.updated_endpoints} refreshed (Total: ${res.total_discovered})`
      );
      await loadPermissions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Route synchronization failed";
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  // Helper to get effective roles for an endpoint (taking dirty edits into account)
  const getEffectiveRoles = (item: ApiPermissionItem): string[] => {
    if (dirtyMap[item.id] !== undefined) {
      return dirtyMap[item.id].allowed_roles;
    }
    return item.allowed_roles;
  };

  const getEffectiveIsPublic = (item: ApiPermissionItem): boolean => {
    if (dirtyMap[item.id] !== undefined) {
      return dirtyMap[item.id].is_public;
    }
    return item.is_public;
  };

  // Toggle role on/off for an endpoint
  const handleToggleRole = (item: ApiPermissionItem, roleKey: string) => {
    const currentRoles = getEffectiveRoles(item);
    const isPublic = getEffectiveIsPublic(item);

    let nextRoles: string[];
    if (currentRoles.includes(roleKey)) {
      nextRoles = currentRoles.filter((r) => r !== roleKey);
    } else {
      nextRoles = [...currentRoles, roleKey];
    }

    setDirtyMap((prev) => ({
      ...prev,
      [item.id]: {
        allowed_roles: nextRoles,
        is_public: isPublic,
      },
    }));
  };

  // Toggle public status
  const handleTogglePublic = (item: ApiPermissionItem) => {
    const currentRoles = getEffectiveRoles(item);
    const currentPublic = getEffectiveIsPublic(item);

    setDirtyMap((prev) => ({
      ...prev,
      [item.id]: {
        allowed_roles: currentRoles,
        is_public: !currentPublic,
      },
    }));
  };

  // Quick preset actions per row
  const handleSetAllRoles = (item: ApiPermissionItem) => {
    const allRoleKeys = MANAGED_ROLES.map((r) => r.key);
    setDirtyMap((prev) => ({
      ...prev,
      [item.id]: {
        allowed_roles: allRoleKeys,
        is_public: getEffectiveIsPublic(item),
      },
    }));
  };

  const handleSetAdminOnly = (item: ApiPermissionItem) => {
    setDirtyMap((prev) => ({
      ...prev,
      [item.id]: {
        allowed_roles: ["admin"],
        is_public: getEffectiveIsPublic(item),
      },
    }));
  };

  const handleClearAllRoles = (item: ApiPermissionItem) => {
    setDirtyMap((prev) => ({
      ...prev,
      [item.id]: {
        allowed_roles: [],
        is_public: getEffectiveIsPublic(item),
      },
    }));
  };

  // Multi-row selection state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const masterCheckboxRef = useRef<HTMLInputElement | null>(null);

  // Clear row selections when filters change
  useEffect(() => {
    setSelectedRowIds(new Set());
  }, [search, selectedMethod, selectedModule, selectedRoleFilter]);

  // Non-public endpoints in the current filtered view
  const nonPublicFiltered = useMemo(
    () => endpoints.filter((e) => !getEffectiveIsPublic(e)),
    [endpoints, dirtyMap]
  );

  // Row selection helpers
  const isAllRowsSelected = endpoints.length > 0 && endpoints.every((e) => selectedRowIds.has(e.id));
  const isSomeRowsSelected = endpoints.some((e) => selectedRowIds.has(e.id)) && !isAllRowsSelected;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isSomeRowsSelected;
    }
  }, [isSomeRowsSelected]);

  const handleToggleSelectAllRows = () => {
    if (isAllRowsSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(endpoints.map((e) => e.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedRowIds(new Set());
  };

  // Status computation for role column-header checkboxes
  const getRoleHeaderStatus = (roleKey: string) => {
    if (nonPublicFiltered.length === 0) {
      return { checked: false, indeterminate: false, count: 0, total: 0 };
    }
    const count = nonPublicFiltered.filter((item) =>
      getEffectiveRoles(item).includes(roleKey)
    ).length;
    const allChecked = count === nonPublicFiltered.length;
    const indeterminate = count > 0 && !allChecked;
    return {
      checked: allChecked,
      indeterminate,
      count,
      total: nonPublicFiltered.length,
    };
  };

  // Toggle role across ALL filtered endpoints
  const handleToggleRoleForFiltered = (roleKey: string, isCurrentlyAllChecked: boolean) => {
    if (nonPublicFiltered.length === 0) return;
    const roleDef = MANAGED_ROLES.find((r) => r.key === roleKey);
    const roleLabel = roleDef ? roleDef.label : roleKey;
    const shouldAdd = !isCurrentlyAllChecked;

    setDirtyMap((prev) => {
      const next = { ...prev };
      for (const item of nonPublicFiltered) {
        const currentRoles = getEffectiveRoles(item);
        const updatedRoles = shouldAdd
          ? currentRoles.includes(roleKey)
            ? currentRoles
            : [...currentRoles, roleKey]
          : currentRoles.filter((r) => r !== roleKey);

        next[item.id] = {
          allowed_roles: updatedRoles,
          is_public: getEffectiveIsPublic(item),
        };
      }
      return next;
    });

    toast.success(
      shouldAdd
        ? `Granted ${roleLabel} to all ${nonPublicFiltered.length} filtered APIs.`
        : `Removed ${roleLabel} from all ${nonPublicFiltered.length} filtered APIs.`
    );
  };

  // Status for Public column header checkbox
  const publicCount = endpoints.filter((e) => getEffectiveIsPublic(e)).length;
  const isPublicAllChecked = endpoints.length > 0 && publicCount === endpoints.length;
  const isPublicIndeterminate = publicCount > 0 && !isPublicAllChecked;

  const handleTogglePublicForFiltered = () => {
    if (endpoints.length === 0) return;
    const shouldMakePublic = !isPublicAllChecked;

    setDirtyMap((prev) => {
      const next = { ...prev };
      for (const item of endpoints) {
        next[item.id] = {
          allowed_roles: getEffectiveRoles(item),
          is_public: shouldMakePublic,
        };
      }
      return next;
    });

    toast.success(
      shouldMakePublic
        ? `Marked all ${endpoints.length} filtered APIs as Public.`
        : `Marked all ${endpoints.length} filtered APIs as Protected.`
    );
  };

  // Bulk actions on selected rows
  const getSelectedItems = (): ApiPermissionItem[] => {
    return endpoints.filter((e) => selectedRowIds.has(e.id));
  };

  const handleBulkSetAllRoles = () => {
    const selected = getSelectedItems();
    if (selected.length === 0) return;
    const allRoleKeys = MANAGED_ROLES.map((r) => r.key);

    setDirtyMap((prev) => {
      const next = { ...prev };
      for (const item of selected) {
        next[item.id] = {
          allowed_roles: allRoleKeys,
          is_public: getEffectiveIsPublic(item),
        };
      }
      return next;
    });

    toast.success(`Granted all roles to ${selected.length} selected APIs.`);
  };

  const handleBulkSetAdminOnly = () => {
    const selected = getSelectedItems();
    if (selected.length === 0) return;

    setDirtyMap((prev) => {
      const next = { ...prev };
      for (const item of selected) {
        next[item.id] = {
          allowed_roles: ["admin"],
          is_public: getEffectiveIsPublic(item),
        };
      }
      return next;
    });

    toast.success(`Set Admin-only access for ${selected.length} selected APIs.`);
  };

  const handleBulkClearRoles = () => {
    const selected = getSelectedItems();
    if (selected.length === 0) return;

    setDirtyMap((prev) => {
      const next = { ...prev };
      for (const item of selected) {
        next[item.id] = {
          allowed_roles: [],
          is_public: getEffectiveIsPublic(item),
        };
      }
      return next;
    });

    toast.success(`Cleared all roles from ${selected.length} selected APIs.`);
  };

  const handleBulkGrantRole = (roleKey: string) => {
    const selected = getSelectedItems();
    if (selected.length === 0) return;
    const roleDef = MANAGED_ROLES.find((r) => r.key === roleKey);
    const roleLabel = roleDef ? roleDef.label : roleKey;

    setDirtyMap((prev) => {
      const next = { ...prev };
      for (const item of selected) {
        const currentRoles = getEffectiveRoles(item);
        if (!currentRoles.includes(roleKey)) {
          next[item.id] = {
            allowed_roles: [...currentRoles, roleKey],
            is_public: getEffectiveIsPublic(item),
          };
        }
      }
      return next;
    });

    toast.success(`Granted ${roleLabel} to ${selected.length} selected APIs.`);
  };

  const handleBulkRevokeRole = (roleKey: string) => {
    const selected = getSelectedItems();
    if (selected.length === 0) return;
    const roleDef = MANAGED_ROLES.find((r) => r.key === roleKey);
    const roleLabel = roleDef ? roleDef.label : roleKey;

    setDirtyMap((prev) => {
      const next = { ...prev };
      for (const item of selected) {
        const currentRoles = getEffectiveRoles(item);
        if (currentRoles.includes(roleKey)) {
          next[item.id] = {
            allowed_roles: currentRoles.filter((r) => r !== roleKey),
            is_public: getEffectiveIsPublic(item),
          };
        }
      }
      return next;
    });

    toast.success(`Revoked ${roleLabel} from ${selected.length} selected APIs.`);
  };

  const handleBulkTogglePublic = () => {
    const selected = getSelectedItems();
    if (selected.length === 0) return;
    const anyNotPublic = selected.some((item) => !getEffectiveIsPublic(item));

    setDirtyMap((prev) => {
      const next = { ...prev };
      for (const item of selected) {
        next[item.id] = {
          allowed_roles: getEffectiveRoles(item),
          is_public: anyNotPublic,
        };
      }
      return next;
    });

    toast.success(
      anyNotPublic
        ? `Marked ${selected.length} selected APIs as Public.`
        : `Marked ${selected.length} selected APIs as Protected.`
    );
  };

  // Save all dirty changes
  const handleSaveAll = async () => {
    const entries = Object.entries(dirtyMap);
    if (entries.length === 0) return;

    try {
      setSaving(true);
      const updates = entries.map(([id, val]) => ({
        id,
        allowed_roles: val.allowed_roles,
        is_public: val.is_public,
      }));

      const res = await apiPermissionsApi.bulkUpdate(updates);
      toast.success(`Successfully saved permissions for ${res.updated} API endpoints.`);
      setDirtyMap({});
      await loadPermissions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save permissions";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Discard all unsaved changes
  const handleDiscardAll = () => {
    setDirtyMap({});
    toast.info("Unsaved changes discarded.");
  };

  const dirtyCount = Object.keys(dirtyMap).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Platform API Access Control (RBAC)
                </h1>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Platform Owner Only
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Define role-based authorization for all platform APIs across all tenants.
                Unconfigured APIs strictly permit only the Platform Owner.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncRoutes}
              disabled={syncing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              title="Inspect FastAPI codebase routes and sync into database"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin text-sky-600" : ""}`} />
              <span>{syncing ? "Syncing..." : "Sync from Codebase"}</span>
            </button>

            {dirtyCount > 0 && (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes ({dirtyCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total APIs Configured</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">{endpoints.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Modules Registered</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">{availableModules.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Standard Roles</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">{MANAGED_ROLES.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Unsaved Edits</p>
            <p className={`mt-0.5 text-lg font-bold ${dirtyCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {dirtyCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search API path (e.g. /patients, /billing) or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Method Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400">Method:</span>
          {["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"].map((method) => {
            const isSelected = selectedMethod === method;
            return (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {method}
              </button>
            );
          })}
        </div>

        {/* Module Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">Module:</span>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Modules ({availableModules.length})</option>
            {availableModules.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>
        </div>

        {/* Role Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">Access:</span>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none"
          >
            <option value="ALL">Any Role</option>
            {MANAGED_ROLES.map((r) => (
              <option key={r.key} value={r.key}>
                Accessible by {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar when rows are selected */}
      {selectedRowIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/95 p-3.5 text-xs text-sky-900 shadow-sm animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-bold text-white">
              {selectedRowIds.size}
            </div>
            <span className="font-semibold text-sky-950">
              API{selectedRowIds.size === 1 ? "" : "s"} selected of {endpoints.length} filtered
            </span>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleClearSelection}
              className="text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
            >
              Clear selection
            </button>
            {!isAllRowsSelected && (
              <button
                onClick={handleToggleSelectAllRows}
                className="text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
              >
                Select all {endpoints.length}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
              Batch Actions:
            </span>

            {/* Presets */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleBulkSetAllRoles}
                className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500"
                title="Assign all 8 roles to selected APIs"
              >
                All Roles
              </button>
              <button
                onClick={handleBulkSetAdminOnly}
                className="rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-sky-800 shadow-sm transition hover:bg-sky-50"
                title="Assign only Admin to selected APIs"
              >
                Admin Only
              </button>
              <button
                onClick={handleBulkClearRoles}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                title="Remove all roles from selected APIs"
              >
                Clear Roles
              </button>
            </div>

            {/* Role Grant & Revoke Dropdowns */}
            <div className="flex items-center gap-1.5 border-l border-sky-200 pl-2">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleBulkGrantRole(e.target.value);
                }}
                className="rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-xs font-medium text-sky-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="" disabled>
                  + Grant Role...
                </option>
                {MANAGED_ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    + {r.label}
                  </option>
                ))}
              </select>

              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleBulkRevokeRole(e.target.value);
                }}
                className="rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
              >
                <option value="" disabled>
                  - Revoke Role...
                </option>
                {MANAGED_ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    - {r.label}
                  </option>
                ))}
              </select>

              <button
                onClick={handleBulkTogglePublic}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                title="Toggle public access for selected APIs"
              >
                Toggle Public
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Matrix Data Grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-sky-500" />
            <p className="text-xs text-slate-500">Loading API permissions catalog...</p>
          </div>
        ) : endpoints.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <Shield className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No API endpoints match criteria</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or click &quot;Sync from Codebase&quot;.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  {/* Master row selection checkbox */}
                  <th className="sticky left-0 z-20 bg-slate-50 px-3 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      ref={masterCheckboxRef}
                      checked={isAllRowsSelected}
                      disabled={loading || endpoints.length === 0}
                      onChange={handleToggleSelectAllRows}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:opacity-40"
                      title={isAllRowsSelected ? "Deselect all visible APIs" : "Select all visible APIs"}
                    />
                  </th>
                  <th className="px-3 py-3 w-24">Method</th>
                  <th className="px-3 py-3 min-w-[280px]">Endpoint Route &amp; Purpose</th>
                  <th className="px-2 py-2 text-center w-16" title="Public endpoints require no authentication">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] lowercase text-slate-500 font-normal">all</span>
                      </div>
                      <input
                        type="checkbox"
                        ref={(el) => {
                          if (el) el.indeterminate = isPublicIndeterminate;
                        }}
                        checked={isPublicAllChecked}
                        disabled={loading || endpoints.length === 0}
                        onChange={handleTogglePublicForFiltered}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:opacity-40"
                        title={isPublicAllChecked ? "Unmark all filtered as public" : "Mark all filtered as public"}
                      />
                    </div>
                  </th>
                  {MANAGED_ROLES.map((role) => {
                    const status = getRoleHeaderStatus(role.key);
                    return (
                      <th key={role.key} className="px-2 py-2 text-center min-w-[72px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-700">{role.shortLabel}</span>
                          <input
                            type="checkbox"
                            ref={(el) => {
                              if (el) el.indeterminate = status.indeterminate;
                            }}
                            checked={status.checked}
                            disabled={loading || status.total === 0}
                            onChange={() => handleToggleRoleForFiltered(role.key, status.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:opacity-40"
                            title={`Toggle ${role.label} for all ${status.total} filtered APIs`}
                          />
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-2 py-3 text-center min-w-[90px] text-amber-700" title="Platform Owner has permanent full access across all endpoints">
                    Owner
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {endpoints.map((item) => {
                  const effectiveRoles = getEffectiveRoles(item);
                  const isPublic = getEffectiveIsPublic(item);
                  const isDirty = dirtyMap[item.id] !== undefined;
                  const isRowSelected = selectedRowIds.has(item.id);
                  const methodStyle = METHOD_STYLES[item.http_method] || {
                    bg: "bg-slate-50",
                    text: "text-slate-700",
                    border: "border-slate-200",
                  };

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-slate-50/70 ${
                        isRowSelected
                          ? "bg-sky-50/70"
                          : isDirty
                          ? "bg-amber-50/40"
                          : ""
                      }`}
                    >
                      {/* Row selection checkbox */}
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => handleToggleSelectRow(item.id)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                      </td>

                      {/* Method Badge */}
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${methodStyle.bg} ${methodStyle.text} ${methodStyle.border}`}
                        >
                          {item.http_method}
                        </span>
                      </td>

                      {/* Route Path & Summary */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-900">
                              {item.path_pattern}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              {item.module_tag}
                            </span>
                            {isDirty && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                                Modified
                              </span>
                            )}
                          </div>
                          {item.summary && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">{item.summary}</p>
                          )}
                          {/* Row quick actions */}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                            <span>Presets:</span>
                            <button
                              onClick={() => handleSetAllRoles(item)}
                              className="text-sky-600 hover:underline"
                            >
                              All Roles
                            </button>
                            <span>•</span>
                            <button
                              onClick={() => handleSetAdminOnly(item)}
                              className="text-sky-600 hover:underline"
                            >
                              Admin Only
                            </button>
                            <span>•</span>
                            <button
                              onClick={() => handleClearAllRoles(item)}
                              className="text-rose-600 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Public Toggle */}
                      <td className="px-2 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isPublic}
                          onChange={() => handleTogglePublic(item)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          title={isPublic ? "Public API (No authentication required)" : "Protected API"}
                        />
                      </td>

                      {/* Role Checkboxes */}
                      {MANAGED_ROLES.map((role) => {
                        const isChecked = effectiveRoles.includes(role.key);
                        return (
                          <td key={role.key} className="px-2 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isPublic}
                              onChange={() => handleToggleRole(item, role.key)}
                              className={`h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 ${
                                isPublic ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                              }`}
                            />
                          </td>
                        );
                      })}

                      {/* Platform Owner (Permanent Superuser) */}
                      <td className="px-2 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-600" title="Platform Owner has permanent full access across all tenants">
                          <ShieldCheck className="h-4 w-4" />
                          <span className="text-[10px] font-semibold">Always</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Action Bar for Unsaved Changes */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/95 px-5 py-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-900">
              You have {dirtyCount} unsaved API permission change{dirtyCount > 1 ? "s" : ""}.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscardAll}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Discard
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>{saving ? "Saving..." : "Save All"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
