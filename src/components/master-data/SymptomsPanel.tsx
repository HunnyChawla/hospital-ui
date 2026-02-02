"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchSymptoms, updateSymptom, deleteSymptom } from "@/redux/symptomsSlice";
import { SymptomForm } from "./SymptomForm";
import { SymptomDiagnosesLinkModal } from "./SymptomDiagnosesLinkModal";
import { SymptomBulkImportModal } from "./SymptomBulkImportModal";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "../common/Modal";
import { ConfirmationDialog } from "../common/ConfirmationDialog";
import { Pagination } from "../common/Pagination";
import {
    FileText,
    RefreshCcw,
    Search,
    ToggleLeft,
    ToggleRight,
    Plus,
    Edit,
    Trash2,
    Power,
    PowerOff,
    Building2,
    Eye,
    EyeOff,
    Link2,
    Upload,
} from "lucide-react";
import { Symptom } from "@/services/symptomsApi";
import { isPlatformOwner } from "@/utils/auth";
import { tenantsApi, Tenant } from "@/services/tenantsApi";

const DEFAULT_QUERY = { page: 1, page_size: 20, is_active: true };

export function SymptomsPanel() {
    const dispatch = useAppDispatch();
    const { items, loading, total, lastQuery, updatingId, deletingId } = useAppSelector(
        (s) => s.symptoms
    );

    const [search, setSearch] = useState("");
    const [onlyActive, setOnlyActive] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSymptom, setEditingSymptom] = useState<Symptom | null>(null);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>("");
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);
    const [linkingSymptom, setLinkingSymptom] = useState<Symptom | null>(null);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);

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
        dispatch(fetchSymptoms({ ...DEFAULT_QUERY, tenant_id: selectedTenantId || undefined }));
    }, [dispatch, selectedTenantId]);

    useEffect(() => {
        const handler = setTimeout(() => {
            dispatch(
                fetchSymptoms({
                    page: 1,
                    page_size: DEFAULT_QUERY.page_size,
                    search: search.trim() || undefined,
                    is_active: onlyActive ? true : undefined,
                    tenant_id: selectedTenantId || undefined,
                })
            );
        }, 320);

        return () => clearTimeout(handler);
    }, [search, onlyActive, selectedTenantId, dispatch]);

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const newStatus = !currentStatus;
            await dispatch(updateSymptom({ id, updates: { is_active: newStatus }, tenantId: selectedTenantId || undefined })).unwrap();
            toast.success(`Symptom ${newStatus ? "activated" : "deactivated"}`);
            dispatch(fetchSymptoms({ ...(lastQuery || DEFAULT_QUERY), tenant_id: selectedTenantId || undefined }));
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
            await dispatch(deleteSymptom({ id: deleteConfirmation.id, tenantId: selectedTenantId || undefined })).unwrap();
            toast.success("Symptom deleted successfully");
            dispatch(fetchSymptoms({ ...(lastQuery || DEFAULT_QUERY), tenant_id: selectedTenantId || undefined }));
            setDeleteConfirmation(null);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const refresh = () => {
        dispatch(fetchSymptoms({ ...(lastQuery || DEFAULT_QUERY), tenant_id: selectedTenantId || undefined }));
    };

    const handleSymptomCreated = () => {
        refresh();
        setShowAddModal(false);
    };

    const handlePageChange = (page: number) => {
        dispatch(
            fetchSymptoms({
                page,
                page_size: lastQuery?.page_size || DEFAULT_QUERY.page_size,
                search: search.trim() || undefined,
                is_active: onlyActive ? true : undefined,
                tenant_id: selectedTenantId || undefined,
            })
        );
    };

    const handleEditClick = (symptom: Symptom) => {
        setEditingSymptom(symptom);
    };

    const handleEditSuccess = () => {
        refresh();
        setEditingSymptom(null);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Symptom Master</p>
                        <p className="text-xs text-slate-500">
                            Manage symptoms with eye-specific attributes and categories.
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
                                className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
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
                            Add Symptom
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
                            placeholder="Search by symptom name, category, or description"
                            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <p className="text-xs text-slate-600">
                            {onlyActive ? "Showing active symptoms" : "Showing all symptoms"}
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
                        <div className="col-span-2">Name</div>
                        <div>Category</div>
                        <div>Eye Specific</div>
                        <div>Applicable Eye</div>
                        <div>Display Order</div>
                        <div className="text-center">Status</div>
                        <div className="text-right">Actions</div>
                    </div>

                    {loading ? (
                        <div className="p-4">
                            <SkeletonRow rows={4} />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500">
                            No symptoms found. Add a new symptom to get started.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {items.map((symptom) => (
                                <div
                                    key={symptom.id}
                                    className="grid grid-cols-8 items-center px-4 py-3 text-sm text-slate-800"
                                >
                                    <div className="col-span-2">
                                        <p className="font-semibold text-slate-900">{symptom.symptom_name}</p>
                                        {symptom.description && (
                                            <p className="text-xs text-slate-500 line-clamp-1">{symptom.description}</p>
                                        )}
                                    </div>
                                    <div className="text-slate-600">
                                        <span className="pill bg-purple-50 text-purple-700">
                                            {symptom.category}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        {symptom.is_eye_specific ? (
                                            <Eye className="h-4 w-4 text-sky-500" />
                                        ) : (
                                            <EyeOff className="h-4 w-4 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="text-slate-600">
                                        {symptom.is_eye_specific ? symptom.applicable_eye : "-"}
                                    </div>
                                    <div className="text-slate-600">{symptom.display_order || "-"}</div>
                                    <div className="flex items-center justify-center">
                                        <span
                                            className={`pill ${symptom.is_active
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-amber-50 text-amber-700"
                                                }`}
                                        >
                                            {symptom.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleToggleActive(symptom.id, symptom.is_active)}
                                            disabled={updatingId === symptom.id}
                                            className={`group relative flex items-center justify-center overflow-visible rounded-lg p-2 text-xs font-semibold text-white transition-all duration-300 ${symptom.is_active
                                                ? "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
                                                : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                                                } disabled:opacity-60`}
                                            style={{ width: "2rem", minWidth: "2rem" }}
                                            onMouseEnter={(e) => {
                                                if (updatingId !== symptom.id) {
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
                                            title={symptom.is_active ? "Deactivate" : "Activate"}
                                        >
                                            {symptom.is_active ? (
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
                                            onClick={() => setLinkingSymptom(symptom)}
                                            className="group relative flex items-center justify-center overflow-visible rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:from-purple-600 hover:to-pink-600"
                                            style={{ width: "2rem", minWidth: "2rem" }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.width = "auto";
                                                e.currentTarget.style.minWidth = "auto";
                                                e.currentTarget.style.paddingLeft = "0.75rem";
                                                e.currentTarget.style.paddingRight = "0.75rem";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.width = "2rem";
                                                e.currentTarget.style.minWidth = "2rem";
                                                e.currentTarget.style.paddingLeft = "0.5rem";
                                                e.currentTarget.style.paddingRight = "0.5rem";
                                            }}
                                            title="Link Diagnoses"
                                        >
                                            <Link2 className="h-4 w-4 shrink-0" />
                                            <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline-block">
                                                Link Diagnoses
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleEditClick(symptom)}
                                            className="group relative flex items-center justify-center overflow-visible rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:from-sky-600 hover:to-blue-600"
                                            style={{ width: "2rem", minWidth: "2rem" }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.width = "auto";
                                                e.currentTarget.style.minWidth = "auto";
                                                e.currentTarget.style.paddingLeft = "0.75rem";
                                                e.currentTarget.style.paddingRight = "0.75rem";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.width = "2rem";
                                                e.currentTarget.style.minWidth = "2rem";
                                                e.currentTarget.style.paddingLeft = "0.5rem";
                                                e.currentTarget.style.paddingRight = "0.5rem";
                                            }}
                                            title="Edit"
                                        >
                                            <Edit className="h-4 w-4 shrink-0" />
                                            <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline-block">
                                                Edit
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(symptom.id, symptom.symptom_name)}
                                            disabled={deletingId === symptom.id}
                                            className="group relative flex items-center justify-center overflow-visible rounded-lg bg-gradient-to-r from-rose-500 to-red-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:from-rose-600 hover:to-red-600 disabled:opacity-60"
                                            style={{ width: "2rem", minWidth: "2rem" }}
                                            onMouseEnter={(e) => {
                                                if (deletingId !== symptom.id) {
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

                <div className="border-t border-slate-200">
                    <Pagination
                        currentPage={lastQuery?.page || 1}
                        total={total}
                        pageSize={lastQuery?.page_size || DEFAULT_QUERY.page_size}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>

            {/* Add Symptom Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add Symptom"
                size="md"
            >
                <SymptomForm onCreated={handleSymptomCreated} tenantId={selectedTenantId || undefined} />
            </Modal>

            <Modal
                isOpen={!!editingSymptom}
                onClose={() => setEditingSymptom(null)}
                title="Edit Symptom"
                size="md"
            >
                {editingSymptom && (
                    <SymptomForm
                        onCreated={handleEditSuccess}
                        tenantId={selectedTenantId || undefined}
                        initialData={editingSymptom}
                    />
                )}
            </Modal>

            {/* Link Diagnoses Modal */}
            {linkingSymptom && (
                <SymptomDiagnosesLinkModal
                    isOpen={!!linkingSymptom}
                    onClose={() => setLinkingSymptom(null)}
                    symptom={linkingSymptom}
                    tenantId={selectedTenantId || undefined}
                    onSuccess={() => {
                        // Optionally refresh the symptoms list
                        refresh();
                    }}
                />
            )}

            {/* Bulk Import Modal */}
            {showBulkImportModal && (
                <SymptomBulkImportModal
                    isOpen={showBulkImportModal}
                    onClose={() => setShowBulkImportModal(false)}
                    onSuccess={() => {
                        setShowBulkImportModal(false);
                        refresh();
                    }}
                    tenantId={selectedTenantId || undefined}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Symptom"
                message={`Are you sure you want to delete "${deleteConfirmation?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                isLoading={deletingId === deleteConfirmation?.id}
            />
        </div>
    );
}
