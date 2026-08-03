"use client";

import { useEffect, useState } from "react";
import { X, CalendarClock, Calendar, Clock, Loader2, FileText } from "lucide-react";
import { PlannedSurgery, RescheduleRequest } from "@/types";
import { getTodayDateLocal } from "@/utils/format";
import { toast } from "sonner";

interface RescheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payload: RescheduleRequest) => void;
    surgery: PlannedSurgery | null;
    isLoading?: boolean;
}

export function RescheduleModal({
    isOpen,
    onClose,
    onConfirm,
    surgery,
    isLoading = false,
}: RescheduleModalProps) {
    const surgeryName = surgery?.surgery_name || "";
    const patientName = surgery?.patient_name || "";
    const currentDate = surgery?.planned_date;
    const currentTime = surgery?.planned_time;

    const [newDate, setNewDate] = useState("");
    const [newTime, setNewTime] = useState("");
    const [reason, setReason] = useState("");

    const isFirstSchedule = !currentDate;
    const titleText = isFirstSchedule ? "Schedule Surgery" : "Reschedule Surgery";
    const dateLabel = isFirstSchedule ? "Surgery Date *" : "New Surgery Date *";
    const timeLabel = isFirstSchedule ? "Surgery Time (optional)" : "New Surgery Time (optional)";
    const submitText = isLoading
        ? (isFirstSchedule ? "Scheduling…" : "Rescheduling…")
        : (isFirstSchedule ? "Confirm Schedule" : "Confirm Reschedule");

    // Reset / initialize form on open or surgery change
    useEffect(() => {
        if (isOpen && surgery) {
            setNewDate(surgery.planned_date || getTodayDateLocal());
            setNewTime(surgery.planned_time ? surgery.planned_time.slice(0, 5) : "");
            setReason("");
        }
    }, [isOpen, surgery]);

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

    if (!isOpen || !surgery) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newDate.trim()) {
            toast.error("Please select a surgery date");
            return;
        }

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
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => !isLoading && onClose()}
        >
            <div
                className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-100/80 text-amber-800">
                            {isFirstSchedule ? <Calendar className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">{titleText}</h3>
                            <p className="text-xs font-medium text-slate-500">
                                {surgeryName} {surgery.eye ? `(${surgery.eye})` : ""} • {patientName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => !isLoading && onClose()}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                        disabled={isLoading}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Currently scheduled banner */}
                    {currentDate && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Currently Scheduled For</p>
                                <p className="mt-0.5 text-sm font-bold text-slate-800">
                                    {formatCurrentDate(currentDate)}
                                    {currentTime && (
                                        <span className="ml-2 text-xs font-medium text-slate-600">at {currentTime.slice(0, 5)}</span>
                                    )}
                                </p>
                            </div>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                                Rescheduling
                            </span>
                        </div>
                    )}

                    {/* Date & Time Selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {dateLabel}
                            </label>
                            <input
                                type="date"
                                required
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                min={getTodayDateLocal()}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {timeLabel}
                            </label>
                            <input
                                type="time"
                                step="300"
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            {isFirstSchedule ? "Notes / Scheduling Remarks (optional)" : "Reason for Rescheduling (optional)"}
                        </label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={
                                isFirstSchedule
                                    ? "e.g. Scheduled as per patient request"
                                    : "e.g. Patient requested date change, Doctor unavailable, etc."
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !newDate}
                            className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Updating…
                                </>
                            ) : (
                                submitText
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
