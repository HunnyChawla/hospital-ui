"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  Edit2,
  FileText,
  Gauge,
  Globe,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  bridgeSecurityApi,
  FacilityRateLimitItem,
  TestIpResult,
} from "@/services/bridgeSecurityApi";

export const bridgeSecurityKeys = {
  all: ["bridge-security"] as const,
  overview: () => [...bridgeSecurityKeys.all, "overview"] as const,
  config: () => [...bridgeSecurityKeys.all, "config"] as const,
  geoip: () => [...bridgeSecurityKeys.all, "geoip"] as const,
  facilities: () => [...bridgeSecurityKeys.all, "facilities"] as const,
  blockedIps: () => [...bridgeSecurityKeys.all, "blocked-ips"] as const,
  trustedIps: () => [...bridgeSecurityKeys.all, "trusted-ips"] as const,
};

export function BridgeSecurityManager() {
  const queryClient = useQueryClient();

  // Queries
  const {
    data: overview,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
    isRefetching,
  } = useQuery({
    queryKey: bridgeSecurityKeys.overview(),
    queryFn: () => bridgeSecurityApi.getOverview(),
    staleTime: 15000,
  });

  const { data: facilities, refetch: refetchFacilities } = useQuery({
    queryKey: bridgeSecurityKeys.facilities(),
    queryFn: () => bridgeSecurityApi.listFacilities(),
    staleTime: 15000,
  });

  const { data: blockedIps, refetch: refetchBlockedIps } = useQuery({
    queryKey: bridgeSecurityKeys.blockedIps(),
    queryFn: () => bridgeSecurityApi.listBlockedIps(),
    staleTime: 15000,
  });

  const { data: trustedIps, refetch: refetchTrustedIps } = useQuery({
    queryKey: bridgeSecurityKeys.trustedIps(),
    queryFn: () => bridgeSecurityApi.listTrustedIps(),
    staleTime: 15000,
  });

  // State: Tab selection inside Bridge panel
  const [activeSubTab, setActiveSubTab] = useState<"rates" | "facilities" | "blocked" | "trusted">("rates");

  // State: IP Tester tool
  const [testIpInput, setTestIpInput] = useState("");
  const [testIpResult, setTestIpResult] = useState<TestIpResult | null>(null);
  const [isTestingIp, setIsTestingIp] = useState(false);

  // State: Modal for editing facility quota
  const [editingFacility, setEditingFacility] = useState<FacilityRateLimitItem | null>(null);
  const [facilityLimitInput, setFacilityLimitInput] = useState("");

  // State: Modal for adding Blocked IP
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockIpInput, setBlockIpInput] = useState("");
  const [blockReasonInput, setBlockReasonInput] = useState("");

  // State: Modal for adding Trusted IP
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [trustIpInput, setTrustIpInput] = useState("");
  const [trustDescInput, setTrustDescInput] = useState("");

  // State: Config form inputs
  const configs = overview?.configs || {};
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [isConfigDirty, setIsConfigDirty] = useState(false);

  // Sync form config from query
  React.useEffect(() => {
    if (overview?.configs) {
      setFormConfig(overview.configs);
      setIsConfigDirty(false);
    }
  }, [overview?.configs]);

  const geoip = overview?.geoip;
  const isGeoipEnabled = (formConfig["geoip_enabled"] ?? configs["geoip_enabled"] ?? "true").toLowerCase() === "true";
  const isRateLimitEnabled = (formConfig["rate_limit_enabled"] ?? configs["rate_limit_enabled"] ?? "true").toLowerCase() === "true";

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: (newConfigs: Record<string, string>) => bridgeSecurityApi.updateConfig(newConfigs),
    onSuccess: () => {
      toast.success("Bridge configuration saved successfully");
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.all });
      setIsConfigDirty(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Failed to update configuration");
    },
  });

  const uploadMmdbMutation = useMutation({
    mutationFn: (file: File) => bridgeSecurityApi.uploadGeoIPDatabase(file),
    onSuccess: (data) => {
      toast.success("GeoIP MMDB database uploaded and activated successfully");
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Failed to upload MMDB file");
    },
  });

  const deleteMmdbMutation = useMutation({
    mutationFn: () => bridgeSecurityApi.deleteGeoIPDatabase(),
    onSuccess: () => {
      toast.success("GeoIP database deleted from bridge");
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Failed to delete MMDB file");
    },
  });

  const updateFacilityMutation = useMutation({
    mutationFn: ({ hipId, limit }: { hipId: string; limit: number | null }) =>
      bridgeSecurityApi.updateFacilityRateLimit(hipId, limit),
    onSuccess: () => {
      toast.success("Facility rate limit updated");
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.facilities() });
      setEditingFacility(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Failed to update facility rate limit");
    },
  });

  const addBlockedIpMutation = useMutation({
    mutationFn: ({ ip, reason }: { ip: string; reason: string }) =>
      bridgeSecurityApi.addBlockedIp(ip, reason),
    onSuccess: () => {
      toast.success("IP/CIDR added to blacklist");
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.blockedIps() });
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.overview() });
      setShowBlockModal(false);
      setBlockIpInput("");
      setBlockReasonInput("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Failed to block IP");
    },
  });

  const removeBlockedIpMutation = useMutation({
    mutationFn: (ip: string) => bridgeSecurityApi.removeBlockedIp(ip),
    onSuccess: (_, ip) => {
      toast.success(`Unblocked IP: ${ip}`);
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.blockedIps() });
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.overview() });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Failed to unblock IP");
    },
  });

  const addTrustedIpMutation = useMutation({
    mutationFn: ({ ip, desc }: { ip: string; desc: string }) =>
      bridgeSecurityApi.addTrustedIp(ip, desc),
    onSuccess: () => {
      toast.success("IP/CIDR added to trusted exemptions");
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.trustedIps() });
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.overview() });
      setShowTrustModal(false);
      setTrustIpInput("");
      setTrustDescInput("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Failed to add trusted IP");
    },
  });

  const removeTrustedIpMutation = useMutation({
    mutationFn: (ip: string) => bridgeSecurityApi.removeTrustedIp(ip),
    onSuccess: (_, ip) => {
      toast.success(`Removed trusted IP: ${ip}`);
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.trustedIps() });
      queryClient.invalidateQueries({ queryKey: bridgeSecurityKeys.overview() });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Failed to remove trusted IP");
    },
  });

  const handleTestIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testIpInput.trim()) return;
    setIsTestingIp(true);
    try {
      const res = await bridgeSecurityApi.testIpLookup(testIpInput.trim());
      setTestIpResult(res);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "IP lookup failed");
    } finally {
      setIsTestingIp(false);
    }
  };

  const handleConfigChange = (key: string, val: string) => {
    setFormConfig((prev) => ({ ...prev, [key]: val }));
    setIsConfigDirty(true);
  };

  const handleSaveConfig = () => {
    updateConfigMutation.mutate(formConfig);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".mmdb")) {
      toast.error("Please upload a file with .mmdb extension");
      return;
    }
    uploadMmdbMutation.mutate(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 text-white shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-sky-500/20 p-2 ring-1 ring-sky-400/30">
              <ShieldCheck className="h-6 w-6 text-sky-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              ABDM Bridge Traffic & DDoS Shield
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
              India Geo-Fenced
            </span>
          </div>
          <p className="text-sm text-slate-300">
            Regulate public access, enforce India-only GeoIP fencing, manage blocked IPs, and prevent DDoS attacks on the ABDM Bridge.
          </p>
        </div>

        <button
          onClick={() => {
            refetchOverview();
            refetchFacilities();
            refetchBlockedIps();
            refetchTrustedIps();
          }}
          disabled={isOverviewLoading || isRefetching}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white/20 active:scale-95 disabled:opacity-60 md:self-auto cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          {isRefetching ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {/* Warning Banner if GeoIP Database is Missing */}
      {geoip && !geoip.has_database && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-amber-100/60 p-4 shadow-sm text-amber-950">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-bold text-amber-900">
              GeoIP MMDB Database File is Missing
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              {geoip.warning ||
                "Country-based filtering is operating in fallback mode. Upload an MMDB database file (e.g. GeoLite2-Country.mmdb) below to restore full offline local IP geolocation."}
            </p>
          </div>
          <label className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-amber-700 cursor-pointer transition shrink-0">
            <UploadCloud className="h-3.5 w-3.5" />
            Upload MMDB
            <input type="file" accept=".mmdb" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">GeoIP Fencing</span>
            <Globe className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {isGeoipEnabled ? "India (IN)" : "Disabled"}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {geoip?.has_database ? "Local MMDB active" : "Proxy header fallback"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Public IP Shield</span>
            <Shield className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {formConfig["rate_limit_public_per_ip"] || configs["rate_limit_public_per_ip"] || "60"}
          </div>
          <p className="mt-1 text-xs text-slate-500">req/min per unauthenticated IP</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">ABDM Inbound Burst</span>
            <Gauge className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {Number(formConfig["rate_limit_inbound_per_minute"] || configs["rate_limit_inbound_per_minute"] || 3000).toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500">req/min gateway webhook capacity</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Blocked IPs</span>
            <Ban className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {overview?.blocked_ips_count ?? (blockedIps?.length || 0)}
          </div>
          <p className="mt-1 text-xs text-slate-500">banned attacker IPs/CIDRs</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Trusted Exemptions</span>
            <CheckCircle2 className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {overview?.trusted_ips_count ?? (trustedIps?.length || 0)}
          </div>
          <p className="mt-1 text-xs text-slate-500">CIDRs bypassing filters</p>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab("rates")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeSubTab === "rates"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          Global Limits & GeoIP
        </button>

        <button
          onClick={() => setActiveSubTab("facilities")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeSubTab === "facilities"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          Hospital Facility Quotas
          {facilities && facilities.some((f) => f.is_custom) && (
            <span className="rounded-full bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-bold text-sky-700">
              {facilities.filter((f) => f.is_custom).length} Custom
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("blocked")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeSubTab === "blocked"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Ban className="h-3.5 w-3.5 text-rose-500" />
          Blocked IPs (Blacklist)
          {blockedIps && blockedIps.length > 0 && (
            <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-700">
              {blockedIps.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("trusted")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            activeSubTab === "trusted"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
          Trusted Exemptions (Whitelist)
        </button>
      </div>

      {/* Sub-Tab 1: Global Limits & GeoIP Management */}
      {activeSubTab === "rates" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column: Global Limits Configuration */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Bridge Rate Limiting Matrix</h3>
                <p className="text-xs text-slate-500">Configure global request thresholds across traffic tiers.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRateLimitEnabled}
                  onChange={(e) => handleConfigChange("rate_limit_enabled", e.target.checked ? "true" : "false")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Public Unauthenticated Limit (req/min per IP)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formConfig["rate_limit_public_per_ip"] || ""}
                  onChange={(e) => handleConfigChange("rate_limit_public_per_ip", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                  placeholder="60"
                />
                <p className="mt-1 text-[11px] text-slate-400">Protects against port scanners, bots, and unauthenticated floods.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  ABDM Inbound Gateway Webhook Burst (req/min)
                </label>
                <input
                  type="number"
                  min="100"
                  value={formConfig["rate_limit_inbound_per_minute"] || ""}
                  onChange={(e) => handleConfigChange("rate_limit_inbound_per_minute", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                  placeholder="3000"
                />
                <p className="mt-1 text-[11px] text-slate-400">High burst ceiling for OPD morning rush check-ins and consent callbacks.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Hospital Default Outbound Proxy Limit (req/min per tenant)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formConfig["rate_limit_tenant_default"] || ""}
                  onChange={(e) => handleConfigChange("rate_limit_tenant_default", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                  placeholder="1200"
                />
                <p className="mt-1 text-[11px] text-slate-400">Default quota for facilities that don't have custom overrides.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Admin Endpoints Limit (req/min per IP)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formConfig["rate_limit_admin_per_ip"] || ""}
                  onChange={(e) => handleConfigChange("rate_limit_admin_per_ip", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                  placeholder="30"
                />
                <p className="mt-1 text-[11px] text-slate-400">Prevents brute-force access on internal bridge management routes.</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={!isConfigDirty || updateConfigMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  <Sliders className="h-4 w-4" />
                  {updateConfigMutation.isPending ? "Saving..." : "Save Rate Limits"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: GeoIP Management & IP Tester */}
          <div className="space-y-6">
            {/* GeoIP Card */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">GeoIP Country Fencing</h3>
                  <p className="text-xs text-slate-500">Restrict bridge access to Indian IPs (IN).</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGeoipEnabled}
                    onChange={(e) => {
                      const next = e.target.checked ? "true" : "false";
                      handleConfigChange("geoip_enabled", next);
                      updateConfigMutation.mutate({ ...formConfig, geoip_enabled: next });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              {/* Database details */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">MMDB Database:</span>
                  <span className="font-semibold text-slate-900">
                    {geoip?.has_database ? "Installed (GeoLite2-Country)" : "Missing"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">File Size:</span>
                  <span className="font-semibold text-slate-900">
                    {geoip?.file_size_bytes ? `${(geoip.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Last Modified:</span>
                  <span className="font-semibold text-slate-900">
                    {geoip?.last_modified ? new Date(geoip.last_modified).toLocaleString() : "N/A"}
                  </span>
                </div>
              </div>

              {/* Action Buttons for MMDB */}
              <div className="flex items-center gap-3">
                <label className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer transition">
                  <UploadCloud className="h-4 w-4 text-sky-600" />
                  {uploadMmdbMutation.isPending ? "Uploading..." : "Upload / Replace MMDB"}
                  <input type="file" accept=".mmdb" onChange={handleFileUpload} className="hidden" />
                </label>

                {geoip?.has_database && (
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete the GeoIP MMDB database file?")) {
                        deleteMmdbMutation.mutate();
                      }
                    }}
                    disabled={deleteMmdbMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete File
                  </button>
                )}
              </div>
            </div>

            {/* Live IP Geolocation Tester */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900">Live IP Geolocation Tester</h3>
                <p className="text-xs text-slate-500">Test how any IP is evaluated by GeoIP & security rules.</p>
              </div>

              <form onSubmit={handleTestIp} className="flex gap-2">
                <input
                  type="text"
                  value={testIpInput}
                  onChange={(e) => setTestIpInput(e.target.value)}
                  placeholder="e.g. 125.16.0.1 or 8.8.8.8"
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isTestingIp || !testIpInput.trim()}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
                >
                  {isTestingIp ? "Testing..." : "Test IP"}
                </button>
              </form>

              {testIpResult && (
                <div className={`rounded-xl border p-3.5 space-y-1.5 text-xs ${
                  testIpResult.verdict === "ALLOWED"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span>IP: {testIpResult.ip}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      testIpResult.verdict === "ALLOWED" ? "bg-emerald-200 text-emerald-950" : "bg-rose-200 text-rose-950"
                    }`}>
                      {testIpResult.verdict}
                    </span>
                  </div>
                  <div className="text-slate-600 space-y-0.5">
                    <p>Detected Country: <span className="font-bold text-slate-900">{testIpResult.resolved_country}</span></p>
                    <p>Is in Trusted List: {testIpResult.is_trusted ? "Yes (Bypass)" : "No"}</p>
                    <p>Is in Blocklist: {testIpResult.is_blocked ? "Yes (Blocked)" : "No"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Hospital Facility Rate Limits */}
      {activeSubTab === "facilities" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Hospital Facility Quotas (Outbound Proxy)</h3>
            <p className="text-xs text-slate-500">
              Customize outbound ABDM API proxy quotas per hospital facility without affecting other facilities.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Facility HIP ID</th>
                  <th className="px-4 py-3">Tenant ID</th>
                  <th className="px-4 py-3">Effective Limit</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facilities && facilities.length > 0 ? (
                  facilities.map((f) => (
                    <tr key={f.hip_id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{f.hip_id}</td>
                      <td className="px-4 py-3 text-slate-700">{f.tenant_id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {f.effective_limit.toLocaleString()} req/min
                      </td>
                      <td className="px-4 py-3">
                        {f.is_custom ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-200">
                            Custom Quota
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            Global Default
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingFacility(f);
                            setFacilityLimitInput(String(f.effective_limit));
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit Quota
                        </button>
                        {f.is_custom && (
                          <button
                            onClick={() => {
                              if (confirm(`Reset ${f.hip_id} to global default limit?`)) {
                                updateFacilityMutation.mutate({ hipId: f.hip_id, limit: null });
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reset Default
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No facilities registered in routing table.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Blocked IPs (Blacklist) */}
      {activeSubTab === "blocked" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Blocked IPs & Subnets (Blacklist)</h3>
              <p className="text-xs text-slate-500">
                Immediately drops all traffic from these IP addresses or CIDR blocks with 403 Forbidden.
              </p>
            </div>
            <button
              onClick={() => setShowBlockModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 cursor-pointer transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Block New IP
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">IP / CIDR Block</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Added Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blockedIps && blockedIps.length > 0 ? (
                  blockedIps.map((b) => (
                    <tr key={b.ip_or_cidr} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-rose-700">{b.ip_or_cidr}</td>
                      <td className="px-4 py-3 text-slate-600">{b.reason || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {b.created_at ? new Date(b.created_at).toLocaleString() : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Unblock IP ${b.ip_or_cidr}?`)) {
                              removeBlockedIpMutation.mutate(b.ip_or_cidr);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      No IPs currently blocked. All authorized Indian traffic passes smoothly.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Trusted Exemptions (Whitelist) */}
      {activeSubTab === "trusted" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Trusted IPs & Subnets (Whitelist)</h3>
              <p className="text-xs text-slate-500">
                These IP ranges completely bypass rate limiting and GeoIP checks (e.g. internal HMS cluster, monitoring).
              </p>
            </div>
            <button
              onClick={() => setShowTrustModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 cursor-pointer transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Trusted IP
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">IP / CIDR Block</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Added Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trustedIps && trustedIps.length > 0 ? (
                  trustedIps.map((t) => (
                    <tr key={t.ip_or_cidr} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-teal-700">{t.ip_or_cidr}</td>
                      <td className="px-4 py-3 text-slate-600">{t.description || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {t.created_at ? new Date(t.created_at).toLocaleString() : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Remove trusted IP ${t.ip_or_cidr}?`)) {
                              removeTrustedIpMutation.mutate(t.ip_or_cidr);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      No custom trusted IPs configured. Loopback and RFC1918 subnets are automatically exempted.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Edit Facility Quota */}
      {editingFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Facility Quota</h3>
              <button
                onClick={() => setEditingFacility(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p><span className="text-slate-500">Facility HIP ID:</span> <span className="font-mono font-bold text-slate-900">{editingFacility.hip_id}</span></p>
              <p><span className="text-slate-500">Tenant ID:</span> <span className="font-semibold text-slate-900">{editingFacility.tenant_id}</span></p>

              <div>
                <label className="block text-xs font-bold text-slate-700">Custom Limit (req/min)</label>
                <input
                  type="number"
                  min="1"
                  value={facilityLimitInput}
                  onChange={(e) => setFacilityLimitInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                  placeholder="e.g. 3000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingFacility(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const num = parseInt(facilityLimitInput.trim(), 10);
                  if (isNaN(num) || num < 1) {
                    toast.error("Please enter a valid positive number");
                    return;
                  }
                  updateFacilityMutation.mutate({ hipId: editingFacility.hip_id, limit: num });
                }}
                disabled={updateFacilityMutation.isPending}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                {updateFacilityMutation.isPending ? "Saving..." : "Save Quota"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Block IP */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Block IP Address / CIDR</h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700">IP Address or CIDR Block</label>
                <input
                  type="text"
                  value={blockIpInput}
                  onChange={(e) => setBlockIpInput(e.target.value)}
                  placeholder="e.g. 198.51.100.5 or 198.51.100.0/24"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Reason for Blocking</label>
                <input
                  type="text"
                  value={blockReasonInput}
                  onChange={(e) => setBlockReasonInput(e.target.value)}
                  placeholder="e.g. Volumetric DDoS flood, credential scanner"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBlockModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!blockIpInput.trim()) {
                    toast.error("Please enter an IP address or CIDR");
                    return;
                  }
                  addBlockedIpMutation.mutate({ ip: blockIpInput.trim(), reason: blockReasonInput.trim() });
                }}
                disabled={addBlockedIpMutation.isPending}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {addBlockedIpMutation.isPending ? "Blocking..." : "Block IP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Trusted IP */}
      {showTrustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Trusted IP Exemption</h3>
              <button
                onClick={() => setShowTrustModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700">IP Address or CIDR Block</label>
                <input
                  type="text"
                  value={trustIpInput}
                  onChange={(e) => setTrustIpInput(e.target.value)}
                  placeholder="e.g. 10.0.0.50 or 10.0.0.0/16"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Description</label>
                <input
                  type="text"
                  value={trustDescInput}
                  onChange={(e) => setTrustDescInput(e.target.value)}
                  placeholder="e.g. Internal HMS Cluster, Monitoring Agent"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTrustModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!trustIpInput.trim()) {
                    toast.error("Please enter an IP address or CIDR");
                    return;
                  }
                  addTrustedIpMutation.mutate({ ip: trustIpInput.trim(), desc: trustDescInput.trim() });
                }}
                disabled={addTrustedIpMutation.isPending}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 cursor-pointer disabled:opacity-50"
              >
                {addTrustedIpMutation.isPending ? "Adding..." : "Add Trusted IP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
