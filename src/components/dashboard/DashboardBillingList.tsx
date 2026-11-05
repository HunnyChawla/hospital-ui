"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { invoicesApi, Invoice } from "@/services/invoicesApi";

import { patientsApi, formatPatientName } from "@/services/patientsApi";
import { getTenantIdForApi } from "@/utils/auth";
import { currency, formatDate } from "@/utils/format";
import { CreditCard, Receipt, Printer, Clock } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { PaymentCollectionModal } from "../payments/PaymentCollectionModal";
import { InvoicePrint } from "../invoices/InvoicePrint";
import { InvoicePaymentReceiptPrint } from "../payments/InvoicePaymentReceiptPrint";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { useReactToPrint } from "react-to-print";
import clsx from "clsx";

interface DashboardBillingListProps {
  statusFilter: "pending" | "paid";
  onStatusFilterChange: (filter: "pending" | "paid") => void;
  colSpan?: number;
  rowSpan?: number;
  hideHeader?: boolean;
}

export function DashboardBillingList({
  statusFilter,
  onStatusFilterChange,
  colSpan = 1,
  rowSpan = 1,
  hideHeader = false,
}: DashboardBillingListProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  // Dynamic page size based on rowSpan height
  const pageSize = rowSpan === 4 ? 9 : rowSpan === 3 ? 6 : rowSpan === 2 ? 3 : 1;
  const isCompact1x = rowSpan === 1;

  // Print state
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string } | null>(null);
  const [shouldPrintInvoice, setShouldPrintInvoice] = useState(false);
  const [printPaymentInvoiceId, setPrintPaymentInvoiceId] = useState<string | null>(null);
  const [shouldPrintPayment, setShouldPrintPayment] = useState(false);
  const printInvoiceRef = useRef<HTMLDivElement>(null);
  const printPaymentRef = useRef<HTMLDivElement>(null);
  const lastFetchedFilterRef = useRef<string | null>(null);

  const handlePrintInvoice = useReactToPrint({
    contentRef: printInvoiceRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const handlePrintPayment = useReactToPrint({
    contentRef: printPaymentRef,
    documentTitle: printPaymentInvoiceId ? `PaymentReceipt_Invoice_${printPaymentInvoiceId}` : "Payment Receipt",
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await invoicesApi.list({
        page: 1,
        page_size: pageSize,
        status: statusFilter,
        tenant_id: getTenantIdForApi(tenantId),
      });
      setInvoices(response.items);
    } catch (error: any) {
      console.error("Failed to fetch invoices:", error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pageSize]);

  // Fetch invoices only when statusFilter actually changes
  useEffect(() => {
    // Only fetch if the filter has changed from the last fetch
    if (lastFetchedFilterRef.current !== statusFilter) {
      fetchInvoices();
      lastFetchedFilterRef.current = statusFilter;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (printInvoiceData && shouldPrintInvoice && printInvoiceRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintInvoice();
        setShouldPrintInvoice(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printInvoiceData, shouldPrintInvoice, handlePrintInvoice]);

  useEffect(() => {
    if (shouldPrintPayment && printPaymentRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintPayment();
        setShouldPrintPayment(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintPayment, handlePrintPayment]);

  const handleCollectPaymentClick = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    setSelectedInvoiceForPayment(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    fetchInvoices();
  };

  const handlePrintInvoiceClick = async (invoice: Invoice) => {
    try {
      // Fetch full invoice details with line items
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const fullInvoice = await invoicesApi.getById(invoice.id, getTenantIdForApi(tenantId));

      // Use patient_name and patient_mobile from invoice if available, otherwise fetch
      let patientName = fullInvoice.patient_name || "Unknown";
      let patientMobile = fullInvoice.patient_mobile;

      if (!fullInvoice.patient_name || !fullInvoice.patient_mobile) {
        const patient = await patientsApi.getById(fullInvoice.patient_id);
        patientName = formatPatientName(patient);
        patientMobile = patient.mobile;
      }

      setPrintInvoiceData({
        invoice: fullInvoice,
        patientName,
        patientMobile,
      });
      setShouldPrintInvoice(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare invoice for printing");
    }
  };

  const handlePrintPaymentReceiptClick = async (invoice: Invoice) => {
    if (!invoice.id) {
      toast.error("Invoice ID not available");
      return;
    }

    try {
      setPrintPaymentInvoiceId(invoice.id);
      setShouldPrintPayment(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare payment receipt for printing");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-50 text-emerald-700";
      case "partial":
        return "bg-amber-50 text-amber-700";
      case "pending":
        return "bg-amber-50 text-amber-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const calculateDaysSince = (invoiceDate: string) => {
    if (!invoiceDate) return "N/A";
    const date = new Date(invoiceDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day";
    return `${diffDays} days`;
  };

  return (
    <>
      <div className="flex h-full flex-col justify-between space-y-2">
        {!hideHeader && (
          <div className="flex items-center justify-between shrink-0">
            <p className="text-sm font-semibold text-slate-900">
              Bills
            </p>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                onClick={() => onStatusFilterChange("pending")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${statusFilter === "pending"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                Pending
              </button>
              <button
                onClick={() => onStatusFilterChange("paid")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${statusFilter === "paid"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                Paid
              </button>
            </div>
          </div>
        )}

        {/* Invoices List */}
        <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
          {loading ? (
            <SkeletonRow rows={isCompact1x ? 1 : 3} />
          ) : invoices.length === 0 ? (
            isCompact1x ? (
              <div className="flex h-full items-center justify-center text-center p-2">
                <p className="text-xs text-slate-400">No {statusFilter} invoices recorded.</p>
              </div>
            ) : (
              <EmptyStateCard
                icon={Receipt}
                title={`No ${statusFilter} invoices`}
                description={
                  statusFilter === "pending"
                    ? "All clear! There are no pending or unpaid invoices at this time."
                    : "No settled invoices recorded for this period."
                }
                action={{
                  label: "Manage Invoices",
                  onClick: () => router.push("/billing"),
                }}
                tone="amber"
                size="sm"
              />
            )
          ) : isCompact1x ? (
            /* Dedicated 1x Height Compact View (Guaranteed No Scrollbar) */
            <div className="flex h-full flex-col justify-center">
              {invoices.slice(0, 1).map((invoice) => {
                const balance = invoice.balance_amount !== undefined && invoice.balance_amount > 0
                  ? invoice.balance_amount
                  : invoice.total_amount || 0;

                return (
                  <div
                    key={invoice.id}
                    onClick={() => router.push("/billing")}
                    className="group rounded-xl border border-slate-200/90 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/20 via-white to-white p-2.5 transition-all hover:border-amber-300 hover:shadow-2xs cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100/80 text-amber-800 font-bold text-xs shadow-2xs font-mono">
                          ₹
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {invoice.patient_name || invoice.patient_mobile || "Patient"}
                            </p>
                            <span className="font-mono text-[10px] text-slate-400 truncate">
                              #{invoice.invoice_number.slice(-8)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {formatDate(invoice.invoice_date)} • {calculateDaysSince(invoice.invoice_date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="font-mono text-xs font-bold text-slate-900">
                            {currency(invoice.status === "pending" ? balance : invoice.total_amount || 0)}
                          </p>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider ${
                            invoice.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {invoice.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {invoice.status === "pending" && (
                            <button
                              onClick={(e) => handleCollectPaymentClick(e, invoice)}
                              className="flex h-7 px-2 items-center justify-center gap-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs text-[11px] font-semibold cursor-pointer active:scale-95"
                              title="Collect Payment"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Collect</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (invoice.status === "paid") handlePrintPaymentReceiptClick(invoice);
                              else handlePrintInvoiceClick(invoice);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-sky-600 hover:bg-sky-50 hover:border-sky-200 transition shadow-2xs cursor-pointer"
                            title="Print"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Multi-row 2x, 3x, 4x Mode with Modern Financial Ledger Cards */
            <div className="space-y-2">
              {invoices.map((invoice) => {
                const isPaid = invoice.status === "paid";
                const balance = invoice.balance_amount !== undefined && invoice.balance_amount > 0
                  ? invoice.balance_amount
                  : invoice.total_amount || 0;
                const hasPartial = invoice.paid_amount > 0 && !isPaid;
                const isNarrow = (colSpan || 1) === 1;

                return (
                  <div
                    key={invoice.id}
                    onClick={() => router.push("/billing")}
                    className={clsx(
                      "group relative rounded-xl border border-slate-200/90 bg-white p-3 transition-all duration-200 hover:shadow-xs hover:border-slate-300 cursor-pointer border-l-4",
                      isPaid ? "border-l-emerald-500" : "border-l-amber-500"
                    )}
                  >
                    <div
                      className={clsx(
                        "flex justify-between gap-3",
                        isNarrow ? "flex-col" : "flex-col sm:flex-row sm:items-center"
                      )}
                    >
                      {/* Left Block: Invoice & Patient Identity */}
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar / Receipt Stamp */}
                        <div
                          className={clsx(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold font-mono shadow-2xs transition-transform group-hover:scale-105",
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          )}
                        >
                          <Receipt className="h-4 w-4" />
                        </div>

                        {/* Text info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 tracking-tight">
                              {invoice.invoice_number}
                            </span>
                            <span
                              className={clsx(
                                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              )}
                            >
                              {invoice.status}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                              <Clock className="h-3 w-3" />
                              <span>{calculateDaysSince(invoice.invoice_date)}</span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mt-1">
                            <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                              {invoice.patient_name || "Patient"}
                            </span>
                            {invoice.patient_mobile && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500 font-mono text-[11px]">
                                  {invoice.patient_mobile}
                                </span>
                              </>
                            )}
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400 text-[11px]">
                              {formatDate(invoice.invoice_date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Amount & Action Buttons */}
                      <div
                        className={clsx(
                          "flex items-center justify-between gap-3 shrink-0",
                          isNarrow ? "pt-2 border-t border-slate-100" : "sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100"
                        )}
                      >
                        {/* Financial Figures */}
                        <div className={clsx(isNarrow ? "text-left" : "text-left sm:text-right")}>
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                            {isPaid ? "Paid Amount" : "Balance Due"}
                          </p>
                          <p className="font-mono text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                            {currency(isPaid ? invoice.paid_amount || invoice.total_amount : balance)}
                          </p>
                          {hasPartial && (
                            <p className="text-[10px] text-emerald-600 font-medium">
                              Paid: {currency(invoice.paid_amount)} of {currency(invoice.total_amount)}
                            </p>
                          )}
                          {!hasPartial && !isPaid && (
                            <p className="text-[10px] text-slate-400">
                              Total: {currency(invoice.total_amount)}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {!isPaid && (
                            <button
                              onClick={(e) => handleCollectPaymentClick(e, invoice)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                              title="Collect Payment"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Collect</span>
                            </button>
                          )}

                          {isPaid && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintPaymentReceiptClick(invoice);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 shadow-2xs transition-all cursor-pointer"
                              title="Print Receipt"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Receipt</span>
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintInvoiceClick(invoice);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-sky-600 hover:bg-sky-50 hover:border-sky-200 shadow-2xs transition-all cursor-pointer"
                            title="Print Invoice"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View All Link (only for rowSpan >= 2) */}
        {!isCompact1x && invoices.length > 0 && (
          <button
            onClick={() => {
              router.push("/billing");
            }}
            className="w-full mt-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 shrink-0"
          >
            View all {statusFilter} invoices →
          </button>
        )}
      </div>

      {/* Payment Collection Modal */}
      <PaymentCollectionModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoiceForPayment(null);
        }}
        invoice={selectedInvoiceForPayment}
        onSuccess={handlePaymentSuccess}
      />

      {/* Print Invoice (Hidden) */}
      {printInvoiceData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printInvoiceRef} className="print-content">
            <InvoicePrint
              invoice={printInvoiceData.invoice}
              patientName={printInvoiceData.patientName}
              patientMobile={printInvoiceData.patientMobile}
            />
          </div>
        </div>
      )}

      {/* Print Payment Receipt (Hidden) */}
      {printPaymentInvoiceId && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printPaymentRef} className="print-content">
            <InvoicePaymentReceiptPrint invoiceId={printPaymentInvoiceId} />
          </div>
        </div>
      )}
    </>
  );
}

