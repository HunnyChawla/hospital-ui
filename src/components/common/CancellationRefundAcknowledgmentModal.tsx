"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Modal } from "./Modal";

interface CancellationRefundAcknowledgmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: "opd" | "lab";
  itemNumber?: string;
  amount?: number;
  loading?: boolean;
}

export function CancellationRefundAcknowledgmentModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  itemNumber,
  amount,
  loading = false,
}: CancellationRefundAcknowledgmentModalProps) {
  const itemType = type === "opd" ? "OPD Visit" : "Lab Test Booking";
  const itemLabel = type === "opd" ? "visit" : "booking";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancel ${itemType}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Warning Icon and Message */}
        <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="mb-2 text-sm font-semibold text-amber-900">
              Payment Refund Acknowledgment Required
            </h3>
            <p className="text-sm text-amber-800">
              This {itemLabel} has an associated payment. By proceeding with cancellation, you acknowledge that:
            </p>
          </div>
        </div>

        {/* Acknowledgment Points */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <p className="text-sm text-slate-700">
              The payment will be automatically marked as <strong>refunded</strong> in the system
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <p className="text-sm text-slate-700">
              A refund transaction will be created with a negative amount
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <p className="text-sm text-slate-700">
              The {itemLabel} will be cancelled and cannot be undone
            </p>
          </div>
        </div>

        {/* Item Details */}
        {(itemNumber || amount) && (
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
              {amount !== undefined && amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Payment Amount:</span>
                  <span className="font-semibold text-emerald-600">
                    ₹{amount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-rose-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
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

