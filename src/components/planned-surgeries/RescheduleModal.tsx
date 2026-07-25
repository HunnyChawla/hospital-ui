"use client";

import { useEffect, useState } from "react";
import { X, CalendarClock, Calendar, Package, CheckCircle2, CreditCard, Loader2, Edit2 } from "lucide-react";
import { surgeryPackagesApi } from "@/services/surgeryPackagesApi";
import type { PlannedSurgery, SurgeryPackage, RescheduleRequest } from "@/types";
import { toast } from "sonner";

interface RescheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: RescheduleRequest) => void;
    surgery: PlannedSurgery | null;
    isLoading?: boolean;
}

function getTodayDateLocal(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

    // Package selection state
    const [packages, setPackages] = useState<SurgeryPackage[]>([]);
    const [loadingPackages, setLoadingPackages] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

    // Advance Payment state
    const [advanceAmount, setAdvanceAmount] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<string>("cash");
    const [paymentReference, setPaymentReference] = useState<string>("");
    const [paymentDate, setPaymentDate] = useState<string>(getTodayDateLocal());
    const [paymentNotes, setPaymentNotes] = useState<string>("");

    const hasCollectedPayment = !!(surgery?.advance_payment_amount && Number(surgery.advance_payment_amount) > 0);
    const [isEditingPayment, setIsEditingPayment] = useState(false);

    const isFirstSchedule = !currentDate;
    const titleText = isFirstSchedule ? "Schedule Surgery" : "Reschedule Surgery";
    const dateLabel = isFirstSchedule ? "Surgery Date *" : "New Date *";
    const timeLabel = isFirstSchedule ? "Surgery Time (optional)" : "New Time (optional)";
    const submitText = isLoading
        ? (isFirstSchedule ? "Scheduling…" : "Rescheduling…")
        : (isFirstSchedule ? "Schedule Surgery" : "Confirm Schedule");

    // Reset / initialize form on open or surgery change
    useEffect(() => {
        if (isOpen && surgery) {
            setNewDate(surgery.planned_date || getTodayDateLocal());
            setNewTime(surgery.planned_time ? surgery.planned_time.slice(0, 5) : "");
            setReason("");
            setSelectedPackageId(surgery.package_id || null);
            setIsEditingPayment(false);

            if (surgery.advance_payment_amount) {
                setAdvanceAmount(surgery.advance_payment_amount.toString());
                setPaymentMethod(surgery.advance_payment_method || "cash");
                setPaymentReference(surgery.advance_payment_reference || "");
                setPaymentDate(surgery.advance_payment_date || getTodayDateLocal());
                setPaymentNotes(surgery.advance_payment_notes || "");
            } else {
                setAdvanceAmount("");
                setPaymentMethod("cash");
                setPaymentReference("");
                setPaymentDate(getTodayDateLocal());
                setPaymentNotes("");
            }
        }
    }, [isOpen, surgery]);

    // Fetch packages when modal opens
    useEffect(() => {
        const fetchPackages = async () => {
            if (!surgery?.surgery_id) {
                setPackages([]);
                return;
            }
            setLoadingPackages(true);
            try {
                const data = await surgeryPackagesApi.list(surgery.surgery_id, true);
                setPackages(data);
                
                // Auto-select first package if none selected yet
                if (data.length > 0 && (!surgery.package_id || !selectedPackageId)) {
                    const defaultPkg = data.find((p) => p.id === surgery.package_id) || data[0];
                    setSelectedPackageId(defaultPkg.id);
                }
            } catch (error) {
                console.error("Failed to fetch surgery packages:", error);
                setPackages([]);
            } finally {
                setLoadingPackages(false);
            }
        };

        if (isOpen && surgery?.surgery_id) {
            fetchPackages();
        }
    }, [isOpen, surgery?.surgery_id]);

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

    const handlePackageSelect = (pkg: SurgeryPackage) => {
        setSelectedPackageId(pkg.id);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newDate.trim()) {
            toast.error("Please select a surgery date");
            return;
        }

        // Package selection mandatory for scheduling if packages exist
        if (packages.length > 0 && !selectedPackageId) {
            toast.error("Please select a surgery package to proceed with scheduling");
            return;
        }

        const numAdvance = advanceAmount ? parseFloat(advanceAmount) : null;

        onConfirm({
            new_date: newDate,
            new_time: newTime || undefined,
            reason: reason.trim() || undefined,
            package_id: selectedPackageId,
            advance_payment_amount: numAdvance,
            advance_payment_method: numAdvance ? paymentMethod : undefined,
            advance_payment_reference: numAdvance ? paymentReference || undefined : undefined,
            advance_payment_date: numAdvance ? paymentDate || undefined : undefined,
            advance_payment_notes: numAdvance ? paymentNotes || undefined : undefined,
        });
    };

    const formatDate = (d: string | null | undefined) => {
        if (!d) return "";
        try {
            return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch {
            return d;
        }
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
                className="relative w-full max-w-xl max-h-[90vh] flex flex-col transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 to-teal-50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                                isFirstSchedule
                                    ? "border-sky-200 bg-sky-50 text-sky-700"
                                    : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                        >
                            {isFirstSchedule ? <Calendar className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">{titleText}</h3>
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

                {/* Scrollable Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="space-y-5 p-6">
                        {/* Currently scheduled banner */}
                        {currentDate && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Currently scheduled for</p>
                                    <p className="mt-0.5 text-sm font-semibold text-slate-800">
                                        {formatCurrentDate(currentDate)}
                                        {currentTime && (
                                            <span className="ml-2 font-medium text-slate-500">at {currentTime.slice(0, 5)}</span>
                                        )}
                                    </p>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                    Rescheduling
                                </span>
                            </div>
                        )}

                        {/* Date and Time Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    {dateLabel}
                                </label>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    required
                                    min={getTodayDateLocal()}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    {timeLabel}
                                </label>
                                <input
                                    type="time"
                                    value={newTime}
                                    onChange={(e) => setNewTime(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                />
                            </div>
                        </div>

                        {/* Package Selection Section (Mandatory) */}
                        <div className="space-y-2 border-t border-slate-100 pt-4">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                                    <Package className="h-4 w-4 text-sky-600" />
                                    Select Surgery Package <span className="text-rose-500 font-bold">*</span>
                                </label>
                                {selectedPackageId && (
                                    <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        Package Selected
                                    </span>
                                )}
                            </div>

                            {loadingPackages ? (
                                <div className="flex items-center gap-2 py-4 text-xs text-slate-500 justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                                    Loading packages...
                                </div>
                            ) : packages.length === 0 ? (
                                <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    Standard package automatically applied for this surgery.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    {packages.map((pkg) => {
                                        const isSelected = selectedPackageId === pkg.id;
                                        return (
                                            <button
                                                key={pkg.id}
                                                type="button"
                                                onClick={() => handlePackageSelect(pkg)}
                                                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all relative ${
                                                    isSelected
                                                        ? "border-sky-500 bg-sky-50/50 shadow-sm ring-2 ring-sky-200"
                                                        : "border-slate-200 bg-white hover:border-slate-300"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full mb-1">
                                                    <span className="font-semibold text-sm text-slate-900">
                                                        {pkg.name}
                                                    </span>
                                                    <span className="text-sm font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                        ₹{pkg.price.toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                                {pkg.description && (
                                                    <p className="text-xs text-slate-500 line-clamp-2">
                                                        {pkg.description}
                                                    </p>
                                                )}
                                                {isSelected && (
                                                    <div className="mt-2 text-[11px] font-semibold text-sky-700 flex items-center gap-1">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" /> Selected Package
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Advance Payment Details */}
                        {hasCollectedPayment && !isEditingPayment ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2.5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                                        Advance Payment Already Collected
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingPayment(true)}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800 underline cursor-pointer"
                                    >
                                        <Edit2 className="h-3 w-3" />
                                        Edit / Update Payment
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 pt-1">
                                    <div>
                                        <span className="text-slate-500 block text-[11px]">Collected Amount</span>
                                        <span className="text-base font-bold text-slate-900">
                                            ₹{Number(surgery.advance_payment_amount).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[11px]">Payment Method</span>
                                        <span className="font-semibold text-slate-800 uppercase bg-white px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                                            {surgery.advance_payment_method || "Cash"}
                                        </span>
                                    </div>
                                    {surgery.advance_payment_date && (
                                        <div>
                                            <span className="text-slate-500 block text-[11px]">Payment Date</span>
                                            <span className="font-medium text-slate-800">
                                                {formatDate(surgery.advance_payment_date)}
                                            </span>
                                        </div>
                                    )}
                                    {surgery.advance_payment_reference && (
                                        <div>
                                            <span className="text-slate-500 block text-[11px]">Ref / Txn No</span>
                                            <span className="font-medium text-slate-800 truncate block max-w-[120px]">
                                                {surgery.advance_payment_reference}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {surgery.advance_payment_notes && (
                                    <p className="text-[11px] text-slate-600 pt-1.5 border-t border-emerald-200/60">
                                        <span className="font-medium text-slate-700">Notes:</span> {surgery.advance_payment_notes}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 bg-slate-100/80 border-b border-slate-200/60">
                                    <span className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                                        <CreditCard className="h-4 w-4 text-sky-600" />
                                        {hasCollectedPayment ? "Modifying Advance Payment Information" : "Advance Payment Details (Optional)"}
                                    </span>
                                    {hasCollectedPayment ? (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingPayment(false)}
                                            className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                                        >
                                            Cancel Edit
                                        </button>
                                    ) : advanceAmount && parseFloat(advanceAmount) > 0 ? (
                                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                            ₹{parseFloat(advanceAmount).toLocaleString("en-IN")}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="p-4 bg-white space-y-3">
                                    {hasCollectedPayment && (
                                        <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 font-medium">
                                            ⚠️ You are updating the previously recorded advance payment details.
                                        </p>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Advance Amount (₹)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={advanceAmount}
                                                onChange={(e) => setAdvanceAmount(e.target.value)}
                                                placeholder="e.g. 5000"
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Payment Method
                                            </label>
                                            <select
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 bg-white"
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="upi">UPI / QR</option>
                                                <option value="card">Credit / Debit Card</option>
                                                <option value="netbanking">Netbanking</option>
                                                <option value="cheque">Cheque</option>
                                            </select>
                                        </div>
                                    </div>

                                    {advanceAmount && parseFloat(advanceAmount) > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                                    Ref / Txn Number (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={paymentReference}
                                                    onChange={(e) => setPaymentReference(e.target.value)}
                                                    placeholder="e.g. UPI-987654"
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                                    Collection Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={paymentDate}
                                                    onChange={(e) => setPaymentDate(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {advanceAmount && parseFloat(advanceAmount) > 0 && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Payment Notes (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={paymentNotes}
                                                onChange={(e) => setPaymentNotes(e.target.value)}
                                                placeholder="e.g. Advance paid at front desk"
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Reason / Notes */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                {isFirstSchedule ? "Pre-Op Notes (optional)" : "Reason for Rescheduling (optional)"}
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={
                                    isFirstSchedule
                                        ? "e.g., Patient confirmed for OT slot 1"
                                        : "e.g., Patient requested different date"
                                }
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
                        <button
                            type="button"
                            onClick={() => !isLoading && onClose()}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 shadow-sm ${
                                isFirstSchedule
                                    ? "bg-sky-600 hover:bg-sky-700 shadow-sky-600/20"
                                    : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                            }`}
                        >
                            {submitText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
