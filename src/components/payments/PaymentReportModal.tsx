"use client";

import { useEffect, useState, useRef } from "react";
import { Modal } from "@/components/common/Modal";
import { paymentsApi, PaymentReportSummaryResponse, PaymentMethodSummaryItem } from "@/services/paymentsApi";
import { currency, formatDate } from "@/utils/format";
import { getErrorMessage } from "@/utils/errorHandler";
import { toast } from "sonner";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import {
  CreditCard,
  Calendar,
  Download,
  Printer,
  DollarSign,
  TrendingUp,
  FileText,
  Filter,
  CheckCircle2,
  Wallet,
  QrCode,
  Building,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { PaymentReportPrint } from "./PaymentReportPrint";

interface PaymentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DatePreset = "today" | "yesterday" | "week" | "month" | "custom";

export function PaymentReportModal({ isOpen, onClose }: PaymentReportModalProps) {
  const [report, setReport] = useState<PaymentReportSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string>("all");

  // Print ref
  const printComponentRef = useRef<HTMLDivElement>(null);
  const handlePrintPdf = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Payment_Report_${new Date().toISOString().split("T")[0]}`,
  });

  const getDateRange = () => {
    const today = new Date();
    let start_date: string | undefined;
    let end_date: string | undefined;

    switch (datePreset) {
      case "today":
        start_date = today.toISOString().split("T")[0];
        end_date = start_date;
        break;
      case "yesterday": {
        const yest = new Date(today);
        yest.setDate(today.getDate() - 1);
        start_date = yest.toISOString().split("T")[0];
        end_date = start_date;
        break;
      }
      case "week": {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        start_date = weekAgo.toISOString().split("T")[0];
        end_date = today.toISOString().split("T")[0];
        break;
      }
      case "month": {
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        start_date = monthAgo.toISOString().split("T")[0];
        end_date = today.toISOString().split("T")[0];
        break;
      }
      case "custom":
        if (customStartDate && customEndDate) {
          start_date = customStartDate;
          end_date = customEndDate;
        }
        break;
    }

    return { start_date, end_date };
  };

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const { start_date, end_date } = getDateRange();
      const response = await paymentsApi.getPaymentMethodReport({
        start_date,
        end_date,
        payment_method: selectedMethod === "all" ? undefined : selectedMethod,
      });
      setReport(response);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg || "Failed to load payment report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, datePreset, customStartDate, customEndDate, selectedMethod]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const { start_date, end_date } = getDateRange();
      const blob = await paymentsApi.downloadPaymentReportCsv({
        start_date,
        end_date,
        payment_method: selectedMethod === "all" ? undefined : selectedMethod,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payment_report_${start_date || "all"}_to_${end_date || "all"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV Report downloaded successfully");
    } catch (err) {
      toast.error("Failed to export CSV report");
    } finally {
      setExporting(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "cash":
        return <Wallet className="h-5 w-5 text-emerald-600" />;
      case "upi":
        return <QrCode className="h-5 w-5 text-sky-600" />;
      case "card":
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      case "cheque":
        return <Building className="h-5 w-5 text-amber-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-slate-600" />;
    }
  };

  const getMethodBg = (method: string) => {
    switch (method.toLowerCase()) {
      case "cash":
        return "bg-emerald-50 border-emerald-200 text-emerald-900";
      case "upi":
        return "bg-sky-50 border-sky-200 text-sky-900";
      case "card":
        return "bg-purple-50 border-purple-200 text-purple-900";
      case "cheque":
        return "bg-amber-50 border-amber-200 text-amber-900";
      default:
        return "bg-slate-50 border-slate-200 text-slate-900";
    }
  };

  const getMethodBarColor = (method: string) => {
    switch (method.toLowerCase()) {
      case "cash":
        return "bg-emerald-500";
      case "upi":
        return "bg-sky-500";
      case "card":
        return "bg-purple-500";
      case "cheque":
        return "bg-amber-500";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Method Breakdown & Report"
      size="2xl"
    >
      <div className="space-y-5">
        {/* Printable Component for PDF Export (Hidden off-screen) */}
        {report && (
          <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
            <div ref={printComponentRef} className="print-content">
              <PaymentReportPrint
                report={report}
                startDate={getDateRange().start_date}
                endDate={getDateRange().end_date}
              />
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
          {/* Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "Last 7 Days" },
              { id: "month", label: "Last 30 Days" },
              { id: "custom", label: "Custom" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id as DatePreset)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  datePreset === p.id
                    ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Method:</label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-sky-500"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash Only</option>
              <option value="upi">UPI Only</option>
              <option value="card">Card Only</option>
              <option value="cheque">Cheque Only</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {datePreset === "custom" && (
          <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-600">From Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-600">To Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}

        {/* Action Header: Print PDF & Export CSV */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Collected</p>
            <p className="text-2xl font-bold text-emerald-600">
              {loading ? "..." : currency(report?.total_collected || 0)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrintPdf()}
              disabled={loading || !report || report.total_transactions === 0}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>Print PDF Report</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={loading || exporting || !report || report.total_transactions === 0}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>{exporting ? "Exporting..." : "Export CSV"}</span>
            </button>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="py-6">
            <SkeletonRow rows={5} />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : !report || report.by_payment_method.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-900">No payment records found</p>
            <p className="mt-1 text-xs text-slate-500">
              No payments match your selected date range or payment method.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Visual Breakdown Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Payment Method Distribution</span>
                <span>{report.total_transactions} Total Transactions</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {report.by_payment_method.map((item) => (
                  <div
                    key={item.payment_method}
                    className={`${getMethodBarColor(item.payment_method)} transition-all`}
                    style={{ width: `${Math.max(item.percentage, 2)}%` }}
                    title={`${item.payment_method.toUpperCase()}: ${currency(item.total_amount)} (${item.percentage.toFixed(1)}%)`}
                  />
                ))}
              </div>
            </div>

            {/* Payment Method KPI Cards Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {report.by_payment_method.map((item) => (
                <div
                  key={item.payment_method}
                  className={`rounded-xl border p-3.5 shadow-sm transition hover:shadow ${getMethodBg(
                    item.payment_method
                  )}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {item.payment_method}
                    </span>
                    {getMethodIcon(item.payment_method)}
                  </div>
                  <p className="mt-2 text-xl font-extrabold">{currency(item.total_amount)}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] opacity-80">
                    <span>{item.transaction_count} txns</span>
                    <span className="font-bold">{item.percentage.toFixed(1)}% share</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Transaction List Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Payment Transactions ({report.items.length})
              </h4>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-slate-100 font-semibold text-slate-700">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2 text-left">Payment / Invoice #</th>
                      <th className="px-3 py-2 text-left">Service / Category</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Patient</th>
                      <th className="px-3 py-2 text-center">Method</th>
                      <th className="px-3 py-2 text-right">Inv Amount</th>
                      <th className="px-3 py-2 text-right">Paid Amount</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {report.items.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-semibold text-slate-900">
                          {payment.payment_number}
                          {payment.invoice_number && (
                            <span className="block text-[10px] font-normal text-slate-500">
                              Inv: {payment.invoice_number}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 border border-sky-100">
                            {payment.service_category || payment.invoice_type?.toUpperCase() || "General"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {formatDate(payment.payment_date)}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {payment.patient_name || "Unknown"}
                          {payment.patient_mobile && (
                            <span className="block text-[10px] text-slate-400">
                              {payment.patient_mobile}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-bold uppercase text-slate-800">
                          {payment.payment_method}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-600">
                          {currency(payment.invoice_amount ?? payment.amount)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          {payment.amount === 0 ? (
                            <span className="inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              ₹0 (Free / Follow-up)
                            </span>
                          ) : (
                            currency(payment.amount)
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              payment.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
