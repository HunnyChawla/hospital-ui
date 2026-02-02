"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { DoctorGroupsTable } from "@/components/doctor-groups/DoctorGroupsTable";
import { DoctorGroupFormModal } from "@/components/doctor-groups/DoctorGroupFormModal";
import { GroupMembersPanel } from "@/components/doctor-groups/GroupMembersPanel";
import { AddDoctorToGroupModal } from "@/components/doctor-groups/AddDoctorToGroupModal";
import { DoctorGroup } from "@/services/doctorGroupsApi";

export default function DoctorGroupsPage() {
    // State for selected group
    const [selectedGroup, setSelectedGroup] = useState<DoctorGroup | null>(null);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

    // Refresh triggers
    const [groupsRefreshTrigger, setGroupsRefreshTrigger] = useState(0);
    const [membersRefreshTrigger, setMembersRefreshTrigger] = useState(0);

    const handleGroupClick = (group: DoctorGroup) => {
        setSelectedGroup(group);
    };

    const handleCreateSuccess = (group: DoctorGroup) => {
        setGroupsRefreshTrigger((prev) => prev + 1);
        setSelectedGroup(group);
    };

    const handleAddMemberSuccess = () => {
        setMembersRefreshTrigger((prev) => prev + 1);
        setGroupsRefreshTrigger((prev) => prev + 1); // Refresh to update member count
    };

    return (
        <div className="grid gap-4">
            {/* Header */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900">Doctor Groups</h1>
                            <p className="text-sm text-slate-500">Manage doctor groups for shared queue</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                    >
                        Create Group
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Groups Table */}
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <h2 className="mb-4 text-base font-semibold text-slate-900">All Groups</h2>
                    <DoctorGroupsTable
                        onGroupClick={handleGroupClick}
                        selectedGroupId={selectedGroup?.id}
                        refreshTrigger={groupsRefreshTrigger}
                    />
                </div>

                {/* Members Panel */}
                <div>
                    {selectedGroup ? (
                        <GroupMembersPanel
                            group={selectedGroup}
                            onAddMemberClick={() => setShowAddMemberModal(true)}
                            refreshTrigger={membersRefreshTrigger}
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                            <div className="rounded-full bg-slate-100 p-4">
                                <Users className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="mt-4 font-medium text-slate-700">Select a group</p>
                            <p className="mt-1 text-sm text-slate-500">
                                Click on a group to view and manage its members
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Group Modal */}
            <DoctorGroupFormModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
            />

            {/* Add Member Modal */}
            {selectedGroup && (
                <AddDoctorToGroupModal
                    isOpen={showAddMemberModal}
                    onClose={() => setShowAddMemberModal(false)}
                    groupId={selectedGroup.id}
                    groupName={selectedGroup.name}
                    onSuccess={handleAddMemberSuccess}
                />
            )}
        </div>
    );
}
