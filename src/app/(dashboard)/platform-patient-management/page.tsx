"use client";

import { useState, useEffect, useCallback, useTransition, useId, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isPlatformOwner } from "@/utils/auth";
import { tenantsApi, Tenant } from "@/services/tenantsApi";
import {
  platformPatientApi,
  PlatformPatientSearchItem,
} from "@/services/platformPatientApi";
import {
  Building2,
  Search,
  Trash2,
  Unlink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Calendar,
  Phone,
  CreditCard,
  FileText,
  Activity,
  BedDouble,
  Clock,
  UserX,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/utils/format";

type SearchType = "all" | "mobile" | "abha_number" | "abha_address";

export default function PlatformPatientManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTenantId = searchParams.get("tenant_id") || "";

  const [authorized, setAuthorized] = useState(false);
  
  // Tenant dropdown & search state
  const [defaultTenants, setDefaultTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenantId);
  const [selectedTenantObj, setSelectedTenantObj] = useState<Tenant | null>(null);
  const [tenantFilterText, setTenantFilterText] = useState("");
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);
  const tenantDropdownRef = useRef<HTMLDivElement>(null);
  const tenantSearchInputRef = useRef<HTMLInputElement>(null);

  const [isLoadingDefaultTenants, setIsLoadingDefaultTenants] = useState(false);
  const [isSearchingTenants, setIsSearchingTenants] = useState(false);
  const [searchedTenants, setSearchedTenants] = useState<Tenant[]>([]);
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantTotalPages, setTenantTotalPages] = useState(1);
  const [tenantTotalCount, setTenantTotalCount] = useState(0);

  // Patient search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("all");

  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<PlatformPatientSearchItem[]>([]);

  // Modals state
  const [patientToDelete, setPatientToDelete] = useState<PlatformPatientSearchItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [patientToUnlink, setPatientToUnlink] = useState<PlatformPatientSearchItem | null>(null);
  const [unlinkReason, setUnlinkReason] = useState("");
  const [isUnlinking, setIsUnlinking] = useState(false);

  const tenantSelectId = useId();
  const searchInputId = useId();

  // 1. Auth check
  useEffect(() => {
    if (!isPlatformOwner()) {
      router.push("/");
      return;
    }
    setAuthorized(true);
  }, [router]);

  // 2. Load initial 100 tenants
  useEffect(() => {
    if (!authorized) return;
    let isMounted = true;

    const loadInitialTenants = async () => {
      setIsLoadingDefaultTenants(true);
      try {
        const res = await tenantsApi.list({ page_size: 100, status: "active" });
        if (!isMounted) return;
        const items = res.items || [];
        setDefaultTenants(items);

        if (initialTenantId) {
          const match = items.find((t) => t.id === initialTenantId);
          if (match) {
            setSelectedTenantId(match.id);
            setSelectedTenantObj(match);
          } else {
            // Fetch specific tenant if not among top 100
            try {
              const single = await tenantsApi.getById(initialTenantId);
              if (isMounted && single) {
                setSelectedTenantId(single.id);
                setSelectedTenantObj(single);
              }
            } catch {
              // ignore
            }
          }
        } else if (items.length > 0 && !selectedTenantId) {
          setSelectedTenantId(items[0].id);
          setSelectedTenantObj(items[0]);
        }
      } catch (err) {
        console.error("Failed to load initial tenants:", err);
        toast.error("Failed to load active tenants");
      } finally {
        if (isMounted) setIsLoadingDefaultTenants(false);
      }
    };

    loadInitialTenants();
    return () => {
      isMounted = false;
    };
  }, [authorized, initialTenantId]);

  // Close tenant dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tenantDropdownRef.current &&
        !tenantDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTenantDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when tenant dropdown opens
  useEffect(() => {
    if (isTenantDropdownOpen && tenantSearchInputRef.current) {
      tenantSearchInputRef.current.focus();
    }
  }, [isTenantDropdownOpen]);

  // 3. Backend search with debounce when text length >= 3
  useEffect(() => {
    const trimmed = tenantFilterText.trim();
    if (trimmed.length < 3) {
      setSearchedTenants([]);
      setTenantTotalPages(1);
      setTenantTotalCount(0);
      setIsSearchingTenants(false);
      return;
    }

    setIsSearchingTenants(true);
    const timer = setTimeout(async () => {
      try {
        const res = await tenantsApi.list({
          search: trimmed,
          page: tenantPage,
          page_size: 20,
          status: "active",
        });
        setSearchedTenants(res.items || []);
        setTenantTotalPages(res.total_pages || 1);
        setTenantTotalCount(res.total || 0);
      } catch (err) {
        console.error("Failed to search tenants:", err);
        toast.error("Failed to search hospitals");
        setSearchedTenants([]);
      } finally {
        setIsSearchingTenants(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [tenantFilterText, tenantPage]);

  const isBackendSearchActive = tenantFilterText.trim().length >= 3;

  const displayedTenants: Tenant[] = isBackendSearchActive
    ? searchedTenants
    : defaultTenants.filter((t) => {
        const q = tenantFilterText.toLowerCase().trim();
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          (t.subdomain && t.subdomain.toLowerCase().includes(q)) ||
          (t.city && t.city.toLowerCase().includes(q)) ||
          (t.state && t.state.toLowerCase().includes(q)) ||
          (t.phone_no && t.phone_no.toLowerCase().includes(q)) ||
          (t.email && t.email.toLowerCase().includes(q)) ||
          t.id.toLowerCase().includes(q)
        );
      });

  const selectedTenant =
    selectedTenantObj ||
    searchedTenants.find((t) => t.id === selectedTenantId) ||
    defaultTenants.find((t) => t.id === selectedTenantId) ||
    null;

  // 4. Search patients
  const handleSearch = useCallback(async () => {
    if (!selectedTenantId) {
      toast.error("Please select a hospital tenant first");
      return;
    }
    if (!searchQuery.trim()) {
      toast.error("Please enter a mobile number, ABHA number, or ABHA address");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await platformPatientApi.searchPatients({
        tenant_id: selectedTenantId,
        query: searchQuery.trim(),
        search_type: searchType,
      });
      setSearchResults(res.items || []);
      if (res.items?.length === 0) {
        toast.info("No matching patient records found in this tenant");
      }
    } catch (err: any) {
      console.error("Search failed:", err);
      const detail = err?.response?.data?.detail;
      const errorMsg = typeof detail === "string" ? detail : (Array.isArray(detail) ? detail[0]?.msg : "Search failed");
      toast.error(errorMsg);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [selectedTenantId, searchQuery, searchType]);

  // 4. Handle Delete Patient
  const executeDeletePatient = async () => {
    if (!patientToDelete || !selectedTenantId) return;

    if (deleteConfirmText.trim().toUpperCase() !== patientToDelete.uhid.toUpperCase()) {
      toast.error(`Please enter exact UHID (${patientToDelete.uhid}) to confirm deletion`);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await platformPatientApi.deletePatient({
        patient_id: patientToDelete.id,
        tenant_id: selectedTenantId,
        reason: deleteReason.trim() || undefined,
      });

      toast.success(res.message || "Patient deleted successfully");
      // Remove from results list
      setSearchResults((prev) => prev.filter((p) => p.id !== patientToDelete.id));
      setPatientToDelete(null);
      setDeleteConfirmText("");
      setDeleteReason("");
    } catch (err: any) {
      console.error("Deletion failed:", err);
      const detail = err?.response?.data?.detail;
      const errorMsg = typeof detail === "string" ? detail : (Array.isArray(detail) ? detail[0]?.msg : "Patient deletion failed");
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  // 5. Handle Unlink ABHA
  const executeUnlinkAbha = async () => {
    if (!patientToUnlink || !selectedTenantId) return;

    setIsUnlinking(true);
    try {
      const res = await platformPatientApi.unlinkAbha({
        patient_id: patientToUnlink.id,
        tenant_id: selectedTenantId,
        reason: unlinkReason.trim() || undefined,
      });

      toast.success(res.message || "ABHA ID unlinked successfully");

      // Update patient in local results
      setSearchResults((prev) =>
        prev.map((p) => {
          if (p.id === patientToUnlink.id) {
            return {
              ...p,
              abha_id: null,
              abha_number: null,
              abha_address: null,
              abha_linked_at: null,
              abha_verified: false,
              mobile_verified:
                p.mobile_verified_source === "abha_enrolment" ? false : p.mobile_verified,
            };
          }
          return p;
        })
      );
      setPatientToUnlink(null);
      setUnlinkReason("");
    } catch (err: any) {
      console.error("Unlink ABHA failed:", err);
      const detail = err?.response?.data?.detail;
      const errorMsg = typeof detail === "string" ? detail : (Array.isArray(detail) ? detail[0]?.msg : "Failed to unlink ABHA");
      toast.error(errorMsg);
    } finally {
      setIsUnlinking(false);
    }
  };

  if (!authorized) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-slate-500">Verifying authorization...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 shadow-md">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Platform Patient Data Management
              </h1>
              <p className="text-xs text-slate-500">
                Administrative search, cascading patient deletion, and ABHA data cleanup across hospital tenants
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-1.5 border border-rose-200 text-rose-800 text-xs font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            Platform Owner Privilege
          </div>
        </div>
      </div>

      {/* Control Panel: Tenant Selection & Targeted Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-12">
          {/* Searchable Tenant Selector */}
          <div className="md:col-span-5" ref={tenantDropdownRef}>
            <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Select Tenant Hospital</span>
              <span className="text-[10px] font-medium text-slate-400">
                {isBackendSearchActive
                  ? `${tenantTotalCount} matching (20 / page)`
                  : `${defaultTenants.length} default loaded`}
              </span>
            </label>
            <div className="relative">
              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  if (!isLoadingDefaultTenants) {
                    setIsTenantDropdownOpen((prev) => !prev);
                  }
                }}
                disabled={isLoadingDefaultTenants}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-50 px-3.5 py-2.5 text-left text-sm font-medium text-slate-900 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50 ${
                  isTenantDropdownOpen
                    ? "border-sky-500 bg-white ring-2 ring-sky-500/20"
                    : "border-slate-300"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {isLoadingDefaultTenants ? (
                      <span className="text-xs text-slate-400">Loading hospitals...</span>
                    ) : selectedTenant ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate font-semibold text-slate-900">
                          {selectedTenant.name}
                        </span>
                        {selectedTenant.subdomain && (
                          <span className="shrink-0 rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                            @{selectedTenant.subdomain}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">Select a hospital tenant...</span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                    isTenantDropdownOpen ? "rotate-180 text-sky-600" : ""
                  }`}
                />
              </button>

              {/* Searchable Dropdown Popup */}
              {isTenantDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 flex max-h-96 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  {/* Search Filter Header */}
                  <div className="border-b border-slate-100 bg-slate-50/90 p-2.5 space-y-1.5">
                    <div className="relative flex items-center">
                      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
                      <input
                        ref={tenantSearchInputRef}
                        type="text"
                        value={tenantFilterText}
                        onChange={(e) => {
                          setTenantFilterText(e.target.value);
                          setTenantPage(1);
                        }}
                        placeholder="Search hospital by name, city, subdomain..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                      {tenantFilterText && (
                        <button
                          type="button"
                          onClick={() => {
                            setTenantFilterText("");
                            setTenantPage(1);
                          }}
                          className="absolute right-2.5 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Status / Search mode indicator */}
                    <div className="flex items-center justify-between px-1 text-[10px] text-slate-500">
                      {isSearchingTenants ? (
                        <div className="flex items-center gap-1 text-sky-600 font-medium">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Searching server for &quot;{tenantFilterText}&quot;...</span>
                        </div>
                      ) : isBackendSearchActive ? (
                        <div className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle className="h-3 w-3" />
                          <span>Found {tenantTotalCount} hospitals (Page {tenantPage}/{tenantTotalPages})</span>
                        </div>
                      ) : tenantFilterText.trim().length > 0 ? (
                        <span className="text-amber-600 font-medium">
                          Filtering default 100 • Type ≥3 letters for backend search
                        </span>
                      ) : (
                        <span>Default 100 active hospitals loaded</span>
                      )}
                    </div>
                  </div>

                  {/* Tenants List */}
                  <div className="flex-1 overflow-y-auto p-1.5 divide-y divide-slate-50 min-h-[120px] max-h-60">
                    {isSearchingTenants ? (
                      <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin text-sky-500 mb-2" />
                        <p className="font-medium text-slate-600">Searching hospitals...</p>
                      </div>
                    ) : displayedTenants.length > 0 ? (
                      displayedTenants.map((t) => {
                        const isSelected = t.id === selectedTenantId;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTenantId(t.id);
                              setSelectedTenantObj(t);
                              setIsTenantDropdownOpen(false);
                              setTenantFilterText("");
                              setSearchResults([]);
                              setHasSearched(false);
                            }}
                            className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition ${
                              isSelected
                                ? "bg-sky-50 font-semibold text-sky-950"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-bold text-slate-900 group-hover:text-sky-700">
                                  {t.name}
                                </span>
                                {t.plan && (
                                  <span className="rounded bg-sky-100/70 px-1.5 py-0.5 text-[9px] uppercase font-bold text-sky-700">
                                    {t.plan}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                {t.subdomain && (
                                  <span className="font-mono text-slate-600">
                                    @{t.subdomain}
                                  </span>
                                )}
                                {(t.city || t.state) && (
                                  <span>
                                    • {[t.city, t.state].filter(Boolean).join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">
                        <Building2 className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                        <p className="font-medium text-slate-600">No hospitals found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          No active hospital matches &quot;{tenantFilterText}&quot;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dropdown Footer (Pagination for Backend Search) */}
                  {isBackendSearchActive && tenantTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                      <span className="text-[11px] font-medium text-slate-500">
                        Page {tenantPage} of {tenantTotalPages} ({tenantTotalCount} total)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTenantPage((p) => Math.max(1, p - 1));
                          }}
                          disabled={tenantPage <= 1 || isSearchingTenants}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-3 w-3" />
                          Prev
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTenantPage((p) => Math.min(tenantTotalPages, p + 1));
                          }}
                          disabled={tenantPage >= tenantTotalPages || isSearchingTenants}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Next
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Query Input */}
          <div className="md:col-span-7">
            <label htmlFor={searchInputId} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Search Patient by Full Mobile / ABHA Number / ABHA ID
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id={searchInputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. 9876543210, 14-1234-5678-9012, or username@abdm"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pl-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-sky-600 hover:to-teal-600 hover:shadow-lg disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search
                  </>
                )}
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-slate-500">Filter mode:</span>
              {[
                { id: "all", label: "Smart Match (All)" },
                { id: "mobile", label: "Full Mobile (10-digit)" },
                { id: "abha_number", label: "ABHA Number (14-digit)" },
                { id: "abha_address", label: "ABHA Address / ID" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setSearchType(pill.id as SearchType)}
                  className={`rounded-lg px-2.5 py-1 font-medium transition ${
                    searchType === pill.id
                      ? "bg-sky-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Matching Records {hasSearched && `(${searchResults.length})`}
          </h2>
          {selectedTenant && (
            <p className="text-xs text-slate-500">
              Hospital: <span className="font-semibold text-slate-800">{selectedTenant.name}</span>
            </p>
          )}
        </div>

        {isSearching ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <RefreshCw className="h-8 w-8 animate-spin text-sky-500 mb-3" />
            <p className="text-sm font-semibold text-slate-700">Searching records...</p>
            <p className="text-xs text-slate-400 mt-1">Checking demographics and ABHA registry for tenant</p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="grid gap-3">
            {searchResults.map((patient) => {
              const hasAbha = Boolean(patient.abha_number || patient.abha_address || patient.abha_verified);

              return (
                <div
                  key={patient.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left: Patient Demographic Details */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold rounded-lg bg-sky-50 px-2.5 py-1 text-sky-700 border border-sky-200">
                          {patient.uhid}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {patient.full_name || `${patient.first_name} ${patient.last_name || ""}`}
                        </h3>
                        {patient.gender && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 capitalize">
                            {patient.gender}
                          </span>
                        )}
                        {patient.date_of_birth && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            DOB: {formatDate(patient.date_of_birth)}
                          </span>
                        )}
                        {patient.category && (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                            {patient.category}
                          </span>
                        )}
                      </div>

                      {/* Contact & ABHA row */}
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs text-slate-600 pt-1">
                        {/* Mobile */}
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700">Mobile:</span>
                          <span className="font-mono">{patient.mobile || "N/A"}</span>
                          {patient.mobile_verified && (
                            <span className="inline-flex items-center text-[10px] text-emerald-600 font-semibold gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <CheckCircle className="h-3 w-3" /> Verified
                            </span>
                          )}
                        </div>

                        {/* ABHA Number */}
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700">ABHA No:</span>
                          <span className="font-mono text-slate-800">
                            {patient.abha_number || "None"}
                          </span>
                          {patient.abha_verified && (
                            <span className="inline-flex items-center text-[10px] text-teal-600 font-semibold gap-0.5 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                              <CheckCircle className="h-3 w-3" /> Linked
                            </span>
                          )}
                        </div>

                        {/* ABHA Address */}
                        <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-1">
                          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700">ABHA Address:</span>
                          <span className="font-mono text-slate-800 truncate" title={patient.abha_address || undefined}>
                            {patient.abha_address || "None"}
                          </span>
                        </div>
                      </div>

                      {/* Associated Data Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[11px] text-slate-600">
                        <span className="font-medium text-slate-400">Associated Data:</span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          <span className="font-semibold text-slate-800">{patient.opd_visit_count}</span> OPD Visits
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          <span className="font-semibold text-slate-800">{patient.ipd_admission_count}</span> IPD Stays
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          <span className="font-semibold text-slate-800">{patient.day_care_visit_count}</span> Day Care
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          <span className="font-semibold text-slate-800">{patient.invoice_count}</span> Invoices
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          <span className="font-semibold text-slate-800">{patient.prescription_count}</span> Rx
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          <span className="font-semibold text-slate-800">{patient.episode_count}</span> Episodes
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          <span className="font-semibold text-slate-800">{patient.lab_booking_count}</span> Labs
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex shrink-0 items-center gap-2 pt-3 border-t border-slate-100 lg:border-t-0 lg:pt-0">
                      {/* Unlink ABHA */}
                      <button
                        onClick={() => {
                          setPatientToUnlink(patient);
                          setUnlinkReason("");
                        }}
                        disabled={!hasAbha}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm transition ${
                          hasAbha
                            ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400"
                            : "border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                        }`}
                        title={hasAbha ? "Unlink ABHA and clear ABHA data" : "No ABHA linked to this patient"}
                      >
                        <Unlink className="h-4 w-4 text-amber-600" />
                        Unlink ABHA
                      </button>

                      {/* Delete Patient */}
                      <button
                        onClick={() => {
                          setPatientToDelete(patient);
                          setDeleteConfirmText("");
                          setDeleteReason("");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 hover:border-rose-400 hover:text-rose-900"
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                        Delete Patient
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : hasSearched ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <UserX className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-800">No matching patients found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              We could not find any patient in this tenant matching &quot;{searchQuery}&quot;. Please verify the tenant and search input.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <Search className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-800">Search for Patient Records</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Select the hospital tenant above, enter a full 10-digit mobile number, 14-digit ABHA number, or ABHA address, and click Search.
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DELETE CONFIRMATION MODAL (High Safeguard: UHID Verification) */}
      {/* ------------------------------------------------------------- */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-rose-200 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Permanently Delete Patient Record?
                </h3>
                <p className="text-xs text-rose-600 font-medium mt-0.5">
                  WARNING: This action is permanent and cannot be undone!
                </p>
              </div>
            </div>

            {/* Patient Details Summary */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Patient Name:</span>
                <span className="font-bold text-slate-900">{patientToDelete.full_name || patientToDelete.first_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">UHID:</span>
                <span className="font-mono font-bold text-sky-700">{patientToDelete.uhid}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Mobile:</span>
                <span className="font-mono text-slate-900">{patientToDelete.mobile || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Records to be erased:</span>
                <span className="font-medium text-slate-900">
                  {patientToDelete.opd_visit_count} OPD, {patientToDelete.ipd_admission_count} IPD, {patientToDelete.day_care_visit_count} DayCare, {patientToDelete.invoice_count} Bills, {patientToDelete.prescription_count} Rx, {patientToDelete.episode_count} ABDM Episodes
                </span>
              </div>
            </div>

            {/* Optional Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Deletion (Optional - recorded in Audit Trail):
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Patient data purge, GDPR request, duplicate patient test data"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* Confirmation Box */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-800">
                To confirm deletion, please type the UHID{" "}
                <span className="font-mono text-rose-600 select-all">{patientToDelete.uhid}</span> below:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Type ${patientToDelete.uhid}`}
                className="w-full rounded-xl border border-rose-300 bg-rose-50/40 px-3.5 py-2.5 font-mono text-sm font-semibold text-slate-900 shadow-sm focus:border-rose-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-600/20"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPatientToDelete(null);
                  setDeleteConfirmText("");
                  setDeleteReason("");
                }}
                disabled={isDeleting}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeletePatient}
                disabled={
                  isDeleting ||
                  deleteConfirmText.trim().toUpperCase() !== patientToDelete.uhid.toUpperCase()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-rose-700 disabled:opacity-40"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Deleting Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* UNLINK ABHA MODAL */}
      {/* ------------------------------------------------------------- */}
      {patientToUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-amber-200 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Unlink className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Unlink ABHA &amp; Clear ABHA Data?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dissociates ABHA identity while retaining patient hospital clinical records
                </p>
              </div>
            </div>

            {/* Explanation Alert */}
            <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="h-4 w-4 text-amber-700 shrink-0" />
                What will happen:
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-800">
                <li>Patient&apos;s ABHA Number ({patientToUnlink.abha_number || "N/A"}) and ABHA Address ({patientToUnlink.abha_address || "N/A"}) will be cleared.</li>
                <li>Cached ABDM link tokens, active user-linking sessions, and consents will be wiped.</li>
                <li>ABDM care context episodes will be reset to <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">unlinked</code> status.</li>
                <li>Hospital appointments, OPD visits, IPD stays, prescriptions, and bills remain completely safe.</li>
              </ul>
            </div>

            {/* Optional Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Unlinking (Optional - recorded in Audit Trail):
              </label>
              <input
                type="text"
                value={unlinkReason}
                onChange={(e) => setUnlinkReason(e.target.value)}
                placeholder="e.g. Patient provided wrong ABHA ID during intake"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPatientToUnlink(null);
                  setUnlinkReason("");
                }}
                disabled={isUnlinking}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeUnlinkAbha}
                disabled={isUnlinking}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-amber-700 disabled:opacity-50"
              >
                {isUnlinking ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Unlinking...
                  </>
                ) : (
                  <>
                    <Unlink className="h-3.5 w-3.5" />
                    Unlink &amp; Clear ABHA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
