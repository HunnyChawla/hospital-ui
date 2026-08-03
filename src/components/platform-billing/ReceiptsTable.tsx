"use client";

import { Receipt } from "@/types/platformBilling";
import { formatDate } from "@/utils/format";
import { FileText, Download, Loader2 } from "lucide-react";

interface ReceiptsTableProps {
  receipts: Receipt[];
  loading: boolean;
  onDownload: (id: string) => void;
}

export function ReceiptsTable({ receipts, loading, onDownload }: ReceiptsTableProps) {
  const formatMethod = (method: string) => {
    switch (method) {
      case "cash":
        return "Cash";
      case "bank_transfer":
        return "Bank Transfer";
      case "cheque":
        return "Cheque";
      case "upi":
        return "UPI";
      case "online":
        return "Online Card/NetBanking";
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-2 text-sm font-semibold text-slate-900">No payment receipts found</h3>
        <p className="mt-1 text-sm text-slate-500">Record a payment on a platform invoice to generate receipts.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-500">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700">
            <tr>
              <th className="px-6 py-3">Receipt Number</th>
              <th className="px-6 py-3">Hospital</th>
              <th className="px-6 py-3">Invoice Ref</th>
              <th className="px-6 py-3">Payment Date</th>
              <th className="px-6 py-3">Method</th>
              <th className="px-6 py-3">Reference No</th>
              <th className="px-6 py-3 text-right">Amount Received</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {receipts.map((receipt) => (
              <tr key={receipt.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">{receipt.receipt_number}</td>
                <td className="px-6 py-4">{receipt.tenant_name}</td>
                <td className="whitespace-nowrap px-6 py-4 font-medium text-sky-600">{receipt.platform_invoice_number}</td>
                <td className="whitespace-nowrap px-6 py-4">{formatDate(receipt.payment_date)}</td>
                <td className="whitespace-nowrap px-6 py-4">{formatMethod(receipt.payment_method)}</td>
                <td className="whitespace-nowrap px-6 py-4">{receipt.transaction_reference || "N/A"}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-slate-950">₹{receipt.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <button
                    onClick={() => onDownload(receipt.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    title="Download Receipt PDF"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
