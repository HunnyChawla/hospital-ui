"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Modal } from "./Modal";

export interface CancellationDetails {
  reason: string;
  notes?: string;
  /** Omitted for a full refund of everything still refundable. */
  refundAmount?: number;
}

interface CancellationRefundAcknowledgmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called on confirm. Receives the collected details when
   * `collectCancellationDetails` is set, and nothing otherwise (the
   * acknowledge-only flow still used by lab bookings).
   */
  onConfirm: (details?: CancellationDetails) => void | Promise<void>;
  type: "opd" | "lab";
  itemNumber?: string;
  /** Amount still refundable against this item. */
  amount?: number;
  loading?: boolean;
  /**
   * Collect a mandatory reason and allow refunding less than the full amount,
   * retaining the difference as a cancellation fee.
   */
  collectCancellationDetails?: boolean;
  /** Quick-pick reasons; a free-text "Other" option is always appended. */
  reasonOptions?: readonly string[];
}

const OTHER_REASON = "__other__";

export function CancellationRefundAcknowledgmentModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  itemNumber,
  amount,
  loading = false,
  collectCancellationDetails = false,
  reasonOptions = [],
}: CancellationRefundAcknowledgmentModalProps) {
  const itemType = type === "opd" ? "OPD Visit" : "Lab Test Booking";
  const itemLabel = type === "opd" ? "visit" : "booking";

  const refundableAmount = amount && amount > 0 ? amount : 0;

  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const [refundAmountInput, setRefundAmountInput] = useState("");

  // Reset every time the modal is opened so a previous cancellation's values
  // never leak into the next one.
  useEffect(() => {
    if (isOpen) {
      setSelectedReason("");
      setCustomReason("");
      setNotes("");
      setRefundAmountInput(refundableAmount > 0 ? String(refundableAmount) : "");
    }
  }, [isOpen, refundableAmount]);

  const reason = selectedReason === OTHER_REASON ? customReason.trim() : selectedReason;

  const parsedRefund = useMemo(() => {
    if (refundableAmount <= 0) return 0;
    const parsed = Number(refundAmountInput);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [refundAmountInput, refundableAmount]);

  const refundError = useMemo(() => {
    if (refundableAmount <= 0) return null;
    if (Number.isNaN(parsedRefund)) return "Enter a valid refund amount";
    if (parsedRefund < 0) return "Refund amount cannot be negative";
    if (parsedRefund > refundableAmount)
      return `Refund cannot exceed ₹${refundableAmount.toLocaleString("en-IN")}`;
    return null;
  }, [parsedRefund, refundableAmount]);

  const cancellationFee =
    refundableAmount > 0 && !refundError ? refundableAmount - parsedRefund : 0;

  const canConfirm = collectCancellationDetails
    ? !!reason && !refundError
    : true;

  const handleConfirm = async () => {
    if (!canConfirm || loading) return;
    if (!collectCancellationDetails) {
      await onConfirm();
      return;
    }
    await onConfirm({
      reason,
      notes: notes.trim() || undefined,
      // Send the explicit amount only when it differs from a full refund, so
      // the default path stays "refund everything" server-side.
      refundAmount:
        refundableAmount > 0 && parsedRefund !== refundableAmount ? parsedRefund : undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Cancel ${itemType}`} size="md">
      <div className="space-y-4">
        {/* Warning */}
        <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <h3 className="mb-1 text-sm font-semibold text-amber-900">
              {refundableAmount > 0
                ? "Payment Refund Acknowledgment Required"
                : "Confirm Cancellation"}
            </h3>
            <p className="text-sm text-amber-800">
              {refundableAmount > 0
                ? `This ${itemLabel} has a collected payment. By proceeding you acknowledge that:`
                : `There is nothing left to refund on this ${itemLabel}. By proceeding you acknowledge that:`}
            </p>
          </div>
        </div>

        {/* Item details */}
        {(itemNumber || refundableAmount > 0) && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="space-y-2">
              {itemNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {type === "opd" ? "Visit Number" : "Booking Number"}:
                  </span>
                  <span className="font-semibold text-slate-900">{itemNumber}</span>
                </div>
              )}
              {refundableAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Refundable Amount:</span>
                  <span className="font-semibold text-emerald-600">
                    ₹{refundableAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {collectCancellationDetails && (
          <>
            {/* Reason */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Reason for cancellation <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
              >
                <option value="">Select a reason…</option>
                {reasonOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={OTHER_REASON}>Other (specify)</option>
              </select>
              {selectedReason === OTHER_REASON && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  disabled={loading}
                  maxLength={255}
                  placeholder="Describe the reason"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
                />
              )}
            </div>

            {/* Refund amount */}
            {refundableAmount > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Refund amount
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={refundAmountInput}
                    onChange={(e) => setRefundAmountInput(e.target.value)}
                    disabled={loading}
                    min={0}
                    max={refundableAmount}
                    step="0.01"
                    className={`w-full rounded-xl border py-2 pl-7 pr-3 text-sm text-slate-900 focus:outline-none focus:ring-1 disabled:opacity-50 ${refundError
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                      : "border-slate-300 focus:border-sky-500 focus:ring-sky-500"
                      }`}
                  />
                </div>
                {refundError ? (
                  <p className="mt-1.5 text-xs font-medium text-rose-600">{refundError}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Cancellation fee retained:{" "}
                    <span className="font-semibold text-slate-700">
                      ₹{cancellationFee.toLocaleString("en-IN")}
                    </span>
                  </p>
                )}

                {!refundError && cancellationFee > 0 && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2.5">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600" />
                    <p className="text-xs text-sky-900">
                      A partial refund is final — each payment can only be refunded once, so
                      the retained ₹{cancellationFee.toLocaleString("en-IN")} cannot be
                      refunded later through this screen.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                rows={2}
                placeholder="Any additional detail for the record"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
              />
            </div>
          </>
        )}

        {/* Acknowledgment points */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          {refundableAmount > 0 && (!collectCancellationDetails || parsedRefund > 0) && (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <p className="text-sm text-slate-700">
                A refund transaction will be created with a negative amount
                {collectCancellationDetails && !refundError
                  ? ` for ₹${parsedRefund.toLocaleString("en-IN")}`
                  : ""}
              </p>
            </div>
          )}
          {collectCancellationDetails && cancellationFee > 0 && !refundError && (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <p className="text-sm text-slate-700">
                ₹{cancellationFee.toLocaleString("en-IN")} will be retained by the hospital as
                a cancellation fee
              </p>
            </div>
          )}
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <p className="text-sm text-slate-700">
              The {itemLabel} will be cancelled and cannot be undone
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep {itemType}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !canConfirm}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-rose-600 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Processing...
              </span>
            ) : (
              "I Acknowledge & Proceed with Cancellation"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
