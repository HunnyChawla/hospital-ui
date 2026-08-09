"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, Loader2, Building2 } from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { tenantsApi, type Tenant } from "@/services/tenantsApi";
import { usePermissions } from "@/hooks/usePermissions";

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
    const [loadingTenants, setLoadingTenants] = useState(false);

    const { allFlags, isLoading, updateFlags, isUpdating, refetch } = useFeatureFlags();

    const [queueFlags, setQueueFlags] = useState({
        allow_doctor_pick_any: false,
        allow_optometrist_pick_any: false,
    });

    const [prescriptionFlags, setPrescriptionFlags] = useState({
        allow_edit_after_finalize: false,
        allow_edit_after_visit_completed: false,
    });

    const [abhaFlags, setAbhaFlags] = useState({
        enabled: false,
    });

    const [clinicPanelFlags, setClinicPanelFlags] = useState({
        enabled: false,
    });

    // Fetch tenants for platform owners
    useEffect(() => {
        if (isPlatformOwner) {
            const fetchTenants = async () => {
                setLoadingTenants(true);
                try {
                    const response = await tenantsApi.list({ status: "active" });
                    setTenants(response.items);
                    // Only auto-select first tenant if no tenant is selected
                    const currentTenantId = localStorage.getItem('tenant_id');
                    if (response.items.length > 0 && !currentTenantId) {
                        const firstTenantId = response.items[0].id;
                        setSelectedTenantId(firstTenantId);
                        localStorage.setItem('tenant_id', firstTenantId);
                    }
                } catch (error) {
                    console.error("Failed to fetch tenants:", error);
                } finally {
                    setLoadingTenants(false);
                }
            };
            fetchTenants();
        }
    }, [isPlatformOwner]);

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
        if (allFlags?.abha) {
            setAbhaFlags({
                enabled: allFlags.abha.enabled as boolean,
            });
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

    const handleSaveAbha = () => {
        updateFlags({ feature: 'abha', flags: abhaFlags });
    };

    const handleSaveClinicPanel = () => {
        updateFlags({ feature: 'clinic_panel', flags: clinicPanelFlags });
    };

    const handleTenantChange = async (newTenantId: string) => {
        setSelectedTenantId(newTenantId);
        // Store in localStorage so API calls use this tenant
        localStorage.setItem('tenant_id', newTenantId);
        // Refetch flags for the new tenant
        await refetch();
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
            {isPlatformOwner && tenants.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
                    <label className="block">
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-4 w-4 text-slate-600" />
                            <span className="text-sm font-medium text-slate-700">Select Tenant</span>
                        </div>
                        <select
                            value={selectedTenantId}
                            onChange={(e) => handleTenantChange(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            {tenants.map((tenant) => (
                                <option key={tenant.id} value={tenant.id}>
                                    {tenant.name} ({tenant.subdomain})
                                </option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs text-slate-500">
                            Configure feature flags for the selected tenant
                        </p>
                    </label>
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

            {/* ABHA Integration Card */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">ABDM / ABHA Integration</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure Ayushman Bharat Health Account (ABHA) enrollment and linking workflows
                    </p>
                </div>
                <div className="p-6 space-y-6">
                    <label className="flex items-start gap-4 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={abhaFlags.enabled}
                            onChange={(e) => setAbhaFlags({ enabled: e.target.checked })}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <div className="flex-1">
                            <div className="font-medium text-slate-900">
                                Enable ABHA Enrollment & Linking
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                When enabled, hospital staff can enroll new patients in ABHA or link existing ABHA accounts during Add Patient and in Patient Details.
                            </div>
                        </div>
                    </label>

                    {/* Save Button */}
                    <div className="pt-4 border-t border-slate-200">
                        <button
                            onClick={handleSaveAbha}
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
        </div>
    );
}
