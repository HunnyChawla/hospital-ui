"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchVaccines, updateVaccine, deleteVaccine } from "@/redux/vaccinesSlice";
import { VaccineForm } from "./VaccineForm";
import { VaccineBulkImportModal } from "./VaccineBulkImportModal";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "../common/Modal";
import { ConfirmationDialog } from "../common/ConfirmationDialog";
import { Pagination } from "../common/Pagination";
import {
    Syringe,
    RefreshCcw,
    Search,
    Plus,
    Edit,
    Trash2,
    Power,
    PowerOff,
    Building2,
    Globe,
    Upload,
    Thermometer,
    Shield,
    Calendar,
    Filter,
} from "lucide-react";
import { VaccineMaster } from "@/services/vaccinesApi";
import { isPlatformOwner } from "@/utils/auth";
import { tenantsApi, Tenant } from "@/services/tenantsApi";

const DEFAULT_QUERY = { page: 1, page_size: 20, is_active: true };

export function VaccinesPanel() {
    const dispatch = useAppDispatch();
    const { items, loading, total, lastQuery, updatingId, deletingId } = useAppSelector(
        (s) => s.vaccines
    );

    const [search, setSearch] = useState("");
    const [onlyActive, setOnlyActive] = useState(true);
    const [diseaseFilter, setDiseaseFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [editingVaccine, setEditingVaccine] = useState<VaccineMaster | null>(null);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>("");
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(
        null
    );

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

    // Debounced search
    useEffect(() => {
        const handler = setTimeout(() => {
            dispatch(
                fetchVaccines({
                    page: 1,
                    page_size: DEFAULT_QUERY.page_size,
                    search: search.trim() || undefined,
                    is_active: onlyActive ? true : undefined,
                    disease: diseaseFilter || undefined,
                    vaccine_type: typeFilter || undefined,
                    tenant_id: selectedTenantId || undefined,
                    include_global: true,
                })
            );
        }, 320);

        return () => clearTimeout(handler);
    }, [search, onlyActive, diseaseFilter, typeFilter, selectedTenantId, dispatch]);

    const diseases = useMemo(
        () => Array.from(new Set(items.map((v) => v.disease).filter(Boolean) as string[])).sort(),
        [items]
    );

    const vaccineTypes = useMemo(
        () => Array.from(new Set(items.map((v) => v.vaccine_type).filter(Boolean) as string[])).sort(),
        [items]
    );

    const refresh = useCallback(() => {
        dispatch(
            fetchVaccines({
                ...(lastQuery || DEFAULT_QUERY),
                tenant_id: selectedTenantId || undefined,
                include_global: true,
            })
        );
    }, [dispatch, lastQuery, selectedTenantId]);

    const handleToggleActive = async (vaccine: VaccineMaster) => {
        try {
            await dispatch(
                updateVaccine({
                    id: vaccine.id,
                    updates: { is_active: !vaccine.is_active },
                    tenantId: selectedTenantId || undefined,
                })
            ).unwrap();
            toast.success(`Vaccine ${!vaccine.is_active ? "activated" : "deactivated"}`);
            refresh();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmation) return;
        try {
            await dispatch(
                deleteVaccine({
                    id: deleteConfirmation.id,
                    tenantId: selectedTenantId || undefined,
                })
            ).unwrap();
            toast.success("Vaccine deleted successfully");
            setDeleteConfirmation(null);
            refresh();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handlePageChange = (page: number) => {
        dispatch(
            fetchVaccines({
                page,
                page_size: lastQuery?.page_size || DEFAULT_QUERY.page_size,
                search: search.trim() || undefined,
                is_active: onlyActive ? true : undefined,
                disease: diseaseFilter || undefined,
                vaccine_type: typeFilter || undefined,
                tenant_id: selectedTenantId || undefined,
                include_global: true,
            })
        );
    };

    return (
        <div className="space-y-4">
            {/* Header & Controls Bar */}
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                            <Syringe className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Vaccine Master</p>
                            <p className="text-xs text-slate-500">
                                Standard immunization catalog, dosage guidelines, administration routes & cold-chain storage
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={refresh}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                            title="Refresh vaccines"
                        >
                            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                            <span>Refresh</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowBulkImportModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                        >
                            <Upload className="h-3.5 w-3.5 text-slate-500" />
                            <span>Bulk Import</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add Vaccine</span>
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
                    {/* Search */}
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, code, disease, route..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-1.5 text-xs outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                        />
                    </div>

                    {/* Disease filter */}
                    <div>
                        <select
                            value={diseaseFilter}
                            onChange={(e) => setDiseaseFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                        >
                            <option value="">All Diseases</option>
                            {diseases.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Vaccine Type filter */}
                    <div>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                        >
                            <option value="">All Vaccine Types</option>
                            {vaccineTypes.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Toggle & Platform Owner tenant selector */}
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setOnlyActive(!onlyActive)}
                            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                onlyActive
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                        >
                            <span
                                className={`h-2 w-2 rounded-full ${
                                    onlyActive ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                            />
                            {onlyActive ? "Active Only" : "All Statuses"}
                        </button>

                        {isPlatformOwnerUser && tenants.length > 0 && (
                            <select
                                value={selectedTenantId}
                                onChange={(e) => setSelectedTenantId(e.target.value)}
                                className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 focus:bg-white"
                            >
                                <option value="">Global + All</option>
                                {tenants.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="px-4 py-3">Code / Vaccine Name</th>
                                <th className="px-4 py-3">Disease & Type</th>
                                <th className="px-4 py-3">Administration & Dose</th>
                                <th className="px-4 py-3">Age & Storage</th>
                                <th className="px-3 py-3">Scope</th>
                                <th className="px-3 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-4">
                                        <SkeletonRow rows={5} />
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        <Syringe className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                        <p className="font-semibold text-slate-700 text-sm">No vaccines found</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Try adjusting search criteria or add a new vaccine
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                items.map((vax) => {
                                    const isGlobal = vax.tenant_id === null;
                                    const isRowUpdating = updatingId === vax.id;
                                    const isRowDeleting = deletingId === vax.id;

                                    return (
                                        <tr
                                            key={vax.id}
                                            className={`hover:bg-slate-50/70 transition-colors ${
                                                !vax.is_active ? "opacity-60 bg-slate-50/40" : ""
                                            }`}
                                        >
                                            {/* Code & Name */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-start gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                                                                {vax.code || "—"}
                                                            </span>
                                                            {vax.short_name && (
                                                                <span className="text-[11px] font-semibold text-slate-500">
                                                                    ({vax.short_name})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="font-semibold text-slate-900 mt-1">
                                                            {vax.name}
                                                        </p>
                                                        {vax.description && (
                                                            <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                                                                {vax.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Disease & Type */}
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {vax.disease ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                            <Shield className="h-3 w-3 text-emerald-600" />
                                                            {vax.disease}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-[11px]">—</span>
                                                    )}
                                                    {vax.vaccine_type && (
                                                        <p className="text-[11px] text-slate-500 font-medium">
                                                            {vax.vaccine_type}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Administration & Dose */}
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1 text-slate-800 font-semibold text-[11px]">
                                                        <span>{vax.dose_volume !== null ? vax.dose_volume : "—"}</span>
                                                        <span>{vax.dose_unit || "mL"}</span>
                                                        {vax.doses_required && (
                                                            <span className="text-slate-400 font-normal">
                                                                ({vax.doses_required} dose{vax.doses_required > 1 ? "s" : ""})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        <span>{vax.route || "—"}</span>
                                                        {vax.administration_site && (
                                                            <span className="text-slate-400"> · {vax.administration_site}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Age & Storage */}
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {vax.storage_min_temp !== null && vax.storage_max_temp !== null ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-mono">
                                                            <Thermometer className="h-3 w-3 text-blue-500" />
                                                            {vax.storage_min_temp}°C to {vax.storage_max_temp}°C
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-[11px]">—</span>
                                                    )}
                                                    {vax.schedule_hint && (
                                                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                                            <Calendar className="h-3 w-3 text-slate-400" />
                                                            {vax.schedule_hint}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Scope */}
                                            <td className="px-3 py-3">
                                                {isGlobal ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                                        <Globe className="h-3 w-3 text-indigo-500" />
                                                        Global
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                        <Building2 className="h-3 w-3 text-amber-500" />
                                                        Tenant
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                        vax.is_active
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : "bg-slate-100 text-slate-500 border border-slate-200"
                                                    }`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                            vax.is_active ? "bg-emerald-500" : "bg-slate-400"
                                                        }`}
                                                    />
                                                    {vax.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingVaccine(vax)}
                                                        disabled={isRowUpdating || isRowDeleting}
                                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                                                        title="Edit vaccine"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleActive(vax)}
                                                        disabled={isRowUpdating || isRowDeleting}
                                                        className={`rounded-lg p-1.5 transition cursor-pointer ${
                                                            vax.is_active
                                                                ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                                        }`}
                                                        title={vax.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        {vax.is_active ? (
                                                            <Power className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <PowerOff className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteConfirmation({ id: vax.id, name: vax.name })
                                                        }
                                                        disabled={isRowUpdating || isRowDeleting}
                                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                                                        title="Delete vaccine"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div className="border-t border-slate-100">
                        <Pagination
                            currentPage={lastQuery?.page || 1}
                            total={total}
                            pageSize={lastQuery?.page_size || DEFAULT_QUERY.page_size}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>

            {/* Add Vaccine Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Vaccine"
                size="lg"
            >
                <VaccineForm
                    onSuccess={() => {
                        setShowAddModal(false);
                        refresh();
                    }}
                    tenantId={selectedTenantId || undefined}
                />
            </Modal>

            {/* Edit Vaccine Modal */}
            <Modal
                isOpen={!!editingVaccine}
                onClose={() => setEditingVaccine(null)}
                title={`Edit Vaccine: ${editingVaccine?.name || ""}`}
                size="lg"
            >
                {editingVaccine && (
                    <VaccineForm
                        initialData={editingVaccine}
                        onSuccess={() => {
                            setEditingVaccine(null);
                            refresh();
                        }}
                        tenantId={selectedTenantId || undefined}
                    />
                )}
            </Modal>

            {/* Bulk Import Modal */}
            <VaccineBulkImportModal
                isOpen={showBulkImportModal}
                onClose={() => setShowBulkImportModal(false)}
                onSuccess={() => {
                    setShowBulkImportModal(false);
                    refresh();
                }}
                tenantId={selectedTenantId || undefined}
            />

            {/* Delete Confirmation */}
            <ConfirmationDialog
                isOpen={!!deleteConfirmation}
                title="Delete Vaccine"
                message={`Are you sure you want to delete '${deleteConfirmation?.name}'? If patient immunisations reference this vaccine, deletion will be blocked and you should deactivate it instead.`}
                confirmText="Delete Vaccine"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleDeleteConfirm}
                onClose={() => setDeleteConfirmation(null)}
            />
        </div>
    );
}
