"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi, BillingTransactionRow, PaymentMethod, PaymentMethodBreakdown, BillingStatsResponse, Payment, BillingFeedScope } from "@/services/paymentsApi";
import { patientsApi, formatPatientName } from "@/services/patientsApi";
import { getTenantIdForApi } from "@/utils/auth";
import { currency, formatDate, formatDateTime } from "@/utils/format";
import { buildTableRows, BillingTableRow } from "@/utils/billing";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { InvoicePrint } from "@/components/invoices/InvoicePrint";
import { InvoicePaymentReceiptPrint } from "@/components/payments/InvoicePaymentReceiptPrint";
import { InvoiceCreateModal } from "@/components/invoices/InvoiceCreateModal";
import { Modal } from "@/components/common/Modal";
import { Pagination } from "@/components/common/Pagination";
import { PaymentCollectionModal } from "@/components/payments/PaymentCollectionModal";
import { BillingTransactionsPrint } from "@/components/billing/BillingTransactionsPrint";
import { useReactToPrint } from "react-to-print";
import {
  Search,
  User,
  Printer,
  X,
  CreditCard,
  Receipt,
  Clock,
  DollarSign,
  FileText,
  AlertCircle,
  Calendar,
  Download,
  Eye,
  PlusCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  FileWarning,
  LayoutGrid,
  List,
} from "lucide-react";
import { EnhancedStatCard } from "@/components/common/EnhancedStatCard";

export type BillingStatusFilter =
  | "all"
  | "pending"
  | "paid"
  | "partial"
  | "refunded"
  | "partially_refunded";

interface BillingManagementProps {
  renderSearchInHeader?: (searchBox: React.ReactNode) => void;
  renderFilterInHeader?: (filterToggle: React.ReactNode) => void;
  statusFilter: BillingStatusFilter;
  onStatusFilterChange: (filter: BillingStatusFilter) => void;
}

// Values match the backend's TRANSACTION_SORT_FIELDS (hms/payments/api/payments.py)
// 1:1 so they can be sent straight through as sort_by, no translation needed.
type TableSortColumn = "payment_date" | "invoice_date" | "patient_name" | "total" | "received" | "pending";

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

  // Payment method filter (combined list only - narrows to invoices/payments using this method)
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | PaymentMethod>("all");

  // Card vs table view - persisted so the user's preferred view sticks across visits
  const [viewMode, setViewMode] = useState<"card" | "table">(() =>
    typeof window !== "undefined" && localStorage.getItem("billing_transactions_view") === "table"
      ? "table"
      : "card"
  );
  const handleViewModeChange = (mode: "card" | "table") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("billing_transactions_view", mode);
    }
  };

  // Combined (invoices + invoice-less payments) / Invoices-only / Payments-only
  // scope - persisted the same way as viewMode above.
  const [feedScope, setFeedScope] = useState<BillingFeedScope>(() => {
    if (typeof window === "undefined") return "combined";
    const stored = localStorage.getItem("billing_feed_scope");
    return stored === "invoice" || stored === "payment" ? stored : "combined";
  });
  const handleFeedScopeChange = (scope: BillingFeedScope) => {
    setFeedScope(scope);
    if (typeof window !== "undefined") {
      localStorage.setItem("billing_feed_scope", scope);
    }
  };

  // Table view sort state - drives sort_by/sort_order on the backend request,
  // so ordering holds correctly across pages (not just within the fetched page).
  const [sortColumn, setSortColumn] = useState<TableSortColumn>("payment_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const handleSort = (column: TableSortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Combined invoice+payment transactions state
  const [transactions, setTransactions] = useState<BillingTransactionRow[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsPageSize] = useState(10);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(new Set());

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoicePayments, setSelectedInvoicePayments] = useState<Payment[]>([]);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);

  // Stats state - sourced from the dedicated GET /payments/stats endpoint
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    paidAmount: 0,
    totalInvoices: 0,
  });
  const [byPaymentMethod, setByPaymentMethod] = useState<PaymentMethodBreakdown[]>([]);

  // Payment collection state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [collectingPaymentForId, setCollectingPaymentForId] = useState<string | null>(null);

  // Invoice creation state
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);

  // Refresh / export state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [printReportData, setPrintReportData] = useState<{
    items: BillingTransactionRow[];
    total: number;
    startDate?: string;
    endDate?: string;
    stats: BillingStatsResponse;
  } | null>(null);

  // Print state
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string } | null>(null);
  const [shouldPrintInvoice, setShouldPrintInvoice] = useState(false);
  // Receipt print target - "invoice" fetches by invoice id (payments nested
  // under it), "payment" fetches a single invoice-less payment directly by
  // its own id (e.g. a surgery advance with no invoice yet).
  const [printReceiptTarget, setPrintReceiptTarget] = useState<{ type: "invoice" | "payment"; id: string } | null>(null);
  const [shouldPrintPayment, setShouldPrintPayment] = useState(false);
  const printInvoiceRef = useRef<HTMLDivElement>(null);
  const printPaymentRef = useRef<HTMLDivElement>(null);
  const printReportRef = useRef<HTMLDivElement>(null);

  const handlePrintInvoice = useReactToPrint({
    contentRef: printInvoiceRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const handlePrintPayment = useReactToPrint({
    contentRef: printPaymentRef,
    documentTitle: printReceiptTarget
      ? printReceiptTarget.type === "invoice"
        ? `PaymentReceipt_Invoice_${printReceiptTarget.id}`
        : `PaymentReceipt_${printReceiptTarget.id}`
      : "Payment Receipt",
  });

  const handlePrintReport = useReactToPrint({
    contentRef: printReportRef,
    documentTitle: `Billing_Transactions_${new Date().toISOString().split("T")[0]}`,
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

  useEffect(() => {
    if (printReportData && printReportRef.current) {
      const timeoutId = setTimeout(() => {
        handlePrintReport();
        setPrintReportData(null);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printReportData, handlePrintReport]);

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

  // Fetch dashboard stats from the dedicated Billing stats endpoint - deliberately
  // scoped to date range + patient only (not statusFilter/paymentMethodFilter),
  // so these numbers stay stable while the transaction list below is narrowed.
  const fetchStats = useCallback(async () => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const { start_date, end_date } = getDateRange();

      const response = await paymentsApi.getBillingStats({
        patient_id: selectedPatientId || undefined,
        start_date,
        end_date,
        tenant_id: getTenantIdForApi(tenantId) || undefined,
      });

      setStats({
        totalRevenue: response.total_revenue,
        pendingAmount: response.total_pending,
        paidAmount: response.total_paid,
        totalInvoices: response.total_invoices,
      });
      setByPaymentMethod(response.by_payment_method);
    } catch (error) {
      // Stats are secondary to the transactions list - fail quietly, don't block the screen.
      console.error("Failed to fetch billing stats:", error);
    }
  }, [selectedPatientId, getDateRange]);

  // Fetch the combined invoice+payment transactions feed
  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const { start_date, end_date } = getDateRange();

      const response = await paymentsApi.listTransactions({
        page: transactionsPage,
        page_size: transactionsPageSize,
        patient_id: selectedPatientId || undefined,
        payment_method: paymentMethodFilter === "all" ? undefined : paymentMethodFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        start_date,
        end_date,
        sort_by: sortColumn,
        sort_order: sortDirection,
        feed_scope: feedScope,
        // Table view wants exactly page_size rows per page; card view wants
        // the invoice grain (full payment history on expand) - see
        // PaymentService._list_flattened_transactions.
        flatten: viewMode === "table",
        tenant_id: getTenantIdForApi(tenantId),
      });
      setTransactions(response.items);
      setTransactionsTotal(response.total);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch billing transactions");
    } finally {
      setTransactionsLoading(false);
    }
  }, [selectedPatientId, transactionsPage, transactionsPageSize, paymentMethodFilter, statusFilter, getDateRange, sortColumn, sortDirection, feedScope, viewMode]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset page when filters, sorting, or scope/view mode change
  useEffect(() => {
    setTransactionsPage(1);
  }, [statusFilter, selectedPatientId, dateFilter, customStartDate, customEndDate, paymentMethodFilter, sortColumn, sortDirection, feedScope, viewMode]);

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
    setTransactionsPage(1);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCollectPaymentClick = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation();

    setCollectingPaymentForId(invoiceId);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const invoice = await invoicesApi.getById(invoiceId, getTenantIdForApi(tenantId));
      setSelectedInvoiceForPayment(invoice);
      setShowPaymentModal(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to load invoice for payment");
    } finally {
      setCollectingPaymentForId(null);
    }
  };

  const handlePaymentSuccess = () => {
    fetchTransactions();
    fetchStats();
  };

  const handleInvoiceClick = async (invoiceId: string) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId);
      const [invoice, payments] = await Promise.all([
        invoicesApi.getById(invoiceId, apiTenantId),
        paymentsApi.getByInvoiceId(invoiceId, apiTenantId),
      ]);
      setSelectedInvoice(invoice);
      setSelectedInvoicePayments(payments);
      setShowInvoiceDetail(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoice details");
    }
  };

  const handlePrintInvoiceClick = async (invoiceId: string) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const fullInvoice = await invoicesApi.getById(invoiceId, getTenantIdForApi(tenantId));

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

  const handlePrintPaymentReceiptClick = async (invoiceId: string) => {
    if (!invoiceId) {
      toast.error("Invoice ID not available");
      return;
    }

    try {
      setPrintReceiptTarget({ type: "invoice", id: invoiceId });
      setShouldPrintPayment(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare payment receipt for printing");
    }
  };

  // Standalone (invoice-less) payments have no invoice to key the receipt
  // off of - print directly from the payment's own id instead.
  const handlePrintStandalonePaymentReceiptClick = (paymentId: string) => {
    if (!paymentId) {
      toast.error("Payment ID not available");
      return;
    }
    setPrintReceiptTarget({ type: "payment", id: paymentId });
    setShouldPrintPayment(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchTransactions(), fetchStats()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const { start_date, end_date } = getDateRange();
      const blob = await paymentsApi.exportTransactionsCsv({
        patient_id: selectedPatientId || undefined,
        payment_method: paymentMethodFilter === "all" ? undefined : paymentMethodFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        start_date,
        end_date,
        feed_scope: feedScope,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `billing_transactions_${start_date || "all"}_to_${end_date || "all"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Billing transactions exported successfully");
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to export billing transactions");
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handlePrintPdfClick = async () => {
    setIsPreparingPrint(true);
    try {
      const { start_date, end_date } = getDateRange();
      const [response, printStats] = await Promise.all([
        paymentsApi.listTransactions({
          page: 1,
          page_size: 1000,
          patient_id: selectedPatientId || undefined,
          payment_method: paymentMethodFilter === "all" ? undefined : paymentMethodFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
          start_date,
          end_date,
          feed_scope: feedScope,
        }),
        paymentsApi.getBillingStats({
          patient_id: selectedPatientId || undefined,
          start_date,
          end_date,
        }),
      ]);
      if (response.total > response.items.length) {
        toast.warning(
          `Printed report shows the first ${response.items.length} of ${response.total} matching rows. Use "Export CSV" to get the complete data set.`
        );
      }
      setPrintReportData({
        items: response.items,
        total: response.total,
        startDate: start_date,
        endDate: end_date,
        stats: printStats,
      });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to prepare report for printing");
    } finally {
      setIsPreparingPrint(false);
    }
  };

  // Statuses are snake_case on the wire (e.g. "partially_refunded"); render them
  // as words so `capitalize` produces "Partially refunded" and not "Partially_refunded".
  const formatStatusLabel = (status: string) => status.replace(/_/g, " ");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "partial":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "refunded":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "partially_refunded":
        return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
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
        { value: "partially_refunded", label: "Part. Refunded" },
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

  // Payment method filter toggle component
  const paymentMethodToggle = useMemo(() => (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Method</span>
      {[
        { value: "all", label: "All" },
        { value: "cash", label: "Cash" },
        { value: "upi", label: "UPI" },
        { value: "card", label: "Card" },
        { value: "cheque", label: "Cheque" },
      ].map((filter) => (
        <button
          key={filter.value}
          onClick={() => setPaymentMethodFilter(filter.value as any)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${paymentMethodFilter === filter.value
            ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  ), [paymentMethodFilter]);

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

  // Render one "invoice" row - status, amount (original vs agreed if discounted), and its
  // nested payments (expandable). Collect Payment shows for pending AND partial invoices.
  const renderInvoiceRow = (txn: BillingTransactionRow) => {
    const isExpanded = expandedInvoiceIds.has(txn.id);
    const hasPayments = txn.payments.length > 0;
    const balance = (txn.total_amount || 0) - (txn.paid_amount || 0);
    const canCollect = txn.invoice_status === "pending" || txn.invoice_status === "partial";

    // Original vs agreed price: a generic invoice discount shows via `discount`;
    // an OPD fee override or lab test price override shows via `original_amount`
    // (the override was baked into the line-item price, so `discount` stays 0).
    const hasDiscount = (txn.discount || 0) > 0;
    const originalAmount = hasDiscount ? txn.subtotal : txn.original_amount;
    const showOriginal = originalAmount != null && originalAmount !== (txn.total_amount || 0);
    const displayDiscount = hasDiscount ? (txn.discount || 0) : (originalAmount || 0) - (txn.total_amount || 0);

    // Received/Refunded/Actual breakdown - derived from this invoice's own
    // payments (already on the wire, no extra fetch needed). `actual` should
    // equal `txn.paid_amount`, which is already net of refunds.
    const receivedGross = txn.payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
    const refundedAmt = txn.payments.filter((p) => p.status === "refunded").reduce((s, p) => s + Math.abs(p.amount), 0);
    const hasRefund = refundedAmt > 0;

    return (
      <div
        key={txn.id}
        className="group relative rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-sky-300 hover:shadow-md"
      >
        <div className="cursor-pointer p-4" onClick={() => handleInvoiceClick(txn.id)}>
          {/* Top Section */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusColor(txn.invoice_status || "")}`}>
                  {getStatusIcon(txn.invoice_status || "")}
                  <span className="capitalize">{formatStatusLabel(txn.invoice_status || "")}</span>
                </span>
                <span className="text-sm font-bold text-slate-900">#{txn.invoice_number}</span>
              </div>

              {txn.patient_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-700">{txn.patient_name}</span>
                  {txn.patient_mobile && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">{txn.patient_mobile}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Amount Breakdown - Total, Received, Pending together, with original-vs-agreed on top when applicable */}
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-2.5 text-right min-w-[150px]">
              {showOriginal && (
                <div className="mb-1.5 flex items-center justify-end gap-2 border-b border-slate-200 pb-1.5">
                  <span className="text-[11px] text-slate-400 line-through">{currency(originalAmount || 0)}</span>
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    {hasDiscount ? `-${currency(displayDiscount)}` : "Overridden"}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium text-slate-500">Total</span>
                <span className="text-sm font-bold text-slate-900">{currency(txn.total_amount || 0)}</span>
              </div>
              {hasRefund ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-medium text-emerald-600">Received</span>
                    <span className="text-sm font-bold text-emerald-700">{currency(receivedGross)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-medium text-rose-500">Refunded</span>
                    <span className="text-sm font-bold text-rose-600">{currency(refundedAmt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-1">
                    <span className="text-[11px] font-medium text-slate-600">Actual</span>
                    <span className="text-sm font-bold text-slate-900">{currency(receivedGross - refundedAmt)}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-emerald-600">Received</span>
                  <span className="text-sm font-bold text-emerald-700">{currency(txn.paid_amount || 0)}</span>
                </div>
              )}
              {balance > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-amber-600">Pending</span>
                  <span className="text-sm font-bold text-amber-700">{currency(balance)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(txn.row_date)}
              </span>
              {hasPayments && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(txn.id);
                  }}
                  className="flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-800"
                >
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {txn.payments.length} payment{txn.payments.length > 1 ? "s" : ""}
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {canCollect && (
                <button
                  onClick={(e) => handleCollectPaymentClick(e, txn.id)}
                  disabled={collectingPaymentForId === txn.id}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:from-emerald-600 hover:to-teal-600 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
                  title="Collect Payment"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{collectingPaymentForId === txn.id ? "Loading..." : "Collect"}</span>
                </button>
              )}
              {(txn.paid_amount || 0) > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrintPaymentReceiptClick(txn.id);
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
                  handlePrintInvoiceClick(txn.id);
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
                  handleInvoiceClick(txn.id);
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

        {/* Nested payments */}
        {isExpanded && hasPayments && (
          <div className="rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Payments against this invoice
            </p>
            <div className="space-y-1.5">
              {txn.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono font-semibold text-slate-700">{p.payment_number}</span>
                    <span className="text-slate-500">{formatDate(p.payment_date)}</span>
                    <span className="font-semibold uppercase text-sky-700">{p.payment_method}</span>
                    {p.payment_reference && <span className="text-slate-400">Ref: {p.payment_reference}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{currency(p.amount)}</span>
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${getStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render a "payment" row. In Combined/Invoices scope this is always an
  // invoice-less payment (e.g. a surgery advance); in Payments scope it may
  // carry a real linked invoice - branch on txn.invoice_number presence.
  const renderPaymentOnlyRow = (txn: BillingTransactionRow) => {
    const payment = txn.payment;
    const hasInvoice = !!txn.invoice_number;
    const balance = hasInvoice ? (txn.total_amount || 0) - (txn.paid_amount || 0) : 0;
    return (
      <div
        key={txn.id}
        className={`rounded-xl border p-4 shadow-sm ${hasInvoice ? "border-slate-200 bg-white" : "border-dashed border-amber-300 bg-amber-50/40"}`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {payment && (
                <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusColor(payment.status)}`}>
                  {getStatusIcon(payment.status)}
                  <span className="capitalize">{payment.status}</span>
                </span>
              )}
              {hasInvoice ? (
                <button
                  onClick={() => handleInvoiceClick(txn.invoice_id as string)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                >
                  #{txn.invoice_number}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <FileWarning className="h-3.5 w-3.5" />
                  Invoice not available
                </span>
              )}
            </div>

            {txn.patient_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-slate-700">{txn.patient_name}</span>
                {txn.patient_mobile && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{txn.patient_mobile}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {hasInvoice ? (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-2.5 text-right min-w-[140px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium text-slate-500">Total</span>
                <span className="text-sm font-bold text-slate-900">{currency(txn.total_amount || 0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium text-emerald-600">Received</span>
                <span className="text-sm font-bold text-emerald-700">{currency(txn.paid_amount || 0)}</span>
              </div>
              {balance > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-amber-600">Pending</span>
                  <span className="text-sm font-bold text-amber-700">{currency(balance)}</span>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-slate-200 pt-1">
                <span className="text-[11px] font-medium text-indigo-500">This payment</span>
                <span className="text-sm font-bold text-indigo-700">{currency(payment?.amount || 0)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-right">
              <p className="text-xs font-medium text-slate-500">Amount Collected</p>
              <p className="text-lg font-bold text-amber-700">{currency(payment?.amount || 0)}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(txn.row_date)}
            </span>
            {hasInvoice && txn.invoice_date && <span>Inv: {formatDate(txn.invoice_date)}</span>}
            {payment && (
              <>
                <span className="font-mono">{payment.payment_number}</span>
                <span className="font-semibold uppercase text-sky-700">{payment.payment_method}</span>
                {payment.payment_reference && <span>Ref: {payment.payment_reference}</span>}
              </>
            )}
          </div>
          {(payment?.amount || 0) > 0 && (
            <button
              onClick={() => handlePrintStandalonePaymentReceiptClick(txn.id)}
              title="Print Receipt"
              className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-1.5 text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600"
            >
              <Receipt className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Table view row - one <tr> per BillingTableRow (already flattened/filtered/
  // sorted before this is called). Actions render on every row now, not just
  // an invoice's first payment.
  const renderTableRow = (row: BillingTableRow) => {
    const txn = row.txn;
    const canCollect = !row.isStandalone && (txn.invoice_status === "pending" || txn.invoice_status === "partial");

    return (
      <tr key={row.key} className={row.isStandalone ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-slate-50/50"}>
        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
          <p>{row.paymentDate ? formatDateTime(row.paymentDate) : "-"}</p>
          <p className="text-[10px] text-slate-400">
            Inv: {row.invoiceDate ? formatDate(row.invoiceDate) : "-"}
          </p>
        </td>
        <td className="whitespace-nowrap px-3 py-2.5">
          <p className="font-mono text-slate-700">{row.paymentId || "-"}</p>
          {row.isStandalone || !row.invoiceId ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
              <FileWarning className="h-3 w-3" />
              No invoice
            </span>
          ) : (
            <button onClick={() => handleInvoiceClick(row.invoiceId as string)} className="font-mono text-[10px] text-sky-700 hover:underline">
              Inv: #{row.invoiceNumber}
            </button>
          )}
        </td>
        <td className="px-3 py-2.5">
          <p className="font-semibold text-slate-800">{row.patientName || "-"}</p>
          {(row.patientUhid || row.patientMobile) && (
            <p className="text-[10px] text-slate-400">
              {[row.patientUhid, row.patientMobile].filter(Boolean).join(" • ")}
            </p>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 text-right">
          {row.total != null ? (
            <div className="flex items-baseline justify-end gap-1.5">
              {row.originalAmount != null && row.originalAmount !== row.total && (
                <span className="text-[11px] text-slate-400 line-through">{currency(row.originalAmount)}</span>
              )}
              <span className="font-semibold text-slate-900">{currency(row.total)}</span>
            </div>
          ) : (
            "-"
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-emerald-700">
          {row.received != null ? currency(row.received) : "-"}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-amber-700">
          {row.pending != null ? currency(row.pending) : "-"}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 text-right">
          {row.transactionAmount != null ? (
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-sm font-bold text-indigo-700">
              {currency(row.transactionAmount)}
            </span>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-center capitalize text-slate-600">
          <span className="truncate" title={row.serviceType || undefined}>
            {row.serviceType || "-"}
          </span>
        </td>
        <td className="px-3 py-2.5 text-center uppercase text-slate-600">{row.method || "-"}</td>
        <td className="px-3 py-2.5 text-center">
          {row.hasPayment && row.status ? (
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${getStatusColor(row.status)}`}>
              {row.status}
            </span>
          ) : !row.isStandalone ? (
            <span className="text-slate-400">No payments yet</span>
          ) : null}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5">
          {row.isStandalone || !row.invoiceId ? (
            (txn.payment?.amount || 0) > 0 && (
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handlePrintStandalonePaymentReceiptClick(txn.id)}
                  title="Print Receipt"
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-1.5 text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600"
                >
                  <Receipt className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center justify-end gap-1.5">
              {canCollect && (
                <button
                  onClick={(e) => handleCollectPaymentClick(e, row.invoiceId as string)}
                  disabled={collectingPaymentForId === row.invoiceId}
                  title="Collect Payment"
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-1.5 text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                </button>
              )}
              {row.received != null && row.received > 0 && (
                <button
                  onClick={() => handlePrintPaymentReceiptClick(row.invoiceId as string)}
                  title="Print Receipt"
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-1.5 text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600"
                >
                  <Receipt className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => handlePrintInvoiceClick(row.invoiceId as string)}
                title="Print Invoice"
                className="rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 p-1.5 text-white shadow-sm transition hover:from-sky-600 hover:to-teal-600"
              >
                <Printer className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleInvoiceClick(row.invoiceId as string)}
                title="View Details"
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  };

  const sortHeader = (label: string, column: TableSortColumn, align: "left" | "right" | "center" = "left") => (
    <th
      className={`px-3 py-2 font-semibold uppercase text-slate-500 cursor-pointer select-none hover:text-slate-800 ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      }`}
      onClick={() => handleSort(column)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        {sortColumn === column ? (
          sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-slate-300" />
        )}
      </span>
    </th>
  );

  const tableRows = useMemo(() => {
    const { start_date, end_date } = getDateRange();
    return buildTableRows(transactions, start_date, end_date);
  }, [transactions, getDateRange]);

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

      {/* Collections by Payment Method */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Collections by Payment Method
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["cash", "upi", "card", "cheque"] as const).map((method) => {
            const item = byPaymentMethod.find((m) => m.payment_method === method);
            return (
              <div key={method} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="mb-1 text-[11px] font-semibold uppercase text-slate-500">{method}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium text-slate-500">Received</span>
                  <span className="text-xs font-bold text-slate-900">{currency(item?.received_amount || 0)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium text-rose-500">Refunded</span>
                  <span className="text-xs font-bold text-rose-600">{currency(item?.refunded_amount || 0)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-slate-200 pt-0.5">
                  <span className="text-[10px] font-medium text-emerald-600">Actual</span>
                  <span className="text-xs font-bold text-emerald-700">{currency(item?.actual_amount || 0)}</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">{item?.transaction_count || 0} txn{(item?.transaction_count || 0) === 1 ? "" : "s"}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreateInvoiceModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow"
            >
              <PlusCircle className="h-4 w-4" />
              Create Invoice
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 text-sky-500 transition-transform duration-300 ${isRefreshing ? "animate-spin" : "hover:rotate-180"}`} />
            </button>

            <button
              onClick={handleExportCsv}
              disabled={isExportingCsv || transactionsTotal === 0}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-sky-600" />
              {isExportingCsv ? "Exporting..." : "Export CSV"}
            </button>

            <button
              onClick={handlePrintPdfClick}
              disabled={isPreparingPrint || transactionsTotal === 0}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4 text-sky-600" />
              {isPreparingPrint ? "Preparing..." : "Print PDF"}
            </button>

            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
              <button
                onClick={() => handleFeedScopeChange("combined")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${feedScope === "combined" ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                title="Invoices + invoice-less payments together"
              >
                Combined
              </button>
              <button
                onClick={() => handleFeedScopeChange("invoice")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${feedScope === "invoice" ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                title="Invoices only"
              >
                Invoices
              </button>
              <button
                onClick={() => handleFeedScopeChange("payment")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${feedScope === "payment" ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                title="Every payment, with or without an invoice"
              >
                Payments
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
              <button
                onClick={() => handleViewModeChange("card")}
                className={`flex items-center justify-center rounded-lg p-2 transition ${viewMode === "card" ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                title="Card View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange("table")}
                className={`flex items-center justify-center rounded-lg p-2 transition ${viewMode === "table" ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
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
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!renderFilterInHeader && filterToggle}
          {paymentMethodToggle}
        </div>
      </div>

      {/* Combined Invoice + Payment Transactions List */}
      <div className="space-y-3">
        {transactionsLoading ? (
          <div className="flex items-center justify-center py-12 rounded-xl border border-slate-200 bg-white">
            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500"></div>
              <p className="text-sm text-slate-500">Loading billing transactions...</p>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900">No billing transactions found</p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedPatientId
                ? "No transactions for this patient match your filters"
                : "No transactions match your filters"}
            </p>
          </div>
        ) : (
          <>
            {viewMode === "card" ? (
              <div className="space-y-2">
                {transactions.map((txn) =>
                  txn.row_type === "invoice" ? renderInvoiceRow(txn) : renderPaymentOnlyRow(txn)
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      {sortHeader("Date", "payment_date")}
                      <th className="px-3 py-2 text-left font-semibold uppercase text-slate-500">ID</th>
                      {sortHeader("Patient", "patient_name")}
                      {sortHeader("Total", "total", "right")}
                      {sortHeader("Received", "received", "right")}
                      {sortHeader("Pending", "pending", "right")}
                      <th className="px-3 py-2 text-right font-semibold uppercase text-slate-500">Amount</th>
                      <th className="px-3 py-2 text-center font-semibold uppercase text-slate-500">Type</th>
                      <th className="px-3 py-2 text-center font-semibold uppercase text-slate-500">Method</th>
                      <th className="px-3 py-2 text-center font-semibold uppercase text-slate-500">Status</th>
                      <th className="px-3 py-2 text-right font-semibold uppercase text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableRows.map((row) => renderTableRow(row))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <Pagination
                currentPage={transactionsPage}
                total={transactionsTotal}
                pageSize={transactionsPageSize}
                onPageChange={setTransactionsPage}
              />
            </div>
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
                    <span className="capitalize">{formatStatusLabel(selectedInvoice.status)}</span>
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

            {/* Payment History */}
            {selectedInvoicePayments.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">
                    Payment History ({selectedInvoicePayments.length})
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedInvoicePayments.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono font-semibold text-slate-700">{p.payment_number}</span>
                        <span className="text-slate-500">{formatDate(p.payment_date)}</span>
                        <span className="font-semibold uppercase text-sky-700">{p.payment_method}</span>
                        {p.payment_reference && <span className="text-slate-400">Ref: {p.payment_reference}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{currency(p.amount)}</span>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary */}
            {selectedInvoice.subtotal !== undefined && (
              <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                <div className="space-y-2">
                  {selectedInvoice.original_amount != null && selectedInvoice.original_amount !== selectedInvoice.total_amount && (
                    <div className="flex justify-between items-center rounded-lg bg-amber-50 px-2 py-1.5">
                      <span className="text-sm font-medium text-amber-800">
                        {selectedInvoice.fee_overridden ? "Original Consultation Fee" : "Original Price"}
                      </span>
                      <span className="text-sm font-bold text-amber-800 line-through">
                        {currency(selectedInvoice.original_amount)}
                      </span>
                    </div>
                  )}
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
                  {(() => {
                    const receivedGross = selectedInvoicePayments
                      .filter((p) => p.status === "completed")
                      .reduce((s, p) => s + p.amount, 0);
                    const refundedAmt = selectedInvoicePayments
                      .filter((p) => p.status === "refunded")
                      .reduce((s, p) => s + Math.abs(p.amount), 0);

                    if (refundedAmt > 0) {
                      return (
                        <>
                          <div className="border-t border-slate-200 pt-2"></div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-emerald-600">Received</span>
                            <span className="text-sm font-bold text-emerald-700">{currency(receivedGross)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-rose-500">Refunded</span>
                            <span className="text-sm font-bold text-rose-600">{currency(refundedAmt)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Actual (Paid Amount)</span>
                            <span className="text-sm font-bold text-slate-900">{currency(receivedGross - refundedAmt)}</span>
                          </div>
                        </>
                      );
                    }
                    return selectedInvoice.paid_amount > 0 ? (
                      <>
                        <div className="border-t border-slate-200 pt-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600">Paid Amount</span>
                          <span className="text-sm font-bold text-emerald-600">{currency(selectedInvoice.paid_amount)}</span>
                        </div>
                      </>
                    ) : null;
                  })()}
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
                  setSelectedInvoicePayments([]);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Close
              </button>
              {selectedInvoice.paid_amount > 0 && (
                <button
                  onClick={() => {
                    if (selectedInvoice) {
                      handlePrintPaymentReceiptClick(selectedInvoice.id);
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
                    handlePrintInvoiceClick(selectedInvoice.id);
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
          fetchTransactions();
          fetchStats();
        }}
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
      {printReceiptTarget && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printPaymentRef} className="print-content">
            {printReceiptTarget.type === "invoice" ? (
              <InvoicePaymentReceiptPrint invoiceId={printReceiptTarget.id} />
            ) : (
              <InvoicePaymentReceiptPrint paymentId={printReceiptTarget.id} />
            )}
          </div>
        </div>
      )}

      {/* Print Billing Transactions Report (Hidden) */}
      {printReportData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printReportRef} className="print-content">
            <BillingTransactionsPrint
              items={printReportData.items}
              total={printReportData.total}
              startDate={printReportData.startDate}
              endDate={printReportData.endDate}
              stats={printReportData.stats}
            />
          </div>
        </div>
      )}
    </div>
  );
}
