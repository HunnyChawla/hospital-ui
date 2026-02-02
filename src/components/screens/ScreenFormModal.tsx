"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { ScreenResponse, ScreenCreate, ScreenUpdate } from "@/services/screensApi";
import { Loader2 } from "lucide-react";

interface ScreenFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ScreenCreate | ScreenUpdate) => Promise<void>;
    initialData?: ScreenResponse | null;
    isLoading?: boolean;
}

export function ScreenFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isLoading = false,
}: ScreenFormModalProps) {
    const [formData, setFormData] = useState<ScreenCreate>({
        label: "",
        path: "",
        icon: "",
        category: "",
        display_order: 0,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                label: initialData.label,
                path: initialData.path,
                icon: initialData.icon || "",
                category: initialData.category || "",
                display_order: initialData.display_order,
            });
        } else {
            setFormData({
                label: "",
                path: "",
                icon: "",
                category: "",
                display_order: 0,
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            ...formData,
            icon: formData.icon || null,
            category: formData.category || null,
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Edit Screen" : "Create Screen"}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Label */}
                    <div className="col-span-2 md:col-span-1">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Label <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g. Dashboard"
                        />
                    </div>

                    {/* Path */}
                    <div className="col-span-2 md:col-span-1">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Path <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.path}
                            onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g. /dashboard"
                        />
                    </div>

                    {/* Icon */}
                    <div className="col-span-2 md:col-span-1">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Icon Name
                        </label>
                        <input
                            type="text"
                            value={formData.icon || ""}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g. Home"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Lucide icon name (e.g. Home, Users, Settings)
                        </p>
                    </div>

                    {/* Category */}
                    <div className="col-span-2 md:col-span-1">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Category
                        </label>
                        <input
                            type="text"
                            value={formData.category || ""}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g. Admin"
                        />
                    </div>

                    {/* Display Order */}
                    <div className="col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Display Order
                        </label>
                        <input
                            type="number"
                            value={formData.display_order}
                            onChange={(e) =>
                                setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {initialData ? "Update Screen" : "Create Screen"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
