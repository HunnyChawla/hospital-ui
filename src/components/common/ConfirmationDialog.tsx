"use client";

import { Modal } from "./Modal";
import { AlertTriangle, Info, Trash2, AlertCircle } from "lucide-react";

export type ConfirmationDialogVariant = "danger" | "warning" | "info";

type ConfirmationDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmationDialogVariant;
    isLoading?: boolean;
};

export function ConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger",
    isLoading = false,
}: ConfirmationDialogProps) {
    const handleConfirm = () => {
        onConfirm();
    };

    const getVariantStyles = () => {
        switch (variant) {
            case "danger":
                return {
                    icon: Trash2,
                    iconBg: "bg-rose-100",
                    iconColor: "text-rose-600",
                    buttonBg: "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600",
                };
            case "warning":
                return {
                    icon: AlertTriangle,
                    iconBg: "bg-amber-100",
                    iconColor: "text-amber-600",
                    buttonBg: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
                };
            case "info":
                return {
                    icon: Info,
                    iconBg: "bg-sky-100",
                    iconColor: "text-sky-600",
                    buttonBg: "bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600",
                };
        }
    };

    const styles = getVariantStyles();
    const Icon = styles.icon;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
            <div className="p-1">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className={`rounded-full ${styles.iconBg} p-3`}>
                        <Icon className={`h-8 w-8 ${styles.iconColor}`} />
                    </div>
                </div>

                {/* Content */}
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-sm text-slate-600">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-60 ${styles.buttonBg}`}
                    >
                        {isLoading ? "Processing..." : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
