"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchDiagnoses, updateDiagnosis, deleteDiagnosis } from "@/redux/diagnosesSlice";
import { DiagnosisForm } from "./DiagnosisForm";
import { BulkImportModal } from "./BulkImportModal";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "../common/Modal";
import { ConfirmationDialog } from "../common/ConfirmationDialog";
import {
    FileText,
    RefreshCcw,
    Search,
    ToggleLeft,
    ToggleRight,
    Filter,
    Plus,
    Edit,
    Trash2,
    Upload,
    Power,
    PowerOff,
    Building2,
} from "lucide-react";
import { Diagnosis } from "@/services/diagnosesApi";
import { isPlatformOwner } from "@/utils/auth";
import { tenantsApi, Tenant } from "@/services/tenantsApi";

const DEFAULT_QUERY = { page: 1, page_size: 20, status: "active" as const };

export function DiagnosesPanel() {
    const dispatch = useAppDispatch();
    const { items, loading, total, lastQuery, updatingId, deletingId } = useAppSelector(
        (s) => s.diagnoses
    );

    const [search, setSearch] = useState("");
    const [onlyActive, setOnlyActive] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [editingDiagnosis, setEditingDiagnosis] = useState<Diagnosis | null>(null);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>("");
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);

    const isPlatformOwnerUser = isPlatformOwner();

    // Fetch tenants for Platform Owner
    const loadTenants = useCallback(async () => {
        if (isPlatformOwnerUser) {
            try {
                const response = await tenantsApi.list({ page: 1, page_size: 100 });
                setTenants(response.items);
            } catch (error) {
                console.error("Failed to fetch tenants:", error);
            }
        }
    }, [isPlatformOwnerUser]);

    useEffect(() => {
        loadTenants();
    }, [loadTenants]);

    useEffect(() => {
        dispatch(fetchDiagnoses({ ...DEFAULT_QUERY, tenant_id: selectedTenantId || undefined }));
    }, [dispatch, selectedTenantId]);

    useEffect(() => {
        const handler = setTimeout(() => {
            dispatch(
                fetchDiagnoses({
                    page: 1,
                    page_size: DEFAULT_QUERY.page_size,
                    search: search.trim() || undefined,
                    status: onlyActive ? "active" : undefined,
                    tenant_id: selectedTenantId || undefined,
                })
            );
        }, 320);

        return () => clearTimeout(handler);
    }, [search, onlyActive, selectedTenantId, dispatch]);

    const categories = useMemo(
        () => Array.from(new Set(items.map((d) => d.category).filter(Boolean))).sort(),
        [items]
    );

    const handleToggleActive = async (id: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === "active" ? "inactive" : "active";
            await dispatch(updateDiagnosis({ id, updates: { status: newStatus }, tenantId: selectedTenantId || undefined })).unwrap();
            toast.success(`Diagnosis ${newStatus === "active" ? "activated" : "deactivated"}`);
            dispatch(fetchDiagnoses({ ...(lastQuery || DEFAULT_QUERY), tenant_id: selectedTenantId || undefined }));
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleDeleteClick = (id: string, name: string) => {
        setDeleteConfirmation({ id, name });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmation) return;

        try {
            await dispatch(deleteDiagnosis({ id: deleteConfirmation.id, tenantId: selectedTenantId || undefined })).unwrap();
            toast.success("Diagnosis deleted successfully");
            dispatch(fetchDiagnoses({ ...(lastQuery || DEFAULT_QUERY), tenant_id: selectedTenantId || undefined }));
            setDeleteConfirmation(null);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const refresh = () => {
        dispatch(fetchDiagnoses({ ...(lastQuery || DEFAULT_QUERY), tenant_id: selectedTenantId || undefined }));
    };

    const handleDiagnosisCreated = () => {
        refresh();
        setShowAddModal(false);
    };

    const handleBulkImportSuccess = () => {
        refresh();
        setShowBulkImportModal(false);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Diagnosis Master</p>
                        <p className="text-xs text-slate-500">
                            Manage diagnosis codes, ICD mappings, and categories.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={refresh}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-300"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Refresh
                        </button>
                        {isPlatformOwnerUser && (
                            <button
                                onClick={() => setShowBulkImportModal(true)}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-300"
                            >
                                <Upload className="h-4 w-4" />
                                Bulk Import
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                        >
                            <Plus className="h-4 w-4" />
                            Add Diagnosis
                        </button>
                    </div>
                </div>

                {/* Tenant Selector for Platform Owner */}
                {isPlatformOwnerUser && tenants.length > 0 && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                        <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-sky-600" />
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-sky-900 mb-1 block">
                                    Select Tenant
                                </label>
                                <select
                                    value={selectedTenantId}
                                    onChange={(e) => setSelectedTenantId(e.target.value)}
                                    className="w-full rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                                >
                                    <option value="">All Tenants (Global)</option>
                                    {tenants.map((tenant) => (
                                        <option key={tenant.id} value={tenant.id}>
                                            {tenant.name} ({tenant.subdomain})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, code, description, category, or ICD codes"
                            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <p className="text-xs text-slate-600">
                            {onlyActive ? "Showing active diagnoses" : "Showing all diagnoses"}
                        </p>
                    </div>
                    <button
                        onClick={() => setOnlyActive((prev) => !prev)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-sky-300"
                    >
                        {onlyActive ? (
                            <>
                                <ToggleLeft className="h-4 w-4 text-sky-500" />
                                Active only
                            </>
                        ) : (
                            <>
                                <ToggleRight className="h-4 w-4 text-emerald-500" />
                                Include inactive
                            </>
                        )}
                    </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="grid grid-cols-8 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                        <div>Code</div>
                        <div className="col-span-2">Name</div>
                        <div>Category</div>
                        <div>ICD-10</div>
                        <div>ICD-11</div>
                        <div className="text-center">Status</div>
                        <div className="text-right">Actions</div>
                    </div>

                    {loading ? (
                        <div className="p-4">
                            <SkeletonRow rows={4} />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500">
                            No diagnoses found. Add a new diagnosis to get started.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {items.map((diagnosis) => (
                                <div
                                    key={diagnosis.id}
                                    className="grid grid-cols-8 items-center px-4 py-3 text-sm text-slate-800"
                                >
                                    <div className="font-semibold text-slate-900">{diagnosis.diagnosis_code}</div>
                                    <div className="col-span-2">
                                        <p className="font-semibold text-slate-900">{diagnosis.diagnosis_name}</p>
                                        {diagnosis.description && (
                                            <p className="text-xs text-slate-500 line-clamp-1">{diagnosis.description}</p>
                                        )}
                                    </div>
                                    <div className="text-slate-600">{diagnosis.category || "-"}</div>
                                    <div className="text-slate-600">{diagnosis.icd_10_code || "-"}</div>
                                    <div className="text-slate-600">{diagnosis.icd_11_code || "-"}</div>
                                    <div className="flex items-center justify-center">
                                        <span
                                            className={`pill ${diagnosis.status === "active"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-amber-50 text-amber-700"
                                                }`}
                                        >
                                            {diagnosis.status === "active" ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleToggleActive(diagnosis.id, diagnosis.status)}
                                            disabled={updatingId === diagnosis.id}
                                            className={`group relative flex items-center justify-center overflow-visible rounded-lg p-2 text-xs font-semibold text-white transition-all duration-300 ${diagnosis.status === "active"
                                                ? "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
                                                : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                                                } disabled:opacity-60`}
                                            style={{ width: "2rem", minWidth: "2rem" }}
                                            onMouseEnter={(e) => {
                                                if (updatingId !== diagnosis.id) {
                                                    e.currentTarget.style.width = "auto";
                                                    e.currentTarget.style.minWidth = "auto";
                                                    e.currentTarget.style.paddingLeft = "0.75rem";
                                                    e.currentTarget.style.paddingRight = "0.75rem";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.width = "2rem";
                                                e.currentTarget.style.minWidth = "2rem";
                                                e.currentTarget.style.paddingLeft = "0.5rem";
                                                e.currentTarget.style.paddingRight = "0.5rem";
                                            }}
                                            title={diagnosis.status === "active" ? "Deactivate" : "Activate"}
                                        >
                                            {diagnosis.status === "active" ? (
                                                <>
                                                    <PowerOff className="h-4 w-4 shrink-0" />
                                                    <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline-block">
                                                        Deactivate
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Power className="h-4 w-4 shrink-0" />
                                                    <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline-block">
                                                        Activate
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(diagnosis.id, diagnosis.diagnosis_name)}
                                            disabled={deletingId === diagnosis.id}
                                            className="group relative flex items-center justify-center overflow-visible rounded-lg bg-gradient-to-r from-rose-500 to-red-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:from-rose-600 hover:to-red-600 disabled:opacity-60"
                                            style={{ width: "2rem", minWidth: "2rem" }}
                                            onMouseEnter={(e) => {
                                                if (deletingId !== diagnosis.id) {
                                                    e.currentTarget.style.width = "auto";
                                                    e.currentTarget.style.minWidth = "auto";
                                                    e.currentTarget.style.paddingLeft = "0.75rem";
                                                    e.currentTarget.style.paddingRight = "0.75rem";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.width = "2rem";
                                                e.currentTarget.style.minWidth = "2rem";
                                                e.currentTarget.style.paddingLeft = "0.5rem";
                                                e.currentTarget.style.paddingRight = "0.5rem";
                                            }}
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4 shrink-0" />
                                            <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline-block">
                                                Delete
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                    <p>Total: {total} diagnoses</p>
                    <p>Filters auto-apply; use Refresh to reload.</p>
                </div>
            </div>

            {/* Add Diagnosis Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add Diagnosis"
                size="md"
            >
                <DiagnosisForm onCreated={handleDiagnosisCreated} tenantId={selectedTenantId || undefined} />
            </Modal>

            {/* Bulk Import Modal - Platform Owner Only */}
            {isPlatformOwnerUser && (
                <BulkImportModal
                    isOpen={showBulkImportModal}
                    onClose={() => setShowBulkImportModal(false)}
                    onSuccess={handleBulkImportSuccess}
                    tenantId={selectedTenantId || undefined}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Diagnosis"
                message={`Are you sure you want to delete "${deleteConfirmation?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                isLoading={deletingId === deleteConfirmation?.id}
            />
        </div>
    );
}
