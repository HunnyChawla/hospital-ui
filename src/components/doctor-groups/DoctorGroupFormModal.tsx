"use client";

import { Modal } from "@/components/common/Modal";
import { DoctorGroupForm } from "./DoctorGroupForm";
import { DoctorGroup } from "@/services/doctorGroupsApi";

interface DoctorGroupFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (group: DoctorGroup) => void;
}

export function DoctorGroupFormModal({ isOpen, onClose, onSuccess }: DoctorGroupFormModalProps) {
    const handleSuccess = (group: DoctorGroup) => {
        onSuccess(group);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Doctor Group" size="md">
            <DoctorGroupForm onSuccess={handleSuccess} onCancel={onClose} />
        </Modal>
    );
}
