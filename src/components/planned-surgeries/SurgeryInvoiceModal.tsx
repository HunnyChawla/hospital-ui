"use client";

import { useEffect, useRef, useState } from "react";
import { X, FileText, IndianRupee, Printer, CheckCircle2, AlertCircle, CreditCard, Loader2 } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  useSurgeryInvoice,
  useSurgeryPaymentSummary,
  useGenerateSurgeryInvoice,
  useCollectSurgeryBalance,
} from "@/hooks/queries/useSurgeryBilling";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import type { PlannedSurgery } from "@/types";
import type { Invoice } from "@/services/invoicesApi";

interface SurgeryInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgery: PlannedSurgery | null;
  onOpenAdvanceModal?: () => void;
}

export function SurgeryInvoiceModal({
  isOpen,
  onClose,
  surgery,
  onOpenAdvanceModal,
}: SurgeryInvoiceModalProps) {
  const surgeryId = surgery?.id || null;

  const { data: invoice, isLoading: isLoadingInvoice } = useSurgeryInvoice(surgeryId);
  const { data: summary, isLoading: isLoadingSummary } = useSurgeryPaymentSummary(surgeryId);

  const generateInvoiceMutation = useGenerateSurgeryInvoice();
  const collectBalanceMutation = useCollectSurgeryBalance();

  // Balance collection inline state
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceMethod, setBalanceMethod] = useState<"cash" | "upi" | "card" | "cheque">("cash");
  const [balanceRef, setBalanceRef] = useState("");
  const [balanceNotes, setBalanceNotes] = useState("");

  // Sync balance payment default amount when balance_due changes
  useEffect(() => {
    if (summary?.balance_due !== undefined) {
      setBalanceAmount(summary.balance_due.toString());
    }
  }, [summary?.balance_due]);

  const [shouldPrintInvoice, setShouldPrintInvoice] = useState(false);
  const printInvoiceRef = useRef<HTMLDivElement>(null);
  const triggerPrintInvoice = useReactToPrint({
    contentRef: printInvoiceRef,
    documentTitle: invoice ? `Invoice_${invoice.invoice_number}` : "Invoice",
  });

  useEffect(() => {
    if (invoice && shouldPrintInvoice && printInvoiceRef.current) {
      const timeoutId = setTimeout(() => {
        triggerPrintInvoice();
        setShouldPrintInvoice(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [invoice, shouldPrintInvoice, triggerPrintInvoice]);

  if (!isOpen || !surgery) return null;

  const isPackageFinalized = !!(surgery.package_id || surgery.package_price || summary?.package_price);
  const agreedPackagePrice = summary?.package_price ?? (surgery.package_price ? Number(surgery.package_price) : 0);
  const totalAdvancesCollected = summary?.total_advance_collected ?? 0;
  const estimatedBalance = Math.max(0, agreedPackagePrice - totalAdvancesCollected);

  const handleGenerateInvoiceClick = () => {
    if (!isPackageFinalized) return;

    generateInvoiceMutation.mutate({
      surgeryId: surgery.id,
      payload: {
        line_items: [],
      },
    });
  };

  const handleCollectBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(balanceAmount);
    if (!numAmt || numAmt <= 0 || !invoice) return;

    collectBalanceMutation.mutate(
      {
        surgeryId: surgery.id,
        invoiceId: invoice.id,
        payload: {
          invoice_id: invoice.id,
          amount: numAmt,
          payment_method: balanceMethod,
          payment_reference: balanceRef || undefined,
          notes: balanceNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          setShowBalanceForm(false);
          setBalanceRef("");
          setBalanceNotes("");
        },
      }
    );
  };

  const handlePrintInvoice = () => {
    setShouldPrintInvoice(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl transition-all max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {invoice ? "Surgery Invoice & Billing" : "Payment & Invoicing Hub"}
              </h2>
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {isLoadingInvoice || isLoadingSummary ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading billing data...</div>
          ) : invoice ? (
            /* VIEW GENERATED INVOICE MODE */
            <div className="space-y-5">
              {/* Invoice Status Banner */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Invoice Status</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{invoice.invoice_number}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        invoice.status === "paid"
                          ? "bg-emerald-200 text-emerald-900"
                          : invoice.status === "partial"
                          ? "bg-amber-200 text-amber-900"
                          : "bg-rose-200 text-rose-900"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Generated on {new Date(invoice.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Invoice Total</div>
                  <div className="text-xl font-extrabold text-slate-900">
                    ₹{Number(invoice.total_amount).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-semibold text-slate-700">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Agreed Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {invoice.line_items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="p-2.5 font-medium text-slate-800">{item.description}</td>
                        <td className="p-2.5 text-center">{item.quantity}</td>
                        <td className="p-2.5 text-right">₹{Number(item.unit_price).toLocaleString("en-IN")}</td>
                        <td className="p-2.5 text-right font-semibold text-slate-900">
                          ₹{Number(item.total_price).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Metrics & Balance Summary */}
              {summary && (
                <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Advances Deducted</span>
                    <span className="text-sm font-bold text-emerald-700">
                      ₹{summary.total_advance_collected.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Payments on Invoice</span>
                    <span className="text-sm font-bold text-blue-700">
                      ₹{summary.total_paid_on_invoice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Balance Due</span>
                    <span className={`text-base font-extrabold ${summary.balance_due > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      ₹{summary.balance_due.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions: Print & Collect Balance */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </button>

                {summary && summary.balance_due > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBalanceForm(!showBalanceForm)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 transition"
                  >
                    <CreditCard className="h-4 w-4" />
                    {showBalanceForm ? "Hide Payment Form" : `Collect Balance (₹${summary.balance_due.toLocaleString("en-IN")})`}
                  </button>
                )}
              </div>

              {/* Inline Balance Payment Collection Form */}
              {showBalanceForm && summary && (
                <form onSubmit={handleCollectBalanceSubmit} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-900">Record Balance Payment Against Invoice</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Payment Amount (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        max={summary.balance_due}
                        required
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Payment Method *
                      </label>
                      <select
                        value={balanceMethod}
                        onChange={(e) => setBalanceMethod(e.target.value as any)}
                        className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Reference / UTR
                      </label>
                      <input
                        type="text"
                        value={balanceRef}
                        onChange={(e) => setBalanceRef(e.target.value)}
                        placeholder="Txn ID"
                        className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={balanceNotes}
                        onChange={(e) => setBalanceNotes(e.target.value)}
                        placeholder="Optional notes"
                        className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={collectBalanceMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {collectBalanceMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Confirm Balance Payment
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* NO INVOICE YET — GENERATE INVOICE HUB */
            <div className="space-y-5">
              {/* Invoice Status Banner */}
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Invoice Status</span>
                    <span className="rounded-full bg-amber-200 px-3 py-0.5 text-xs font-bold text-amber-900 border border-amber-300">
                      Not Generated
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1 font-medium">
                    Final surgery invoice will be generated based on the agreed package price finalized by the counsellor.
                  </p>
                </div>

                {onOpenAdvanceModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdvanceModal();
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition shrink-0"
                  >
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    Collect Advance
                  </button>
                )}
              </div>

              {/* Package & Agreed Pricing Card */}
              {isPackageFinalized ? (
                <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-sky-700 tracking-wider">Finalized Package</span>
                      <h4 className="text-sm font-bold text-slate-900">
                        {surgery.package_name || surgery.surgery_name || "Surgery Package"}
                      </h4>
                    </div>
                    <span className="text-lg font-extrabold text-sky-800 bg-white px-3 py-1 rounded-lg border border-sky-200 shadow-2xs">
                      ₹{agreedPackagePrice.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-sky-200/70 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Total Advances Collected</span>
                      <span className="font-bold text-emerald-700">₹{totalAdvancesCollected.toLocaleString("en-IN")}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Estimated Invoice Balance</span>
                      <span className="font-extrabold text-blue-900">₹{estimatedBalance.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <AlertCircle className="mx-auto h-10 w-10 text-amber-600 mb-2" />
                  <h3 className="text-base font-bold text-amber-900">Package Not Finalized</h3>
                  <p className="mt-1 text-xs text-amber-700 max-w-md mx-auto">
                    A surgery package has not been selected for this surgery yet. Please edit the surgery details to select and finalize a package before generating an invoice.
                  </p>
                </div>
              )}

              {/* Advance Payments Breakdown */}
              {summary?.payments && summary.payments.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Collected Advances History ({summary.payments.length})
                    </span>
                    <span className="font-extrabold text-emerald-700">
                      Total: ₹{totalAdvancesCollected.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
                    {summary.payments.map((p: any, idx: number) => (
                      <div key={p.surgery_payment_id || idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {p.payment_number || `Advance #${idx + 1}`} ({p.payment_type?.toUpperCase() || "ADVANCE"})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-IN") : "Date N/A"} • {(p.payment_method || "CASH").toUpperCase()} {p.payment_reference ? `• Ref: ${p.payment_reference}` : ""}
                          </div>
                        </div>
                        <div className="text-right font-extrabold text-emerald-700 text-sm">
                          +₹{Number(p.amount).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Single Click Generate Invoice Button */}
              {isPackageFinalized && (
                <div className="pt-3 border-t border-slate-100 flex flex-col items-center justify-center space-y-2">
                  <button
                    type="button"
                    onClick={handleGenerateInvoiceClick}
                    disabled={generateInvoiceMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {generateInvoiceMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Invoice…
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        Generate Invoice (₹{agreedPackagePrice.toLocaleString("en-IN")})
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">
                    Generating the invoice locks package pricing and registers existing advances against invoice {agreedPackagePrice > 0 ? `₹${agreedPackagePrice.toLocaleString("en-IN")}` : ""}.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Print Invoice (Hidden) */}
      {invoice && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printInvoiceRef} className="print-content">
            <InvoicePrint
              invoice={invoice}
              patientName={invoice.patient_name || surgery.patient_name || "Patient"}
              patientMobile={invoice.patient_mobile || surgery.patient_mobile || undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
