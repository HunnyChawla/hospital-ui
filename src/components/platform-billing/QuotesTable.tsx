"use client";

import { Quote } from "@/types/platformBilling";
import { formatDate } from "@/utils/format";
import { FileText, Download, Loader2, Pencil, Mail, CheckCircle2 } from "lucide-react";

interface QuotesTableProps {
  quotes: Quote[];
  loading: boolean;
  onDownload: (id: string) => void;
  onEdit?: (quote: Quote) => void;
  onSendEmail?: (quote: Quote) => void;
}

export function QuotesTable({
  quotes,
  loading,
  onDownload,
  onEdit,
  onSendEmail,
}: QuotesTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">Draft</span>;
      case "sent":
        return <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">Sent</span>;
      case "accepted":
        return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Accepted</span>;
      case "rejected":
        return <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">Rejected</span>;
      case "expired":
        return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Expired</span>;
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

  if (quotes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-2 text-sm font-semibold text-slate-900">No quotes found</h3>
        <p className="mt-1 text-sm text-slate-500">Get started by creating a new platform quote.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-500">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700">
            <tr>
              <th className="px-6 py-3">Quote Number</th>
              <th className="px-6 py-3">Hospital</th>
              <th className="px-6 py-3">Valid Until</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {quotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                  {quote.quote_number}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-900">{quote.tenant_name}</span>
                      {!quote.tenant_id && (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          Prospect
                        </span>
                      )}
                    </div>
                    {quote.gst_number && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        GST: {quote.gst_number}
                      </span>
                    )}
                    {quote.sent_to_email && (
                      <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Emailed to {quote.sent_to_email}
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">{formatDate(quote.valid_until)}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-slate-950">
                  ₹
                  {quote.total_amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-center">
                  {getStatusBadge(quote.status)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex justify-end gap-1.5">
                    {onSendEmail && (
                      <button
                        onClick={() => onSendEmail(quote)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 transition"
                        title={quote.status === "sent" ? "Resend Quote Email" : "Send Quote Email"}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {quote.status === "sent" ? "Resend" : "Send"}
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(quote)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50"
                        title="Edit quote"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                    <button
                      onClick={() => onDownload(quote.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      title="Download PDF"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
