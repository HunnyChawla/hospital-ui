"use client";

import { useEffect } from "react";
import { usePlannedSurgeryHistory } from "@/hooks/queries/usePlannedSurgeries";
import { PlannedSurgeryStatusHistory } from "@/types";
import { formatDate } from "@/utils/format";
import {
    X,
    Loader2,
    AlertCircle,
    CalendarPlus,
    CalendarClock,
    CheckCircle2,
    XCircle,
    Ban,
    Clock,
    ArrowRight,
    RotateCcw,
} from "lucide-react";

interface SurgeryHistoryModalProps {
    surgeryId: string;
    surgeryName: string;
    patientName: string;
    isOpen: boolean;
    onClose: () => void;
}

const EVENT_CONFIG: Record<
    string,
    {
        icon: React.ComponentType<{ className?: string }>;
        color: string;
        bgColor: string;
        borderColor: string;
        label: string;
    }
> = {
    created: {
        icon: CalendarPlus,
        color: "text-blue-700",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        label: "Surgery Advised",
    },
    scheduled: {
        icon: CalendarClock,
        color: "text-sky-700",
        bgColor: "bg-sky-50",
        borderColor: "border-sky-200",
        label: "Scheduled",
    },
    rescheduled: {
        icon: RotateCcw,
        color: "text-amber-700",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        label: "Rescheduled",
    },
    postponed: {
        icon: Clock,
        color: "text-orange-700",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        label: "Postponed",
    },
    completed: {
        icon: CheckCircle2,
        color: "text-emerald-700",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
        label: "Completed",
    },
    cancelled: {
        icon: XCircle,
        color: "text-rose-700",
        bgColor: "bg-rose-50",
        borderColor: "border-rose-200",
        label: "Cancelled",
    },
    denied: {
        icon: Ban,
        color: "text-red-700",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        label: "Denied by Patient",
    },
};

function getEventConfig(eventType: string) {
    return (
        EVENT_CONFIG[eventType] || {
            icon: AlertCircle,
            color: "text-slate-700",
            bgColor: "bg-slate-50",
            borderColor: "border-slate-200",
            label: eventType,
        }
    );
}

function formatTime12h(timeStr: string | null | undefined): string {
    if (!timeStr) return "";
    try {
        const [hours, minutes] = timeStr.split(":");
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    } catch {
        return timeStr;
    }
}

function formatStatusLabel(status: string | null): string {
    if (!status) return "—";
    const labels: Record<string, string> = {
        advised: "Advised",
        scheduled: "Scheduled",
        postponed: "Postponed",
        completed: "Completed",
        cancelled: "Cancelled",
        denied: "Denied",
    };
    return labels[status] || status;
}

function TimelineEntry({
    entry,
    isLast,
}: {
    entry: PlannedSurgeryStatusHistory;
    isLast: boolean;
}) {
    const config = getEventConfig(entry.event_type);
    const Icon = config.icon;

    const createdDate = new Date(entry.created_at);
    const timeStr = createdDate.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
    const dateStr = formatDate(entry.created_at);

    return (
        <div className="relative flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
                <div
                    className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${config.borderColor} ${config.bgColor}`}
                >
                    <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                {!isLast && (
                    <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                )}
            </div>

            {/* Content Card */}
            <div className={`flex-1 pb-6 ${isLast ? "pb-0" : ""}`}>
                <div
                    className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-4 shadow-2xs`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-bold ${config.color}`}>
                            {config.label}
                        </h4>
                        <span className="text-xs font-medium text-slate-500">
                            {dateStr} • {timeStr}
                        </span>
                    </div>

                    {/* Status transition */}
                    {entry.from_status && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                            <span className="rounded bg-white px-2 py-0.5 font-semibold border border-slate-200">
                                {formatStatusLabel(entry.from_status)}
                            </span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="rounded bg-white px-2 py-0.5 font-semibold border border-slate-200">
                                {formatStatusLabel(entry.to_status)}
                            </span>
                        </div>
                    )}

                    {/* Date change (for reschedule) */}
                    {entry.event_type === "rescheduled" && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                            <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800 border border-amber-200">
                                {entry.from_date ? formatDate(entry.from_date) : "No date"}
                                {entry.from_time ? ` at ${formatTime12h(entry.from_time)}` : ""}
                            </span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="rounded bg-sky-100 px-2 py-0.5 font-semibold text-sky-800 border border-sky-200">
                                {entry.to_date ? formatDate(entry.to_date) : "No date"}
                                {entry.to_time ? ` at ${formatTime12h(entry.to_time)}` : ""}
                            </span>
                        </div>
                    )}

                    {/* Scheduled date & time */}
                    {entry.event_type === "scheduled" && entry.to_date && (
                        <div className="mt-2 text-xs text-slate-600">
                            <span className="text-slate-500">Scheduled Date & Time: </span>
                            <span className="font-semibold text-sky-700">
                                {formatDate(entry.to_date)}
                                {entry.to_time ? ` at ${formatTime12h(entry.to_time)}` : ""}
                            </span>
                        </div>
                    )}

                    {/* Follow-up date */}
                    {entry.followup_date && (
                        <div className="mt-1.5 text-xs text-slate-600">
                            <span className="text-slate-500">Hospital Follow-up: </span>
                            <span className="font-semibold text-orange-700">{formatDate(entry.followup_date)}</span>
                        </div>
                    )}

                    {/* Notes */}
                    {entry.notes && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 italic bg-white/70 p-2 rounded-lg border border-slate-100">
                            &quot;{entry.notes}&quot;
                        </p>
                    )}

                    {/* Who did it */}
                    {entry.created_by && (
                        <div className="mt-2 text-[11px] text-slate-400 font-medium">
                            By: {entry.created_by}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function SurgeryHistoryModal({
    surgeryId,
    surgeryName,
    patientName,
    isOpen,
    onClose,
}: SurgeryHistoryModalProps) {
    const { data: history, isLoading, error } = usePlannedSurgeryHistory(isOpen ? surgeryId : null);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            return () => document.removeEventListener("keydown", handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200 flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 to-teal-50 px-6 py-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Surgery Timeline History</h3>
                        <p className="mt-0.5 text-xs text-slate-500 font-medium">
                            {surgeryName} • {patientName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                            <span className="ml-2 text-sm text-slate-500 font-medium">Loading history…</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center gap-2 py-12 text-rose-600">
                            <AlertCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">Failed to load history timeline</span>
                        </div>
                    )}

                    {!isLoading && !error && history && history.length === 0 && (
                        <div className="py-12 text-center text-sm text-slate-500">
                            No history entries recorded yet.
                        </div>
                    )}

                    {!isLoading && !error && history && history.length > 0 && (
                        <div className="space-y-0">
                            {history.map((entry, idx) => (
                                <TimelineEntry
                                    key={entry.id}
                                    entry={entry}
                                    isLast={idx === history.length - 1}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                            Total {history?.length ?? 0} event{(history?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                        <button
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
