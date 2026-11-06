"use client";

import { useEffect, useState, useCallback } from "react";
import { platformBillingApi } from "@/services/platformBillingApi";
import { Quote } from "@/types/platformBilling";
import { QuotesTable } from "@/components/platform-billing/QuotesTable";
import { CreateQuoteModal } from "@/components/platform-billing/CreateQuoteModal";
import { EditQuoteModal } from "@/components/platform-billing/EditQuoteModal";
import { SendBillingEmailModal } from "@/components/platform-billing/SendBillingEmailModal";
import { generateQuotePdf } from "@/utils/platformBillingPdf";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PlatformQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [quoteToEmail, setQuoteToEmail] = useState<Quote | null>(null);

  const handleEdit = (quote: Quote) => {
    setQuoteToEdit(quote);
    setIsEditOpen(true);
  };

  const handleSendEmail = (quote: Quote) => {
    setQuoteToEmail(quote);
    setIsEmailModalOpen(true);
  };

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await platformBillingApi.quotes.list({
        page: currentPage,
        page_size: 10,
      });
      setQuotes(res.items);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error("Failed to fetch quotes:", err);
      toast.error("Failed to load platform quotes");
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleDownload = async (id: string) => {
    try {
      let quote = quotes.find((q) => q.id === id);
      if (!quote || !quote.line_items || quote.line_items.length === 0) {
        quote = await platformBillingApi.quotes.getById(id);
      }
      if (!quote) {
        toast.error("Quote not found");
        return;
      }
      await generateQuotePdf(quote);
      toast.success("Quote PDF generated successfully");
    } catch (err) {
      toast.error("Failed to generate quote PDF");
    }
  };

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

      {/* Table */}
      <QuotesTable
        quotes={quotes}
        loading={loading}
        onDownload={handleDownload}
        onEdit={handleEdit}
        onSendEmail={handleSendEmail}
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

      {/* Edit Modal */}
      <EditQuoteModal
        isOpen={isEditOpen}
        quote={quoteToEdit}
        onClose={() => {
          setIsEditOpen(false);
          setQuoteToEdit(null);
        }}
        onSuccess={fetchQuotes}
      />

      {/* Send Email Modal */}
      <SendBillingEmailModal
        isOpen={isEmailModalOpen}
        type="quote"
        document={quoteToEmail}
        onClose={() => {
          setIsEmailModalOpen(false);
          setQuoteToEmail(null);
        }}
        onSuccess={fetchQuotes}
      />
    </div>
  );
}
