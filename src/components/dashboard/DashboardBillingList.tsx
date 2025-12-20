"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi, Payment } from "@/services/paymentsApi";
import { patientsApi } from "@/services/patientsApi";
import { getTenantIdForApi } from "@/utils/auth";
import { currency, formatDate } from "@/utils/format";
import { CreditCard, Receipt, Printer, Clock } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { PaymentCollectionModal } from "../payments/PaymentCollectionModal";
import { InvoicePrint } from "../invoices/InvoicePrint";
import { PaymentReceiptPrint } from "../payments/PaymentReceiptPrint";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { useReactToPrint } from "react-to-print";

interface DashboardBillingListProps {
  statusFilter: "pending" | "paid";
  onStatusFilterChange: (filter: "pending" | "paid") => void;
}

export function DashboardBillingList({ statusFilter, onStatusFilterChange }: DashboardBillingListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  // Print state
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string } | null>(null);
  const [shouldPrintInvoice, setShouldPrintInvoice] = useState(false);
  const [printPaymentData, setPrintPaymentData] = useState<{ payment: Payment; patientName: string; patientMobile?: string; invoiceNumber?: string } | null>(null);
  const [shouldPrintPayment, setShouldPrintPayment] = useState(false);
  const printInvoiceRef = useRef<HTMLDivElement>(null);
  const printPaymentRef = useRef<HTMLDivElement>(null);

  const handlePrintInvoice = useReactToPrint({
    contentRef: printInvoiceRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const handlePrintPayment = useReactToPrint({
    contentRef: printPaymentRef,
    documentTitle: printPaymentData ? `PaymentReceipt_${printPaymentData.payment.payment_number}` : "Payment Receipt",
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await invoicesApi.list({
        page: 1,
        page_size: 5,
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
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

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
        patientName = `${patient.first_name} ${patient.last_name || ""}`.trim();
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
    if (!invoice.payment_id) {
      toast.error("Payment ID not available for this invoice");
      return;
    }

    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId || undefined);
      
      // Fetch payment details directly using payment_id from invoice
      const payment = await paymentsApi.getById(invoice.payment_id, apiTenantId);

      // Get invoice number (we already have it from the invoice object)
      const invoiceNumber = invoice.invoice_number;

      // Get patient name and mobile (already available in invoice object)
      let patientName = invoice.patient_name || "Unknown";
      let patientMobile = invoice.patient_mobile;

      if (!invoice.patient_name || !invoice.patient_mobile) {
        const patient = await patientsApi.getById(invoice.patient_id);
        patientName = `${patient.first_name} ${patient.last_name || ""}`.trim();
        patientMobile = patient.mobile;
      }

      setPrintPaymentData({
        payment,
        patientName,
        patientMobile,
        invoiceNumber,
      });
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
      <div className="space-y-3">
        {/* Status Toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">
            Bills
          </p>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              onClick={() => onStatusFilterChange("pending")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                statusFilter === "pending"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => onStatusFilterChange("paid")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                statusFilter === "paid"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Paid
            </button>
          </div>
        </div>

        {/* Invoices List */}
        {loading ? (
          <SkeletonRow rows={3} />
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">
              No {statusFilter} invoices found
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className={`relative rounded-lg border border-slate-200 bg-white p-3 hover:border-sky-200 transition ${
                  invoice.status === "pending" ? "pr-32" : "pr-24"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`pill px-2 py-0.5 text-xs font-normal capitalize ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 truncate">{invoice.invoice_number}</p>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(invoice.invoice_date)}
                      </span>
                    </div>
                    {(invoice.patient_name || invoice.patient_mobile) && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                        {invoice.patient_name && (
                          <span className="font-medium truncate">{invoice.patient_name}</span>
                        )}
                        {invoice.patient_name && invoice.patient_mobile && <span>•</span>}
                        {invoice.patient_mobile && <span className="whitespace-nowrap">{invoice.patient_mobile}</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{currency(invoice.total_amount || 0)}</span>
                      {invoice.paid_amount > 0 && (
                        <>
                          <span>•</span>
                          <span>Paid: {currency(invoice.paid_amount)}</span>
                        </>
                      )}
                      {invoice.balance_amount !== undefined && invoice.balance_amount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600">Balance: {currency(invoice.balance_amount)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{calculateDaysSince(invoice.invoice_date)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="absolute right-2 top-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {invoice.status === "pending" && (
                      <button
                        onClick={(e) => handleCollectPaymentClick(e, invoice)}
                        className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-emerald-500 p-1.5 text-xs font-semibold text-white transition-all duration-300 hover:bg-emerald-600"
                        style={{ width: "1.75rem" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.width = "auto";
                          e.currentTarget.style.paddingLeft = "0.5rem";
                          e.currentTarget.style.paddingRight = "0.5rem";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.width = "1.75rem";
                          e.currentTarget.style.paddingLeft = "0.375rem";
                          e.currentTarget.style.paddingRight = "0.375rem";
                        }}
                        title="Collect Payment"
                      >
                        <CreditCard className="h-3.5 w-3.5 shrink-0" />
                        <span className="ml-1 hidden whitespace-nowrap group-hover:inline text-[10px]">Collect</span>
                      </button>
                    )}
                    {invoice.status === "paid" && invoice.payment_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintPaymentReceiptClick(invoice);
                        }}
                        className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-emerald-500 p-1.5 text-xs font-semibold text-white transition-all duration-300 hover:bg-emerald-600"
                        style={{ width: "1.75rem" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.width = "auto";
                          e.currentTarget.style.paddingLeft = "0.5rem";
                          e.currentTarget.style.paddingRight = "0.5rem";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.width = "1.75rem";
                          e.currentTarget.style.paddingLeft = "0.375rem";
                          e.currentTarget.style.paddingRight = "0.375rem";
                        }}
                        title="Print Receipt"
                      >
                        <Receipt className="h-3.5 w-3.5 shrink-0" />
                        <span className="ml-1 hidden whitespace-nowrap group-hover:inline text-[10px]">Receipt</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintInvoiceClick(invoice);
                      }}
                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-1.5 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                      style={{ width: "1.75rem" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.width = "auto";
                        e.currentTarget.style.paddingLeft = "0.5rem";
                        e.currentTarget.style.paddingRight = "0.5rem";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.width = "1.75rem";
                        e.currentTarget.style.paddingLeft = "0.375rem";
                        e.currentTarget.style.paddingRight = "0.375rem";
                      }}
                      title="Print Invoice"
                    >
                      <Printer className="h-3.5 w-3.5 shrink-0" />
                      <span className="ml-1 hidden whitespace-nowrap group-hover:inline text-[10px]">Print</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View All Link */}
        {invoices.length > 0 && (
          <button
            onClick={() => {
              window.location.hash = "billing";
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
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
      {printPaymentData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printPaymentRef} className="print-content">
            <PaymentReceiptPrint
              payment={printPaymentData.payment}
              patientName={printPaymentData.patientName}
              patientMobile={printPaymentData.patientMobile}
              invoiceNumber={printPaymentData.invoiceNumber}
            />
          </div>
        </div>
      )}
    </>
  );
}

