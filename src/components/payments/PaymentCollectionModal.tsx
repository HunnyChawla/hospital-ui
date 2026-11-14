"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { Invoice } from "@/services/invoicesApi";
import { paymentsApi, CreatePaymentRequest, PaymentMethod, Payment } from "@/services/paymentsApi";
import { currency } from "@/utils/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTenantIdForApi } from "@/utils/auth";
import { AmountInput } from "@/components/common/AmountInput";
import { Plus, Trash2, Split } from "lucide-react";

interface PaymentCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess?: (payment?: Payment) => void;
}

interface SplitPaymentRow {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
}

export function PaymentCollectionModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: PaymentCollectionModalProps) {
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Split payment state
  const [splitRows, setSplitRows] = useState<SplitPaymentRow[]>([]);
  const [collectedOffset, setCollectedOffset] = useState(0);

  // Reset form when modal opens/closes or invoice changes
  useEffect(() => {
    if (isOpen && invoice) {
      const balance = invoice.balance_amount ?? invoice.total_amount - (invoice.paid_amount || 0);
      setPaymentAmount(balance);
      setPaymentMethod("cash");
      setPaymentReference("");
      setNotes("");
      setIsSplitMode(false);
      setCollectedOffset(0);
      setSplitRows([
        { id: "1", amount: Math.floor(balance / 2), paymentMethod: "cash", paymentReference: "" },
        { id: "2", amount: Math.ceil(balance / 2), paymentMethod: "upi", paymentReference: "" },
      ]);
    } else {
      setPaymentAmount(0);
      setPaymentMethod("cash");
      setPaymentReference("");
      setNotes("");
      setIsSplitMode(false);
      setCollectedOffset(0);
      setSplitRows([]);
    }
  }, [isOpen, invoice]);

  const addSplitRow = () => {
    setSplitRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        amount: 0,
        paymentMethod: "cash",
        paymentReference: "",
      },
    ]);
  };

  const removeSplitRow = (id: string) => {
    if (splitRows.length <= 1) {
      toast.error("At least one payment row is required");
      return;
    }
    setSplitRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateSplitRow = (id: string, updates: Partial<SplitPaymentRow>) => {
    setSplitRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const totalSplitAmount = splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoice) {
      toast.error("Invoice not found");
      return;
    }

    const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
    const effectiveTenantId = getTenantIdForApi(tenantId || undefined);

    if (isSplitMode) {
      if (splitRows.length === 0) {
        toast.error("Please add at least one payment method");
        return;
      }

      for (let i = 0; i < splitRows.length; i++) {
        const row = splitRows[i];
        if (row.amount <= 0) {
          toast.error(`Payment row ${i + 1} amount must be greater than 0`);
          return;
        }
        if (
          (row.paymentMethod === "upi" || row.paymentMethod === "card" || row.paymentMethod === "cheque") &&
          !row.paymentReference.trim()
        ) {
          toast.error(`Reference is required for row ${i + 1} (${row.paymentMethod.toUpperCase()})`);
          return;
        }
      }

      const rawBalance = invoice.balance_amount ?? invoice.total_amount - (invoice.paid_amount || 0);
      const remainingBalance = Math.max(0, Math.round((rawBalance - collectedOffset) * 100) / 100);
      const roundedTotalSplit = Math.round(totalSplitAmount * 100) / 100;
      if (roundedTotalSplit > remainingBalance) {
        toast.error(`Total split amount (${currency(roundedTotalSplit)}) exceeds outstanding balance (${currency(remainingBalance)})`);
        return;
      }

      setIsSubmitting(true);
      let completedCount = 0;
      let collectedBatchAmount = 0;
      try {
        let lastPayment: Payment | undefined;
        for (let i = 0; i < splitRows.length; i++) {
          const row = splitRows[i];
          const paymentData: CreatePaymentRequest = {
            invoice_id: invoice.id,
            amount: row.amount,
            payment_method: row.paymentMethod,
            payment_reference: row.paymentReference.trim() || null,
            notes: notes.trim()
              ? `${notes.trim()} (Split ${i + 1}/${splitRows.length})`
              : `Split payment ${i + 1}/${splitRows.length}`,
          };
          lastPayment = await paymentsApi.create(paymentData, effectiveTenantId);
          completedCount++;
          collectedBatchAmount += row.amount;
        }

        toast.success(`Successfully collected ${splitRows.length} split payments totalling ${currency(totalSplitAmount)}!`);
        onSuccess?.(lastPayment);
        onClose();
      } catch (error) {
        if (completedCount > 0) {
          // Prune successfully recorded rows so they are never charged twice upon retry
          setSplitRows((prev) => prev.slice(completedCount));
          setCollectedOffset((prev) => prev + collectedBatchAmount);
          const remainingAmount = Math.max(0, Math.round((roundedTotalSplit - collectedBatchAmount) * 100) / 100);
          toast.error(
            `Recorded ${completedCount} of ${splitRows.length} payments (${currency(collectedBatchAmount)} saved). Failed on payment #${completedCount + 1}. Please retry the remaining ${currency(remainingAmount)}.`
          );
        } else {
          const errorMessage = getErrorMessage(error);
          toast.error(errorMessage || "Failed to collect split payment");
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Single payment mode
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
      const paymentData: CreatePaymentRequest = {
        invoice_id: invoice.id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || null,
        notes: notes.trim() || undefined,
      };

      const payment = await paymentsApi.create(paymentData, effectiveTenantId);
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

  const rawBalance = invoice.balance_amount ?? invoice.total_amount - (invoice.paid_amount || 0);
  const balanceAmount = Math.max(0, Math.round((rawBalance - collectedOffset) * 100) / 100);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Collect Payment" size={isSplitMode ? "lg" : "md"}>
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
        {/* Invoice Details */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Invoice Number:</span>
              <span className="font-semibold text-slate-900">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Invoice Amount:</span>
              <span className="font-semibold text-slate-900">{currency(invoice.total_amount)}</span>
            </div>
            {invoice.paid_amount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span className="font-medium">✓ Total Paid:</span>
                <span className="font-semibold">-{currency(invoice.paid_amount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 bg-amber-50/60 p-2 rounded-lg">
              <span className="font-bold text-amber-900">Outstanding Balance:</span>
              <span className="font-black text-amber-900 text-base">{currency(balanceAmount)}</span>
            </div>
          </div>
        </div>

        {/* Mode Toggle: Single vs Split Payments */}
        <div className="flex items-center justify-between rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setIsSplitMode(false)}
            className={`flex-1 rounded-lg py-1.5 transition disabled:opacity-50 ${
              !isSplitMode
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Single Payment Method
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setIsSplitMode(true)}
            className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg py-1.5 transition disabled:opacity-50 ${
              isSplitMode
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Split className="h-3.5 w-3.5" />
            Split / Multiple Payments
          </button>
        </div>

        {!isSplitMode ? (
          /* Single Payment Mode */
          <>
            <label className="space-y-1 block">
              <span className="text-slate-600 text-xs font-semibold">
                Payment Amount <span className="text-rose-500">*</span>
              </span>
              <AmountInput
                min="0.01"
                max={balanceAmount}
                arrowStep={10}
                value={paymentAmount}
                disabled={isSubmitting}
                onValueChange={(val) => setPaymentAmount(parseFloat(val) || 0)}
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2 outline-none focus:border-sky-400 disabled:opacity-50"
                required
              />
              <p className="text-xs text-slate-500">Maximum: {currency(balanceAmount)}</p>
            </label>

            <label className="space-y-1 block">
              <span className="text-slate-600 text-xs font-semibold">
                Payment Method <span className="text-rose-500">*</span>
              </span>
              <select
                value={paymentMethod}
                disabled={isSubmitting}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as PaymentMethod);
                  setPaymentReference("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 disabled:opacity-50"
                required
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </label>

            {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "cheque") && (
              <label className="space-y-1 block">
                <span className="text-slate-600 text-xs font-semibold">
                  Payment Reference <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  value={paymentReference}
                  disabled={isSubmitting}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={`Enter ${paymentMethod.toUpperCase()} reference`}
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 disabled:opacity-50"
                  required
                />
              </label>
            )}
          </>
        ) : (
          /* Split / Multiple Payment Mode */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Split Breakdown</span>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={addSplitRow}
                className="flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Method
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {splitRows.map((row, idx) => {
                const needsRef = row.paymentMethod === "upi" || row.paymentMethod === "card" || row.paymentMethod === "cheque";
                return (
                  <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Payment #{idx + 1}</span>
                      {splitRows.length > 1 && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => removeSplitRow(row.id)}
                          className="text-slate-400 hover:text-rose-600 transition disabled:opacity-50"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4">
                        <select
                          value={row.paymentMethod}
                          disabled={isSubmitting}
                          onChange={(e) => updateSplitRow(row.id, { paymentMethod: e.target.value as PaymentMethod, paymentReference: "" })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400 disabled:opacity-50"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="card">Card</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>
                      <div className="col-span-4">
                        <AmountInput
                          min="0.01"
                          max={balanceAmount}
                          value={row.amount}
                          disabled={isSubmitting}
                          onValueChange={(val) => updateSplitRow(row.id, { amount: parseFloat(val) || 0 })}
                          placeholder="Amount"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400 disabled:opacity-50"
                          required
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={row.paymentReference}
                          disabled={isSubmitting}
                          onChange={(e) => updateSplitRow(row.id, { paymentReference: e.target.value })}
                          placeholder={needsRef ? "Reference *" : "Reference"}
                          className={`w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400 disabled:opacity-50 ${
                            needsRef && !row.paymentReference.trim() ? "border-amber-300 bg-amber-50/30" : "border-slate-200"
                          }`}
                          required={needsRef}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-100 p-2.5 text-xs">
              <span className="font-medium text-slate-600">Total Allocated:</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold font-mono ${totalSplitAmount > balanceAmount ? "text-rose-600" : "text-emerald-700"}`}>
                  {currency(totalSplitAmount)}
                </span>
                <span className="text-slate-400">/ {currency(balanceAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <label className="space-y-1 block">
          <span className="text-slate-600 text-xs font-semibold">Notes (Optional)</span>
          <textarea
            value={notes}
            disabled={isSubmitting}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Add any notes about this payment"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400 resize-none disabled:opacity-50"
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
            {isSubmitting ? "Processing..." : isSplitMode ? `Collect Split Payment (${currency(totalSplitAmount)})` : "Collect Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
