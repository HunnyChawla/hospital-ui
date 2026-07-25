"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter, Pencil, Trash2, CheckCircle2, XCircle, Package } from "lucide-react";
import { CreateSurgeryRequest, Surgery, UpdateSurgeryRequest } from "@/types";
import { surgeriesApi } from "@/services/surgeriesApi";
import { useTenant } from "@/hooks/useTenant";
import { SurgeryFormModal } from "@/components/surgeries/SurgeryFormModal";
import { DeleteSurgeryModal } from "@/components/surgeries/DeleteSurgeryModal";
import { SurgeryPackagesModal } from "@/components/surgeries/SurgeryPackagesModal";

function ExpandableActionButton({
    onClick,
    icon: Icon,
    title,
    label,
    variant,
}: {
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    label: string;
    variant: "sky" | "rose" | "amber" | "emerald" | "teal" | "purple" | "indigo";
}) {
    const [isHovered, setIsHovered] = useState(false);

    const variantClasses = {
        sky: "bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20",
        rose: "bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/20",
        amber: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20",
        emerald: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20",
        teal: "bg-teal-500 hover:bg-teal-600 text-white shadow-sm shadow-teal-500/20",
        purple: "bg-purple-500 hover:bg-purple-600 text-white shadow-sm shadow-purple-500/20",
        indigo: "bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm shadow-indigo-500/20",
    };

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`flex items-center justify-center overflow-hidden rounded-lg transition-all duration-200 text-xs font-semibold cursor-pointer ${
                isHovered ? "px-3 py-1.5" : "h-8 w-8"
            } ${variantClasses[variant]}`}
            title={title}
        >
            <Icon className="h-4 w-4 shrink-0" />
            {isHovered && <span className="ml-1.5 whitespace-nowrap">{label}</span>}
        </button>
    );
}

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
    const [isPackagesModalOpen, setIsPackagesModalOpen] = useState(false);
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

    const handleManagePackages = (surgery: Surgery) => {
        setSelectedSurgery(surgery);
        setIsPackagesModalOpen(true);
    };

    const handleDeleteClick = (surgery: Surgery) => {
        setSelectedSurgery(surgery);
        setIsDeleteModalOpen(true);
    };

    const handleFormSubmit = async (data: CreateSurgeryRequest | UpdateSurgeryRequest) => {
        if (selectedSurgery) {
            await surgeriesApi.update(selectedSurgery.id, data);
        } else {
            await surgeriesApi.create(data as CreateSurgeryRequest);
        }
        await fetchSurgeries();
    };

    const handleDeleteConfirm = async () => {
        if (selectedSurgery) {
            await surgeriesApi.delete(selectedSurgery.id);
            await fetchSurgeries();
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
                    <table className="min-w-full divide-y divide-slate-200 table-fixed">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="w-[30%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Name
                                </th>
                                <th scope="col" className="w-[20%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Category
                                </th>
                                <th scope="col" className="w-[15%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Status
                                </th>
                                <th scope="col" className="w-[15%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Last Updated
                                </th>
                                <th scope="col" className="w-[20%] px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Actions
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
                                    <tr key={surgery.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">{surgery.name}</span>
                                                {surgery.description && (
                                                    <span className="text-xs text-slate-500 truncate max-w-xs">{surgery.description}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            {surgery.category ? (
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
                                        <td className="w-[20%] whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <ExpandableActionButton
                                                    onClick={() => handleManagePackages(surgery)}
                                                    icon={Package}
                                                    title="Manage Surgery Packages"
                                                    label="Packages"
                                                    variant="sky"
                                                />
                                                <ExpandableActionButton
                                                    onClick={() => handleEdit(surgery)}
                                                    icon={Pencil}
                                                    title="Edit Surgery"
                                                    label="Edit"
                                                    variant="amber"
                                                />
                                                <ExpandableActionButton
                                                    onClick={() => handleDeleteClick(surgery)}
                                                    icon={Trash2}
                                                    title="Delete Surgery"
                                                    label="Delete"
                                                    variant="rose"
                                                />
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

            <SurgeryPackagesModal
                isOpen={isPackagesModalOpen}
                onClose={() => setIsPackagesModalOpen(false)}
                surgery={selectedSurgery}
            />
        </div>
    );
}
