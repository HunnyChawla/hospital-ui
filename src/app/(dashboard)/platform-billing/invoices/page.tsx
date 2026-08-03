"use client";

import { useEffect, useState, useCallback } from "react";
import { platformBillingApi } from "@/services/platformBillingApi";
import { PlatformInvoice, PlatformInvoiceStatus } from "@/types/platformBilling";
import { InvoicesTable } from "@/components/platform-billing/InvoicesTable";
import { CreateInvoiceModal } from "@/components/platform-billing/CreateInvoiceModal";
import { CreateReceiptModal } from "@/components/platform-billing/CreateReceiptModal";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PlatformInvoicesPage() {
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PlatformInvoiceStatus | undefined>(undefined);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<PlatformInvoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await platformBillingApi.invoices.list({
        page: currentPage,
        page_size: 10,
        status: statusFilter,
      });
      setInvoices(res.items);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      toast.error("Failed to load platform invoices");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSend = async (id: string) => {
    try {
      await platformBillingApi.invoices.send(id);
      toast.success("Invoice sent to hospital successfully");
      fetchInvoices();
    } catch (err) {
      toast.error("Failed to send invoice");
    }
  };

  const handleLogPayment = (invoice: PlatformInvoice) => {
    setActiveInvoice(invoice);
    setIsPaymentOpen(true);
  };

  const handleDownload = async (id: string) => {
    try {
      const blob = await platformBillingApi.invoices.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const match = invoices.find((inv) => inv.id === id);
      link.download = match ? `${match.invoice_number}.pdf` : `invoice_${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download invoice PDF");
    }
  };

  const filterTabs: { label: string; value: PlatformInvoiceStatus | undefined }[] = [
    { label: "All Invoices", value: undefined },
    { label: "Draft", value: "draft" },
    { label: "Sent", value: "sent" },
    { label: "Paid", value: "paid" },
    { label: "Overdue", value: "overdue" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/platform-billing"
              className="rounded-lg p-1.5 hover:bg-slate-100 transition text-slate-500"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Invoices</h1>
          </div>
          <p className="text-sm text-slate-500 pl-8">Issue subscription invoices and collect payments from hospitals.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition pl-8 pr-8"
        >
          <Plus className="h-4 w-4" /> Create Invoice
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {filterTabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              className={`border-b-2 py-4 px-1 text-sm font-medium transition ${
                statusFilter === tab.value
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <InvoicesTable
        invoices={invoices}
        loading={loading}
        onSend={handleSend}
        onLogPayment={handleLogPayment}
        onDownload={handleDownload}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-xl">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700">
                Page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateInvoiceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchInvoices}
      />

      <CreateReceiptModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setActiveInvoice(null);
        }}
        onSuccess={fetchInvoices}
        selectedInvoice={activeInvoice}
      />
    </div>
  );
}
