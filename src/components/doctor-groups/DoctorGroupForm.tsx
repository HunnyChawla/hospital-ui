"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { doctorGroupsApi, CreateDoctorGroupRequest, DoctorGroup } from "@/services/doctorGroupsApi";

interface DoctorGroupFormProps {
    onSuccess: (group: DoctorGroup) => void;
    onCancel: () => void;
}

export function DoctorGroupForm({ onSuccess, onCancel }: DoctorGroupFormProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Group name is required");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const data: CreateDoctorGroupRequest = {
                name: name.trim(),
                ...(description.trim() && { description: description.trim() }),
            };

            const createdGroup = await doctorGroupsApi.create(data);
            onSuccess(createdGroup);
        } catch (err: any) {
            console.error("Failed to create group:", err);
            setError(err.response?.data?.detail || "Failed to create group");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            )}

            <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                    Group Name <span className="text-rose-500">*</span>
                </label>
                <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Ophthalmology Team"
                    maxLength={255}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    disabled={loading}
                />
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                    Description
                </label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description for the group"
                    maxLength={500}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    disabled={loading}
                />
                <p className="mt-1 text-xs text-slate-500">{description.length}/500 characters</p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
                >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Creating..." : "Create Group"}
                </button>
            </div>
        </form>
    );
}
