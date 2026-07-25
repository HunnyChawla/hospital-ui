"use client";

import { useEffect, useState } from "react";
import { X, CalendarClock } from "lucide-react";

interface RescheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { new_date: string; new_time?: string; reason?: string }) => void;
    surgeryName: string;
    patientName: string;
    currentDate?: string | null;
    currentTime?: string | null;
    isLoading?: boolean;
}

export function RescheduleModal({
    isOpen,
    onClose,
    onConfirm,
    surgeryName,
    patientName,
    currentDate,
    currentTime,
    isLoading = false,
}: RescheduleModalProps) {
    const [newDate, setNewDate] = useState("");
    const [newTime, setNewTime] = useState("");
    const [reason, setReason] = useState("");

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            setNewDate("");
            setNewTime("");
            setReason("");
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

    if (!isOpen) return null;

    const canSubmit = newDate.trim().length > 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit || isLoading) return;

        onConfirm({
            new_date: newDate,
            new_time: newTime || undefined,
            reason: reason.trim() || undefined,
        });
    };

    const formatCurrentDate = (d: string | null | undefined) => {
        if (!d) return "Not set";
        try {
            return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch {
            return d;
        }
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
                            <CalendarClock className="h-5 w-5 text-amber-700" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">Reschedule Surgery</h3>
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
                        {/* Current date info */}
                        {currentDate && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-medium text-slate-500">Currently scheduled for</p>
                                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                                    {formatCurrentDate(currentDate)}
                                    {currentTime && (
                                        <span className="ml-2 font-medium text-slate-500">at {currentTime}</span>
                                    )}
                                </p>
                            </div>
                        )}

                        {/* New date */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                New Date *
                            </label>
                            <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                required
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </div>

                        {/* New time */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                New Time (optional)
                            </label>
                            <input
                                type="time"
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                Reason (optional)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g., Patient requested different date"
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </div>
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
                            className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isLoading ? "Rescheduling…" : "Reschedule"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
