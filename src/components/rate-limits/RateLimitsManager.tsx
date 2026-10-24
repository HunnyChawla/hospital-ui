"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Gauge,
  KeyRound,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  Sliders,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  rateLimitsApi,
  TenantRateLimitItem,
  TenantRateLimitUpdateRequest,
} from "@/services/rateLimitsApi";

export const rateLimitKeys = {
  all: ["rate-limits"] as const,
  list: () => [...rateLimitKeys.all, "list"] as const,
};

type FilterType = "all" | "custom" | "default";

export function RateLimitsManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [editingTenant, setEditingTenant] = useState<TenantRateLimitItem | null>(null);

  // Form State for modal
  const [tenantLimitInput, setTenantLimitInput] = useState<string>("");
  const [userLimitInput, setUserLimitInput] = useState<string>("");
  const [reasonInput, setReasonInput] = useState<string>("");

  // Query: Fetch all tenants rate limits + system defaults
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: rateLimitKeys.list(),
    queryFn: () => rateLimitsApi.list(),
    staleTime: 30000,
  });

  // Extract baseline limits safely
  const defaultTenantLimit = data?.defaults?.tenant_limit ?? data?.default_tenant_limit ?? 1200;
  const defaultUserLimit = data?.defaults?.user_limit ?? data?.default_user_limit ?? 240;
  const defaultOtpLimit = data?.defaults?.staff_otp_limit ?? data?.default_staff_otp_limit ?? 15;
  const defaultLoginLimit = data?.defaults?.login_limit ?? data?.default_login_limit ?? 5;

  // Extract tenant items array safely (supporting both items and tenants)
  const allTenants: TenantRateLimitItem[] = useMemo(() => {
    return data?.items || data?.tenants || [];
  }, [data]);

  // Mutation: Update tenant rate limits
  const updateMutation = useMutation({
    mutationFn: async ({
      tenantId,
      payload,
    }: {
      tenantId: string;
      payload: TenantRateLimitUpdateRequest;
    }) => {
      return await rateLimitsApi.update(tenantId, payload);
    },
    onSuccess: (updated) => {
      toast.success(`Rate limits updated for "${updated.subdomain || "hospital"}"`);
      queryClient.invalidateQueries({ queryKey: rateLimitKeys.list() });
      closeModal();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail?.[0]?.msg || err.message || "Failed to update rate limit";
      toast.error(msg);
    },
  });

  // Mutation: Reset tenant rate limits to defaults
  const resetMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await rateLimitsApi.reset(tenantId);
    },
    onSuccess: (_, tenantId) => {
      toast.success("Reset custom limits to system defaults");
      queryClient.invalidateQueries({ queryKey: rateLimitKeys.list() });
      if (editingTenant?.tenant_id === tenantId) {
        closeModal();
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail?.[0]?.msg || err.message || "Failed to reset rate limit";
      toast.error(msg);
    },
  });

  const openEditModal = (item: TenantRateLimitItem) => {
    setEditingTenant(item);
    const effTenant =
      item.custom_tenant_limit ??
      item.tenant_limit ??
      item.effective_tenant_limit ??
      defaultTenantLimit;
    const effUser =
      item.custom_user_limit ??
      item.user_limit ??
      item.effective_user_limit ??
      defaultUserLimit;

    setTenantLimitInput(String(effTenant));
    setUserLimitInput(String(effUser));
    setReasonInput(item.reason || "");
  };

  const closeModal = () => {
    setEditingTenant(null);
    setTenantLimitInput("");
    setUserLimitInput("");
    setReasonInput("");
  };

  const handleSaveOverrides = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    const tenantNum = tenantLimitInput.trim() ? parseInt(tenantLimitInput, 10) : undefined;
    const userNum = userLimitInput.trim() ? parseInt(userLimitInput, 10) : undefined;

    if (tenantNum !== undefined && (isNaN(tenantNum) || tenantNum < 1)) {
      toast.error("Hospital rate limit must be at least 1 request/min");
      return;
    }
    if (userNum !== undefined && (isNaN(userNum) || userNum < 1)) {
      toast.error("User rate limit must be at least 1 request/min");
      return;
    }

    updateMutation.mutate({
      tenantId: editingTenant.tenant_id,
      payload: {
        tenant_limit: tenantNum,
        user_limit: userNum,
        tenant_limit_per_minute: tenantNum,
        user_limit_per_minute: userNum,
        reason: reasonInput.trim() || undefined,
      },
    });
  };

  // Filtered list
  const filteredItems = useMemo(() => {
    return allTenants.filter((item) => {
      const name = item.tenant_name || item.subdomain || "";
      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        item.subdomain.toLowerCase().includes(search.toLowerCase()) ||
        (item.reason && item.reason.toLowerCase().includes(search.toLowerCase())) ||
        (item.plan && item.plan.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === "custom") return item.is_custom;
      if (filterType === "default") return !item.is_custom;
      return true;
    });
  }, [allTenants, search, filterType]);

  const customCount = useMemo(() => {
    return allTenants.filter((i) => i.is_custom).length;
  }, [allTenants]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-500/20 p-2 ring-1 ring-indigo-400/30">
              <Gauge className="h-6 w-6 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              Platform Rate Limiting
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              In-Memory Sliding Window
            </span>
          </div>
          <p className="text-sm text-slate-300">
            Dynamically regulate API throughput per hospital tenant and clinical staff user without Redis overhead or restarts.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white/20 active:scale-95 disabled:opacity-60 md:self-auto cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          {isRefetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Metric / Baseline Overview Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Hospital Baseline</span>
            <Building2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {defaultTenantLimit.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500">req/min aggregate per hospital</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Staff User Baseline</span>
            <Users className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {defaultUserLimit.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500">req/min per logged-in staff</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Staff OTP Guard</span>
            <KeyRound className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {defaultOtpLimit}
          </div>
          <p className="mt-1 text-xs text-slate-500">req/min per staff user (shared Wi-Fi safe)</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Auth Login Protection</span>
            <Lock className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {defaultLoginLimit}
          </div>
          <p className="mt-1 text-xs text-slate-500">req/min per IP (/64 IPv6 normalized)</p>
        </div>

        <div className="col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Custom Overrides</span>
            <Sliders className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-900">
            {customCount} <span className="text-xs font-normal text-indigo-600">/ {data?.total ?? allTenants.length}</span>
          </div>
          <p className="mt-1 text-xs text-indigo-700 font-medium">Hospitals with customized quotas</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hospitals by name, subdomain, or reason..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setFilterType("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              filterType === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({allTenants.length})
          </button>
          <button
            onClick={() => setFilterType("custom")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              filterType === "custom"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Custom Only ({customCount})
          </button>
          <button
            onClick={() => setFilterType("default")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              filterType === "default"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Default Baseline ({allTenants.length - customCount})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-slate-100 p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse py-3">
                <div className="space-y-2">
                  <div className="h-4 w-36 rounded bg-slate-200" />
                  <div className="h-3 w-24 rounded bg-slate-100" />
                </div>
                <div className="flex gap-4">
                  <div className="h-4 w-20 rounded bg-slate-200" />
                  <div className="h-4 w-20 rounded bg-slate-200" />
                </div>
                <div className="h-8 w-24 rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-10 w-10 text-rose-500" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">Failed to load rate limits</h3>
            <p className="mt-1 text-sm text-slate-500">{(error as any)?.message || "Unknown error"}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Gauge className="h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">No hospital tenants found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {search ? "No tenants match your current search query." : "No tenants registered on the platform."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Hospital Tenant</th>
                  <th className="px-6 py-3.5">Plan & Status</th>
                  <th className="px-6 py-3.5">Hospital Limit</th>
                  <th className="px-6 py-3.5">Staff User Limit</th>
                  <th className="px-6 py-3.5">Override Reason</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredItems.map((item) => {
                  const tenantLimitVal =
                    item.tenant_limit ?? item.effective_tenant_limit ?? defaultTenantLimit;
                  const userLimitVal =
                    item.user_limit ?? item.effective_user_limit ?? defaultUserLimit;

                  return (
                    <tr key={item.tenant_id} className="transition hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {item.tenant_name || item.subdomain}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          subdomain: {item.subdomain} &bull; ID: {String(item.tenant_id).slice(0, 8)}...
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.plan && (
                            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200 capitalize">
                              {item.plan}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {tenantLimitVal.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400">req/min</span>
                          {item.is_custom ? (
                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                              Custom
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              Default
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {userLimitVal.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400">req/min</span>
                          {item.is_custom ? (
                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                              Custom
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              Default
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 max-w-xs">
                        {item.reason ? (
                          <div className="truncate text-xs text-slate-700" title={item.reason}>
                            {item.reason}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Global baseline</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                          >
                            <Sliders className="h-3.5 w-3.5 text-slate-500" />
                            Configure
                          </button>

                          {item.is_custom && (
                            <button
                              onClick={() => {
                                if (confirm(`Reset rate limits for "${item.subdomain}" back to global defaults?`)) {
                                  resetMutation.mutate(item.tenant_id);
                                }
                              }}
                              disabled={resetMutation.isPending}
                              title="Reset to global system defaults"
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Reset
                            </button>
                          )}
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

      {/* Edit / Configure Overrides Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                  <Gauge className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Configure Quotas: {editingTenant.tenant_name || editingTenant.subdomain}
                  </h3>
                  <p className="text-xs text-slate-500">Live in-memory override across all endpoints</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOverrides} className="p-6 space-y-5">
              {/* Info pill */}
              <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-xs text-sky-800 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  Overriding limits takes effect <strong>immediately</strong> in FastAPI memory without service disruption, and is persisted to PostgreSQL for server restarts.
                </div>
              </div>

              {/* Hospital Tenant Limit Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Hospital-wide Limit (req / min)
                  </label>
                  <span className="text-xs text-slate-400">
                    System Default: {defaultTenantLimit}
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="500000"
                  value={tenantLimitInput}
                  onChange={(e) => setTenantLimitInput(e.target.value)}
                  placeholder="e.g. 2400"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[11px] text-slate-500">
                  Total combined requests allowed across all staff & terminals of this hospital in 60s.
                </p>
              </div>

              {/* User Limit Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Individual Staff User Limit (req / min)
                  </label>
                  <span className="text-xs text-slate-400">
                    System Default: {defaultUserLimit}
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="50000"
                  value={userLimitInput}
                  onChange={(e) => setUserLimitInput(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[11px] text-slate-500">
                  Maximum requests any individual authenticated doctor, nurse, or receptionist can issue per minute.
                </p>
              </div>

              {/* Reason Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Reason for Custom Quota
                </label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="e.g., High-volume regional center with 50+ concurrent OPD counters"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {editingTenant.is_custom ? (
                  <button
                    type="button"
                    onClick={() => resetMutation.mutate(editingTenant.tenant_id)}
                    disabled={resetMutation.isPending || updateMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset to Default
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 transition disabled:opacity-60 cursor-pointer"
                  >
                    {updateMutation.isPending ? "Applying..." : "Apply Overrides"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
