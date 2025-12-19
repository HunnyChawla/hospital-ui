"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { Modal } from "@/components/common/Modal";
import { InitiateDischargeForm } from "./InitiateDischargeForm";
import { admissionsApi, InitiateDischargeRequest, Admission } from "@/services/admissionsApi";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { currency } from "@/utils/format";
import { formatDate } from "@/utils/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTenantIdForApi } from "@/utils/auth";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { User, Printer } from "lucide-react";

interface InitiateDischargeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
  onSuccess: (admission: Admission) => void;
}

export function InitiateDischargeFormModal({ isOpen, onClose, admissionId, onSuccess }: InitiateDischargeFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [initiatedInvoice, setInitiatedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const handleSubmit = async (data: InitiateDischargeRequest) => {
    setSubmitting(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const admission = await admissionsApi.initiateDischarge(admissionId, data, tenantId || undefined);
      
      // Fetch invoice details if invoice_id is present
      if (admission.invoice_id) {
        try {
          const apiTenantId = getTenantIdForApi(tenantId || undefined);
          const invoice = await invoicesApi.getById(admission.invoice_id, apiTenantId);
          setInitiatedInvoice(invoice);
          setShowInvoiceModal(true);
        } catch (error) {
          console.error("Failed to fetch invoice:", error);
          // Still proceed even if invoice fetch fails
        }
      }

      toast.success("Discharge initiated successfully. Invoice generated.");
      onSuccess(admission);
      
      // Close the initiate discharge modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Failed to initiate discharge:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to initiate discharge");
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseInvoice = () => {
    setShowInvoiceModal(false);
    setInitiatedInvoice(null);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Initiate Discharge" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Generate the final invoice before discharge. This will create an invoice for all admission charges.
          </p>
          <InitiateDischargeForm onSubmit={handleSubmit} />
        </div>
      </Modal>

      {/* Invoice Details Modal - Reuse pattern from BillingManagement */}
      {showInvoiceModal && initiatedInvoice && (
        <InvoiceDetailsModal
          isOpen={showInvoiceModal}
          onClose={handleCloseInvoice}
          invoice={initiatedInvoice}
        />
      )}
    </>
  );
}

// Invoice Details Modal Component
function InvoiceDetailsModal({ isOpen, onClose, invoice }: { isOpen: boolean; onClose: () => void; invoice: Invoice }) {
  const printInvoiceRef = useRef<HTMLDivElement>(null);
  const [shouldPrintInvoice, setShouldPrintInvoice] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printInvoiceRef,
    documentTitle: `Invoice_${invoice.invoice_number}`,
  });

  useEffect(() => {
    if (shouldPrintInvoice && printInvoiceRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrint();
        setShouldPrintInvoice(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintInvoice, handlePrint]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "partial":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "cancelled":
        return "bg-slate-50 text-slate-700 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generated Invoice" size="xl">
      <div className="space-y-2.5 -mx-6 -mb-6 px-6 pb-6">
      {/* Patient Information */}
      {invoice.patient_name && (
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-sky-50 to-sky-50/50 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-sm">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Patient</p>
                <p className="text-sm font-bold text-slate-900">{invoice.patient_name}</p>
              </div>
            </div>
            {invoice.patient_mobile && (
              <div className="text-xs text-slate-600">
                <span className="font-medium">{invoice.patient_mobile}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Header - Compact Grid */}
      <div className="grid grid-cols-4 gap-2.5">
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Invoice #</p>
          <p className="text-sm font-bold text-slate-900 truncate">{invoice.invoice_number}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Date</p>
          <p className="text-sm font-bold text-slate-900">{formatDate(invoice.invoice_date)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Status</p>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(invoice.status)}`}>
            {invoice.status}
          </span>
        </div>
        <div className="rounded-lg border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-teal-50/30 p-2.5 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Total</p>
          <p className="text-base font-bold text-sky-700">{currency(invoice.total_amount)}</p>
        </div>
      </div>

      {/* Line Items Table - Compact */}
      {invoice.line_items && invoice.line_items.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-700">Description</th>
                  <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-700 w-16">Qty</th>
                  <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-700 w-20">Unit Price</th>
                  <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-700 w-20">Discount</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-700 w-24">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invoice.line_items.map((item, index) => {
                  const quantity = typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity;
                  const unitPrice = typeof item.unit_price === "string" ? parseFloat(item.unit_price) : item.unit_price;
                  const discount = item.discount !== undefined 
                    ? (typeof item.discount === "string" ? parseFloat(item.discount) : item.discount)
                    : 0;
                  const total = item.total_price !== undefined 
                    ? (typeof item.total_price === "string" ? parseFloat(item.total_price) : item.total_price)
                    : (item.total || quantity * unitPrice);
                  return (
                    <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2 text-xs text-slate-900 font-medium">{item.description}</td>
                      <td className="px-2 py-2 text-center text-xs text-slate-700">{quantity}</td>
                      <td className="px-2 py-2 text-right text-xs text-slate-700">{currency(unitPrice)}</td>
                      <td className="px-2 py-2 text-right text-xs text-slate-700">{discount > 0 ? currency(discount) : "-"}</td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-slate-900">{currency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financial Summary - Compact */}
      {invoice.subtotal !== undefined && (
        <div className="rounded-lg border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50/30 p-3 shadow-sm">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-600">Subtotal</span>
              <span className="text-xs font-semibold text-slate-900">{currency(invoice.subtotal)}</span>
            </div>
            {invoice.tax_rate > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-600">Tax ({invoice.tax_rate}%)</span>
                <span className="text-xs font-semibold text-slate-900">{currency(invoice.tax_amount)}</span>
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-600">Discount</span>
                <span className="text-xs font-bold text-emerald-600">-{currency(invoice.discount)}</span>
              </div>
            )}
            <div className="border-t border-slate-300 pt-1.5 mt-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">Total Amount</span>
                <span className="text-base font-bold text-slate-900">{currency(invoice.total_amount)}</span>
              </div>
            </div>
            {invoice.paid_amount > 0 && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-xs font-medium text-slate-600">Paid</span>
                <span className="text-xs font-bold text-emerald-600">{currency(invoice.paid_amount)}</span>
              </div>
            )}
            {invoice.balance_amount !== undefined && invoice.balance_amount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-600">Balance</span>
                <span className="text-xs font-bold text-amber-600">{currency(invoice.balance_amount)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes - Compact */}
      {invoice.notes && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">Notes</p>
          <p className="text-xs text-slate-700 leading-relaxed">{invoice.notes}</p>
        </div>
      )}

      {/* Actions - Compact */}
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
        >
          Close
        </button>
        <button
          onClick={() => setShouldPrintInvoice(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md"
        >
          <Printer className="h-3.5 w-3.5" />
          Print Invoice
        </button>
      </div>
      </div>

      {/* Hidden printable invoice */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
        <div ref={printInvoiceRef} className="print-content">
          <InvoicePrint
            invoice={invoice}
            patientName={invoice.patient_name || "Unknown"}
            patientMobile={invoice.patient_mobile}
          />
        </div>
      </div>
    </Modal>
  );
}
