"use client";

import { useEffect, useState, useCallback } from "react";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi, Payment } from "@/services/paymentsApi";
import { patientsApi } from "@/services/patientsApi";
import { getTenantIdForApi } from "@/utils/auth";
import { currency, formatDate } from "@/utils/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { Modal } from "@/components/common/Modal";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import {
  CreditCard,
  Receipt,
  Search,
  User,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
} from "lucide-react";

type ActiveTab = "invoices" | "payments";

export function BillingManagement() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("invoices");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesPageSize] = useState(10);
  const [invoicesTotalPages, setInvoicesTotalPages] = useState(1);
  const [invoicesTotal, setInvoicesTotal] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPageSize] = useState(10);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentDetail, setShowPaymentDetail] = useState(false);

  // Print state
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string } | null>(null);
  const [shouldPrintInvoice, setShouldPrintInvoice] = useState(false);
  const printInvoiceRef = useRef<HTMLDivElement>(null);

  const handlePrintInvoice = useReactToPrint({
    contentRef: printInvoiceRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  useEffect(() => {
    if (printInvoiceData && shouldPrintInvoice && printInvoiceRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintInvoice();
        setShouldPrintInvoice(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printInvoiceData, shouldPrintInvoice, handlePrintInvoice]);

  // Patient search
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await patientsApi.searchGlobal({ q: searchTerm.trim(), page_size: 5 });
        const patients = patientsApi.mapToPatients(response.items);
        setSearchResults(patients);
        setShowDropdown(true);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await invoicesApi.list({
        page: invoicesPage,
        page_size: invoicesPageSize,
        patient_id: selectedPatientId || undefined,
        status: "pending",
        tenant_id: getTenantIdForApi(tenantId),
      });
      setInvoices(response.items);
      setInvoicesTotalPages(response.total_pages);
      setInvoicesTotal(response.total);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoices");
    } finally {
      setInvoicesLoading(false);
    }
  }, [selectedPatientId, invoicesPage, invoicesPageSize]);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await paymentsApi.list({
        page: paymentsPage,
        page_size: paymentsPageSize,
        patient_id: selectedPatientId || undefined,
        sort_by: "created_at",
        sort_order: "desc",
        tenant_id: getTenantIdForApi(tenantId),
      });
      setPayments(response.items);
      setPaymentsTotalPages(response.total_pages);
      setPaymentsTotal(response.total);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch payments");
    } finally {
      setPaymentsLoading(false);
    }
  }, [selectedPatientId, paymentsPage, paymentsPageSize]);

  useEffect(() => {
    if (activeTab === "invoices") {
      fetchInvoices();
    } else {
      fetchPayments();
    }
  }, [activeTab, fetchInvoices, fetchPayments]);

  // Reset pages when switching tabs or patient filter
  useEffect(() => {
    setInvoicesPage(1);
    setPaymentsPage(1);
  }, [activeTab, selectedPatientId]);

  const handlePatientSelect = (patient: any) => {
    setSelectedPatientId(patient.id);
    setSearchTerm(patient.name);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleClearPatient = () => {
    setSelectedPatientId("");
    setSearchTerm("");
    setShowDropdown(false);
    setSearchResults([]);
    setInvoicesPage(1);
    setPaymentsPage(1);
  };

  const handleInvoiceClick = async (invoiceId: string) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const invoice = await invoicesApi.getById(invoiceId, getTenantIdForApi(tenantId));
      setSelectedInvoice(invoice);
      setShowInvoiceDetail(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoice details");
    }
  };

  const handlePaymentClick = async (paymentId: string) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const payment = await paymentsApi.getById(paymentId, getTenantIdForApi(tenantId));
      setSelectedPayment(payment);
      setShowPaymentDetail(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch payment details");
    }
  };

  const handlePrintInvoiceClick = async (invoice: Invoice) => {
    try {
      // Use patient_name and patient_mobile from invoice if available, otherwise fetch
      let patientName = invoice.patient_name || "Unknown";
      let patientMobile = invoice.patient_mobile;
      
      if (!invoice.patient_name || !invoice.patient_mobile) {
        const patient = await patientsApi.getById(invoice.patient_id);
        patientName = `${patient.first_name} ${patient.last_name || ""}`.trim();
        patientMobile = patient.mobile;
      }
      
      setPrintInvoiceData({
        invoice,
        patientName,
        patientMobile,
      });
      setShouldPrintInvoice(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare invoice for printing");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return "bg-emerald-50 text-emerald-700";
      case "partial":
        return "bg-amber-50 text-amber-700";
      case "cancelled":
      case "failed":
        return "bg-rose-50 text-rose-700";
      case "pending":
        return "bg-amber-50 text-amber-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const selectedPatient = searchResults.find((p) => p.id === selectedPatientId) || 
    (searchTerm && selectedPatientId ? { name: searchTerm } : null);

  return (
    <div className="space-y-4">
      {/* Patient Search */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!e.target.value.trim()) {
                handleClearPatient();
              }
            }}
            placeholder="Search patient by name, mobile, or Health ID (leave empty to show all)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {selectedPatientId && (
            <button
              onClick={handleClearPatient}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              title="Clear filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {showDropdown && (isSearching || searchResults.length > 0) && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl">
            {isSearching ? (
              <div className="p-3 text-center text-sm text-slate-500">Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{patient.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span>{patient.mobile}</span>
                        <span>•</span>
                        <span>{patient.healthId}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-sm text-slate-500">No patients found</div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("invoices")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition ${
                activeTab === "invoices"
                  ? "border-sky-500 text-sky-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Invoices
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition ${
                activeTab === "payments"
                  ? "border-sky-500 text-sky-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Receipt className="h-4 w-4" />
              Payment Receipts
            </button>
          </div>

          {/* Invoices Tab */}
          {activeTab === "invoices" && (
            <div className="space-y-4">
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-slate-500">Loading invoices...</div>
                </div>
              ) : invoices.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <p className="text-sm text-slate-500">
                    {selectedPatientId ? "No pending invoices found for this patient" : "No pending invoices found"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="relative rounded-xl border border-slate-200 bg-white p-4 pr-32 hover:border-sky-200 transition cursor-pointer"
                        onClick={() => handleInvoiceClick(invoice.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`pill px-3 py-1 text-xs font-normal capitalize ${getStatusColor(invoice.status)}`}>
                                {invoice.status}
                              </span>
                              <p className="text-sm font-semibold text-slate-900">{invoice.invoice_number}</p>
                              <span className="pill px-2 py-0.5 text-xs font-normal">
                                {formatDate(invoice.invoice_date)}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">{currency(invoice.total_amount || 0)}</span>
                              {invoice.paid_amount > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Paid: {currency(invoice.paid_amount)}</span>
                                </>
                              )}
                              {invoice.balance_amount > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-600">Balance: {currency(invoice.balance_amount)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="absolute right-4 top-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handlePrintInvoiceClick(invoice)}
                              className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                              style={{ width: "2rem" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.width = "auto";
                                e.currentTarget.style.paddingLeft = "0.75rem";
                                e.currentTarget.style.paddingRight = "0.75rem";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.width = "2rem";
                                e.currentTarget.style.paddingLeft = "0.5rem";
                                e.currentTarget.style.paddingRight = "0.5rem";
                              }}
                              title="Print Invoice"
                            >
                              <Printer className="h-4 w-4 shrink-0" />
                              <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Print</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {invoicesTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                      <div className="text-sm text-slate-500">
                        Page {invoicesPage} of {invoicesTotalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setInvoicesPage((p) => Math.max(1, p - 1))}
                          disabled={invoicesPage === 1}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </button>
                        <button
                          onClick={() => setInvoicesPage((p) => Math.min(invoicesTotalPages, p + 1))}
                          disabled={invoicesPage === invoicesTotalPages}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-slate-500">Loading payments...</div>
                </div>
              ) : payments.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <p className="text-sm text-slate-500">
                    {selectedPatientId ? "No payment receipts found for this patient" : "No payment receipts found"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="relative rounded-xl border border-slate-200 bg-white p-4 pr-32 hover:border-sky-200 transition cursor-pointer"
                        onClick={() => handlePaymentClick(payment.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`pill px-3 py-1 text-xs font-normal capitalize ${getStatusColor(payment.status)}`}>
                                {payment.status}
                              </span>
                              <p className="text-sm font-semibold text-slate-900">{payment.payment_number}</p>
                              <span className="pill px-2 py-0.5 text-xs font-normal">
                                {formatDate(payment.payment_date)}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">{currency(payment.amount)}</span>
                              <span>•</span>
                              <span>{getPaymentMethodLabel(payment.payment_method)}</span>
                              {payment.notes && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-xs">{payment.notes}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="absolute right-4 top-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handlePaymentClick(payment.id)}
                              className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                              style={{ width: "2rem" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.width = "auto";
                                e.currentTarget.style.paddingLeft = "0.75rem";
                                e.currentTarget.style.paddingRight = "0.75rem";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.width = "2rem";
                                e.currentTarget.style.paddingLeft = "0.5rem";
                                e.currentTarget.style.paddingRight = "0.5rem";
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4 shrink-0" />
                              <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">View</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {paymentsTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                      <div className="text-sm text-slate-500">
                        Page {paymentsPage} of {paymentsTotalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                          disabled={paymentsPage === 1}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </button>
                        <button
                          onClick={() => setPaymentsPage((p) => Math.min(paymentsTotalPages, p + 1))}
                          disabled={paymentsPage === paymentsTotalPages}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={showInvoiceDetail}
        onClose={() => {
          setShowInvoiceDetail(false);
          setSelectedInvoice(null);
        }}
        title="Invoice Details"
        size="xl"
      >
        {selectedInvoice && (
          <div className="space-y-2.5 -mx-6 -mb-6 px-6 pb-6">
            {/* Patient Information */}
            {selectedInvoice.patient_name && (
              <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-sky-50 to-sky-50/50 p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-sm">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Patient</p>
                      <p className="text-sm font-bold text-slate-900">{selectedInvoice.patient_name}</p>
                    </div>
                  </div>
                  {selectedInvoice.patient_mobile && (
                    <div className="text-xs text-slate-600">
                      <span className="font-medium">{selectedInvoice.patient_mobile}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invoice Header - Compact Grid */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Invoice #</p>
                <p className="text-sm font-bold text-slate-900 truncate">{selectedInvoice.invoice_number}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Date</p>
                <p className="text-sm font-bold text-slate-900">{formatDate(selectedInvoice.invoice_date)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(selectedInvoice.status)}`}>
                  {selectedInvoice.status}
                </span>
              </div>
              <div className="rounded-lg border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-teal-50/30 p-2.5 shadow-sm">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Total</p>
                <p className="text-base font-bold text-sky-700">{currency(selectedInvoice.total_amount)}</p>
              </div>
            </div>

            {/* Line Items Table - Compact */}
            {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
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
                      {selectedInvoice.line_items.map((item, index) => {
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
            {selectedInvoice.subtotal !== undefined && (
              <div className="rounded-lg border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50/30 p-3 shadow-sm">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-600">Subtotal</span>
                    <span className="text-xs font-semibold text-slate-900">{currency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.tax_rate > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">Tax ({selectedInvoice.tax_rate}%)</span>
                      <span className="text-xs font-semibold text-slate-900">{currency(selectedInvoice.tax_amount)}</span>
                    </div>
                  )}
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">Discount</span>
                      <span className="text-xs font-bold text-emerald-600">-{currency(selectedInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-300 pt-1.5 mt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-900">Total Amount</span>
                      <span className="text-base font-bold text-slate-900">{currency(selectedInvoice.total_amount)}</span>
                    </div>
                  </div>
                  {selectedInvoice.paid_amount > 0 && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <span className="text-xs font-medium text-slate-600">Paid</span>
                      <span className="text-xs font-bold text-emerald-600">{currency(selectedInvoice.paid_amount)}</span>
                    </div>
                  )}
                  {selectedInvoice.balance_amount !== undefined && selectedInvoice.balance_amount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">Balance</span>
                      <span className="text-xs font-bold text-amber-600">{currency(selectedInvoice.balance_amount)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes - Compact */}
            {selectedInvoice.notes && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">Notes</p>
                <p className="text-xs text-slate-700 leading-relaxed">{selectedInvoice.notes}</p>
              </div>
            )}
            {/* Actions - Compact */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowInvoiceDetail(false);
                  setSelectedInvoice(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (selectedInvoice) {
                    handlePrintInvoiceClick(selectedInvoice);
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Detail Modal */}
      <Modal
        isOpen={showPaymentDetail}
        onClose={() => {
          setShowPaymentDetail(false);
          setSelectedPayment(null);
        }}
        title="Payment Receipt Details"
        size="md"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Payment Number</p>
                <p className="text-sm font-semibold text-slate-900">{selectedPayment.payment_number}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Payment Date</p>
                <p className="text-sm font-semibold text-slate-900">{formatDate(selectedPayment.payment_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Amount</p>
                <p className="text-sm font-semibold text-slate-900">{currency(selectedPayment.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Payment Method</p>
                <p className="text-sm font-semibold text-slate-900">{getPaymentMethodLabel(selectedPayment.payment_method)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <span className={`pill px-2 py-0.5 text-xs font-normal capitalize ${getStatusColor(selectedPayment.status)}`}>
                  {selectedPayment.status}
                </span>
              </div>
              {selectedPayment.payment_reference && (
                <div>
                  <p className="text-xs text-slate-500">Reference</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedPayment.payment_reference}</p>
                </div>
              )}
            </div>
            {selectedPayment.notes && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-900">{selectedPayment.notes}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => {
                  setShowPaymentDetail(false);
                  setSelectedPayment(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

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
    </div>
  );
}
