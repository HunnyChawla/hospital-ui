"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchMedicines, updateMedicine, deleteMedicine } from "@/redux/medicinesSlice";
import { MedicineForm } from "./MedicineForm";
import { MedicineBulkImportModal } from "./MedicineBulkImportModal";
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
    Upload,
    Download,
    Power,
    PowerOff,
    Building2,
    Globe,
    Lock,
} from "lucide-react";
import { Medicine, medicinesApi } from "@/services/medicinesApi";
import { isPlatformOwner } from "@/utils/auth";
import { tenantsApi, Tenant } from "@/services/tenantsApi";

const DEFAULT_QUERY = { page: 1, page_size: 20, is_active: true, include_global: false };

export function MedicinesPanel() {
    const dispatch = useAppDispatch();
    const { items, loading, total, lastQuery, updatingId, deletingId } = useAppSelector(
        (s) => s.medicines
    );

    const [search, setSearch] = useState("");
    const [onlyActive, setOnlyActive] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>("");
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);
    const [isExporting, setIsExporting] = useState(false);

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

    const refresh = () => {
        dispatch(
            fetchMedicines({
                page: lastQuery?.page || DEFAULT_QUERY.page,
                page_size: lastQuery?.page_size || DEFAULT_QUERY.page_size,
                is_active: onlyActive ? true : undefined,
                tenant_id: selectedTenantId || undefined,
                q: search.trim() || undefined,
                include_global: false,
            })
        );
    };

    // Debounced fetch when search, onlyActive, or selectedTenantId changes
    useEffect(() => {
        const handler = setTimeout(() => {
            dispatch(
                fetchMedicines({
                    page: 1,
                    page_size: lastQuery?.page_size || DEFAULT_QUERY.page_size,
                    is_active: onlyActive ? true : undefined,
                    tenant_id: selectedTenantId || undefined,
                    q: search.trim() || undefined,
                    include_global: false,
                })
            );
        }, 320);

        return () => clearTimeout(handler);
    }, [search, onlyActive, selectedTenantId, dispatch]);

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const newStatus = !currentStatus;
            await dispatch(updateMedicine({ id, updates: { is_active: newStatus }, tenantId: selectedTenantId || undefined })).unwrap();
            toast.success(`Medicine ${newStatus ? "activated" : "deactivated"}`);
            refresh();
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
            await dispatch(deleteMedicine({ id: deleteConfirmation.id, tenantId: selectedTenantId || undefined })).unwrap();
            toast.success("Medicine deleted successfully");
            refresh();
            setDeleteConfirmation(null);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleMedicineCreated = () => {
        refresh();
        setShowAddModal(false);
    };

    const handleBulkImportSuccess = () => {
        refresh();
        setShowBulkImportModal(false);
    };

    const handlePageChange = (page: number) => {
        dispatch(
            fetchMedicines({
                page,
                page_size: lastQuery?.page_size || DEFAULT_QUERY.page_size,
                is_active: onlyActive ? true : undefined,
                tenant_id: selectedTenantId || undefined,
                q: search.trim() || undefined,
                include_global: false,
            })
        );
    };

    const handleEditClick = (medicine: Medicine) => {
        setEditingMedicine(medicine);
    };

    const handleEditSuccess = () => {
        refresh();
        setEditingMedicine(null);
    };

    const handleExportExcel = async () => {
        try {
            setIsExporting(true);
            const blob = await medicinesApi.exportExcel(selectedTenantId || undefined);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `medicines_tenant_${selectedTenantId || "current"}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Excel data exported successfully");
        } catch (error) {
            console.error("Failed to export medicines:", error);
            toast.error("Failed to export medicines to Excel");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Medicine Master</p>
                        <p className="text-xs text-slate-500">
                            Manage pharmacy medicines, default dosages, and instructions for prescriptions.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={refresh}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-300 transition"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Refresh
                        </button>
                        <button
                            onClick={handleExportExcel}
                            disabled={isExporting}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-300 transition disabled:opacity-60"
                        >
                            <Download className="h-4 w-4" />
                            {isExporting ? "Exporting..." : "Export Excel"}
                        </button>
                        <button
                            onClick={() => setShowBulkImportModal(true)}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-300 transition"
                        >
                            <Upload className="h-4 w-4" />
                            Bulk Import
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                        >
                            <Plus className="h-4 w-4" />
                            Add Medicine
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
                            placeholder="Search by name, generic name, or manufacturer"
                            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400 transition"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <p className="text-xs text-slate-600">
                            {onlyActive ? "Showing active medicines" : "Showing all medicines"}
                        </p>
                    </div>
                    <button
                        onClick={() => setOnlyActive((prev) => !prev)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-sky-300 transition"
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
                    <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                        <div className="col-span-2">Name</div>
                        <div className="col-span-2">Generic Name</div>
                        <div className="col-span-2">Manufacturer</div>
                        <div className="col-span-1">Form</div>
                        <div className="col-span-1">Strength</div>
                        <div className="col-span-1 text-center">Type</div>
                        <div className="col-span-1 text-center">Status</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {loading ? (
                        <div className="p-4">
                            <SkeletonRow rows={4} />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500">
                            No medicines found. Add or import medicines to get started.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {items.map((medicine) => {
                                const isGlobal = !medicine.tenant_id;
                                return (
                                    <div
                                        key={medicine.id}
                                        className="grid grid-cols-12 items-center px-4 py-3 text-sm text-slate-800 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="col-span-2">
                                            <p className="font-semibold text-slate-900">{medicine.name}</p>
                                            {medicine.default_instructions && (
                                                <p className="text-[10px] text-slate-500 line-clamp-1 italic">{medicine.default_instructions}</p>
                                            )}
                                        </div>
                                        <div className="col-span-2 text-slate-600 line-clamp-1">{medicine.generic_name || "-"}</div>
                                        <div className="col-span-2 text-slate-600 line-clamp-1">{medicine.manufacturer || "-"}</div>
                                        <div className="col-span-1 text-slate-600">{medicine.dosage_form || "-"}</div>
                                        <div className="col-span-1 text-slate-600">{medicine.strength || "-"}</div>
                                        <div className="col-span-1 flex items-center justify-center">
                                            {isGlobal ? (
                                                <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                                                    <Globe className="h-3 w-3" />
                                                    Global
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                                                    <Lock className="h-3 w-3" />
                                                    Tenant
                                                </span>
                                            )}
                                        </div>
                                        <div className="col-span-1 flex items-center justify-center">
                                            <span
                                                className={`pill text-[10px] ${medicine.is_active
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-amber-50 text-amber-700"
                                                    }`}
                                            >
                                                {medicine.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end gap-2">
                                            {/* Disable toggling/deleting global medicines for non-platform owners */}
                                            <button
                                                onClick={() => handleToggleActive(medicine.id, medicine.is_active)}
                                                disabled={updatingId === medicine.id || (isGlobal && !isPlatformOwnerUser)}
                                                className={`group relative flex items-center justify-center overflow-visible rounded-lg p-2 text-xs font-semibold text-white transition-all duration-300 ${medicine.is_active
                                                    ? "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
                                                    : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                                                    } disabled:opacity-30`}
                                                style={{ width: "2rem", minWidth: "2rem" }}
                                                onMouseEnter={(e) => {
                                                    if (updatingId !== medicine.id && (!isGlobal || isPlatformOwnerUser)) {
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
                                                title={medicine.is_active ? "Deactivate" : "Activate"}
                                            >
                                                {medicine.is_active ? (
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
                                                onClick={() => handleEditClick(medicine)}
                                                disabled={isGlobal && !isPlatformOwnerUser}
                                                className="group relative flex items-center justify-center overflow-visible rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:from-sky-600 hover:to-blue-600 disabled:opacity-30"
                                                style={{ width: "2rem", minWidth: "2rem" }}
                                                onMouseEnter={(e) => {
                                                    if (!isGlobal || isPlatformOwnerUser) {
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
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4 shrink-0" />
                                                <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline-block">
                                                    Edit
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(medicine.id, medicine.name)}
                                                disabled={deletingId === medicine.id || (isGlobal && !isPlatformOwnerUser)}
                                                className="group relative flex items-center justify-center overflow-visible rounded-lg bg-gradient-to-r from-rose-500 to-red-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:from-rose-600 hover:to-red-600 disabled:opacity-30"
                                                style={{ width: "2rem", minWidth: "2rem" }}
                                                onMouseEnter={(e) => {
                                                    if (deletingId !== medicine.id && (!isGlobal || isPlatformOwnerUser)) {
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
                                );
                            })}
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

            {/* Add Medicine Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add Medicine"
                size="md"
            >
                <MedicineForm onCreated={handleMedicineCreated} tenantId={selectedTenantId || undefined} />
            </Modal>

            {/* Edit Medicine Modal */}
            <Modal
                isOpen={!!editingMedicine}
                onClose={() => setEditingMedicine(null)}
                title="Edit Medicine"
                size="md"
            >
                {editingMedicine && (
                    <MedicineForm
                        onCreated={handleEditSuccess}
                        tenantId={selectedTenantId || undefined}
                        initialData={editingMedicine}
                    />
                )}
            </Modal>

            {/* Bulk Import Modal */}
            <MedicineBulkImportModal
                isOpen={showBulkImportModal}
                onClose={() => setShowBulkImportModal(false)}
                onSuccess={handleBulkImportSuccess}
                tenantId={selectedTenantId || undefined}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Medicine"
                message={`Are you sure you want to delete "${deleteConfirmation?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                isLoading={deletingId === deleteConfirmation?.id}
            />
        </div>
    );
}
