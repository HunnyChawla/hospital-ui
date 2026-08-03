"use client";

import { useEffect, useRef, useState } from "react";
import { X, CreditCard, IndianRupee, Printer, CheckCircle2, History, Loader2, AlertCircle } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { useCollectSurgeryAdvance, useSurgeryPayments, useSurgeryPaymentSummary } from "@/hooks/queries/useSurgeryBilling";
import { SurgeryPaymentReceiptPrint } from "./SurgeryPaymentReceiptPrint";
import type { PlannedSurgery } from "@/types";

interface AdvancePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgery: PlannedSurgery | null;
}

export function AdvancePaymentModal({
  isOpen,
  onClose,
  surgery,
}: AdvancePaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "upi" | "card" | "cheque">("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [lastPayment, setLastPayment] = useState<{ payment_number: string; payment_id: string; amount: number } | null>(null);
  const [printPaymentId, setPrintPaymentId] = useState<string | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const triggerPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printPaymentId ? `Receipt_${printPaymentId}` : "Payment Receipt",
  });

  useEffect(() => {
    if (printPaymentId && shouldPrint && printRef.current) {
      const timeoutId = setTimeout(() => {
        triggerPrint();
        setShouldPrint(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printPaymentId, shouldPrint, triggerPrint]);

  const surgeryId = surgery?.id || null;
  const { data: payments = [], isLoading: isLoadingPayments } = useSurgeryPayments(surgeryId);
  const { data: summary } = useSurgeryPaymentSummary(surgeryId);

  const collectAdvanceMutation = useCollectSurgeryAdvance();

  const advancePayments = payments.filter((p) => p.payment_type === "advance");
  const totalAdvancesCollected = advancePayments
    .filter((p) => p.status !== "refunded")
    .reduce((sum, p) => sum + p.amount, 0);

  // Compute pending balance
  const packagePrice = summary?.package_price ?? (surgery?.package_price ? Number(surgery.package_price) : null);
  const pendingBalance = summary?.pending_balance ?? (packagePrice !== null ? Math.max(0, packagePrice - totalAdvancesCollected) : null);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setMethod("cash");
      setReference("");
      setNotes("");
      setLastPayment(null);
    }
  }, [isOpen]);

  if (!isOpen || !surgery) return null;

  const isPackageFinalized = !!(surgery.package_id || surgery.package_price || summary?.package_price);
  const numAmount = parseFloat(amount) || 0;
  const isExceedingBalance = pendingBalance !== null && numAmount > pendingBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPackageFinalized || !numAmount || numAmount <= 0 || isExceedingBalance) {
      return;
    }

    collectAdvanceMutation.mutate(
      {
        surgeryId: surgery.id,
        payload: {
          amount: numAmount,
          payment_method: method,
          payment_reference: reference || null,
          notes: notes || null,
        },
      },
      {
        onSuccess: (res) => {
          setLastPayment({
            payment_number: res.payment_number,
            payment_id: res.payment_id,
            amount: res.amount,
          });
        },
      }
    );
  };

  const handlePrintReceipt = (paymentId: string) => {
    setPrintPaymentId(paymentId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Collect Surgery Advance</h2>
              <p className="text-xs text-slate-500">
                {surgery.surgery_name} • {surgery.patient_name || "Patient"} ({surgery.patient_uhid || "No UHID"})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Confirmation Banner */}
        {lastPayment ? (
          <div className="my-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-2" />
            <h3 className="text-base font-bold text-emerald-900">Advance Collected Successfully!</h3>
            <p className="mt-1 text-sm text-emerald-700">
              Payment Receipt Number: <span className="font-mono font-bold">{lastPayment.payment_number}</span>
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">Amount: ₹{lastPayment.amount.toLocaleString("en-IN")}</p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handlePrintReceipt(lastPayment.payment_id)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print Payment Receipt
              </button>
              <button
                type="button"
                onClick={() => setLastPayment(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Collect Another
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-4">
            {/* Financial Overview Card with Pending Balance */}
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-teal-50/50 p-4 shadow-2xs">
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Package / Cost</span>
                  <span className="text-sm font-bold text-slate-800">
                    {packagePrice !== null ? `₹${packagePrice.toLocaleString("en-IN")}` : "Unspecified"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Advances</span>
                  <span className="text-sm font-bold text-emerald-700">
                    ₹{totalAdvancesCollected.toLocaleString("en-IN")}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Pending Balance</span>
                  <span className="text-sm font-bold text-blue-800">
                    {pendingBalance !== null ? `₹${pendingBalance.toLocaleString("en-IN")}` : "Flexible"}
                  </span>
                </div>
              </div>
            </div>

            {/* History of Previous Advances */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-slate-500" />
                  Previously Collected Advances
                </span>
                <span className="text-emerald-700 font-bold">Total: ₹{totalAdvancesCollected.toLocaleString("en-IN")}</span>
              </div>
              {isLoadingPayments ? (
                <div className="py-2 text-center text-xs text-slate-400">Loading history...</div>
              ) : advancePayments.length === 0 ? (
                <div className="py-2 text-center text-xs text-slate-400">No advance payments collected yet.</div>
              ) : (
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                  {advancePayments.map((pay) => (
                    <div
                      key={pay.surgery_payment_id}
                      className="flex items-center justify-between rounded border bg-white p-2 text-xs shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-mono font-medium text-slate-800">
                          <span>{pay.payment_number}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 uppercase font-sans">
                            {pay.payment_method}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(pay.payment_date).toLocaleDateString("en-IN")} {pay.payment_reference ? `• Ref: ${pay.payment_reference}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-emerald-700">₹{pay.amount.toLocaleString("en-IN")}</span>
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(pay.payment_id)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Print Receipt"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Collection Form / Package Not Finalized Warning */}
            {!isPackageFinalized ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center my-4">
                <AlertCircle className="mx-auto h-10 w-10 text-amber-600 mb-2" />
                <h3 className="text-base font-bold text-amber-900">Surgery Package Not Finalized</h3>
                <p className="mt-1 text-xs text-amber-700 max-w-md mx-auto">
                  A surgery package has not been selected for this surgery yet. Please edit the surgery details to select and finalize a package before collecting advance payments.
                </p>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Advance Amount (₹) *
                    </label>
                    {pendingBalance !== null && (
                      <span className="text-[11px] font-medium text-slate-500">
                        Max: ₹{pendingBalance.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={pendingBalance !== null ? pendingBalance : undefined}
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                        isExceedingBalance
                          ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30 text-rose-900"
                          : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                      }`}
                    />
                  </div>
                  {isExceedingBalance && pendingBalance !== null && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Amount cannot exceed pending balance of ₹{pendingBalance.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Reference / UTR (Optional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. UPI Ref 8237492819, Cheque #000123"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or remarks"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    collectAdvanceMutation.isPending ||
                    !amount ||
                    parseFloat(amount) <= 0 ||
                    isExceedingBalance
                  }
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {collectAdvanceMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Collect ₹{parseFloat(amount || "0").toLocaleString("en-IN")}
                    </>
                  )}
                </button>
              </div>
            </form>
            )}
          </div>
        )}
      </div>

      {/* Print Payment Receipt (Hidden) */}
      {printPaymentId && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printRef} className="print-content">
            <SurgeryPaymentReceiptPrint
              paymentId={printPaymentId}
              onReady={() => setShouldPrint(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
