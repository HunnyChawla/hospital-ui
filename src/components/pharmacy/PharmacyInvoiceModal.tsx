"use client";

import { useRef } from "react";
import { Modal } from "@/components/common/Modal";
import { PharmacyInvoice } from "@/services/pharmacyApi";
import { Printer, Download } from "lucide-react";

interface PharmacyInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: PharmacyInvoice | null;
}

export function PharmacyInvoiceModal({ isOpen, onClose, invoice }: PharmacyInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pharmacy Invoice: ${invoice.invoice_number}`} size="lg">
      <div className="space-y-4">
        {/* Printable Invoice Container */}
        <div ref={printRef} className="p-4 border border-slate-200 rounded-xl bg-white space-y-4 text-xs">
          {/* Hospital & Invoice Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">CURA HOSPITAL PHARMACY</h2>
              <p className="text-slate-500 text-[11px]">Licensed Hospital Dispensary & Chemist</p>
              <p className="text-slate-500 text-[11px]">DL No: 20B/21B-HP-77123 | GSTIN: 07AAACH1234F1Z1</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-slate-900">{invoice.invoice_number}</span>
              <p className="text-slate-500 text-[11px]">Date: {invoice.invoice_date}</p>
              <span className="inline-flex mt-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <span className="text-slate-400 block text-[10px]">Patient Name:</span>
              <span className="font-semibold text-slate-800">{invoice.patient_name || "-"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Patient UHID:</span>
              <span className="font-mono text-slate-800">{invoice.patient_uhid || "-"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Contact Mobile:</span>
              <span className="text-slate-800">{invoice.patient_phone || "-"}</span>
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
                  <th className="py-2 px-3 text-right">Tax (%)</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items?.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3 font-medium text-slate-800">{it.medicine_name}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{it.batch_number}</td>
                    <td className="py-2 px-3 text-right font-semibold">{it.quantity}</td>
                    <td className="py-2 px-3 text-right">{Number(it.unit_price).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">{it.tax_rate}%</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900">
                      ₹{Number(it.total_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-56 space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-800">₹{Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax Total:</span>
                <span className="font-medium text-slate-800">₹{Number(invoice.tax_total).toFixed(2)}</span>
              </div>
              {Number(invoice.discount_total) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>-₹{Number(invoice.discount_total).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-slate-900">
                <span>Total Amount:</span>
                <span className="text-sky-700">₹{Number(invoice.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 text-center">
            * Medicines once sold can only be returned within 7 days in original condition accompanied with this bill.
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 transition cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </Modal>
  );
}
