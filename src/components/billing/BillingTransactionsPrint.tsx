"use client";

import { BillingTransactionRow, BillingStatsResponse } from "@/services/paymentsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate, formatDateTime, currency } from "@/utils/format";
import { buildTableRows } from "@/utils/billing";
import { PrintHeader } from "@/components/common/PrintHeader";

interface BillingTransactionsPrintProps {
  items: BillingTransactionRow[];
  total: number;
  startDate?: string;
  endDate?: string;
  stats: BillingStatsResponse;
}

export function BillingTransactionsPrint({ items, total, startDate, endDate, stats }: BillingTransactionsPrintProps) {
  const { tenant } = useTenant();
  // Same flattening the on-screen table view uses, so the report matches it
  // column-for-column - one row per date-matching payment.
  const rows = buildTableRows(items, startDate, endDate);

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 print:p-4 text-slate-900 font-sans">
      <style>{`
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          .print-content {
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          table {
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
        }
      `}</style>
      <PrintHeader tenant={tenant} documentType="Billing Transactions Report" />

      <div className="mb-4 rounded-xl border border-slate-300 bg-slate-50 p-3 print:bg-white print:border-slate-400">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date Range</p>
            <p className="text-sm font-bold text-slate-900">
              {startDate ? formatDate(startDate) : "Beginning"} — {endDate ? formatDate(endDate) : "Today"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Rows</p>
            <p className="text-sm font-bold text-slate-900">{total}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Paid</p>
            <p className="text-base font-bold text-emerald-700">{currency(stats.total_paid)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-200 pt-3 text-xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
            <p className="text-sm font-bold text-slate-900">{currency(stats.total_revenue)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Pending</p>
            <p className="text-sm font-bold text-amber-700">{currency(stats.total_pending)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Invoices</p>
            <p className="text-sm font-bold text-slate-900">{stats.total_invoices}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-2">
        <h2 className="border-b-2 border-slate-800 pb-1 text-sm font-bold text-slate-900 uppercase tracking-wider">
          Collections by Payment Method
        </h2>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100 print:bg-slate-200 font-semibold text-slate-700">
              <th className="py-2 px-3">Payment Method</th>
              <th className="py-2 px-3 text-center">Transaction Count</th>
              <th className="py-2 px-3 text-right">Received (₹)</th>
              <th className="py-2 px-3 text-right">Refunded (₹)</th>
              <th className="py-2 px-3 text-right">Actual (₹)</th>
              <th className="py-2 px-3 text-right">% Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {stats.by_payment_method.map((item) => (
              <tr key={item.payment_method} className="hover:bg-slate-50">
                <td className="py-2 px-3 font-semibold uppercase text-slate-800">{item.payment_method}</td>
                <td className="py-2 px-3 text-center">{item.transaction_count}</td>
                <td className="py-2 px-3 text-right font-semibold text-slate-800">{currency(item.received_amount)}</td>
                <td className="py-2 px-3 text-right font-semibold text-rose-700">{currency(item.refunded_amount)}</td>
                <td className="py-2 px-3 text-right font-bold text-slate-900">{currency(item.actual_amount)}</td>
                <td className="py-2 px-3 text-right font-semibold text-slate-700">{item.percentage.toFixed(2)}%</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-800 font-bold bg-slate-50 print:bg-slate-100">
              <td className="py-2.5 px-3 uppercase">Total Collected</td>
              <td className="py-2.5 px-3 text-center">-</td>
              <td className="py-2.5 px-3 text-right">-</td>
              <td className="py-2.5 px-3 text-right">-</td>
              <td className="py-2.5 px-3 text-right text-emerald-700 text-sm">{currency(stats.total_paid)}</td>
              <td className="py-2.5 px-3 text-right">100.00%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-6 space-y-2">
        <h2 className="border-b-2 border-slate-800 pb-1 text-sm font-bold text-slate-900 uppercase tracking-wider">
          Transactions ({rows.length})
        </h2>
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100 print:bg-slate-200 font-semibold text-slate-700">
              <th className="py-1.5 px-2">Date</th>
              <th className="py-1.5 px-2">ID</th>
              <th className="py-1.5 px-2">Patient</th>
              <th className="py-1.5 px-2 text-right">Total (₹)</th>
              <th className="py-1.5 px-2 text-right">Received (₹)</th>
              <th className="py-1.5 px-2 text-right">Pending (₹)</th>
              <th className="py-1.5 px-2 text-right">Amount (₹)</th>
              <th className="py-1.5 px-2">Type</th>
              <th className="py-1.5 px-2">Method</th>
              <th className="py-1.5 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50">
                <td className="py-1.5 px-2 text-slate-700">
                  <p>{row.paymentDate ? formatDateTime(row.paymentDate) : "-"}</p>
                  <p className="text-[9px] text-slate-500">
                    Inv: {row.invoiceDate ? formatDate(row.invoiceDate) : "-"}
                  </p>
                </td>
                <td className="py-1.5 px-2 font-mono text-slate-800">
                  <p>{row.paymentId || "-"}</p>
                  <p className="text-[9px] text-slate-500">
                    {row.isStandalone ? (
                      <span className="italic text-amber-700">No invoice</span>
                    ) : (
                      `Inv: #${row.invoiceNumber}`
                    )}
                  </p>
                </td>
                <td className="py-1.5 px-2">
                  <p className="font-semibold text-slate-900">{row.patientName || "N/A"}</p>
                  {(row.patientUhid || row.patientMobile) && (
                    <p className="text-[9px] text-slate-500">
                      {[row.patientUhid, row.patientMobile].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-700">
                  {row.total != null ? (
                    <>
                      {row.originalAmount != null && row.originalAmount !== row.total && (
                        <span className="mr-1 text-slate-400 line-through">{currency(row.originalAmount)}</span>
                      )}
                      <span>{currency(row.total)}</span>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="py-1.5 px-2 text-right font-semibold text-slate-900">{row.received != null ? currency(row.received) : "-"}</td>
                <td className="py-1.5 px-2 text-right text-amber-700">{row.pending != null ? currency(row.pending) : "-"}</td>
                <td className="py-1.5 px-2 text-right">
                  {row.transactionAmount != null ? (
                    <span className="inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-bold text-indigo-700">
                      {currency(row.transactionAmount)}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="py-1.5 px-2 capitalize text-slate-700">{row.serviceType || "-"}</td>
                <td className="py-1.5 px-2 uppercase text-slate-700">{row.method || "-"}</td>
                <td className="py-1.5 px-2 text-center capitalize text-slate-700">
                  {row.hasPayment && row.status ? row.status : !row.isStandalone ? "No payments yet" : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500">
        <p>This is an official computer-generated billing report.</p>
        <p className="mt-0.5">Generated on {formatDate(new Date().toISOString())}</p>
      </div>
    </div>
  );
}
