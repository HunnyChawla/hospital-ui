"use client";

import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Plus, Pencil, Trash2, Package, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Surgery, SurgeryPackage, CreateSurgeryPackageRequest, UpdateSurgeryPackageRequest } from "@/types";
import { surgeryPackagesApi } from "@/services/surgeryPackagesApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface SurgeryPackagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    surgery: Surgery | null;
}

export function SurgeryPackagesModal({
    isOpen,
    onClose,
    surgery,
}: SurgeryPackagesModalProps) {
    const [packages, setPackages] = useState<SurgeryPackage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingPackage, setEditingPackage] = useState<SurgeryPackage | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState<string>("0");
    const [overrides, setOverrides] = useState<Record<string, string>>({});
    const [showOverrides, setShowOverrides] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [sortOrder, setSortOrder] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);

    const applicableBodyParts = surgery?.body_parts || [];
    const showOverridesSection = applicableBodyParts.length > 1;

    const fetchPackages = async () => {
        if (!surgery) return;
        try {
            setIsLoading(true);
            const data = await surgeryPackagesApi.list(surgery.id);
            setPackages(data);
        } catch (error) {
            toast.error("Failed to load surgery packages");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && surgery) {
            fetchPackages();
            resetForm();
        }
    }, [isOpen, surgery]);

    const resetForm = () => {
        setName("");
        setDescription("");
        setPrice("0");
        setOverrides({});
        setShowOverrides(false);
        setIsActive(true);
        setSortOrder(packages.length);
        setIsEditing(false);
        setEditingPackage(null);
    };

    const handleEditClick = (pkg: SurgeryPackage) => {
        setEditingPackage(pkg);
        setName(pkg.name);
        setDescription(pkg.description || "");
        setPrice(pkg.price.toString());
        const overrideMap: Record<string, string> = {};
        for (const p of pkg.prices || []) {
            overrideMap[p.body_part_id] = p.price.toString();
        }
        setOverrides(overrideMap);
        setShowOverrides(Object.keys(overrideMap).length > 0);
        setIsActive(pkg.is_active);
        setSortOrder(pkg.sort_order);
        setIsEditing(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!surgery) return;

        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice < 0) {
            toast.error("Please enter a valid base price");
            return;
        }

        const prices = Object.entries(overrides)
            .filter(([, val]) => val.trim() !== "")
            .map(([body_part_id, val]) => ({ body_part_id, price: parseFloat(val) }))
            .filter((p) => !isNaN(p.price) && p.price >= 0);

        try {
            setIsSaving(true);
            if (isEditing && editingPackage) {
                const payload: UpdateSurgeryPackageRequest = {
                    name,
                    description: description || null,
                    price: numPrice,
                    prices,
                    is_active: isActive,
                    sort_order: Number(sortOrder),
                };
                await surgeryPackagesApi.update(surgery.id, editingPackage.id, payload);
                toast.success("Package updated successfully");
            } else {
                const payload: CreateSurgeryPackageRequest = {
                    name,
                    description: description || null,
                    price: numPrice,
                    prices,
                    is_active: isActive,
                    sort_order: Number(sortOrder),
                };
                await surgeryPackagesApi.create(surgery.id, payload);
                toast.success("Package created successfully");
            }
            resetForm();
            await fetchPackages();
        } catch (error: any) {
            toast.error(getErrorMessage(error) || "Failed to save surgery package");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (packageId: string) => {
        if (!surgery) return;
        if (!confirm("Are you sure you want to delete this package?")) return;
        try {
            await surgeryPackagesApi.delete(surgery.id, packageId);
            toast.success("Package deleted successfully");
            await fetchPackages();
        } catch (error: any) {
            toast.error(getErrorMessage(error) || "Failed to delete package");
        }
    };

    if (!surgery) return null;

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-slate-100">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-sky-50 to-teal-50">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-sky-500/10 p-2 text-sky-600">
                                            <Package className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <Dialog.Title className="text-lg font-bold text-slate-900">
                                                Manage Packages
                                            </Dialog.Title>
                                            <p className="text-xs text-slate-500">
                                                Surgery: <span className="font-medium text-slate-700">{surgery.name}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"
                                        onClick={onClose}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                                    {/* Create / Edit Form */}
                                    <form onSubmit={handleFormSubmit} className="rounded-xl border border-sky-100 bg-sky-50/40 p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-900">
                                                {isEditing ? "Edit Package" : "Add New Package"}
                                            </h3>
                                            {isEditing && (
                                                <button
                                                    type="button"
                                                    onClick={resetForm}
                                                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                                                >
                                                    Cancel Edit
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                                    Package Name <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="e.g. Premium IOL Package"
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                                    Base Package Price (₹) <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs font-medium">₹</span>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="0"
                                                        step="1"
                                                        value={price}
                                                        onChange={(e) => setPrice(e.target.value)}
                                                        className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {showOverridesSection && (
                                            <div className="rounded-lg border border-slate-200 bg-white">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowOverrides((v) => !v)}
                                                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700"
                                                >
                                                    <span>Per-Body-Part Price Overrides (optional)</span>
                                                    {showOverrides ? (
                                                        <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </button>
                                                {showOverrides && (
                                                    <div className="space-y-2 border-t border-slate-100 p-3">
                                                        {applicableBodyParts.map((bp) => (
                                                            <div key={bp.id} className="flex items-center gap-2">
                                                                <label className="w-32 shrink-0 text-xs text-slate-600">
                                                                    {bp.name}
                                                                </label>
                                                                <div className="relative flex-1">
                                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs font-medium">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="1"
                                                                        placeholder={`Same as base price (₹${price || 0})`}
                                                                        value={overrides[bp.id] || ""}
                                                                        onChange={(e) =>
                                                                            setOverrides((prev) => ({ ...prev, [bp.id]: e.target.value }))
                                                                        }
                                                                        className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 py-1.5 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Description / Inclusions (optional)
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="e.g. Includes Foldable Hydrophobic IOL Lens & Post-Op Drops"
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isActive}
                                                        onChange={(e) => setIsActive(e.target.checked)}
                                                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                                                    />
                                                    Active Package
                                                </label>

                                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                    <span>Sort Order:</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={sortOrder}
                                                        onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                                                        className="w-14 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-center outline-none focus:border-sky-500"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-sky-700 hover:to-teal-700 transition-all disabled:opacity-50"
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="h-3.5 w-3.5" />
                                                        {isEditing ? "Update Package" : "Add Package"}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>

                                    {/* List of existing packages */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Existing Packages ({packages.length})
                                        </h4>

                                        {isLoading ? (
                                            <div className="py-8 flex justify-center">
                                                <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                                            </div>
                                        ) : packages.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-slate-500 text-xs">
                                                No packages defined for this surgery yet. Add one above!
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3">
                                                {packages.map((pkg) => (
                                                    <div
                                                        key={pkg.id}
                                                        className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                                                            pkg.is_active
                                                                ? "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                                                                : "border-slate-200 bg-slate-50/70 opacity-60"
                                                        }`}
                                                    >
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-sm text-slate-900">
                                                                    {pkg.name}
                                                                </span>
                                                                {pkg.is_active ? (
                                                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                                                                        Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                                                                        Inactive
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {pkg.description && (
                                                                <p className="text-xs text-slate-500">{pkg.description}</p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-4">
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                                                                    Base: ₹{pkg.price.toLocaleString("en-IN")}
                                                                </span>
                                                                {(pkg.prices || []).map((p) => (
                                                                    <span
                                                                        key={p.body_part_id}
                                                                        className="text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-md"
                                                                    >
                                                                        {p.body_part_name}: ₹{p.price.toLocaleString("en-IN")}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEditClick(pkg)}
                                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                                                    title="Edit package"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDelete(pkg.id)}
                                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                                    title="Delete package"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
