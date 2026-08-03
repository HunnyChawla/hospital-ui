"use client";

import { CreditCard, FileText, Printer, RotateCcw, AlertCircle, Plus, CheckCircle2, History } from "lucide-react";
import { useSurgeryPaymentSummary } from "@/hooks/queries/useSurgeryBilling";
import type { PlannedSurgery } from "@/types";

interface SurgeryPaymentSummaryPanelProps {
  surgery: PlannedSurgery;
  onOpenAdvanceModal: () => void;
  onOpenInvoiceModal: () => void;
  onOpenRefundModal: () => void;
}

export function SurgeryPaymentSummaryPanel({
  surgery,
  onOpenAdvanceModal,
  onOpenInvoiceModal,
  onOpenRefundModal,
}: SurgeryPaymentSummaryPanelProps) {
  const { data: summary, isLoading } = useSurgeryPaymentSummary(surgery.id);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
        Loading payment summary...
      </div>
    );
  }

  const payments = summary?.payments || [];
  const advanceCount = payments.filter((p) => p.payment_type === "advance").length;
  const isPendingInvoice =
    (surgery.status === "scheduled" || surgery.status === "completed") &&
    !summary?.surgery_invoice_id;

  const handlePrintReceipt = (paymentId: string) => {
    window.open(`/billing/receipt/${paymentId}`, "_blank");
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800">Surgery Payment & Billing Summary</h3>
        </div>
        {summary?.invoice_status && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
              summary.invoice_status === "paid"
                ? "bg-emerald-100 text-emerald-800"
                : summary.invoice_status === "partial"
                ? "bg-amber-100 text-amber-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            Invoice {summary.invoice_status}
          </span>
        )}
      </div>

      {/* Pending Invoice Alert */}
      {isPendingInvoice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>Surgery is {surgery.status}, but no final invoice has been generated yet.</span>
          </div>
          <button
            type="button"
            onClick={onOpenInvoiceModal}
            className="flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            <FileText className="h-3 w-3" />
            Generate Invoice
          </button>
        </div>
      )}

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-4 gap-3 rounded-lg bg-slate-50 p-3 text-center text-xs">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block">Advances Collected</span>
          <span className="text-sm font-bold text-emerald-700">
            ₹{(summary?.total_advance_collected || 0).toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-slate-400 block font-normal">({advanceCount} payments)</span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-500 block">Invoice Total</span>
          <span className="text-sm font-bold text-slate-800">
            {summary?.invoice_total ? `₹${summary.invoice_total.toLocaleString("en-IN")}` : "Not Generated"}
          </span>
          <span className="text-[10px] text-slate-400 block font-normal">
            {summary?.invoice_number || "—"}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-500 block">Paid On Invoice</span>
          <span className="text-sm font-bold text-blue-700">
            ₹{(summary?.total_paid_on_invoice || 0).toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-slate-400 block font-normal">Balance payments</span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-500 block">Balance Due</span>
          <span className="text-sm font-bold text-rose-700">
            ₹{(summary?.balance_due || 0).toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-slate-400 block font-normal">Outstanding</span>
        </div>
      </div>

      {/* Linked Payments Table */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
          <span className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-slate-500" />
            Linked Transactions ({payments.length})
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            No payments recorded for this surgery yet.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-semibold text-slate-600">
                <tr>
                  <th className="p-2">Pay #</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Method</th>
                  <th className="p-2">Date</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {payments.map((pay) => (
                  <tr key={pay.surgery_payment_id} className="hover:bg-slate-50/60">
                    <td className="p-2 font-mono font-medium text-slate-800">{pay.payment_number}</td>
                    <td className="p-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-semibold ${
                          pay.payment_type === "advance"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {pay.payment_type}
                      </span>
                    </td>
                    <td className="p-2 uppercase text-slate-600">{pay.payment_method}</td>
                    <td className="p-2 text-slate-500">
                      {new Date(pay.payment_date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-2 text-right font-bold text-slate-900">
                      ₹{pay.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(pay.payment_id)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        title="Print Receipt"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="flex items-center justify-between pt-2 border-t text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAdvanceModal}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Collect Advance
          </button>

          <button
            type="button"
            onClick={onOpenInvoiceModal}
            className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            {summary?.surgery_invoice_id ? "View Invoice" : "Generate Invoice"}
          </button>
        </div>

        {payments.length > 0 && (
          <button
            type="button"
            onClick={onOpenRefundModal}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Initiate Refund
          </button>
        )}
      </div>
    </div>
  );
}
