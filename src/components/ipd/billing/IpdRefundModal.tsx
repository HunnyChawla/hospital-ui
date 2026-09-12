"use client";

import { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { serviceChargesApi, IpdPaymentItem } from "@/services/serviceChargesApi";
import { formatCurrency } from "@/utils/format";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { IpdPaymentReceiptPrint } from "./IpdPaymentReceiptPrint";
import { Loader2, Printer, CheckCircle2, RotateCcw } from "lucide-react";

interface IpdRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
  admissionNumber?: string | null;
  patientName?: string | null;
  patientUhid?: string | null;
  bedNumber?: string | null;
  wardName?: string | null;
  excessAdvanceAmount?: number;
  onSuccess: () => void;
}

export function IpdRefundModal({
  isOpen,
  onClose,
  admissionId,
  admissionNumber,
  patientName,
  patientUhid,
  bedNumber,
  wardName,
  excessAdvanceAmount = 0,
  onSuccess,
}: IpdRefundModalProps) {
  const [amount, setAmount] = useState<number | string>("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Refund receipt print
  const [completedRefund, setCompletedRefund] = useState<IpdPaymentItem | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptPrintRef,
    documentTitle: completedRefund
      ? `Refund_Voucher_${completedRefund.payment_number}`
      : "Refund_Voucher",
  });

  useEffect(() => {
    if (isOpen) {
      setAmount(excessAdvanceAmount > 0 ? excessAdvanceAmount : "");
      setPaymentMethod("cash");
      setPaymentReference("");
      setReason(
        excessAdvanceAmount > 0
          ? `Refund of excess advance deposit (${formatCurrency(excessAdvanceAmount)})`
          : ""
      );
      setCompletedRefund(null);
      setShowReceiptPreview(false);
    }
  }, [isOpen, excessAdvanceAmount]);

  const parsedAmount = Number(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for the refund");
      return;
    }

    setSubmitting(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const refundResult = await serviceChargesApi.issueRefund(
        admissionId,
        {
          amount: parsedAmount,
          payment_method: paymentMethod,
          payment_reference: paymentReference.trim() || undefined,
          reason: reason.trim(),
        },
        tenantId || undefined
      );

      toast.success(`Refund of ${formatCurrency(parsedAmount)} processed successfully!`);
      setCompletedRefund(refundResult);
      setShowReceiptPreview(true);
      onSuccess();
    } catch (error) {
      const err = getErrorMessage(error);
      toast.error(err || "Failed to process refund");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !showReceiptPreview}
        onClose={onClose}
        title="Issue Inpatient Refund Voucher"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-amber-900">{patientName || "Patient"}</p>
                <p className="text-amber-700 font-mono">
                  {admissionNumber} {patientUhid ? `• ${patientUhid}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-amber-800">Excess Advance Available:</p>
                <p className="font-bold text-sm text-emerald-700 font-mono">
                  {formatCurrency(excessAdvanceAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Refund Amount */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Refund Amount (₹) *</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
              />
            </div>
          </div>

          {/* Refund Mode */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Refund Mode *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI / Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {/* Reference # */}
          {paymentMethod !== "cash" && (
            <div>
              <label className="text-xs font-semibold text-slate-700">Transaction / Cheque Reference #</label>
              <input
                type="text"
                placeholder="e.g. UPI Ref # or Cheque Number"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Reason for Refund *</label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Excess advance returned to patient upon settlement"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || parsedAmount <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing Refund...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" /> Issue Refund Voucher
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Instant Refund Voucher Print Modal */}
      {showReceiptPreview && completedRefund && (
        <Modal
          isOpen={showReceiptPreview}
          onClose={() => {
            setShowReceiptPreview(false);
            onClose();
          }}
          title="Refund Voucher Processed"
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-600 text-white rounded-full">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-amber-900 text-sm">
                    Refund of {formatCurrency(completedRefund.amount)} Issued!
                  </p>
                  <p className="text-xs text-amber-700">Voucher No: {completedRefund.payment_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePrint()}
                className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="h-4 w-4" /> Print Refund Voucher
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-2">
              <IpdPaymentReceiptPrint
                ref={receiptPrintRef}
                payment={completedRefund}
                patientName={patientName}
                patientUhid={patientUhid}
                admissionNumber={admissionNumber}
                bedNumber={bedNumber}
                wardName={wardName}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReceiptPreview(false);
                  onClose();
                }}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
