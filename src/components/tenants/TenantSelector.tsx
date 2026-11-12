"use client";

import { useEffect, useRef, useState } from "react";
import { tenantsApi, Tenant, TenantStatus } from "@/services/tenantsApi";
import {
  Building2,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface TenantSelectorProps {
  selectedTenantId: string;
  onSelectTenant: (tenant: Tenant) => void;
  onTenantResolved?: (tenant: Tenant) => void;
  autoSelectFirst?: boolean;
  label?: string;
}

const getStatusBadgeClass = (status: TenantStatus) => {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "inactive":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "suspended":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

export function TenantSelector({
  selectedTenantId,
  onSelectTenant,
  onTenantResolved,
  autoSelectFirst = true,
  label = "Select Hospital Tenant",
}: TenantSelectorProps) {
  const [defaultTenants, setDefaultTenants] = useState<Tenant[]>([]);
  const [selectedTenantObj, setSelectedTenantObj] = useState<Tenant | null>(null);
  const [tenantFilterText, setTenantFilterText] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const [isLoadingDefault, setIsLoadingDefault] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedTenants, setSearchedTenants] = useState<Tenant[]>([]);
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantTotalPages, setTenantTotalPages] = useState(1);
  const [tenantTotalCount, setTenantTotalCount] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const onSelectRef = useRef(onSelectTenant);
  const onResolvedRef = useRef(onTenantResolved);

  useEffect(() => {
    onSelectRef.current = onSelectTenant;
    onResolvedRef.current = onTenantResolved;
  }, [onSelectTenant, onTenantResolved]);

  // Initial batch load of tenants
  useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      setIsLoadingDefault(true);
      try {
        const res = await tenantsApi.list({ page_size: 100 });
        if (!isMounted) return;
        const items = res.items || [];
        setDefaultTenants(items);

        if (selectedTenantId) {
          const match = items.find((t) => t.id === selectedTenantId);
          if (match) {
            setSelectedTenantObj(match);
            onResolvedRef.current?.(match);
          } else {
            try {
              const single = await tenantsApi.getById(selectedTenantId);
              if (isMounted && single) {
                setSelectedTenantObj(single);
                onResolvedRef.current?.(single);
              }
            } catch {
              // Tenant may not exist or failed to load; table request handles 404
            }
          }
        } else if (autoSelectFirst && items.length > 0) {
          const firstActive = items.find((t) => t.status === "active") || items[0];
          setSelectedTenantObj(firstActive);
          onSelectRef.current(firstActive);
        }
      } catch (err) {
        console.error("Failed to load tenants:", err);
        toast.error("Failed to load hospital tenants");
      } finally {
        if (isMounted) setIsLoadingDefault(false);
      }
    };

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [autoSelectFirst, selectedTenantId]);

  // Keep selectedTenantObj synced when selectedTenantId changes externally
  useEffect(() => {
    if (!selectedTenantId) {
      setSelectedTenantObj(null);
      return;
    }
    const existing =
      defaultTenants.find((t) => t.id === selectedTenantId) ||
      searchedTenants.find((t) => t.id === selectedTenantId);
    if (existing) {
      setSelectedTenantObj(existing);
      onResolvedRef.current?.(existing);
    }
  }, [selectedTenantId, defaultTenants, searchedTenants]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced backend search when >= 3 chars
  useEffect(() => {
    const trimmed = tenantFilterText.trim();
    if (trimmed.length < 3) {
      setSearchedTenants([]);
      setTenantTotalPages(1);
      setTenantTotalCount(0);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await tenantsApi.list({
          search: trimmed,
          page: tenantPage,
          page_size: 20,
        });
        setSearchedTenants(res.items || []);
        setTenantTotalPages(res.total_pages || 1);
        setTenantTotalCount(res.total || 0);
      } catch (err) {
        console.error("Failed to search tenants:", err);
        toast.error("Failed to search hospitals");
        setSearchedTenants([]);
      } finally {
        setIsSearching(false);
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
          t.id.toLowerCase().includes(q)
        );
      });

  const selectedTenant =
    selectedTenantObj ||
    searchedTenants.find((t) => t.id === selectedTenantId) ||
    defaultTenants.find((t) => t.id === selectedTenantId) ||
    null;

  return (
    <div ref={dropdownRef} className="w-full">
      <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
        <span>{label}</span>
        <span className="text-[10px] font-medium text-slate-400 normal-case">
          {isBackendSearchActive
            ? `${tenantTotalCount} matching`
            : `${defaultTenants.length} loaded`}
        </span>
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (!isLoadingDefault) {
              setIsOpen((prev) => !prev);
            }
          }}
          disabled={isLoadingDefault}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-50/70 px-3.5 py-2.5 text-left text-sm font-medium text-slate-900 shadow-xs transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50 ${
            isOpen ? "border-sky-500 bg-white ring-2 ring-sky-500/20" : "border-slate-200"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              {isLoadingDefault ? (
                <span className="text-xs text-slate-400">Loading hospitals...</span>
              ) : selectedTenant ? (
                <div className="flex flex-wrap items-center gap-1.5 truncate">
                  <span className="truncate font-semibold text-slate-900">
                    {selectedTenant.name}
                  </span>
                  {selectedTenant.subdomain && (
                    <span className="shrink-0 rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                      @{selectedTenant.subdomain}
                    </span>
                  )}
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${getStatusBadgeClass(
                      selectedTenant.status
                    )}`}
                  >
                    {selectedTenant.status}
                  </span>
                </div>
              ) : (
                <span className="text-slate-400">Select a hospital tenant...</span>
              )}
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-sky-600" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 flex max-h-96 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-slate-50/90 p-2.5 space-y-1.5">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={tenantFilterText}
                  onChange={(e) => {
                    setTenantFilterText(e.target.value);
                    setTenantPage(1);
                  }}
                  placeholder="Search hospital by name, city, subdomain..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 shadow-xs focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                {tenantFilterText && (
                  <button
                    type="button"
                    onClick={() => {
                      setTenantFilterText("");
                      setTenantPage(1);
                    }}
                    className="absolute right-2.5 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Clear tenant search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between px-1 text-[10px] text-slate-500">
                {isSearching ? (
                  <div className="flex items-center gap-1 text-sky-600 font-medium">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Searching server for &quot;{tenantFilterText}&quot;...</span>
                  </div>
                ) : isBackendSearchActive ? (
                  <div className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle className="h-3 w-3" />
                    <span>
                      Found {tenantTotalCount} hospitals (Page {tenantPage}/{tenantTotalPages})
                    </span>
                  </div>
                ) : tenantFilterText.trim().length > 0 ? (
                  <span className="text-amber-600 font-medium">
                    Filtering loaded list • Type ≥3 letters for server search
                  </span>
                ) : (
                  <span>Showing {defaultTenants.length} hospitals</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 divide-y divide-slate-50 min-h-[120px] max-h-60">
              {isSearching ? (
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
                        setSelectedTenantObj(t);
                        setIsOpen(false);
                        setTenantFilterText("");
                        onSelectTenant(t);
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
                          <span
                            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold capitalize ${getStatusBadgeClass(
                              t.status
                            )}`}
                          >
                            {t.status}
                          </span>
                          {t.plan && (
                            <span className="rounded bg-sky-100/70 px-1.5 py-0.5 text-[9px] uppercase font-bold text-sky-700">
                              {t.plan}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          {t.subdomain && (
                            <span className="font-mono text-slate-600">@{t.subdomain}</span>
                          )}
                          {(t.city || t.state) && (
                            <span>• {[t.city, t.state].filter(Boolean).join(", ")}</span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-xs">
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
                    No hospital matches &quot;{tenantFilterText}&quot;
                  </p>
                </div>
              )}
            </div>

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
                    disabled={tenantPage <= 1 || isSearching}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    disabled={tenantPage >= tenantTotalPages || isSearching}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
  );
}
