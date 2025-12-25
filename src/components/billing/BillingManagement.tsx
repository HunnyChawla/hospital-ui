"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi } from "@/services/paymentsApi";
import { patientsApi } from "@/services/patientsApi";
import { getTenantIdForApi } from "@/utils/auth";
import { currency, formatDate } from "@/utils/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { InvoicePaymentReceiptPrint } from "@/components/payments/InvoicePaymentReceiptPrint";
import { Modal } from "@/components/common/Modal";
import { PaymentCollectionModal } from "@/components/payments/PaymentCollectionModal";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import {
  Search,
  User,
  Printer,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Receipt,
  Clock,
} from "lucide-react";

interface BillingManagementProps {
  renderSearchInHeader?: (searchBox: React.ReactNode) => void;
  renderFilterInHeader?: (filterToggle: React.ReactNode) => void;
  statusFilter: "all" | "pending" | "paid" | "partial" | "refunded";
  onStatusFilterChange: (filter: "all" | "pending" | "paid" | "partial" | "refunded") => void;
}

export function BillingManagement({ 
  renderSearchInHeader, 
  renderFilterInHeader,
  statusFilter,
  onStatusFilterChange
}: BillingManagementProps) {
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

  // Payment collection state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  // Print state
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string } | null>(null);
  const [shouldPrintInvoice, setShouldPrintInvoice] = useState(false);
  const [printPaymentInvoiceId, setPrintPaymentInvoiceId] = useState<string | null>(null);
  const [shouldPrintPayment, setShouldPrintPayment] = useState(false);
  const printInvoiceRef = useRef<HTMLDivElement>(null);
  const printPaymentRef = useRef<HTMLDivElement>(null);

  const handlePrintInvoice = useReactToPrint({
    contentRef: printInvoiceRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const handlePrintPayment = useReactToPrint({
    contentRef: printPaymentRef,
    documentTitle: printPaymentInvoiceId ? `PaymentReceipt_Invoice_${printPaymentInvoiceId}` : "Payment Receipt",
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

  useEffect(() => {
    if (shouldPrintPayment && printPaymentRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintPayment();
        setShouldPrintPayment(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldPrintPayment, handlePrintPayment]);

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
        status: statusFilter === "all" ? undefined : statusFilter,
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
  }, [selectedPatientId, invoicesPage, invoicesPageSize, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Reset page when filter changes
  useEffect(() => {
    setInvoicesPage(1);
  }, [statusFilter, selectedPatientId]);

  const handlePatientSelect = useCallback((patient: any) => {
    setSelectedPatientId(patient.id);
    setSearchTerm(patient.name);
    setShowDropdown(false);
    setSearchResults([]);
  }, []);

  const handleClearPatient = useCallback(() => {
    setSelectedPatientId("");
    setSearchTerm("");
    setShowDropdown(false);
    setSearchResults([]);
    setInvoicesPage(1);
  }, []);

  const handleCollectPaymentClick = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation(); // Prevent row click
    setSelectedInvoiceForPayment(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    fetchInvoices(); // Refresh invoice list after payment
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
      case "completed":
        return "bg-emerald-50 text-emerald-700";
      case "partial":
        return "bg-amber-50 text-amber-700";
      case "refunded":
        return "bg-rose-50 text-rose-700";
      case "cancelled":
      case "failed":
        return "bg-rose-50 text-rose-700";
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


  const selectedPatient = searchResults.find((p) => p.id === selectedPatientId) || 
    (searchTerm && selectedPatientId ? { name: searchTerm } : null);

  // Search box component to be used in header - memoized to prevent infinite re-renders
  const searchBox = useMemo(() => (
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
          placeholder="Search patient..."
          className="w-56 bg-transparent text-sm outline-none placeholder:text-slate-400"
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
        <div className="absolute right-0 top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl">
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
  ), [searchTerm, selectedPatientId, showDropdown, isSearching, searchResults, handleClearPatient, handlePatientSelect]);

  // Status filter toggle component
  const filterToggle = useMemo(() => (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
      <button
        onClick={() => onStatusFilterChange("all")}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
          statusFilter === "all"
            ? "bg-sky-500 text-white shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        }`}
      >
        All
      </button>
      <button
        onClick={() => onStatusFilterChange("pending")}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
          statusFilter === "pending"
            ? "bg-sky-500 text-white shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        }`}
      >
        Pending
      </button>
      <button
        onClick={() => onStatusFilterChange("paid")}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
          statusFilter === "paid"
            ? "bg-sky-500 text-white shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        }`}
      >
        Paid
      </button>
      <button
        onClick={() => onStatusFilterChange("partial")}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
          statusFilter === "partial"
            ? "bg-sky-500 text-white shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        }`}
      >
        Partial
      </button>
      <button
        onClick={() => onStatusFilterChange("refunded")}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
          statusFilter === "refunded"
            ? "bg-sky-500 text-white shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        }`}
      >
        Refunded
      </button>
    </div>
  ), [statusFilter, onStatusFilterChange]);

  // Use useEffect to pass searchBox and filterToggle to parent when render callbacks are provided
  useEffect(() => {
    if (renderSearchInHeader) {
      renderSearchInHeader(searchBox);
    }
  }, [renderSearchInHeader, searchBox]);

  useEffect(() => {
    if (renderFilterInHeader) {
      renderFilterInHeader(filterToggle);
    }
  }, [renderFilterInHeader, filterToggle, statusFilter, onStatusFilterChange]);

  return (
    <div className="space-y-3">
      {(!renderSearchInHeader || !renderFilterInHeader) && (
        <div className="flex items-center justify-between gap-3">
          {!renderSearchInHeader && (
            <div className="relative flex-1">
              {searchBox}
            </div>
          )}
          {!renderFilterInHeader && filterToggle}
        </div>
      )}

      {/* Invoices List */}
      <div className="space-y-2">
        {invoicesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-slate-500">Loading invoices...</div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              {selectedPatientId 
                ? `No ${statusFilter === "all" ? "" : statusFilter} invoices found for this patient`
                : `No ${statusFilter === "all" ? "" : statusFilter} invoices found`}
            </p>
          </div>
        ) : (
                <>
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className={`relative rounded-lg border border-slate-200 bg-white p-3 hover:border-sky-200 transition cursor-pointer ${
                          invoice.status === "pending" ? "pr-48" : invoice.status === "paid" ? "pr-48" : "pr-32"
                        }`}
                        onClick={() => handleInvoiceClick(invoice.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`pill px-2 py-0.5 text-xs font-normal capitalize ${getStatusColor(invoice.status)}`}>
                                {invoice.status}
                              </span>
                              <p className="text-sm font-semibold text-slate-900">{invoice.invoice_number}</p>
                              <span className="text-xs text-slate-500">
                                {formatDate(invoice.invoice_date)}
                              </span>
                            </div>
                            {(invoice.patient_name || invoice.patient_mobile) && (
                              <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                                {invoice.patient_name && (
                                  <span className="font-medium">{invoice.patient_name}</span>
                                )}
                                {invoice.patient_name && invoice.patient_mobile && (
                                  <span>•</span>
                                )}
                                {invoice.patient_mobile && (
                                  <span>{invoice.patient_mobile}</span>
                                )}
                              </div>
                            )}
                            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
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
                          <div className="absolute right-3 top-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {invoice.status === "pending" && (
                              <button
                                onClick={(e) => handleCollectPaymentClick(e, invoice)}
                                className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-emerald-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-emerald-600"
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
                                title="Collect Payment"
                              >
                                <CreditCard className="h-4 w-4 shrink-0" />
                                <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Collect</span>
                              </button>
                            )}
                            {invoice.status === "paid" && (
                              <button
                                onClick={(e) => handlePrintPaymentReceiptClick(invoice)}
                                className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-emerald-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-emerald-600"
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
                                title="Print Receipt"
                              >
                                <Receipt className="h-4 w-4 shrink-0" />
                                <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Receipt</span>
                              </button>
                            )}
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
              {selectedInvoice.status === "paid" && (
                <button
                  onClick={() => {
                    if (selectedInvoice) {
                      handlePrintPaymentReceiptClick(selectedInvoice);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/30 transition-all hover:from-emerald-600 hover:to-teal-600 hover:shadow-md"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Print Receipt
                </button>
              )}
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
    </div>
  );
}
