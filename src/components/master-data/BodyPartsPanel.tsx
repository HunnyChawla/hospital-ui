"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchBodyParts, updateBodyPart, deleteBodyPart } from "@/redux/bodyPartsSlice";
import { BodyPartForm } from "./BodyPartForm";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "../common/Modal";
import { ConfirmationDialog } from "../common/ConfirmationDialog";
import { Pagination } from "../common/Pagination";
import {
    Bone,
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
} from "lucide-react";
import { BodyPart } from "@/services/bodyPartsApi";
import { isPlatformOwner } from "@/utils/auth";
import { tenantsApi, Tenant } from "@/services/tenantsApi";

const DEFAULT_QUERY = { page: 1, page_size: 20, is_active: true };

const LATERALITY_LABEL: Record<string, string> = {
    left: "Left",
    right: "Right",
    bilateral: "Bilateral",
    na: "N/A",
};

export function BodyPartsPanel() {
    const dispatch = useAppDispatch();
    const { items, loading, total, lastQuery, updatingId, deletingId } = useAppSelector(
        (s) => s.bodyParts
    );

    const [search, setSearch] = useState("");
    const [onlyActive, setOnlyActive] = useState(true);
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingBodyPart, setEditingBodyPart] = useState<BodyPart | null>(null);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>("");
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);

    const isPlatformOwnerUser = isPlatformOwner();

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
        const handler = setTimeout(() => {
            dispatch(
                fetchBodyParts({
                    page: 1,
                    page_size: DEFAULT_QUERY.page_size,
                    search: search.trim() || undefined,
                    is_active: onlyActive ? true : undefined,
                    department: departmentFilter || undefined,
                    tenant_id: selectedTenantId || undefined,
                })
            );
        }, 320);

        return () => clearTimeout(handler);
    }, [search, onlyActive, departmentFilter, selectedTenantId, dispatch]);

    const departments = useMemo(
        () => Array.from(new Set(items.map((b) => b.department).filter(Boolean))).sort(),
        [items]
    );

    const refresh = useCallback(() => {
        dispatch(
            fetchBodyParts({
                ...(lastQuery || DEFAULT_QUERY),
                tenant_id: selectedTenantId || undefined,
            })
        );
    }, [dispatch, lastQuery, selectedTenantId]);

    const handleToggleActive = async (bodyPart: BodyPart) => {
        try {
            await dispatch(
                updateBodyPart({
                    id: bodyPart.id,
                    updates: { is_active: !bodyPart.is_active },
                    tenantId: selectedTenantId || undefined,
                })
            ).unwrap();
            toast.success(`Body part ${!bodyPart.is_active ? "activated" : "deactivated"}`);
            refresh();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmation) return;
        try {
            await dispatch(deleteBodyPart({ id: deleteConfirmation.id, tenantId: selectedTenantId || undefined })).unwrap();
            toast.success("Body part deleted successfully");
            refresh();
            setDeleteConfirmation(null);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handlePageChange = (page: number) => {
        dispatch(
            fetchBodyParts({
                page,
                page_size: lastQuery?.page_size || DEFAULT_QUERY.page_size,
                search: search.trim() || undefined,
                is_active: onlyActive ? true : undefined,
                department: departmentFilter || undefined,
                tenant_id: selectedTenantId || undefined,
            })
        );
    };

    return (
        <div className="space-y-4">
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Body Part Master</p>
                        <p className="text-xs text-slate-500">
                            Manage the body parts surgeries can be configured against, across any department.
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
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                        >
                            <Plus className="h-4 w-4" />
                            Add Body Part
                        </button>
                    </div>
                </div>

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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="relative sm:col-span-2">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, code, or department"
                            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400"
                        />
                    </div>
                    <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                    >
                        <option value="">All departments</option>
                        {departments.map((dept) => (
                            <option key={dept} value={dept}>
                                {dept}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Bone className="h-4 w-4 text-slate-500" />
                        <p className="text-xs text-slate-600">
                            {onlyActive ? "Showing active body parts" : "Showing all body parts"}
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
                    <div className="grid grid-cols-7 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                        <div>Code</div>
                        <div className="col-span-2">Name</div>
                        <div>Department</div>
                        <div>Laterality</div>
                        <div className="text-center">Status</div>
                        <div className="text-right">Actions</div>
                    </div>

                    {loading ? (
                        <div className="p-4">
                            <SkeletonRow rows={4} />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500">
                            No body parts found. Add one to get started.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {items.map((bodyPart) => (
                                <div
                                    key={bodyPart.id}
                                    className="grid grid-cols-7 items-center px-4 py-3 text-sm text-slate-800"
                                >
                                    <div className="font-semibold text-slate-900">{bodyPart.code}</div>
                                    <div className="col-span-2">
                                        <p className="font-semibold text-slate-900">{bodyPart.name}</p>
                                        {!bodyPart.tenant_id && (
                                            <p className="text-xs text-slate-400">Global</p>
                                        )}
                                    </div>
                                    <div className="text-slate-600">{bodyPart.department}</div>
                                    <div className="text-slate-600">
                                        {LATERALITY_LABEL[bodyPart.laterality] || bodyPart.laterality}
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <span
                                            className={`pill ${bodyPart.is_active
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-amber-50 text-amber-700"
                                                }`}
                                        >
                                            {bodyPart.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleToggleActive(bodyPart)}
                                            disabled={updatingId === bodyPart.id}
                                            className={`group relative flex items-center justify-center overflow-visible rounded-lg p-2 text-xs font-semibold text-white transition-all duration-300 ${bodyPart.is_active
                                                ? "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
                                                : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                                                } disabled:opacity-60`}
                                            style={{ width: "2rem", minWidth: "2rem" }}
                                            onMouseEnter={(e) => {
                                                if (updatingId !== bodyPart.id) {
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
                                            title={bodyPart.is_active ? "Deactivate" : "Activate"}
                                        >
                                            {bodyPart.is_active ? (
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
                                            onClick={() => setEditingBodyPart(bodyPart)}
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
                                            onClick={() => setDeleteConfirmation({ id: bodyPart.id, name: bodyPart.name })}
                                            disabled={deletingId === bodyPart.id}
                                            className="group relative flex items-center justify-center overflow-visible rounded-lg bg-gradient-to-r from-rose-500 to-red-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:from-rose-600 hover:to-red-600 disabled:opacity-60"
                                            style={{ width: "2rem", minWidth: "2rem" }}
                                            onMouseEnter={(e) => {
                                                if (deletingId !== bodyPart.id) {
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

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Body Part" size="md">
                <BodyPartForm
                    onCreated={() => setShowAddModal(false)}
                    tenantId={selectedTenantId || undefined}
                    knownDepartments={departments}
                />
            </Modal>

            <Modal
                isOpen={!!editingBodyPart}
                onClose={() => setEditingBodyPart(null)}
                title="Edit Body Part"
                size="md"
            >
                {editingBodyPart && (
                    <BodyPartForm
                        onCreated={() => setEditingBodyPart(null)}
                        tenantId={selectedTenantId || undefined}
                        initialData={editingBodyPart}
                        knownDepartments={departments}
                    />
                )}
            </Modal>

            <ConfirmationDialog
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Body Part"
                message={`Are you sure you want to delete "${deleteConfirmation?.name}"? This cannot be undone. Body parts still referenced by a surgery cannot be deleted.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                isLoading={deletingId === deleteConfirmation?.id}
            />
        </div>
    );
}
