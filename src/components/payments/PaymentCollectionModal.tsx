"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { Invoice } from "@/services/invoicesApi";
import { paymentsApi, CreatePaymentRequest, PaymentMethod, Payment } from "@/services/paymentsApi";
import { currency } from "@/utils/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTenantIdForApi } from "@/utils/auth";

interface PaymentCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess?: (payment?: Payment) => void;
}

export function PaymentCollectionModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: PaymentCollectionModalProps) {
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or invoice changes
  useEffect(() => {
    if (isOpen && invoice) {
      const balance = invoice.balance_amount ?? invoice.total_amount - (invoice.paid_amount || 0);
      setPaymentAmount(balance);
      setPaymentMethod("cash");
      setPaymentReference("");
      setNotes("");
    } else {
      setPaymentAmount(0);
      setPaymentMethod("cash");
      setPaymentReference("");
      setNotes("");
    }
  }, [isOpen, invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoice) {
      toast.error("Invoice not found");
      return;
    }

    if (paymentAmount <= 0) {
      toast.error("Payment amount must be greater than 0");
      return;
    }

    // Validate payment reference for upi/card/cheque
    if ((paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && !paymentReference.trim()) {
      toast.error(`Payment reference is required for ${paymentMethod.toUpperCase()} payments`);
      return;
    }

    setIsSubmitting(true);

    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const paymentData: CreatePaymentRequest = {
        invoice_id: invoice.id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || null,
        notes: notes.trim() || undefined,
      };

      const payment = await paymentsApi.create(paymentData, getTenantIdForApi(tenantId || undefined));
      toast.success("Payment collected successfully");
      onSuccess?.(payment);
      onClose();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to collect payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) {
    return null;
  }

  const balanceAmount = invoice.balance_amount ?? invoice.total_amount - (invoice.paid_amount || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Collect Payment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Invoice Details */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Invoice Number:</span>
              <span className="font-semibold text-slate-900">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Amount:</span>
              <span className="font-semibold text-slate-900">{currency(invoice.total_amount)}</span>
            </div>
            {invoice.paid_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Paid Amount:</span>
                <span className="font-semibold text-emerald-700">{currency(invoice.paid_amount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-semibold text-slate-900">Balance Amount:</span>
              <span className="font-bold text-amber-700">{currency(balanceAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Amount */}
        <label className="space-y-1">
          <span className="text-slate-600">
            Payment Amount <span className="text-rose-500">*</span>
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={balanceAmount}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            required
          />
          <p className="text-xs text-slate-500">Maximum: {currency(balanceAmount)}</p>
        </label>

        {/* Payment Method */}
        <label className="space-y-1">
          <span className="text-slate-600">
            Payment Method <span className="text-rose-500">*</span>
          </span>
          <select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value as PaymentMethod);
              setPaymentReference(""); // Clear reference when method changes
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            required
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cheque">Cheque</option>
          </select>
        </label>

        {/* Payment Reference (conditional) */}
        {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
          <label className="space-y-1">
            <span className="text-slate-600">
              Payment Reference <span className="text-rose-500">*</span>
            </span>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder={`Enter ${paymentMethod.toUpperCase()} reference`}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
              required
            />
          </label>
        )}

        {/* Notes */}
        <label className="space-y-1">
          <span className="text-slate-600">Notes (Optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any notes about this payment"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 resize-none"
          />
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Collect Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
