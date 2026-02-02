"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, UserPlus } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { useAppSelector } from "@/redux/hooks";
import { doctorGroupsApi, DoctorGroupMember } from "@/services/doctorGroupsApi";

interface AddDoctorToGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupName: string;
    onSuccess: (member: DoctorGroupMember) => void;
}

export function AddDoctorToGroupModal({
    isOpen,
    onClose,
    groupId,
    groupName,
    onSuccess,
}: AddDoctorToGroupModalProps) {
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingMembers, setExistingMembers] = useState<string[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);

    // Get doctors from Redux store (prefetched in dashboard layout)
    const { list: allDoctors, loading: doctorsLoading } = useAppSelector((s) => s.doctors);

    // Fetch existing members to filter them out
    useEffect(() => {
        if (isOpen && groupId) {
            setLoadingMembers(true);
            doctorGroupsApi
                .getMembers(groupId, false)
                .then((members) => {
                    setExistingMembers(members.map((m) => m.doctor_id));
                })
                .catch(console.error)
                .finally(() => setLoadingMembers(false));
        }
    }, [isOpen, groupId]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedDoctorId(null);
            setSearchQuery("");
            setError(null);
        }
    }, [isOpen]);

    // Filter doctors: exclude existing members and apply search
    const availableDoctors = allDoctors.filter((doctor) => {
        if (existingMembers.includes(doctor.id)) return false;
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const name = (doctor.user_name || doctor.name || "").toLowerCase();
        const specialization = (doctor.specialization || "").toLowerCase();
        return name.includes(query) || specialization.includes(query);
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDoctorId) {
            setError("Please select a doctor");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const member = await doctorGroupsApi.addMember(groupId, selectedDoctorId);
            onSuccess(member);
            onClose();
        } catch (err: any) {
            console.error("Failed to add doctor:", err);
            setError(err.response?.data?.detail || "Failed to add doctor to group");
        } finally {
            setLoading(false);
        }
    };

    const isLoading = doctorsLoading || loadingMembers;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add Doctor to ${groupName}`} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {error}
                    </div>
                )}

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search doctors..."
                        className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        disabled={isLoading}
                    />
                </div>

                {/* Doctor List */}
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                            <span className="ml-2 text-sm text-slate-500">Loading doctors...</span>
                        </div>
                    ) : availableDoctors.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-500">
                            {searchQuery ? "No matching doctors found" : "No available doctors to add"}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {availableDoctors.map((doctor) => {
                                const doctorName = doctor.user_name || doctor.name || "Unknown Doctor";
                                const isSelected = selectedDoctorId === doctor.id;
                                return (
                                    <button
                                        key={doctor.id}
                                        type="button"
                                        onClick={() => setSelectedDoctorId(doctor.id)}
                                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${isSelected ? "bg-sky-50" : "hover:bg-slate-50"
                                            }`}
                                    >
                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-full ${isSelected ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            <span className="text-xs font-semibold">
                                                {doctorName.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-900">{doctorName}</p>
                                            {doctor.specialization && (
                                                <p className="text-xs text-slate-500">{doctor.specialization}</p>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <div className="h-2 w-2 rounded-full bg-sky-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !selectedDoctorId}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <UserPlus className="h-4 w-4" />
                        )}
                        {loading ? "Adding..." : "Add to Group"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
