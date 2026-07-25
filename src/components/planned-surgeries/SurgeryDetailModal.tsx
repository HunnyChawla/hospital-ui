"use client";

import { useEffect } from "react";
import { PlannedSurgery, PlannedSurgeryStatus } from "@/types";
import { formatDate } from "@/utils/format";
import {
    X,
    User,
    Phone,
    Stethoscope,
    Calendar,
    Clock,
    Package,
    CreditCard,
    History,
    Pencil,
    CalendarClock,
    CheckCircle2,
    XCircle,
    Ban,
    RefreshCw,
    FileText,
    AlertCircle,
    Eye as EyeIcon,
} from "lucide-react";

interface SurgeryDetailModalProps {
    surgery: PlannedSurgery | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (surgery: PlannedSurgery) => void;
    onViewHistory: (surgery: PlannedSurgery) => void;
    onReschedule: (surgery: PlannedSurgery) => void;
    onTransition: (surgery: PlannedSurgery, targetStatus: PlannedSurgeryStatus) => void;
}

export function SurgeryDetailModal({
    surgery,
    isOpen,
    onClose,
    onEdit,
    onViewHistory,
    onReschedule,
    onTransition,
}: SurgeryDetailModalProps) {
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

    if (!isOpen || !surgery) return null;

    const isTerminal =
        surgery.status === "completed" || surgery.status === "cancelled" || surgery.status === "denied";

    const getStatusBadge = (status: PlannedSurgeryStatus) => {
        const styles: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
            advised: { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", icon: AlertCircle },
            scheduled: { bg: "bg-sky-50 border-sky-200", text: "text-sky-800", icon: CalendarClock },
            postponed: { bg: "bg-orange-50 border-orange-200", text: "text-orange-800", icon: Clock },
            completed: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", icon: CheckCircle2 },
            cancelled: { bg: "bg-rose-50 border-rose-200", text: "text-rose-800", icon: XCircle },
            denied: { bg: "bg-red-50 border-red-200", text: "text-red-800", icon: Ban },
        };

        const config = styles[status] || { bg: "bg-slate-50 border-slate-200", text: "text-slate-700", icon: AlertCircle };
        const Icon = config.icon;

        return (
            <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}
            >
                <Icon className="h-3.5 w-3.5" />
                <span className="capitalize">{status}</span>
            </span>
        );
    };

    const getEyeBadge = (eye?: string | null) => {
        if (!eye) return null;
        const labels: Record<string, string> = {
            OD: "Right Eye (OD)",
            OS: "Left Eye (OS)",
            OU: "Both Eyes (OU)",
        };
        return (
            <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                <EyeIcon className="h-3.5 w-3.5 text-sky-600" />
                {labels[eye] || eye}
            </span>
        );
    };

    const formatDateTime = (date: string, time: string | null) => {
        const formattedDate = formatDate(date);
        if (time) {
            return `${formattedDate} at ${time.slice(0, 5)}`;
        }
        return formattedDate;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 to-teal-50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-200 bg-white shadow-2xs">
                            <User className="h-5 w-5 text-sky-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900">
                                    {surgery.patient_name || `Patient ${surgery.patient_id.slice(0, 8)}`}
                                </h3>
                                {getEyeBadge(surgery.eye)}
                            </div>
                            <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500 font-medium">
                                <span>UHID: <strong className="text-slate-700">{surgery.patient_uhid || surgery.patient_id.slice(0, 8)}</strong></span>
                                {surgery.patient_mobile && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3 text-slate-400" />
                                        {surgery.patient_mobile}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {getStatusBadge(surgery.status)}
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Surgery & Package Overview */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Surgery Name</span>
                                <h4 className="text-base font-bold text-slate-900">{surgery.surgery_name}</h4>
                            </div>
                            {surgery.reschedule_count > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                                    <RefreshCw className="h-3 w-3" />
                                    Rescheduled {surgery.reschedule_count}x
                                </span>
                            )}
                        </div>

                        {/* Package Details */}
                        {surgery.package_name && (
                            <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 font-medium">
                                <Package className="h-4 w-4 shrink-0 text-sky-600" />
                                <span>
                                    Package: <strong className="font-semibold">{surgery.package_name}</strong>
                                    {surgery.package_price ? ` (₹${Number(surgery.package_price).toLocaleString("en-IN")})` : ""}
                                </span>
                            </div>
                        )}

                        {/* Advance Payment Details */}
                        {surgery.advance_payment_amount && Number(surgery.advance_payment_amount) > 0 ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900 space-y-1">
                                <div className="flex items-center justify-between font-semibold">
                                    <span className="flex items-center gap-1.5 text-emerald-800">
                                        <CreditCard className="h-4 w-4 text-emerald-600" />
                                        Advance Payment Collected
                                    </span>
                                    <span className="text-sm text-emerald-700 font-bold">
                                        ₹{Number(surgery.advance_payment_amount).toLocaleString("en-IN")}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 text-[11px] text-emerald-700 pt-0.5">
                                    {surgery.advance_payment_method && (
                                        <span>Method: <strong className="font-semibold">{surgery.advance_payment_method.toUpperCase()}</strong></span>
                                    )}
                                    {surgery.advance_payment_reference && (
                                        <span>Ref: <strong className="font-semibold">{surgery.advance_payment_reference}</strong></span>
                                    )}
                                    {surgery.advance_payment_date && (
                                        <span>Date: <strong className="font-semibold">{formatDate(surgery.advance_payment_date)}</strong></span>
                                    )}
                                </div>
                                {surgery.advance_payment_notes && (
                                    <p className="text-[11px] text-emerald-600 italic pt-0.5">
                                        &quot;{surgery.advance_payment_notes}&quot;
                                    </p>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Surgeon */}
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 shadow-2xs">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                                Surgeon
                            </span>
                            <p className="text-sm font-semibold text-slate-800">
                                {surgery.surgeon_name || "Unassigned"}
                            </p>
                        </div>

                        {/* Planned / Advised Date */}
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 shadow-2xs">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-sky-500" />
                                {surgery.planned_date ? "Planned Date" : "Advised Date"}
                            </span>
                            <p className="text-sm font-semibold text-slate-800">
                                {surgery.planned_date
                                    ? formatDateTime(surgery.planned_date, surgery.planned_time)
                                    : formatDate(surgery.advised_date || surgery.created_at)}
                            </p>
                        </div>

                        {/* Follow-up Date (if postponed) */}
                        {surgery.status === "postponed" && surgery.followup_date && (
                            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3.5 space-y-1 sm:col-span-2 shadow-2xs">
                                <span className="text-orange-700 font-medium flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5 text-orange-600" />
                                    Hospital Follow-up Due Date
                                </span>
                                <p className="text-sm font-bold text-orange-800">
                                    {formatDate(surgery.followup_date)}
                                </p>
                            </div>
                        )}

                        {/* Hospital Name */}
                        {surgery.hospital_name && (
                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 shadow-2xs">
                                <span className="text-slate-500 font-medium">Hospital Facility</span>
                                <p className="text-sm font-medium text-slate-800">{surgery.hospital_name}</p>
                            </div>
                        )}

                        {/* Created Info */}
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 shadow-2xs">
                            <span className="text-slate-500 font-medium">Recorded On</span>
                            <p className="text-sm font-medium text-slate-800">
                                {formatDate(surgery.created_at)}
                                {surgery.created_by ? ` by ${surgery.created_by}` : ""}
                            </p>
                        </div>
                    </div>

                    {/* Notes */}
                    {surgery.notes && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 shadow-2xs">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5 text-slate-400" />
                                Clinical / Administrative Notes
                            </span>
                            <p className="text-xs leading-relaxed text-slate-600 italic">
                                &quot;{surgery.notes}&quot;
                            </p>
                        </div>
                    )}

                    {/* Denial / Cancellation reason */}
                    {surgery.status === "denied" && surgery.denial_reason && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-1">
                            <span className="text-red-700 font-semibold flex items-center gap-1">
                                <Ban className="h-3.5 w-3.5" />
                                Denial Reason
                            </span>
                            <p className="text-xs text-red-800 font-medium">{surgery.denial_reason}</p>
                        </div>
                    )}
                    {surgery.status === "cancelled" && surgery.cancellation_reason && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 space-y-1">
                            <span className="text-rose-700 font-semibold flex items-center gap-1">
                                <XCircle className="h-3.5 w-3.5" />
                                Cancellation Reason
                            </span>
                            <p className="text-xs text-rose-800 font-medium">{surgery.cancellation_reason}</p>
                        </div>
                    )}
                </div>

                {/* Footer Action Bar */}
                <div className="border-t border-slate-200 bg-slate-50/70 p-4 flex flex-wrap items-center justify-between gap-3">
                    {/* View History Button */}
                    <button
                        onClick={() => onViewHistory(surgery)}
                        className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                        <History className="h-4 w-4" />
                        <span>Timeline History</span>
                    </button>

                    {/* Right-aligned action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Edit Details */}
                        {!isTerminal && (
                            <button
                                onClick={() => onEdit(surgery)}
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Edit</span>
                            </button>
                        )}

                        {/* Reschedule */}
                        {(surgery.status === "advised" || surgery.status === "scheduled" || surgery.status === "postponed") && (
                            <button
                                onClick={() => onReschedule(surgery)}
                                className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                            >
                                <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
                                <span>{surgery.status === "advised" ? "Schedule Date" : "Reschedule"}</span>
                            </button>
                        )}

                        {/* Complete */}
                        {surgery.status === "scheduled" && (
                            <button
                                onClick={() => onTransition(surgery, "completed")}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 shadow-2xs"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Mark Completed</span>
                            </button>
                        )}

                        {/* Postpone */}
                        {(surgery.status === "advised" || surgery.status === "scheduled") && (
                            <button
                                onClick={() => onTransition(surgery, "postponed")}
                                className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-800 transition hover:bg-orange-100"
                            >
                                <Clock className="h-3.5 w-3.5 text-orange-600" />
                                <span>Postpone</span>
                            </button>
                        )}

                        {/* Deny */}
                        {!isTerminal && (
                            <button
                                onClick={() => onTransition(surgery, "denied")}
                                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                                <Ban className="h-3.5 w-3.5 text-red-600" />
                                <span>Patient Denied</span>
                            </button>
                        )}

                        {/* Cancel */}
                        {!isTerminal && (
                            <button
                                onClick={() => onTransition(surgery, "cancelled")}
                                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                <span>Cancel</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
