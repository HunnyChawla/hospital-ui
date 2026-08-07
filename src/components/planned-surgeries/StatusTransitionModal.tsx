"use client";

import { useEffect, useState } from "react";
import { PlannedSurgeryStatus } from "@/types";
import {
    X,
    CalendarClock,
    Clock,
    CheckCircle2,
    XCircle,
    Ban,
    AlertTriangle,
} from "lucide-react";

interface StatusTransitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        to_status: PlannedSurgeryStatus;
        reason?: string;
        followup_date?: string;
        notes?: string;
    }) => void;
    currentStatus: PlannedSurgeryStatus;
    targetStatus: PlannedSurgeryStatus;
    surgeryName: string;
    patientName: string;
    isLoading?: boolean;
}

const STATUS_CONFIG: Record<
    string,
    {
        icon: React.ComponentType<{ className?: string }>;
        color: string;
        bgColor: string;
        borderColor: string;
        label: string;
        description: string;
        requiresReason: boolean;
        showFollowupDate: boolean;
        confirmLabel: string;
        confirmColor: string;
    }
> = {
    scheduled: {
        icon: CalendarClock,
        color: "text-sky-700",
        bgColor: "bg-sky-50",
        borderColor: "border-sky-200",
        label: "Schedule Surgery",
        description: "Confirm the surgery date and time.",
        requiresReason: false,
        showFollowupDate: false,
        confirmLabel: "Schedule",
        confirmColor: "bg-sky-600 hover:bg-sky-700",
    },
    postponed: {
        icon: Clock,
        color: "text-orange-700",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        label: "Postpone Surgery",
        description:
            "Patient wants to plan later. You can set a follow-up date for the hospital to reach out.",
        requiresReason: false,
        showFollowupDate: true,
        confirmLabel: "Postpone",
        confirmColor: "bg-orange-600 hover:bg-orange-700",
    },
    completed: {
        icon: CheckCircle2,
        color: "text-emerald-700",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
        label: "Mark as Completed",
        description: "Mark this surgery as completed.",
        requiresReason: false,
        showFollowupDate: false,
        confirmLabel: "Mark Completed",
        confirmColor: "bg-emerald-600 hover:bg-emerald-700",
    },
    cancelled: {
        icon: XCircle,
        color: "text-rose-700",
        bgColor: "bg-rose-50",
        borderColor: "border-rose-200",
        label: "Cancel Surgery",
        description: "Cancel this surgery. Please provide a reason.",
        requiresReason: true,
        showFollowupDate: false,
        confirmLabel: "Cancel Surgery",
        confirmColor: "bg-rose-600 hover:bg-rose-700",
    },
    denied: {
        icon: Ban,
        color: "text-red-700",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        label: "Patient Denied",
        description: "Patient has refused this surgery. Please provide a reason.",
        requiresReason: true,
        showFollowupDate: false,
        confirmLabel: "Mark as Denied",
        confirmColor: "bg-red-600 hover:bg-red-700",
    },
};

export function StatusTransitionModal({
    isOpen,
    onClose,
    onConfirm,
    currentStatus,
    targetStatus,
    surgeryName,
    patientName,
    isLoading = false,
}: StatusTransitionModalProps) {
    const [reason, setReason] = useState("");
    const [followupDate, setFollowupDate] = useState("");
    const [notes, setNotes] = useState("");

    const config = STATUS_CONFIG[targetStatus];

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            setReason("");
            setFollowupDate("");
            setNotes("");
        }
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isLoading) onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            return () => document.removeEventListener("keydown", handleEscape);
        }
    }, [isOpen, onClose, isLoading]);

    if (!isOpen || !config) return null;

    const Icon = config.icon;
    const canSubmit = config.requiresReason ? reason.trim().length > 0 : true;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit || isLoading) return;

        onConfirm({
            to_status: targetStatus,
            reason: reason.trim() || undefined,
            followup_date: followupDate || undefined,
            notes: notes.trim() || undefined,
        });
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => !isLoading && onClose()}
        >
            <div
                className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 to-teal-50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${config.borderColor} ${config.bgColor}`}
                        >
                            <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">{config.label}</h3>
                            <p className="text-xs font-medium text-slate-500">
                                {surgeryName} • {patientName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => !isLoading && onClose()}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        disabled={isLoading}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 p-6">
                        {/* Description */}
                        <p className="text-sm leading-relaxed text-slate-600 font-medium">{config.description}</p>

                        {/* Warning for terminal states */}
                        {(targetStatus === "cancelled" || targetStatus === "denied" || targetStatus === "completed") && (
                            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <p className="text-xs font-medium text-amber-800">
                                    This action will mark the surgery as{" "}
                                    <strong>{targetStatus}</strong>.
                                </p>
                            </div>
                        )}

                        {/* Reason field */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                Reason{config.requiresReason ? " *" : " (optional)"}
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={
                                    targetStatus === "denied"
                                        ? "e.g., Patient not willing for surgery right now"
                                        : targetStatus === "cancelled"
                                        ? "e.g., Surgery no longer needed"
                                        : "Reason for this change"
                                }
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </div>

                        {/* Follow-up date (for postpone) */}
                        {config.showFollowupDate && (
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Follow-up Date (optional)
                                </label>
                                <input
                                    type="date"
                                    value={followupDate}
                                    onChange={(e) => setFollowupDate(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                />
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Set a date for the hospital to follow up with the patient.
                                </p>
                            </div>
                        )}

                        {/* Additional notes */}
                        {!config.requiresReason && (
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Additional Notes (optional)
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any additional notes"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
                        <button
                            type="button"
                            onClick={() => !isLoading && onClose()}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit || isLoading}
                            className={`rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${config.confirmColor}`}
                        >
                            {isLoading ? "Processing…" : config.confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
