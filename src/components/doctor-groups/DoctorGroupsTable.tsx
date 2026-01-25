"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Loader2 } from "lucide-react";
import { DoctorGroup, doctorGroupsApi } from "@/services/doctorGroupsApi";

interface DoctorGroupsTableProps {
    onGroupClick?: (group: DoctorGroup) => void;
    selectedGroupId?: string;
    refreshTrigger?: number;
}

export function DoctorGroupsTable({ onGroupClick, selectedGroupId, refreshTrigger }: DoctorGroupsTableProps) {
    const [groups, setGroups] = useState<DoctorGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGroups = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await doctorGroupsApi.list(false);
            setGroups(data);
        } catch (err) {
            console.error("Failed to fetch doctor groups:", err);
            setError("Failed to load doctor groups");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups, refreshTrigger]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                <span className="ml-2 text-sm text-slate-500">Loading groups...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
                <p className="text-sm text-rose-800">{error}</p>
                <button
                    onClick={fetchGroups}
                    className="mt-2 text-sm font-medium text-rose-600 hover:text-rose-800"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-slate-100 p-4">
                    <Users className="h-8 w-8 text-slate-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-900">No doctor groups</p>
                <p className="mt-1 text-sm text-slate-500">Create a group to get started</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                        <th className="px-4 py-3">Group Name</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-center">Members</th>
                        <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {groups.map((group) => (
                        <tr
                            key={group.id}
                            onClick={() => onGroupClick?.(group)}
                            className={`cursor-pointer transition ${selectedGroupId === group.id
                                    ? "bg-sky-50 ring-1 ring-inset ring-sky-200"
                                    : "hover:bg-slate-50"
                                }`}
                        >
                            <td className="px-4 py-3">
                                <p className="font-semibold text-slate-900">{group.name}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                                {group.description || <span className="text-slate-400">-</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                                    <Users className="h-3 w-3" />
                                    {group.member_count}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${group.is_active
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                >
                                    {group.is_active ? "Active" : "Inactive"}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
