"use client";

import { useEffect, useState, useCallback } from "react";
import { platformBillingApi } from "@/services/platformBillingApi";
import { Agreement, AgreementStatus } from "@/types/platformBilling";
import { AgreementsTable } from "@/components/platform-billing/AgreementsTable";
import { CreateAgreementModal } from "@/components/platform-billing/CreateAgreementModal";
import { UploadSignedAgreementModal } from "@/components/platform-billing/UploadSignedAgreementModal";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PlatformAgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AgreementStatus | undefined>(undefined);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeAgreement, setActiveAgreement] = useState<Agreement | null>(null);

  const fetchAgreements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await platformBillingApi.agreements.list({
        page: currentPage,
        page_size: 10,
        status: statusFilter,
      });
      setAgreements(res.items);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error("Failed to fetch agreements:", err);
      toast.error("Failed to load platform service agreements");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  const handleShare = async (id: string) => {
    try {
      await platformBillingApi.agreements.share(id);
      toast.success("Agreement shared with hospital successfully");
      fetchAgreements();
    } catch (err) {
      toast.error("Failed to share agreement");
    }
  };

  const handleUploadClick = (agreement: Agreement) => {
    setActiveAgreement(agreement);
    setIsUploadOpen(true);
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const blob = await platformBillingApi.agreements.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const match = agreements.find((a) => a.id === id);
      link.download = match ? `${match.agreement_number}.pdf` : `agreement_${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download agreement PDF");
    }
  };

  const handleDownloadSigned = async (id: string) => {
    try {
      const blob = await platformBillingApi.agreements.downloadSigned(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const match = agreements.find((a) => a.id === id);
      link.download = match ? `signed_${match.agreement_number}.pdf` : `signed_agreement_${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download signed agreement document");
    }
  };

  const filterTabs: { label: string; value: AgreementStatus | undefined }[] = [
    { label: "All Agreements", value: undefined },
    { label: "Draft", value: "draft" },
    { label: "Shared", value: "shared" },
    { label: "Signed", value: "signed" },
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hospital Agreements</h1>
          </div>
          <p className="text-sm text-slate-500 pl-8">Draft service contracts, SLA terms, and upload signed hospital agreements.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition pl-8 pr-8"
        >
          <Plus className="h-4 w-4" /> Create Agreement
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
      <AgreementsTable
        agreements={agreements}
        loading={loading}
        onShare={handleShare}
        onUploadClick={handleUploadClick}
        onDownloadPdf={handleDownloadPdf}
        onDownloadSigned={handleDownloadSigned}
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
      <CreateAgreementModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchAgreements}
      />

      <UploadSignedAgreementModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setActiveAgreement(null);
        }}
        onSuccess={fetchAgreements}
        agreement={activeAgreement}
      />
    </div>
  );
}
