"use client";

import { PaymentReportSummaryResponse } from "@/services/paymentsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate, currency } from "@/utils/format";
import { PrintHeader } from "@/components/common/PrintHeader";

interface PaymentReportPrintProps {
  report: PaymentReportSummaryResponse;
  startDate?: string;
  endDate?: string;
}

export function PaymentReportPrint({ report, startDate, endDate }: PaymentReportPrintProps) {
  const { tenant } = useTenant();

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
          tfoot {
            display: table-footer-group !important;
          }
        }
      `}</style>
      {/* Header */}
      <PrintHeader tenant={tenant} documentType="Payment Method Breakdown Report" />

      {/* Overview Metadata */}
      <div className="mb-4 rounded-xl border border-slate-300 bg-slate-50 p-3 print:bg-white print:border-slate-400">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date Range</p>
            <p className="text-sm font-bold text-slate-900">
              {startDate ? formatDate(startDate) : "Beginning"} — {endDate ? formatDate(endDate) : "Today"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Transactions</p>
            <p className="text-sm font-bold text-slate-900">{report.total_transactions}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Grand Total Collected</p>
            <p className="text-base font-bold text-emerald-700">{currency(report.total_collected)}</p>
          </div>
        </div>
      </div>

      {/* Summary Table Grouped by Payment Method */}
      <div className="mb-6 space-y-2">
        <h2 className="border-b-2 border-slate-800 pb-1 text-sm font-bold text-slate-900 uppercase tracking-wider">
          Payment Method Summary
        </h2>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100 print:bg-slate-200 font-semibold text-slate-700">
              <th className="py-2 px-3">Payment Method</th>
              <th className="py-2 px-3 text-center">Transaction Count</th>
              <th className="py-2 px-3 text-right">Total Amount (₹)</th>
              <th className="py-2 px-3 text-right">% Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {report.by_payment_method.map((item) => (
              <tr key={item.payment_method} className="hover:bg-slate-50">
                <td className="py-2 px-3 font-semibold uppercase text-slate-800">
                  {item.payment_method}
                </td>
                <td className="py-2 px-3 text-center">{item.transaction_count}</td>
                <td className="py-2 px-3 text-right font-bold text-slate-900">
                  {currency(item.total_amount)}
                </td>
                <td className="py-2 px-3 text-right font-semibold text-slate-700">
                  {item.percentage.toFixed(2)}%
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-800 font-bold bg-slate-50 print:bg-slate-100">
              <td className="py-2.5 px-3 uppercase">Total Collected</td>
              <td className="py-2.5 px-3 text-center">{report.total_transactions}</td>
              <td className="py-2.5 px-3 text-right text-emerald-700 text-sm">{currency(report.total_collected)}</td>
              <td className="py-2.5 px-3 text-right">100.00%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Detailed Payment Transactions */}
      {report.items && report.items.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="border-b-2 border-slate-800 pb-1 text-sm font-bold text-slate-900 uppercase tracking-wider">
            Detailed Payment Records ({report.items.length})
          </h2>
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 print:bg-slate-200 font-semibold text-slate-700">
                <th className="py-1.5 px-2">Payment / Inv #</th>
                <th className="py-1.5 px-2">Service / Category</th>
                <th className="py-1.5 px-2">Date</th>
                <th className="py-1.5 px-2">Patient</th>
                <th className="py-1.5 px-2">Method</th>
                <th className="py-1.5 px-2 text-right">Inv Amt (₹)</th>
                <th className="py-1.5 px-2 text-right">Paid Amt (₹)</th>
                <th className="py-1.5 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {report.items.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2 font-mono font-medium text-slate-900">
                    {payment.payment_number}
                    {payment.invoice_number && (
                      <span className="block text-[9px] font-normal text-slate-500">
                        Inv: {payment.invoice_number}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 font-semibold text-sky-800">
                    {payment.service_category || payment.invoice_type?.toUpperCase() || "General"}
                  </td>
                  <td className="py-1.5 px-2 text-slate-700">{formatDate(payment.payment_date)}</td>
                  <td className="py-1.5 px-2 font-semibold text-slate-900">
                    {payment.patient_name || "N/A"}
                    {payment.patient_mobile && <span className="block text-[10px] font-normal text-slate-500">{payment.patient_mobile}</span>}
                  </td>
                  <td className="py-1.5 px-2 font-semibold uppercase text-slate-800">{payment.payment_method}</td>
                  <td className="py-1.5 px-2 text-right font-medium text-slate-600">
                    {currency(payment.invoice_amount ?? payment.amount)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                    {payment.amount === 0 ? "₹0 (Follow-up)" : currency(payment.amount)}
                  </td>
                  <td className="py-1.5 px-2 text-center capitalize text-slate-700">{payment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500">
        <p>This is an official computer-generated payment report.</p>
        <p className="mt-0.5">Generated on {formatDate(new Date().toISOString())}</p>
      </div>
    </div>
  );
}
