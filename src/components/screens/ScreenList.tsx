"use client";

import { useEffect, useState } from "react";
import { screensApi, ScreenResponse } from "@/services/screensApi";
import { ScreenFormModal } from "./ScreenFormModal";
import { Pencil, Trash2, Plus, Monitor } from "lucide-react";
import { toast } from "sonner";

export function ScreenList() {
    const [screens, setScreens] = useState<ScreenResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingScreen, setEditingScreen] = useState<ScreenResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchScreens = async () => {
        try {
            setIsLoading(true);
            const data = await screensApi.list();
            setScreens(data);
        } catch (error) {
            console.error("Failed to fetch screens:", error);
            toast.error("Failed to load screens");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchScreens();
    }, []);

    const handleCreate = () => {
        setEditingScreen(null);
        setIsModalOpen(true);
    };

    const handleEdit = (screen: ScreenResponse) => {
        setEditingScreen(screen);
        setIsModalOpen(true);
    };

    const handleDelete = async (screenId: string) => {
        if (!confirm("Are you sure you want to delete this screen?")) return;

        try {
            await screensApi.delete(screenId);
            toast.success("Screen deleted successfully");
            fetchScreens();
        } catch (error) {
            console.error("Failed to delete screen:", error);
            toast.error("Failed to delete screen");
        }
    };

    const handleSubmit = async (data: any) => {
        try {
            setIsSubmitting(true);
            if (editingScreen) {
                await screensApi.update(editingScreen.id, data);
                toast.success("Screen updated successfully");
            } else {
                await screensApi.create(data);
                toast.success("Screen created successfully");
            }
            setIsModalOpen(false);
            fetchScreens();
        } catch (error) {
            console.error("Failed to save screen:", error);
            toast.error("Failed to save screen");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Screen Management</h1>
                    <p className="text-sm text-slate-500">Manage application screens and menus</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    Add Screen
                </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Label</th>
                            <th className="px-6 py-3 font-semibold">Path</th>
                            <th className="px-6 py-3 font-semibold">Icon</th>
                            <th className="px-6 py-3 font-semibold">Category</th>
                            <th className="px-6 py-3 font-semibold">Order</th>
                            <th className="px-6 py-3 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {screens.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="rounded-full bg-slate-100 p-3">
                                            <Monitor className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <p>No screens found. Create one to get started.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            screens.map((screen) => (
                                <tr key={screen.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">{screen.label}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{screen.path}</td>
                                    <td className="px-6 py-4">{screen.icon || "-"}</td>
                                    <td className="px-6 py-4">
                                        {screen.category ? (
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                                                {screen.category}
                                            </span>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td className="px-6 py-4">{screen.display_order}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(screen)}
                                                className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                                                title="Edit"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(screen.id)}
                                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ScreenFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingScreen}
                isLoading={isSubmitting}
            />
        </div>
    );
}
