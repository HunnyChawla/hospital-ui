"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Settings,
    Save,
    Loader2,
    Building2,
    IdCard,
    Share2,
    FileText,
    CheckCircle2,
    Shield,
    Layers,
    MessageSquare,
    Search,
    ChevronDown,
    X,
    Check,
    RefreshCw,
    KeyRound,
    Pencil,
    Sparkles,
    AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { abhaApi, type TenantAbdmConfigDto } from "@/services/abhaApi";
import { useFeatureFlags, resolveAbdmEnabled } from "@/hooks/useFeatureFlags";
import { tenantsApi, type Tenant } from "@/services/tenantsApi";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/utils/errorHandler";


export function FeatureFlagManagement() {
    const { userRole } = usePermissions();
    const isPlatformOwner = userRole === "platform_owner";

    const [selectedTenantId, setSelectedTenantId] = useState<string>(() => {
        // Initialize from localStorage if available
        if (typeof window !== 'undefined') {
            return localStorage.getItem('tenant_id') || '';
        }
        return '';
    });
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [page, setPage] = useState(1);
    const [totalTenants, setTotalTenants] = useState(0);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeTenantOverride, setActiveTenantOverride] = useState<Tenant | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const isFirstSearchRun = useRef(true);

    const { allFlags, isLoading, updateFlags, isUpdating, refetch } = useFeatureFlags();

    const [queueFlags, setQueueFlags] = useState({
        allow_doctor_pick_any: false,
        allow_optometrist_pick_any: false,
    });

    const [prescriptionFlags, setPrescriptionFlags] = useState({
        allow_edit_after_finalize: false,
        allow_edit_after_visit_completed: false,
    });

    const [isAbdmEnabled, setIsAbdmEnabled] = useState<boolean>(false);
    const [autoInviteUnlinked, setAutoInviteUnlinked] = useState<boolean>(false);
    const [useBlackSmsForOtp, setUseBlackSmsForOtp] = useState<boolean>(false);

    const [clinicPanelFlags, setClinicPanelFlags] = useState({
        enabled: false,
    });

    // ABDM Facility & Token Management State
    const [abdmConfig, setAbdmConfig] = useState<TenantAbdmConfigDto | null>(null);
    const [loadingAbdmConfig, setLoadingAbdmConfig] = useState<boolean>(false);

    // Onboarding Modal State
    const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
    const [onboardHipId, setOnboardHipId] = useState("");
    const [onboardHipName, setOnboardHipName] = useState("");
    const [onboardCallbackUrl, setOnboardCallbackUrl] = useState("");
    const [isOnboarding, setIsOnboarding] = useState(false);

    // Token Rotation Modal State
    const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
    const [isRotating, setIsRotating] = useState(false);

    // Edit Details Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editHipId, setEditHipId] = useState("");
    const [editHipName, setEditHipName] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isDropdownOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isDropdownOpen]);

    // Fetch initial batch of 50 tenants for platform owners
    useEffect(() => {
        if (!isPlatformOwner) return;

        let isMounted = true;
        const fetchInitialTenants = async () => {
            setLoadingTenants(true);
            try {
                const response = await tenantsApi.list({ status: "active", page: 1, page_size: 50 });
                if (!isMounted) return;

                let loadedTenants = response.items;
                setTotalTenants(response.total);
                setPage(1);

                // Only auto-select first tenant if no tenant is selected
                const currentTenantId = localStorage.getItem('tenant_id');
                if (loadedTenants.length > 0 && !currentTenantId) {
                    const firstTenantId = loadedTenants[0].id;
                    setSelectedTenantId(firstTenantId);
                    localStorage.setItem('tenant_id', firstTenantId);
                } else if (currentTenantId) {
                    const exists = loadedTenants.some(t => t.id === currentTenantId);
                    if (!exists) {
                        try {
                            const specificTenant = await tenantsApi.getById(currentTenantId);
                            if (isMounted && specificTenant) {
                                setActiveTenantOverride(specificTenant);
                                loadedTenants = [specificTenant, ...loadedTenants];
                            }
                        } catch {
                            // Ignore if individual tenant fetch fails
                        }
                    }
                }
                setTenants(loadedTenants);
            } catch (error) {
                console.error("Failed to fetch initial tenants:", error);
            } finally {
                if (isMounted) setLoadingTenants(false);
            }
        };
        fetchInitialTenants();

        return () => {
            isMounted = false;
        };
    }, [isPlatformOwner]);

    // Debounce search query
    useEffect(() => {
        if (!isPlatformOwner) return;
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, isPlatformOwner]);

    // Execute search when debounced query changes
    useEffect(() => {
        if (!isPlatformOwner) return;
        if (isFirstSearchRun.current) {
            isFirstSearchRun.current = false;
            return;
        }

        let isMounted = true;
        const executeSearch = async () => {
            setLoadingTenants(true);
            try {
                const response = await tenantsApi.list({
                    status: "active",
                    search: debouncedSearchQuery.trim() || undefined,
                    page: 1,
                    page_size: 50,
                });
                if (!isMounted) return;

                let loadedTenants = response.items;
                if (!debouncedSearchQuery.trim() && selectedTenantId) {
                    const exists = loadedTenants.some(t => t.id === selectedTenantId);
                    if (!exists && activeTenantOverride) {
                        loadedTenants = [activeTenantOverride, ...loadedTenants];
                    }
                }
                setTenants(loadedTenants);
                setTotalTenants(response.total);
                setPage(1);
            } catch (error) {
                console.error("Failed to search tenants:", error);
            } finally {
                if (isMounted) setLoadingTenants(false);
            }
        };

        executeSearch();
        return () => {
            isMounted = false;
        };
    }, [debouncedSearchQuery, isPlatformOwner, selectedTenantId, activeTenantOverride]);

    // Infinite scroll handler: load next 50 on reaching bottom of dropdown list
    const handleDropdownScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 40) {
            if (tenants.length < totalTenants && !loadingMore && !loadingTenants) {
                setLoadingMore(true);
                const nextPage = page + 1;
                try {
                    const response = await tenantsApi.list({
                        status: "active",
                        search: debouncedSearchQuery.trim() || undefined,
                        page: nextPage,
                        page_size: 50,
                    });
                    setTenants(prev => {
                        const existingIds = new Set(prev.map(t => t.id));
                        const uniqueNew = response.items.filter(t => !existingIds.has(t.id));
                        return [...prev, ...uniqueNew];
                    });
                    setPage(nextPage);
                    setTotalTenants(response.total);
                } catch (error) {
                    console.error("Failed to fetch more tenants on scroll:", error);
                } finally {
                    setLoadingMore(false);
                }
            }
        }
    };

    // Update local state when flags are loaded
    useEffect(() => {
        if (allFlags?.queue) {
            setQueueFlags({
                allow_doctor_pick_any: allFlags.queue.allow_doctor_pick_any as boolean,
                allow_optometrist_pick_any: allFlags.queue.allow_optometrist_pick_any as boolean,
            });
        }
        if (allFlags?.prescription) {
            setPrescriptionFlags({
                allow_edit_after_finalize: allFlags.prescription.allow_edit_after_finalize as boolean,
                allow_edit_after_visit_completed: allFlags.prescription.allow_edit_after_visit_completed as boolean,
            });
        }
        const abdmActive = resolveAbdmEnabled(allFlags);
        setIsAbdmEnabled(abdmActive);
        if (allFlags?.abdm?.m2_auto_invite_unlinked !== undefined) {
            setAutoInviteUnlinked(Boolean(allFlags.abdm.m2_auto_invite_unlinked));
        } else {
            setAutoInviteUnlinked(false);
        }
        if (allFlags?.abdm?.use_black_sms_for_otp !== undefined) {
            setUseBlackSmsForOtp(Boolean(allFlags.abdm.use_black_sms_for_otp));
        } else {
            setUseBlackSmsForOtp(false);
        }
        if (allFlags?.clinic_panel) {
            setClinicPanelFlags({
                enabled: allFlags.clinic_panel.enabled as boolean,
            });
        }
    }, [allFlags]);

    const handleSaveQueue = () => {
        updateFlags({ feature: 'queue', flags: queueFlags });
    };

    const handleSavePrescription = () => {
        updateFlags({ feature: 'prescription', flags: prescriptionFlags });
    };

    const fetchAbdmConfig = useCallback(async () => {
        if (!selectedTenantId) return;
        try {
            setLoadingAbdmConfig(true);
            const cfg = await abhaApi.getConfig(selectedTenantId);
            setAbdmConfig(cfg);
        } catch {
            setAbdmConfig(null);
        } finally {
            setLoadingAbdmConfig(false);
        }
    }, [selectedTenantId]);

    useEffect(() => {
        fetchAbdmConfig();
    }, [fetchAbdmConfig]);

    const openOnboardModal = () => {
        setOnboardHipId(abdmConfig?.hip_id || "");
        setOnboardHipName(abdmConfig?.hip_name || selectedTenant?.name || "");
        setOnboardCallbackUrl(typeof window !== "undefined" ? window.location.origin : "");
        setIsOnboardModalOpen(true);
    };

    const openEditModal = () => {
        setEditHipId(abdmConfig?.hip_id || "");
        setEditHipName(abdmConfig?.hip_name || selectedTenant?.name || "");
        setIsEditModalOpen(true);
    };

    const handleOnboardSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenantId || !onboardHipId.trim() || !onboardHipName.trim()) {
            toast.error("Facility ID and Name are required.");
            return;
        }
        try {
            setIsOnboarding(true);
            const res = await abhaApi.onboardTenant({
                tenant_id: selectedTenantId,
                hip_id: onboardHipId.trim(),
                hip_name: onboardHipName.trim(),
                callback_url: onboardCallbackUrl.trim() || null,
                milestone: "m3",
            });
            setAbdmConfig(res);
            setIsAbdmEnabled(true);
            setIsOnboardModalOpen(false);
            toast.success("Facility onboarded! ABDM enabled & bridge routing synced.");
            await refetch();
        } catch (err: any) {
            const msg = getErrorMessage(err) || "Failed to onboard tenant";
            toast.error(msg);
        } finally {
            setIsOnboarding(false);
        }
    };

    const handleRotateToken = async () => {
        if (!selectedTenantId) return;
        try {
            setIsRotating(true);
            await abhaApi.rotateTenantToken(selectedTenantId);
            toast.success("ABDM token rotated successfully. Outbound calls now carry the new JWT.");
            setIsRotateModalOpen(false);
            await fetchAbdmConfig();
        } catch (err: any) {
            const msg = getErrorMessage(err) || "Failed to rotate token";
            toast.error(msg);
        } finally {
            setIsRotating(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenantId || !editHipId.trim() || !editHipName.trim()) {
            toast.error("Facility ID and Name are required.");
            return;
        }
        try {
            setIsEditing(true);
            const res = await abhaApi.updateConfig({
                hip_id: editHipId.trim(),
                hip_name: editHipName.trim(),
            }, selectedTenantId);
            setAbdmConfig(res);
            setIsEditModalOpen(false);
            toast.success("ABDM facility configuration updated.");
        } catch (err: any) {
            const msg = getErrorMessage(err) || "Failed to update configuration";
            toast.error(msg);
        } finally {
            setIsEditing(false);
        }
    };

    const handleSaveAbdm = () => {
        if (isPlatformOwner && isAbdmEnabled && !abdmConfig?.hip_id) {
            openOnboardModal();
            return;
        }
        updateFlags({
            feature: 'abdm',
            flags: {
                enabled: isAbdmEnabled,
                milestone: isAbdmEnabled ? "m3" : "none",
                auto_invite_unlinked: isAbdmEnabled ? autoInviteUnlinked : false,
                use_black_sms_for_otp: isAbdmEnabled ? useBlackSmsForOtp : false,
            }
        });
        updateFlags({
            feature: 'abha',
            flags: { enabled: isAbdmEnabled }
        });
    };

    const handleSaveClinicPanel = () => {
        updateFlags({ feature: 'clinic_panel', flags: clinicPanelFlags });
    };

    const selectedTenant = tenants.find(t => t.id === selectedTenantId) || activeTenantOverride;

    const handleTenantChange = async (newTenantId: string) => {
        setSelectedTenantId(newTenantId);
        setIsDropdownOpen(false);
        const match = tenants.find(t => t.id === newTenantId);
        if (match) setActiveTenantOverride(match);
        // Store in localStorage so API calls use this tenant
        localStorage.setItem('tenant_id', newTenantId);
        // Refetch flags for the new tenant
        await refetch();
    };

    const handleToggleAbdm = (checked: boolean) => {
        if (checked) {
            if (isPlatformOwner && !abdmConfig?.hip_id) {
                openOnboardModal();
                return;
            }
            setIsAbdmEnabled(true);
        } else {
            setIsAbdmEnabled(false);
        }
    };

    if (isLoading || (isPlatformOwner && loadingTenants)) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                    <p className="text-sm text-slate-500">Loading feature flags...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
                    <Settings className="h-5 w-5 text-sky-600" />
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">Feature Configuration</h1>
                    <p className="text-sm text-slate-500">Manage feature flags and settings for your organization</p>
                </div>
            </div>

            {/* Tenant Selector for Platform Owners */}
            {isPlatformOwner && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">Target Organization</h3>
                                <p className="text-xs text-slate-500">Select the hospital to view and configure its feature flags</p>
                            </div>
                        </div>
                        {selectedTenant && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                            </span>
                        )}
                    </div>

                    {/* Combobox Trigger */}
                    <div ref={dropdownRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(prev => !prev)}
                            className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left transition-all hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-900 truncate">
                                            {selectedTenant ? selectedTenant.name : (loadingTenants ? "Loading hospitals..." : "Select a Hospital...")}
                                        </p>
                                        {selectedTenant?.subdomain && (
                                            <span className="shrink-0 text-xs px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-mono font-medium">
                                                {selectedTenant.subdomain}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                        {selectedTenant ? (
                                            [selectedTenant.city, selectedTenant.state].filter(Boolean).join(", ") || `ID: ${selectedTenant.id}`
                                        ) : "Click to choose or search another hospital"}
                                    </p>
                                </div>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? "rotate-180 text-sky-600" : ""}`} />
                        </button>

                        {/* Dropdown Popover */}
                        {isDropdownOpen && (
                            <div className="absolute z-50 left-0 right-0 mt-2 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                {/* Search Bar */}
                                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by name, subdomain, email, or phone..."
                                            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                        />
                                        {loadingTenants ? (
                                            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-sky-600" />
                                        ) : searchQuery ? (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                {/* Options List with Infinite Scroll */}
                                <div
                                    onScroll={handleDropdownScroll}
                                    className="max-h-72 overflow-y-auto divide-y divide-slate-100"
                                >
                                    {tenants.length === 0 && !loadingTenants ? (
                                        <div className="py-8 text-center px-4">
                                            <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-slate-700">No hospitals found</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {searchQuery ? `No results matching "${searchQuery}"` : "No active tenants available"}
                                            </p>
                                        </div>
                                    ) : (
                                        tenants.map((tenant) => {
                                            const isSelected = tenant.id === selectedTenantId;
                                            return (
                                                <button
                                                    key={tenant.id}
                                                    type="button"
                                                    onClick={() => handleTenantChange(tenant.id)}
                                                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                                                        isSelected
                                                            ? "bg-sky-50/70 text-sky-900 font-semibold border-l-4 border-sky-600"
                                                            : "hover:bg-slate-50 text-slate-800"
                                                    }`}
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm truncate">{tenant.name}</span>
                                                            <span className="shrink-0 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                                                {tenant.subdomain}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                            {tenant.city && <span>{tenant.city}</span>}
                                                            {tenant.state && <span>• {tenant.state}</span>}
                                                            {tenant.phone_no && <span>• {tenant.phone_no}</span>}
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <Check className="h-4 w-4 text-sky-600 shrink-0" />
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}

                                    {/* Infinite Scroll Loading Spinner */}
                                    {loadingMore && (
                                        <div className="flex items-center justify-center gap-2 py-3 bg-slate-50/50 text-xs text-slate-500">
                                            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                                            <span>Loading more hospitals...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Status Bar */}
                                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                                    <span>
                                        Showing <strong className="text-slate-700">{tenants.length}</strong> of <strong className="text-slate-700">{totalTenants}</strong> hospitals
                                    </span>
                                    <span>
                                        {tenants.length < totalTenants ? "Scroll down for more" : "All hospitals loaded"}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Queue Management Feature */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">Queue Management</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure queue behavior for doctors and optometrists
                    </p>
                </div>

                <div className="p-6 space-y-5">
                    {/* Doctor Pick Any Patient */}
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <div className="flex items-center h-6">
                            <input
                                type="checkbox"
                                checked={queueFlags.allow_doctor_pick_any}
                                onChange={(e) => setQueueFlags(prev => ({
                                    ...prev,
                                    allow_doctor_pick_any: e.target.checked
                                }))}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-colors"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-slate-900 group-hover:text-sky-700 transition-colors">
                                Allow doctors to pick any patient
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                When enabled, doctors can pick any patient from the queue. When disabled, doctors can only pick the first patient in the queue.
                            </div>
                        </div>
                    </label>

                    {/* Optometrist Pick Any Patient */}
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <div className="flex items-center h-6">
                            <input
                                type="checkbox"
                                checked={queueFlags.allow_optometrist_pick_any}
                                onChange={(e) => setQueueFlags(prev => ({
                                    ...prev,
                                    allow_optometrist_pick_any: e.target.checked
                                }))}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-colors"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-slate-900 group-hover:text-sky-700 transition-colors">
                                Allow optometrists to pick any patient
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                When enabled, optometrists can pick any patient from the queue. When disabled, optometrists can only pick the first patient in the queue.
                            </div>
                        </div>
                    </label>

                    {/* Save Button */}
                    <div className="pt-4 border-t border-slate-200">
                        <button
                            onClick={handleSaveQueue}
                            disabled={isUpdating}
                            className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Prescription Management Feature */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">Prescription Management</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure prescription editing permissions for doctors
                    </p>
                </div>

                <div className="p-6 space-y-5">
                    {/* Allow Edit After Finalize */}
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <div className="flex items-center h-6">
                            <input
                                type="checkbox"
                                checked={prescriptionFlags.allow_edit_after_finalize}
                                onChange={(e) => setPrescriptionFlags(prev => ({
                                    ...prev,
                                    allow_edit_after_finalize: e.target.checked
                                }))}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-colors"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-slate-900 group-hover:text-sky-700 transition-colors">
                                Allow editing prescriptions after finalization
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                When enabled, doctors can edit prescriptions even after they have been finalized. When disabled, finalized prescriptions are read-only.
                            </div>
                        </div>
                    </label>

                    {/* Allow Edit After Visit Completed */}
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <div className="flex items-center h-6">
                            <input
                                type="checkbox"
                                checked={prescriptionFlags.allow_edit_after_visit_completed}
                                onChange={(e) => setPrescriptionFlags(prev => ({
                                    ...prev,
                                    allow_edit_after_visit_completed: e.target.checked
                                }))}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-colors"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-slate-900 group-hover:text-sky-700 transition-colors">
                                Allow editing prescriptions after visit completion
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                When enabled, doctors can edit prescriptions even after the visit has been marked as complete. When disabled, prescriptions from completed visits are read-only.
                            </div>
                        </div>
                    </label>

                    {/* Save Button */}
                    <div className="pt-4 border-t border-slate-200">
                        <button
                            onClick={handleSavePrescription}
                            disabled={isUpdating}
                            className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ABDM Integration Card */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-semibold text-slate-900">ABDM Integration</h2>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Ayushman Bharat Digital Mission (ABDM) integration for ABHA identity, HIP care context linking, and HIU health records
                        </p>
                    </div>
                    <div>
                        {isAbdmEnabled ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                ABDM Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                ABDM Disabled
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Facility & ABDM Bridge Connectivity Status */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Building2 className="h-4 w-4 text-slate-500" />
                                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        ABDM Facility &amp; Bridge Status
                                    </span>
                                    {loadingAbdmConfig ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                                            Checking Status...
                                        </span>
                                    ) : abdmConfig?.has_bridge_token ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                            Active Service JWT
                                        </span>
                                    ) : abdmConfig?.hip_id ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                            Configured (Legacy Key)
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                            Not Configured
                                        </span>
                                    )}
                                </div>
                                {abdmConfig?.hip_id ? (
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
                                        <span className="font-semibold text-slate-900">{abdmConfig.hip_name || "Facility"}</span>
                                        <span className="text-slate-400">•</span>
                                        <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-semibold">
                                            HIP ID: {abdmConfig.hip_id}
                                        </span>
                                        {abdmConfig.updated_at && (
                                            <>
                                                <span className="text-slate-400">•</span>
                                                <span className="text-xs text-slate-500">
                                                    Updated {new Date(abdmConfig.updated_at).toLocaleDateString()}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">
                                        This tenant has not been onboarded with a facility HIP ID on the ABDM Bridge yet.
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                                {abdmConfig?.hip_id ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={openEditModal}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                                        >
                                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                            Edit Details
                                        </button>
                                        {isPlatformOwner && (
                                            <button
                                                type="button"
                                                onClick={() => setIsRotateModalOpen(true)}
                                                disabled={isRotating}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                                            >
                                                <KeyRound className="h-3.5 w-3.5 text-amber-700" />
                                                Rotate Token
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={openOnboardModal}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Setup ABDM Facility
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Master ABDM Toggle */}
                        <div className={`rounded-xl border p-5 transition-all ${
                            isAbdmEnabled
                                ? "border-emerald-300 bg-emerald-50/20 shadow-xs"
                                : "border-slate-200 bg-white hover:border-slate-300"
                        }`}>
                            <label className="flex items-start gap-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAbdmEnabled}
                                    onChange={(e) => handleToggleAbdm(e.target.checked)}
                                    className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-md ${isAbdmEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                            <Shield className="h-4 w-4" />
                                        </div>
                                        <span className="font-semibold text-slate-900 text-base">
                                            Enable ABDM Integration
                                        </span>
                                        <span className={`text-xs px-2.5 py-0.5 rounded-md font-medium ml-auto border ${
                                            isAbdmEnabled
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-slate-100 text-slate-600 border-slate-200"
                                        }`}>
                                            {isAbdmEnabled ? "Activated (M1 + M2 + M3)" : "Disabled (Default)"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                        When enabled, all ABDM features are activated for this hospital: patient ABHA creation &amp; verification (M1), hospital care context linking &amp; health data sharing (M2), and HIU external health record viewing (M3). When disabled, all ABDM-related activities and screens remain hidden.
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* Optional Sub-options (Only available when ABDM is enabled) */}
                        {isAbdmEnabled && (
                            <div className="space-y-3 pl-4 border-l-2 border-indigo-100 mt-2">
                                {/* Auto-Invite Unlinked Patients via SMS */}
                                <div className={`rounded-xl border p-4 transition-all ${
                                    autoInviteUnlinked
                                        ? "border-indigo-300 bg-indigo-50/40 shadow-xs"
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                }`}>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoInviteUnlinked}
                                            onChange={(e) => setAutoInviteUnlinked(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-md ${autoInviteUnlinked ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
                                                    <MessageSquare className="h-4 w-4" />
                                                </div>
                                                <span className="font-semibold text-slate-900 text-sm">
                                                    Auto-Invite Unlinked Patients via SMS (Deep-Link SMS)
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ml-auto border ${
                                                    autoInviteUnlinked
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                                }`}>
                                                    {autoInviteUnlinked ? "Active (Auto-Send)" : "Manual On-Demand"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                When enabled, new health records for patients with a mobile number but no ABHA address automatically queue an ABDM deep-link SMS.
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                {/* Black SMS Gateway for OTP */}
                                <div className={`rounded-xl border p-4 transition-all ${
                                    useBlackSmsForOtp
                                        ? "border-amber-300 bg-amber-50/40 shadow-xs"
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                }`}>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useBlackSmsForOtp}
                                            onChange={(e) => setUseBlackSmsForOtp(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-2 focus:ring-amber-500"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-md ${useBlackSmsForOtp ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                                                    <MessageSquare className="h-4 w-4" />
                                                </div>
                                                <span className="font-semibold text-slate-900 text-sm">
                                                    Use Black SMS Gateway for OTP
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ml-auto border ${
                                                    useBlackSmsForOtp
                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                                }`}>
                                                    {useBlackSmsForOtp ? "Active (Black SMS)" : "ABDM Gateway"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                When enabled, user-initiated linking generates and delivers OTPs via Black SMS Gateway and validates them internally.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                            Current active setting for tenant: <strong className="text-slate-700">{isAbdmEnabled ? "Enabled (Full ABDM)" : "Disabled"}</strong>
                        </div>
                        <button
                            onClick={handleSaveAbdm}
                            disabled={isUpdating}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save ABDM Settings
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Clinic Panel Card */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">General Clinic Panel</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        The examiner → doctor workflow panel for general hospitals
                    </p>
                </div>
                <div className="p-6 space-y-6">
                    <label className="flex items-start gap-4 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={clinicPanelFlags.enabled}
                            onChange={(e) => setClinicPanelFlags({ enabled: e.target.checked })}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <div className="flex-1">
                            <div className="font-medium text-slate-900">
                                Enable Clinic Panel for general doctors
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                When enabled, non-ophthalmology doctors use the new Clinic Panel (with inline prescriptions and the examiner workflow) instead of the legacy Doctor Panel. Examiners always use the Clinic Panel.
                            </div>
                        </div>
                    </label>

                    {/* Save Button */}
                    <div className="pt-4 border-t border-slate-200">
                        <button
                            onClick={handleSaveClinicPanel}
                            disabled={isUpdating}
                            className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Future Features Placeholder */}
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <div className="text-slate-400 mb-2">
                    <Settings className="h-8 w-8 mx-auto mb-3 opacity-50" />
                </div>
                <h3 className="text-sm font-medium text-slate-600 mb-1">More Features Coming Soon</h3>
                <p className="text-xs text-slate-500">
                    Additional feature configurations will appear here as they become available
                </p>
            </div>

            {/* Modal: Onboard Tenant ABDM */}
            {isOnboardModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 px-6 py-5 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-700/60 rounded-xl">
                                    <Sparkles className="h-5 w-5 text-indigo-200" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold">Onboard ABDM Facility</h3>
                                    <p className="text-xs text-indigo-200 mt-0.5">
                                        Auto-configure ABDM Bridge SQLite routing and mint Tenant Service JWT
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOnboardModalOpen(false)}
                                className="rounded-lg p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleOnboardSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Facility HIP ID <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. IN0610090730"
                                    value={onboardHipId}
                                    onChange={(e) => setOnboardHipId(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    National Health Authority Registry HIP Identifier (must match registry credentials).
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Facility Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. City Care Hospital"
                                    value={onboardHipName}
                                    onChange={(e) => setOnboardHipName(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                />
                            </div>


                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Inbound Callback URL <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="url"
                                    placeholder="e.g. https://hms.example.com"
                                    value={onboardCallbackUrl}
                                    onChange={(e) => setOnboardCallbackUrl(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    The base URL where ABDM Bridge forwards inbound callbacks (defaults to HMS backend).
                                </p>
                            </div>

                            <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 p-3 text-xs text-indigo-900">
                                <strong>Security note:</strong> A Tenant Service JWT signed by HMS will be minted and stored in PostgreSQL. The ABDM Bridge SQLite database will be updated with the active JTI to permit outbound proxy requests.
                            </div>

                            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsOnboardModalOpen(false)}
                                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isOnboarding}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
                                >
                                    {isOnboarding ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Onboarding...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-3.5 w-3.5" />
                                            Mint Token &amp; Onboard
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Rotate ABDM Token */}
            {isRotateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                        <div className="bg-amber-500/10 border-b border-amber-200/80 px-6 py-4 flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
                                <KeyRound className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">Rotate ABDM Service Token</h3>
                                <p className="text-xs text-slate-600">Immediate revocation of existing token</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-700">
                                Are you sure you want to rotate the ABDM token for facility{" "}
                                <strong className="text-slate-900">{abdmConfig?.hip_name || selectedTenant?.name}</strong> (HIP ID:{" "}
                                <code className="text-xs font-mono font-bold text-indigo-700">{abdmConfig?.hip_id}</code>)?
                            </p>

                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1.5">
                                <div className="font-semibold flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                                    What happens upon rotation:
                                </div>
                                <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                                    <li>HMS backend immediately mints a fresh Tenant Service JWT.</li>
                                    <li>The ABDM Bridge SQLite registry is updated with a new active JTI and min_iat timestamp.</li>
                                    <li>Any previously issued tokens for this tenant are permanently invalidated.</li>
                                </ul>
                            </div>

                            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsRotateModalOpen(false)}
                                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRotateToken}
                                    disabled={isRotating}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
                                >
                                    {isRotating ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Rotating...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-3.5 w-3.5" />
                                            Confirm Rotate
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Edit ABDM Facility Details */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Pencil className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-base font-semibold text-slate-900">Edit ABDM Facility Details</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Facility HIP ID <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editHipId}
                                    onChange={(e) => setEditHipId(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Facility Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editHipName}
                                    onChange={(e) => setEditHipName(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isEditing}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
                                >
                                    {isEditing ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Details"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
