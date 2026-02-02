"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, UserMinus, Loader2, Users } from "lucide-react";
import { DoctorGroup, DoctorGroupMember, doctorGroupsApi } from "@/services/doctorGroupsApi";

interface GroupMembersPanelProps {
    group: DoctorGroup;
    onAddMemberClick: () => void;
    refreshTrigger?: number;
}

export function GroupMembersPanel({ group, onAddMemberClick, refreshTrigger }: GroupMembersPanelProps) {
    const [members, setMembers] = useState<DoctorGroupMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const fetchMembers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await doctorGroupsApi.getMembers(group.id, false);
            setMembers(data);
        } catch (err) {
            console.error("Failed to fetch group members:", err);
            setError("Failed to load group members");
        } finally {
            setLoading(false);
        }
    }, [group.id]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers, refreshTrigger]);

    const handleRemoveMember = async (member: DoctorGroupMember) => {
        if (!confirm(`Remove ${member.doctor_name || "this doctor"} from the group?`)) {
            return;
        }

        try {
            setRemovingId(member.doctor_id);
            await doctorGroupsApi.removeMember(group.id, member.doctor_id);
            setMembers((prev) => prev.filter((m) => m.id !== member.id));
        } catch (err: any) {
            console.error("Failed to remove member:", err);
            alert(err.response?.data?.detail || "Failed to remove member");
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">{group.name}</h3>
                    {group.description && (
                        <p className="mt-0.5 text-sm text-slate-500">{group.description}</p>
                    )}
                </div>
                <button
                    onClick={onAddMemberClick}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                >
                    <UserPlus className="h-4 w-4" />
                    Add Doctor
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                    <span className="ml-2 text-sm text-slate-500">Loading members...</span>
                </div>
            ) : error ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
                    {error}
                    <button onClick={fetchMembers} className="ml-2 font-medium underline">
                        Retry
                    </button>
                </div>
            ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="rounded-full bg-slate-100 p-3">
                        <Users className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="mt-3 text-sm text-slate-600">No doctors in this group</p>
                    <p className="text-xs text-slate-400">Add doctors to enable shared queue</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {members.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                                    <span className="text-sm font-semibold">
                                        {(member.doctor_name || "D").charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">
                                        {member.doctor_name || "Unknown Doctor"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Added {new Date(member.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveMember(member)}
                                disabled={removingId === member.doctor_id}
                                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                            >
                                {removingId === member.doctor_id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <UserMinus className="h-3 w-3" />
                                )}
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
