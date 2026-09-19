"use client";

import { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { serviceChargesApi, IpdPaymentItem } from "@/services/serviceChargesApi";
import { formatCurrency } from "@/utils/format";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { IpdPaymentReceiptPrint } from "./IpdPaymentReceiptPrint";
import { Loader2, CreditCard, Banknote, QrCode, Printer, CheckCircle2 } from "lucide-react";

interface ReceiveAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
  admissionNumber?: string | null;
  patientName?: string | null;
  patientUhid?: string | null;
  bedNumber?: string | null;
  wardName?: string | null;
  outstandingBalance?: number;
  totalAmount?: number;
  paidAmount?: number;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  isFinalBill?: boolean;
  onSuccess: () => void;
}

const PAYMENT_MODES = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "upi", label: "UPI / QR", icon: QrCode },
  { value: "card", label: "Debit / Credit Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer / NEFT", icon: Banknote },
  { value: "cheque", label: "Cheque", icon: Banknote },
];

export function ReceiveAdvanceModal({
  isOpen,
  onClose,
  admissionId,
  admissionNumber,
  patientName,
  patientUhid,
  bedNumber,
  wardName,
  outstandingBalance = 0,
  totalAmount = 0,
  paidAmount = 0,
  invoiceId,
  invoiceNumber,
  isFinalBill = false,
  onSuccess,
}: ReceiveAdvanceModalProps) {
  const [amount, setAmount] = useState<number | string>("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Receipt print after successful submission
  const [completedPayment, setCompletedPayment] = useState<IpdPaymentItem | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptPrintRef,
    documentTitle: completedPayment
      ? `Receipt_${completedPayment.payment_number}`
      : "Payment_Receipt",
  });

  const hasInvoice = isFinalBill || !!invoiceId || !!invoiceNumber;

  useEffect(() => {
    if (isOpen) {
      setAmount(outstandingBalance > 0 ? outstandingBalance : "");
      setPaymentMethod("upi");
      setPaymentReference("");
      setNotes("");
      setCompletedPayment(null);
      setShowReceiptPreview(false);
    }
  }, [isOpen, outstandingBalance]);

  const parsedAmount = Number(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      toast.error("Please enter a valid advance payment amount");
      return;
    }

    if ((paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && !paymentReference.trim()) {
      toast.error(`Please enter a transaction/reference number for ${paymentMethod.toUpperCase()}`);
      return;
    }

    setSubmitting(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const paymentResult = await serviceChargesApi.receiveAdvance(
        admissionId,
        {
          amount: parsedAmount,
          payment_method: paymentMethod,
          payment_reference: paymentReference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        tenantId || undefined
      );

      toast.success(
        hasInvoice
          ? `Payment of ${formatCurrency(parsedAmount)} collected successfully!`
          : `Advance payment of ${formatCurrency(parsedAmount)} recorded successfully!`
      );
      setCompletedPayment(paymentResult);
      setShowReceiptPreview(true);
      onSuccess();
    } catch (error) {
      const err = getErrorMessage(error);
      toast.error(err || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = hasInvoice
    ? `Collect IPD Bill Payment${invoiceNumber ? ` - Invoice #${invoiceNumber}` : ""}`
    : "Receive Inpatient Advance / Deposit";

  return (
    <>
      <Modal
        isOpen={isOpen && !showReceiptPreview}
        onClose={onClose}
        title={modalTitle}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Quick Context & Bill Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{patientName || "Patient"}</p>
                <p className="text-slate-500 font-mono">
                  {admissionNumber} {patientUhid ? `• ${patientUhid}` : ""}
                  {wardName ? ` • ${wardName} (Bed ${bedNumber || "-"})` : ""}
                </p>
              </div>
              {hasInvoice && invoiceNumber && (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-sky-100 text-sky-800 border border-sky-300">
                  Inv: #{invoiceNumber}
                </span>
              )}
            </div>

            {/* Financial Breakdown */}
            {hasInvoice ? (
              <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-[11px]">
                <div className="p-1.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Net Bill</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatCurrency(totalAmount > 0 ? totalAmount : (paidAmount + outstandingBalance))}
                  </span>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Advance Paid</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {formatCurrency(paidAmount)}
                  </span>
                </div>
                <div className="p-1.5 bg-rose-50 rounded border border-rose-200">
                  <span className="text-rose-600 font-semibold block text-[10px]">Balance Due</span>
                  <span className="font-bold text-rose-700 font-mono">
                    {formatCurrency(outstandingBalance)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Current Balance Due:</span>
                <span
                  className={`font-bold font-mono text-sm ${
                    outstandingBalance > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {formatCurrency(outstandingBalance)}
                </span>
              </div>
            )}
          </div>

          {/* Amount Field */}
          <div>
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">
                {hasInvoice ? "Payment Amount to Collect (₹) *" : "Advance Amount (₹) *"}
              </label>
              {outstandingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(outstandingBalance)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  {hasInvoice ? `Pay Full Balance (${formatCurrency(outstandingBalance)})` : `Clear Due (${formatCurrency(outstandingBalance)})`}
                </button>
              )}
            </div>
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
                className="w-full pl-7 pr-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
              />
            </div>
          </div>

          {/* Quick Preset Buttons (only for advance deposits or small increments) */}
          {!hasInvoice && (
            <div className="flex gap-2">
              {[2000, 5000, 10000, 20000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className="flex-1 py-1 text-[11px] font-semibold border border-slate-200 rounded bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 transition-colors"
                >
                  ₹{preset.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Payment Mode *</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {PAYMENT_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = paymentMethod === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setPaymentMethod(mode.value)}
                    className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transaction Reference (Required for UPI/Card) */}
          {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque" || paymentMethod === "bank_transfer") && (
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Transaction Ref / UPI ID / Cheque # *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. UPI/123456789 or Card Auth 987654"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Cashier Remarks (Optional)</label>
            <input
              type="text"
              placeholder={hasInvoice ? "e.g. Full settlement paid by patient" : "e.g. Paid by patient's brother, initial OT deposit"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
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
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> {hasInvoice ? "Collect Payment & Issue Receipt" : "Collect Advance & Issue Receipt"}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Instant Receipt Preview & Print Modal */}
      {showReceiptPreview && completedPayment && (
        <Modal
          isOpen={showReceiptPreview}
          onClose={() => {
            setShowReceiptPreview(false);
            onClose();
          }}
          title="Payment Recorded - Receipt"
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-full">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-emerald-900 text-sm">
                    Payment of {formatCurrency(completedPayment.amount)} Received!
                  </p>
                  <p className="text-xs text-emerald-700">Receipt No: {completedPayment.payment_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePrint()}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Official Receipt
              </button>
            </div>

            {/* Render Printable Receipt */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-2">
              <IpdPaymentReceiptPrint
                ref={receiptPrintRef}
                payment={completedPayment}
                patientName={patientName}
                patientUhid={patientUhid}
                admissionNumber={admissionNumber}
                bedNumber={bedNumber}
                wardName={wardName}
                invoiceNumber={invoiceNumber}
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
