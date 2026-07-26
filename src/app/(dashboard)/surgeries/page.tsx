"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { CreateSurgeryRequest, Surgery, UpdateSurgeryRequest } from "@/types";
import { surgeriesApi } from "@/services/surgeriesApi";
import { useTenant } from "@/hooks/useTenant";
import { SurgeryFormModal } from "@/components/surgeries/SurgeryFormModal";
import { DeleteSurgeryModal } from "@/components/surgeries/DeleteSurgeryModal";
import { Fragment } from "react";
import { handleError } from "@/utils/errorHandler";
import { toast } from "sonner";

export default function SurgeriesPage() {
    const { tenant } = useTenant();
    const [surgeries, setSurgeries] = useState<Surgery[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null);

    const fetchSurgeries = async () => {
        try {
            setIsLoading(true);
            const data = await surgeriesApi.list({
                page,
                page_size: 20,
                search: searchQuery || undefined,
            });
            setSurgeries(data.items);
            setTotalPages(data.total_pages);
        } catch (error) {
            console.error("Failed to fetch surgeries:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSurgeries();
    }, [page, searchQuery]);

    const handleCreate = () => {
        setSelectedSurgery(null);
        setIsFormModalOpen(true);
    };

    const handleEdit = (surgery: Surgery) => {
        setSelectedSurgery(surgery);
        setIsFormModalOpen(true);
    };

    const handleDeleteClick = (surgery: Surgery) => {
        setSelectedSurgery(surgery);
        setIsDeleteModalOpen(true);
    };

    const handleFormSubmit = async (data: CreateSurgeryRequest | UpdateSurgeryRequest) => {
        try {
            if (selectedSurgery) {
                await surgeriesApi.update(selectedSurgery.id, data);
                toast.success(`Surgery "${(data as any).name || selectedSurgery.name}" updated successfully.`);
            } else {
                await surgeriesApi.create(data as CreateSurgeryRequest);
                toast.success(`Surgery "${(data as CreateSurgeryRequest).name}" created successfully.`);
            }
            await fetchSurgeries();
        } catch (error) {
            // Re-throw so the modal catches it and stays open
            throw error;
        }
    };

    const handleDeleteConfirm = async () => {
        if (selectedSurgery) {
            try {
                await surgeriesApi.delete(selectedSurgery.id);
                toast.success(`Surgery "${selectedSurgery.name}" deleted successfully.`);
                await fetchSurgeries();
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to delete surgery." });
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Surgeries
                    </h1>
                    <p className="text-sm text-slate-500">
                        Manage surgical procedures and categories
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                    <Plus className="h-5 w-5" />
                    Add Surgery
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-lg border-0 py-2.5 pl-10 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6"
                        placeholder="Search surgeries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Additional filters can go here */}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Category
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Last Updated
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex justify-center">
                                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                                        </div>
                                    </td>
                                </tr>
                            ) : surgeries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <Search className="mb-2 h-10 w-10 text-slate-300" />
                                            <p className="text-base font-medium text-slate-900">No surgeries found</p>
                                            <p className="text-sm">Try adjusting your search query or add a new surgery.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                surgeries.map((surgery) => (
                                    <tr
                                        key={surgery.id}
                                        className="group hover:bg-sky-50/40 transition-colors cursor-pointer"
                                        onClick={() => handleEdit(surgery)}
                                    >
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">{surgery.name}</span>
                                                {surgery.description && (
                                                    <span className="text-xs text-slate-500 truncate max-w-xs">{surgery.description}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            {surgery.categories && surgery.categories.length > 0 ? (
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {surgery.categories.map((cat, idx) => (
                                                        <span key={idx} className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 border border-sky-200">
                                                            {cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : surgery.category ? (
                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/10">
                                                    {surgery.category}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            {surgery.is_active ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20">
                                                    <XCircle className="h-3 w-3" />
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                            {new Date(surgery.updated_at).toLocaleDateString()}
                                        </td>
                                        <td
                                            className="whitespace-nowrap px-6 py-4 text-right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(surgery); }}
                                                    title="Edit Surgery"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-all"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(surgery); }}
                                                    title="Delete Surgery"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-500 shadow-2xs hover:bg-red-50 hover:border-red-300 transition-all"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {surgeries.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-slate-700">
                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Previous</span>
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Next</span>
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <SurgeryFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                initialData={selectedSurgery}
            />

            {selectedSurgery && (
                <DeleteSurgeryModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleDeleteConfirm}
                    surgeryName={selectedSurgery.name}
                />
            )}
        </div>
    );
}
