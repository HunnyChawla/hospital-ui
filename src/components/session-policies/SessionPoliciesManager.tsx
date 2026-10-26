"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Building2,
  Search,
  RefreshCw,
  Sliders,
  Laptop,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { authApi, TenantSessionPolicy } from "@/services/authApi";

export function SessionPoliciesManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingPolicy, setEditingPolicy] = useState<TenantSessionPolicy | null>(null);
  const [sessionLimitInput, setSessionLimitInput] = useState<number>(1);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["session-policies"],
    queryFn: () => authApi.getSessionPolicies(),
    staleTime: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ tenantId, limit }: { tenantId: string; limit: number }) =>
      authApi.updateSessionPolicy(tenantId, limit),
    onSuccess: (updated) => {
      toast.success(`Session limit updated for ${updated.tenant_name || updated.subdomain}`);
      queryClient.invalidateQueries({ queryKey: ["session-policies"] });
      setEditingPolicy(null);
    },
    onError: () => {
      toast.error("Failed to update session policy");
    },
  });

  const handleEditClick = (policy: TenantSessionPolicy) => {
    setEditingPolicy(policy);
    setSessionLimitInput(policy.max_concurrent_sessions);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    updateMutation.mutate({
      tenantId: editingPolicy.tenant_id,
      limit: Number(sessionLimitInput),
    });
  };

  const filteredItems = (data?.items || []).filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.tenant_name && item.tenant_name.toLowerCase().includes(q)) ||
      (item.subdomain && item.subdomain.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Session Lockout Policies
              </h1>
              <p className="text-sm text-slate-500">
                Configure maximum concurrent active sessions per user for each hospital
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-sky-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-sky-600" />
          <div>
            <p className="font-semibold">Session Lockout Policy Rule:</p>
            <p className="mt-0.5 text-xs text-sky-800">
              When set to <strong>1</strong> (Single Device Lockout), users logging into a new device will be
              forced to terminate other active sessions. When set to greater than 1, users can optionally keep
              multiple device sessions active up to the configured limit.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by hospital name or subdomain..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 font-semibold text-slate-700">Hospital</th>
              <th className="px-6 py-3.5 font-semibold text-slate-700">Subdomain</th>
              <th className="px-6 py-3.5 font-semibold text-slate-700">Max Concurrent Sessions</th>
              <th className="px-6 py-3.5 font-semibold text-slate-700">Mode</th>
              <th className="px-6 py-3.5 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-sky-600" />
                    Loading session policies...
                  </div>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No hospitals matching your search
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isSingle = item.max_concurrent_sessions === 1;
                return (
                  <tr key={item.tenant_id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {item.tenant_name || "Unnamed Hospital"}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {item.subdomain}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">
                          {item.max_concurrent_sessions}
                        </span>
                        <span className="text-xs text-slate-500">
                          session{item.max_concurrent_sessions > 1 ? "s" : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isSingle ? (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                          Strict Lockout (Single Device)
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 border border-sky-200">
                          Multi-Device Allowed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleEditClick(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-sky-600"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        Configure
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Configure Session Policy</h3>
                  <p className="text-xs text-slate-500">{editingPolicy.tenant_name || editingPolicy.subdomain}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPolicy(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Maximum Concurrent Active Sessions per User
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={sessionLimitInput}
                  onChange={(e) => setSessionLimitInput(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  required
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  {sessionLimitInput === 1 ? (
                    <span className="text-amber-600 font-medium">
                      ⚠️ Setting limit to 1 enables strict lockout: users will be forced to log out other devices.
                    </span>
                  ) : (
                    <span>Users can be logged in on up to {sessionLimitInput} devices simultaneously.</span>
                  )}
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
                  disabled={updateMutation.isPending}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {updateMutation.isPending ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
