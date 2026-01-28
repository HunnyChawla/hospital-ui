"use client";

import { useState, useCallback } from "react";
import { ConfirmationDialogVariant } from "@/components/common/ConfirmationDialog";

type ConfirmOptions = {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmationDialogVariant;
};

type ConfirmState = ConfirmOptions & {
    isOpen: boolean;
    onConfirm: () => void;
};

/**
 * Custom hook for managing confirmation dialogs
 * 
 * @example
 * ```tsx
 * const { confirmState, confirm, closeConfirm } = useConfirm();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: "Delete Item",
 *     message: "Are you sure you want to delete this item?",
 *     variant: "danger"
 *   });
 *   
 *   if (confirmed) {
 *     // Perform delete action
 *   }
 * };
 * 
 * // In your JSX:
 * <ConfirmationDialog {...confirmState} />
 * ```
 */
export function useConfirm() {
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
    });

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({
                ...options,
                isOpen: true,
                onConfirm: () => {
                    setConfirmState((prev) => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
            });

            // Auto-resolve to false when dialog is closed without confirmation
            const closeHandler = () => {
                resolve(false);
            };

            // Store close handler for cleanup
            (closeHandler as any).cleanup = true;
        });
    }, []);

    const closeConfirm = useCallback(() => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
    }, []);

    return {
        confirmState: {
            ...confirmState,
            onClose: closeConfirm,
        },
        confirm,
        closeConfirm,
    };
}
