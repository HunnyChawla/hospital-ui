"use client";

import { useRef } from "react";
import { Printer, CreditCard } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { useTenant } from "@/hooks/useTenant";
import { PharmacyInvoice } from "@/services/pharmacyApi";

interface PharmacyInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: PharmacyInvoice | null;
  onCollectPayment?: (invoice: PharmacyInvoice) => void;
}

export function PharmacyInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onCollectPayment,
}: PharmacyInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { hospitalName } = useTenant();

  if (!invoice) return null;

  const taxAmount = Number(invoice.tax_amount ?? invoice.tax_total ?? 0);
  const discountAmount = Number(invoice.discount ?? invoice.discount_total ?? 0);
  const totalAmount = Number(invoice.total_amount ?? 0);
  const paidAmount = Number(invoice.paid_amount ?? 0);
  const balanceDue = Math.max(0, totalAmount - paidAmount);
  const canPay =
    onCollectPayment &&
    balanceDue > 0 &&
    invoice.status !== "cancelled" &&
    invoice.status !== "refunded";

  const statusBadgeClass =
    invoice.status === "paid"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : invoice.status === "partial"
        ? "bg-cyan-50 text-cyan-800 border-cyan-200"
        : invoice.status === "cancelled"
          ? "bg-rose-50 text-rose-800 border-rose-200"
          : "bg-amber-50 text-amber-800 border-amber-200";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pharmacy Invoice: ${invoice.invoice_number}`} size="lg">
      <div className="space-y-4">
        <div ref={printRef} className="p-5 border border-slate-200 rounded-xl bg-white space-y-4 text-xs">
          {/* Hospital & Invoice Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">{hospitalName.toUpperCase()} — PHARMACY</h2>
              <p className="text-slate-600 text-[11px]">Hospital Dispensary & Pharmacy Billing Receipt</p>
              <p className="text-slate-500 text-[11px] font-mono">Invoice #{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-slate-900">{invoice.invoice_number}</span>
              <p className="text-slate-600 text-[11px] tabular-nums">Date: {invoice.invoice_date}</p>
              <span
                className={`inline-flex mt-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass}`}
              >
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Patient Name</span>
              <span className="font-semibold text-slate-900">{invoice.patient_name || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Patient UHID</span>
              <span className="font-mono font-semibold text-slate-900">{invoice.patient_uhid || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Payment Mode</span>
              <span className="font-semibold text-slate-900 uppercase">
                {invoice.payment_method || (paidAmount === 0 ? "Unpaid" : "-")}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Medicine Description</th>
                  <th className="py-2 px-3">Batch</th>
                  <th className="py-2 px-3 text-right">Qty</th>
                  <th className="py-2 px-3 text-right">Rate (₹)</th>
                  <th className="py-2 px-3 text-right">GST (%)</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items?.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="py-2 px-3 text-slate-500 tabular-nums">{idx + 1}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{it.medicine_name}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{it.batch_number}</td>
                    <td className="py-2 px-3 text-right font-semibold tabular-nums">{it.quantity}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{Number(it.unit_price).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{Number(it.tax_rate).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-900 tabular-nums">
                      ₹{Number(it.total_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-1 text-slate-700">
              <div className="flex justify-between tabular-nums">
                <span>Subtotal (Taxable):</span>
                <span className="font-medium text-slate-900">₹{Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between tabular-nums">
                <span>GST Tax Total:</span>
                <span className="font-medium text-slate-900">₹{taxAmount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-700 tabular-nums">
                  <span>Discount:</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-slate-900 tabular-nums">
                <span>Total Amount:</span>
                <span className="text-cyan-800">₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-emerald-700 tabular-nums">
                <span>Paid Amount:</span>
                <span>₹{paidAmount.toFixed(2)}</span>
              </div>
              {balanceDue > 0 && invoice.status !== "cancelled" && (
                <div className="flex justify-between text-xs font-bold text-amber-800 tabular-nums">
                  <span>Balance Due:</span>
                  <span>₹{balanceDue.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-500 text-center">
            * Medicines once dispensed can only be returned within 7 days in original unopened packaging with this bill.
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>
          {canPay && (
            <button
              type="button"
              onClick={() => onCollectPayment(invoice)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-500 transition cursor-pointer"
            >
              <CreditCard className="h-4 w-4" />
              Collect ₹{balanceDue.toFixed(2)}
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-cyan-600 transition cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </Modal>
  );
}
