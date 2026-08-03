"use client";

import { useEffect, useState, useCallback } from "react";
import { platformBillingApi } from "@/services/platformBillingApi";
import { Quote, QuoteStatus } from "@/types/platformBilling";
import { QuotesTable } from "@/components/platform-billing/QuotesTable";
import { CreateQuoteModal } from "@/components/platform-billing/CreateQuoteModal";
import { toast } from "sonner";
import { FileText, Plus, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PlatformQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await platformBillingApi.quotes.list({
        page: currentPage,
        page_size: 10,
        status: statusFilter,
      });
      setQuotes(res.items);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error("Failed to fetch quotes:", err);
      toast.error("Failed to load platform quotes");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleSend = async (id: string) => {
    try {
      await platformBillingApi.quotes.send(id);
      toast.success("Quote marked as SENT to hospital");
      fetchQuotes();
    } catch (err) {
      toast.error("Failed to send quote");
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await platformBillingApi.quotes.accept(id);
      toast.success("Quote accepted successfully");
      fetchQuotes();
    } catch (err) {
      toast.error("Failed to accept quote");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await platformBillingApi.quotes.reject(id);
      toast.success("Quote marked as rejected");
      fetchQuotes();
    } catch (err) {
      toast.error("Failed to reject quote");
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const blob = await platformBillingApi.quotes.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Get the correct quote number to name the file cleanly
      const match = quotes.find((q) => q.id === id);
      link.download = match ? `${match.quote_number}.pdf` : `quote_${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download quote PDF");
    }
  };

  const filterTabs: { label: string; value: QuoteStatus | undefined }[] = [
    { label: "All Quotes", value: undefined },
    { label: "Draft", value: "draft" },
    { label: "Sent", value: "sent" },
    { label: "Accepted", value: "accepted" },
    { label: "Rejected", value: "rejected" },
    { label: "Expired", value: "expired" },
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quotes Manager</h1>
          </div>
          <p className="text-sm text-slate-500 pl-8">Create and manage sales quotes proposed to hospitals.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition pl-8 pr-8"
        >
          <Plus className="h-4 w-4" /> Create Quote
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
      <QuotesTable
        quotes={quotes}
        loading={loading}
        onSend={handleSend}
        onAccept={handleAccept}
        onReject={handleReject}
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

      {/* Create Modal */}
      <CreateQuoteModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchQuotes}
      />
    </div>
  );
}
