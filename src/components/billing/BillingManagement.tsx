"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi } from "@/services/paymentsApi";
import { patientsApi, formatPatientName } from "@/services/patientsApi";
import { getTenantIdForApi } from "@/utils/auth";
import { currency, formatDate } from "@/utils/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { InvoicePaymentReceiptPrint } from "@/components/payments/InvoicePaymentReceiptPrint";
import { InvoiceCreateModal } from "@/components/invoices/InvoiceCreateModal";
import { Modal } from "@/components/common/Modal";
import { PaymentCollectionModal } from "@/components/payments/PaymentCollectionModal";
import { PaymentReportModal } from "@/components/payments/PaymentReportModal";
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
  TrendingUp,
  DollarSign,
  FileText,
  AlertCircle,
  Calendar,
  Filter,
  Download,
  Eye,
  PlusCircle,
  BarChart3,
} from "lucide-react";
import { EnhancedStatCard } from "@/components/common/EnhancedStatCard";

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

  // Date filter state - default to "today" for daily operational visibility
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "week" | "month" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesPageSize] = useState(10);
  const [invoicesTotalPages, setInvoicesTotalPages] = useState(1);
  const [invoicesTotal, setInvoicesTotal] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    paidAmount: 0,
    totalInvoices: 0,
  });

  // Payment collection state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  // Invoice creation state
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);

  // Payment report state
  const [showPaymentReportModal, setShowPaymentReportModal] = useState(false);

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

  // Calculate date range based on filter
  const getDateRange = useCallback(() => {
    const today = new Date();
    let start_date: string | undefined;
    let end_date: string | undefined;

    switch (dateFilter) {
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
      case "week":
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        start_date = weekAgo.toISOString().split("T")[0];
        end_date = today.toISOString().split("T")[0];
        break;
      case "month":
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        start_date = monthAgo.toISOString().split("T")[0];
        end_date = today.toISOString().split("T")[0];
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          start_date = customStartDate;
          end_date = customEndDate;
        }
        break;
      default:
        break;
    }

    return { start_date, end_date };
  }, [dateFilter, customStartDate, customEndDate]);

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
      const { start_date, end_date } = getDateRange();

      const response = await invoicesApi.list({
        page: invoicesPage,
        page_size: invoicesPageSize,
        patient_id: selectedPatientId || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        start_date,
        end_date,
        tenant_id: getTenantIdForApi(tenantId),
      });
      setInvoices(response.items);
      setInvoicesTotalPages(response.total_pages);
      setInvoicesTotal(response.total);

      // Use server-side DB summary metrics if available, fallback to page sum
      if (response.summary) {
        setStats({
          totalRevenue: response.summary.total_revenue,
          pendingAmount: response.summary.total_pending,
          paidAmount: response.summary.total_paid,
          totalInvoices: response.summary.total_invoices,
        });
      } else {
        const totalRevenue = response.items
          .filter(inv => inv.status !== "refunded" && inv.status !== "cancelled")
          .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const paidAmount = response.items.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
        const pendingAmount = response.items
          .filter(inv => inv.status === "pending" || inv.status === "partial")
          .reduce((sum, inv) => sum + (inv.balance_amount || inv.total_amount || 0), 0);

        setStats({
          totalRevenue,
          pendingAmount,
          paidAmount,
          totalInvoices: response.total,
        });
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoices");
    } finally {
      setInvoicesLoading(false);
    }
  }, [selectedPatientId, invoicesPage, invoicesPageSize, statusFilter, getDateRange]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Reset page when filter changes
  useEffect(() => {
    setInvoicesPage(1);
  }, [statusFilter, selectedPatientId, dateFilter, customStartDate, customEndDate]);

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
    e.stopPropagation();
    setSelectedInvoiceForPayment(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    fetchInvoices();
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
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const fullInvoice = await invoicesApi.getById(invoice.id, getTenantIdForApi(tenantId));

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
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "partial":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "refunded":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "cancelled":
      case "failed":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "pending":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return <CreditCard className="h-3.5 w-3.5" />;
      case "partial":
        return <AlertCircle className="h-3.5 w-3.5" />;
      case "pending":
        return <Clock className="h-3.5 w-3.5" />;
      default:
        return <FileText className="h-3.5 w-3.5" />;
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
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  const selectedPatient = searchResults.find((p) => p.id === selectedPatientId) ||
    (searchTerm && selectedPatientId ? { name: searchTerm } : null);

  // Search box component
  const searchBox = useMemo(() => (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
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
                className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50 last:border-b-0"
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
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {[
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "partial", label: "Partial" },
        { value: "paid", label: "Paid" },
        { value: "refunded", label: "Refunded" },
      ].map((filter) => (
        <button
          key={filter.value}
          onClick={() => onStatusFilterChange(filter.value as any)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${statusFilter === filter.value
            ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  ), [statusFilter, onStatusFilterChange]);

  useEffect(() => {
    if (renderSearchInHeader) {
      renderSearchInHeader(searchBox);
    }
  }, [renderSearchInHeader, searchBox]);

  useEffect(() => {
    if (renderFilterInHeader) {
      renderFilterInHeader(filterToggle);
    }
  }, [renderFilterInHeader, filterToggle]);

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <EnhancedStatCard
          icon={DollarSign}
          label="Total Revenue"
          value={currency(stats.totalRevenue)}
          tone="sky"
        />
        <EnhancedStatCard
          icon={CreditCard}
          label="Paid Amount"
          value={currency(stats.paidAmount)}
          tone="emerald"
        />
        <EnhancedStatCard
          icon={AlertCircle}
          label="Pending Amount"
          value={currency(stats.pendingAmount)}
          tone="amber"
        />
        <EnhancedStatCard
          icon={FileText}
          label="Total Invoices"
          value={stats.totalInvoices.toString()}
          tone="fuchsia"
        />
      </div>

      {/* Filters Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateInvoiceModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow"
            >
              <PlusCircle className="h-4 w-4" />
              Create Invoice
            </button>

            <button
              onClick={() => setShowPaymentReportModal(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
            >
              <BarChart3 className="h-4 w-4 text-sky-600" />
              Payment Report
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!renderSearchInHeader && searchBox}

            {/* Date Filter */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${dateFilter !== "all"
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
              >
                <Calendar className="h-4 w-4" />
                <span>
                  {dateFilter === "all" && "All Time"}
                  {dateFilter === "today" && "Today"}
                  {dateFilter === "yesterday" && "Yesterday"}
                  {dateFilter === "week" && "Last 7 Days"}
                  {dateFilter === "month" && "Last 30 Days"}
                  {dateFilter === "custom" && "Custom Range"}
                </span>
              </button>

              {showDatePicker && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setDateFilter("all");
                        setShowDatePicker(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${dateFilter === "all"
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      All Time
                    </button>
                    <button
                      onClick={() => {
                        setDateFilter("today");
                        setShowDatePicker(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${dateFilter === "today"
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        setDateFilter("yesterday");
                        setShowDatePicker(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${dateFilter === "yesterday"
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      Yesterday
                    </button>
                    <button
                      onClick={() => {
                        setDateFilter("week");
                        setShowDatePicker(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${dateFilter === "week"
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      Last 7 Days
                    </button>
                    <button
                      onClick={() => {
                        setDateFilter("month");
                        setShowDatePicker(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${dateFilter === "month"
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      Last 30 Days
                    </button>
                    <div className="border-t border-slate-200 pt-2">
                      <p className="mb-2 text-xs font-semibold text-slate-700">Custom Range</p>
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-sky-400"
                          placeholder="Start date"
                        />
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-sky-400"
                          placeholder="End date"
                        />
                        <button
                          onClick={() => {
                            if (customStartDate && customEndDate) {
                              setDateFilter("custom");
                              setShowDatePicker(false);
                            }
                          }}
                          disabled={!customStartDate || !customEndDate}
                          className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-sky-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!renderFilterInHeader && filterToggle}
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {invoicesLoading ? (
          <div className="flex items-center justify-center py-12 rounded-xl border border-slate-200 bg-white">
            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500"></div>
              <p className="text-sm text-slate-500">Loading invoices...</p>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900">No invoices found</p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedPatientId
                ? `No ${statusFilter === "all" ? "" : statusFilter} invoices for this patient`
                : `No ${statusFilter === "all" ? "" : statusFilter} invoices match your filters`}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-sky-300 hover:shadow-md cursor-pointer"
                  onClick={() => handleInvoiceClick(invoice.id)}
                >
                  {/* Top Section */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          <span className="capitalize">{invoice.status}</span>
                        </span>
                        <span className="text-sm font-bold text-slate-900">#{invoice.invoice_number}</span>
                      </div>

                      {invoice.patient_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="font-semibold text-slate-700">{invoice.patient_name}</span>
                          {invoice.patient_mobile && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">{invoice.patient_mobile}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Amount Badge */}
                    <div className="rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 px-4 py-2 text-right">
                      <p className="text-xs font-medium text-slate-500">Total Amount</p>
                      <p className="text-lg font-bold text-sky-700">{currency(invoice.total_amount || 0)}</p>
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(invoice.invoice_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {calculateDaysSince(invoice.invoice_date)}
                      </span>
                      {invoice.paid_amount > 0 && (
                        <span className="font-semibold text-emerald-600">
                          Paid: {currency(invoice.paid_amount)}
                        </span>
                      )}
                      {invoice.balance_amount !== undefined && invoice.balance_amount > 0 && (
                        <span className="font-semibold text-amber-600">
                          Balance: {currency(invoice.balance_amount)}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {invoice.status === "pending" && (
                        <button
                          onClick={(e) => handleCollectPaymentClick(e, invoice)}
                          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:from-emerald-600 hover:to-teal-600 hover:shadow"
                          title="Collect Payment"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Collect</span>
                        </button>
                      )}
                      {invoice.status === "paid" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintPaymentReceiptClick(invoice);
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:from-emerald-600 hover:to-teal-600 hover:shadow"
                          title="Print Receipt"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Receipt</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintInvoiceClick(invoice);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow"
                        title="Print Invoice"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInvoiceClick(invoice.id);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {invoicesTotalPages > 1 && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-sm text-slate-500">
                  Page <span className="font-semibold text-slate-900">{invoicesPage}</span> of{" "}
                  <span className="font-semibold text-slate-900">{invoicesTotalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInvoicesPage((p) => Math.max(1, p - 1))}
                    disabled={invoicesPage === 1}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setInvoicesPage((p) => Math.min(invoicesTotalPages, p + 1))}
                    disabled={invoicesPage === invoicesTotalPages}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="space-y-4 -mx-6 -mb-6 px-6 pb-6">
            {/* Invoice Header */}
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Invoice Number</p>
                  <p className="text-sm font-bold text-slate-900">#{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Date</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(selectedInvoice.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(selectedInvoice.status)}`}>
                    {getStatusIcon(selectedInvoice.status)}
                    <span className="capitalize">{selectedInvoice.status}</span>
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Total Amount</p>
                  <p className="text-lg font-bold text-sky-700">{currency(selectedInvoice.total_amount)}</p>
                </div>
              </div>
            </div>

            {/* Patient Information */}
            {selectedInvoice.patient_name && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">Patient Information</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedInvoice.patient_name}</p>
                    {selectedInvoice.patient_mobile && (
                      <p className="text-xs text-slate-500">{selectedInvoice.patient_mobile}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Line Items */}
            {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">Invoice Items</p>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-700">Description</th>
                        <th className="px-3 py-2 text-center text-xs font-bold text-slate-700">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-slate-700">Unit Price</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-slate-700">Discount</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
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
                          <tr key={item.id || index} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.description}</td>
                            <td className="px-3 py-3 text-center text-sm text-slate-700">{quantity}</td>
                            <td className="px-3 py-3 text-right text-sm text-slate-700">{currency(unitPrice)}</td>
                            <td className="px-3 py-3 text-right text-sm text-slate-700">{discount > 0 ? currency(discount) : "-"}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{currency(total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Financial Summary */}
            {selectedInvoice.subtotal !== undefined && (
              <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Subtotal</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {currency(
                        // Calculate subtotal from line items (after line-item discounts)
                        selectedInvoice.line_items?.reduce((sum, item) => {
                          const total = item.total_price !== undefined
                            ? (typeof item.total_price === "string" ? parseFloat(item.total_price) : item.total_price)
                            : (item.total || 0);
                          return sum + total;
                        }, 0) || selectedInvoice.subtotal
                      )}
                    </span>
                  </div>
                  {selectedInvoice.tax_rate > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-600">Tax ({selectedInvoice.tax_rate}%)</span>
                      <span className="text-sm font-semibold text-slate-900">{currency(selectedInvoice.tax_amount)}</span>
                    </div>
                  )}
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-600">Discount</span>
                      <span className="text-sm font-bold text-emerald-600">-{currency(selectedInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-slate-300 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-slate-900">Total Amount</span>
                      <span className="text-xl font-bold text-sky-700">{currency(selectedInvoice.total_amount)}</span>
                    </div>
                  </div>
                  {selectedInvoice.paid_amount > 0 && (
                    <>
                      <div className="border-t border-slate-200 pt-2"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600">Paid Amount</span>
                        <span className="text-sm font-bold text-emerald-600">{currency(selectedInvoice.paid_amount)}</span>
                      </div>
                    </>
                  )}
                  {selectedInvoice.balance_amount !== undefined && selectedInvoice.balance_amount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-600">Balance Due</span>
                      <span className="text-sm font-bold text-amber-600">{currency(selectedInvoice.balance_amount)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedInvoice.notes && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedInvoice.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowInvoiceDetail(false);
                  setSelectedInvoice(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
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
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-emerald-600 hover:to-teal-600 hover:shadow"
                >
                  <Receipt className="h-4 w-4" />
                  Print Receipt
                </button>
              )}
              <button
                onClick={() => {
                  if (selectedInvoice) {
                    handlePrintInvoiceClick(selectedInvoice);
                  }
                }}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Invoice Creation Modal */}
      <InvoiceCreateModal
        isOpen={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        onSuccess={() => {
          fetchInvoices();
        }}
      />

      {/* Payment Report Modal */}
      <PaymentReportModal
        isOpen={showPaymentReportModal}
        onClose={() => setShowPaymentReportModal(false)}
      />

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
