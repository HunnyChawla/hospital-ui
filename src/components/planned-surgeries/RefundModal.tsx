"use client";

import { useState, useEffect } from "react";
import { X, RotateCcw, AlertTriangle, CheckCircle2, IndianRupee, Loader2 } from "lucide-react";
import { useSurgeryPayments, useRefundSurgeryPayment } from "@/hooks/queries/useSurgeryBilling";
import type { PlannedSurgery, SurgeryPaymentEntry } from "@/types";

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgery: PlannedSurgery | null;
}

export function RefundModal({ isOpen, onClose, surgery }: RefundModalProps) {
  const surgeryId = surgery?.id || null;
  const { data: payments = [], isLoading: isLoadingPayments } = useSurgeryPayments(surgeryId);
  const refundMutation = useRefundSurgeryPayment();

  const [selectedPayment, setSelectedPayment] = useState<SurgeryPaymentEntry | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "upi" | "card" | "cheque">("cash");
  const [refundRef, setRefundRef] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [step, setStep] = useState<"select" | "details" | "confirm">("select");

  useEffect(() => {
    if (isOpen) {
      setSelectedPayment(null);
      setRefundAmount("");
      setRefundMethod("cash");
      setRefundRef("");
      setReason("");
      setNotes("");
      setStep("select");
    }
  }, [isOpen]);

  if (!isOpen || !surgery) return null;

  const eligiblePayments = payments.filter((p) => p.status !== "refunded" && p.amount > 0);

  const handleSelectPayment = (pay: SurgeryPaymentEntry) => {
    setSelectedPayment(pay);
    setRefundAmount(pay.amount.toString());
    setRefundMethod((pay.payment_method?.toLowerCase() as any) || "cash");
    setRefundRef("");
    setReason(surgery.status === "cancelled" ? "Surgery cancelled by patient" : "Surgery denied/cancelled");
    setNotes("");
    setStep("details");
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(refundAmount);
    if (!num || num <= 0 || !selectedPayment || num > selectedPayment.amount || !reason.trim()) {
      return;
    }
    setStep("confirm");
  };

  const handleExecuteRefund = () => {
    if (!selectedPayment) return;

    refundMutation.mutate(
      {
        surgeryId: surgery.id,
        paymentId: selectedPayment.payment_id,
        payload: {
          refund_amount: parseFloat(refundAmount),
          refund_method: refundMethod,
          refund_reference: refundRef || null,
          reason: reason.trim(),
          notes: notes || null,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-100 p-2.5 text-rose-700">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Initiate Surgery Refund</h2>
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

        {/* Content */}
        <div className="py-4 space-y-4">
          {isLoadingPayments ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading payment history...</div>
          ) : step === "select" ? (
            /* STEP 1: Select Payment */
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Select Payment Record to Refund
              </label>

              {eligiblePayments.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  No active refundable payments found for this surgery.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {eligiblePayments.map((pay) => (
                    <div
                      key={pay.surgery_payment_id}
                      onClick={() => handleSelectPayment(pay)}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 hover:border-rose-300 hover:bg-rose-50/40 cursor-pointer transition-all shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-mono font-bold text-slate-800 text-xs">
                          <span>{pay.payment_number}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-sans ${
                              pay.payment_type === "advance"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {pay.payment_type}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(pay.payment_date).toLocaleDateString("en-IN")} • {pay.payment_method.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 text-sm">
                          ₹{pay.amount.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-rose-600 font-medium">Click to refund</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : step === "details" && selectedPayment ? (
            /* STEP 2: Enter Refund Details */
            <form onSubmit={handleProceedToConfirm} className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs flex justify-between items-center">
                <div>
                  <div className="font-mono font-bold text-slate-800">{selectedPayment.payment_number}</div>
                  <div className="text-slate-500 text-[11px]">Original Payment Amount: ₹{selectedPayment.amount.toLocaleString("en-IN")}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  className="text-blue-600 hover:underline text-[11px]"
                >
                  Change Payment
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Refund Amount (₹) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={selectedPayment.amount}
                      required
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Refund Mode *
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Refund *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Surgery postponed/cancelled"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference / UTR (Optional)
                </label>
                <input
                  type="text"
                  value={refundRef}
                  onChange={(e) => setRefundRef(e.target.value)}
                  placeholder="Txn reference number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700"
                >
                  Review Refund
                </button>
              </div>
            </form>
          ) : step === "confirm" && selectedPayment ? (
            /* STEP 3: Confirm Refund */
            <div className="space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-rose-600 mb-2" />
                <h3 className="text-base font-bold text-rose-900">Confirm Refund Action</h3>
                <p className="text-xs text-rose-700 mt-1">
                  You are about to issue a refund of{" "}
                  <span className="font-bold text-sm">₹{parseFloat(refundAmount || "0").toLocaleString("en-IN")}</span>{" "}
                  against payment <span className="font-mono font-bold">{selectedPayment.payment_number}</span>.
                </p>
                <div className="mt-3 text-[11px] text-slate-600 bg-white/80 rounded p-2 text-left space-y-1 border">
                  <div>
                    <strong>Reason:</strong> {reason}
                  </div>
                  <div>
                    <strong>Method:</strong> {refundMethod.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRefund}
                  disabled={refundMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-50"
                >
                  {refundMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Refund…
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Confirm & Issue Refund
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
