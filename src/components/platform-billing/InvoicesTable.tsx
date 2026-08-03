"use client";

import { PlatformInvoice } from "@/types/platformBilling";
import { formatDate } from "@/utils/format";
import { FileText, Send, DollarSign, Download, Loader2 } from "lucide-react";

interface InvoicesTableProps {
  invoices: PlatformInvoice[];
  loading: boolean;
  onSend: (id: string) => void;
  onLogPayment: (invoice: PlatformInvoice) => void;
  onDownload: (id: string) => void;
}

export function InvoicesTable({
  invoices,
  loading,
  onSend,
  onLogPayment,
  onDownload,
}: InvoicesTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">Draft</span>;
      case "sent":
        return <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">Sent</span>;
      case "paid":
        return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Paid</span>;
      case "overdue":
        return <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">Overdue</span>;
      case "cancelled":
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">Cancelled</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-2 text-sm font-semibold text-slate-900">No invoices found</h3>
        <p className="mt-1 text-sm text-slate-500">Get started by creating a new platform invoice.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-500">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700">
            <tr>
              <th className="px-6 py-3">Invoice Number</th>
              <th className="px-6 py-3">Hospital</th>
              <th className="px-6 py-3">Due Date</th>
              <th className="px-6 py-3 text-right">Total Amount</th>
              <th className="px-6 py-3 text-right">Paid Amount</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoices.map((invoice) => {
              const balance = invoice.total_amount - invoice.paid_amount;
              return (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">{invoice.invoice_number}</td>
                  <td className="px-6 py-4">{invoice.tenant_name}</td>
                  <td className="whitespace-nowrap px-6 py-4">{formatDate(invoice.due_date)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-slate-950">₹{invoice.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-emerald-600 font-semibold">₹{invoice.paid_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">{getStatusBadge(invoice.status)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {invoice.status === "draft" && (
                        <button
                          onClick={() => onSend(invoice.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50"
                          title="Mark Sent"
                        >
                          <Send className="h-3.5 w-3.5" /> Send
                        </button>
                      )}
                      {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                        <button
                          onClick={() => onLogPayment(invoice)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                          title="Log Payment"
                        >
                          <DollarSign className="h-3.5 w-3.5" /> Log Payment
                        </button>
                      )}
                      <button
                        onClick={() => onDownload(invoice.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        title="Download PDF"
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
