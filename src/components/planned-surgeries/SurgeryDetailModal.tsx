"use client";

import { useEffect } from "react";
import { PlannedSurgery, PlannedSurgeryStatus } from "@/types";
import { formatDate } from "@/utils/format";
import { BodyPartBadge } from "@/components/shared/BodyPartBadge";
import {
    X,
    User,
    Phone,
    Stethoscope,
    Calendar,
    Clock,
    Package,
    History,
    Pencil,
    CalendarClock,
    CheckCircle2,
    XCircle,
    Ban,
    RefreshCw,
    FileText,
    AlertCircle,
} from "lucide-react";

import { SurgeryPaymentSummaryPanel } from "./SurgeryPaymentSummaryPanel";

interface SurgeryDetailModalProps {
    surgery: PlannedSurgery | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (surgery: PlannedSurgery) => void;
    onViewHistory: (surgery: PlannedSurgery) => void;
    onReschedule: (surgery: PlannedSurgery) => void;
    onTransition: (surgery: PlannedSurgery, targetStatus: PlannedSurgeryStatus) => void;
    onOpenAdvanceModal?: (surgery: PlannedSurgery) => void;
    onOpenInvoiceModal?: (surgery: PlannedSurgery) => void;
    onOpenRefundModal?: (surgery: PlannedSurgery) => void;
}

// Expand-on-hover footer action button — matches the CompactActionButton /
// "Create OPD" pattern used in OpdList.tsx & AppointmentsList.tsx so modal
// actions read consistently with the rest of the app instead of bordered chips.
function FooterActionButton({
    onClick,
    icon: Icon,
    label,
    color,
}: {
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: "sky" | "amber" | "emerald" | "rose" | "red" | "slate" | "orange";
}) {
    const colorClasses: Record<string, string> = {
        sky: "bg-sky-500 hover:bg-sky-600",
        amber: "bg-amber-500 hover:bg-amber-600",
        emerald: "bg-emerald-600 hover:bg-emerald-700",
        rose: "bg-rose-500 hover:bg-rose-600",
        red: "bg-red-500 hover:bg-red-600",
        slate: "bg-slate-500 hover:bg-slate-600",
        orange: "bg-orange-500 hover:bg-orange-600",
    };

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`group relative flex items-center justify-center overflow-hidden rounded-xl p-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 ${colorClasses[color]}`}
            style={{ width: "2.5rem" }}
            onMouseEnter={(e) => {
                e.currentTarget.style.width = "auto";
                e.currentTarget.style.paddingLeft = "0.875rem";
                e.currentTarget.style.paddingRight = "0.875rem";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.width = "2.5rem";
                e.currentTarget.style.paddingLeft = "0.625rem";
                e.currentTarget.style.paddingRight = "0.625rem";
            }}
            title={label}
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">{label}</span>
        </button>
    );
}

export function SurgeryDetailModal({
    surgery,
    isOpen,
    onClose,
    onEdit,
    onViewHistory,
    onReschedule,
    onTransition,
    onOpenAdvanceModal,
    onOpenInvoiceModal,
    onOpenRefundModal,
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
                                {surgery.body_part_name && <BodyPartBadge name={surgery.body_part_name} />}
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
                    {/* Surgery Name */}
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Surgery</span>
                            <h4 className="text-base font-bold text-slate-900">{surgery.surgery_name}</h4>
                        </div>
                        {surgery.reschedule_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full shrink-0">
                                <RefreshCw className="h-3 w-3" />
                                Rescheduled {surgery.reschedule_count}x
                            </span>
                        )}
                    </div>

                    {/* 1. Advised Details: Surgeon & Advised Date (known from the outset) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 shadow-2xs">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                                Surgeon
                            </span>
                            <p className="text-sm font-semibold text-slate-800">
                                {surgery.surgeon_name || "Unassigned"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 shadow-2xs">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                Advised Date
                            </span>
                            <p className="text-sm font-semibold text-slate-800">
                                {formatDate(surgery.advised_date || surgery.created_at)}
                            </p>
                        </div>
                    </div>

                    {/* 2. Surgical Plan: Package & Planned Date once finalized, else a call-to-action */}
                    {surgery.planned_date ? (
                        <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-sky-700">Surgical Plan</span>
                                {!isTerminal && (
                                    <button
                                        onClick={() => onEdit(surgery)}
                                        className="flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800"
                                    >
                                        <Pencil className="h-3 w-3" />
                                        Update Plan
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <span className="text-slate-500 font-medium flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5 text-sky-500" />
                                        Planned Date
                                    </span>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {formatDateTime(surgery.planned_date, surgery.planned_time)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-500 font-medium flex items-center gap-1">
                                        <Package className="h-3.5 w-3.5 text-sky-500" />
                                        Package
                                    </span>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {surgery.package_name
                                            ? `${surgery.package_name}${surgery.package_price ? ` (₹${Number(surgery.package_price).toLocaleString("en-IN")})` : ""}`
                                            : "No package selected"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                Surgery plan not finalized yet
                            </div>
                            {!isTerminal && (
                                <button
                                    onClick={() => onEdit(surgery)}
                                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Plan Surgery
                                </button>
                            )}
                        </div>
                    )}

                    {/* 3. Payment Info */}
                    <SurgeryPaymentSummaryPanel
                        surgery={surgery}
                        onOpenAdvanceModal={() => onOpenAdvanceModal?.(surgery)}
                        onOpenInvoiceModal={() => onOpenInvoiceModal?.(surgery)}
                        onOpenRefundModal={() => onOpenRefundModal?.(surgery)}
                    />

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
                    <FooterActionButton
                        onClick={() => onViewHistory(surgery)}
                        icon={History}
                        label="Timeline History"
                        color="sky"
                    />

                    {/* Right-aligned action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        {!isTerminal && (
                            <FooterActionButton
                                onClick={() => onEdit(surgery)}
                                icon={Pencil}
                                label="Plan"
                                color="slate"
                            />
                        )}

                        {(surgery.status === "scheduled" || surgery.status === "postponed") && (
                            <FooterActionButton
                                onClick={() => onReschedule(surgery)}
                                icon={CalendarClock}
                                label="Reschedule"
                                color="amber"
                            />
                        )}

                        {surgery.status === "scheduled" && (
                            <FooterActionButton
                                onClick={() => onTransition(surgery, "completed")}
                                icon={CheckCircle2}
                                label="Mark Completed"
                                color="emerald"
                            />
                        )}

                        {!isTerminal && (surgery.status === "advised" || surgery.status === "scheduled") && (
                            <FooterActionButton
                                onClick={() => onTransition(surgery, "postponed")}
                                icon={Clock}
                                label="Postpone"
                                color="orange"
                            />
                        )}

                        {!isTerminal && (
                            <FooterActionButton
                                onClick={() => onTransition(surgery, "denied")}
                                icon={Ban}
                                label="Patient Denied"
                                color="red"
                            />
                        )}

                        {!isTerminal && (
                            <FooterActionButton
                                onClick={() => onTransition(surgery, "cancelled")}
                                icon={XCircle}
                                label="Cancel"
                                color="rose"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
