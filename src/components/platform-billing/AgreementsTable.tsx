"use client";

import { Agreement } from "@/types/platformBilling";
import { formatDate } from "@/utils/format";
import { FileText, Share2, Upload, FileCheck, Download, Loader2 } from "lucide-react";

interface AgreementsTableProps {
  agreements: Agreement[];
  loading: boolean;
  onShare: (id: string) => void;
  onUploadClick: (agreement: Agreement) => void;
  onDownloadPdf: (id: string) => void;
  onDownloadSigned: (id: string) => void;
}

export function AgreementsTable({
  agreements,
  loading,
  onShare,
  onUploadClick,
  onDownloadPdf,
  onDownloadSigned,
}: AgreementsTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">Draft</span>;
      case "shared":
        return <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">Shared</span>;
      case "signed":
        return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Signed</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (agreements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-2 text-sm font-semibold text-slate-900">No agreements found</h3>
        <p className="mt-1 text-sm text-slate-500">Get started by drafting a new service agreement.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-500">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700">
            <tr>
              <th className="px-6 py-3">Agreement Number</th>
              <th className="px-6 py-3">Hospital</th>
              <th className="px-6 py-3">Agreement Title</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {agreements.map((agr) => (
              <tr key={agr.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">{agr.agreement_number}</td>
                <td className="px-6 py-4">{agr.tenant_name}</td>
                <td className="px-6 py-4">{agr.title}</td>
                <td className="whitespace-nowrap px-6 py-4">{formatDate(agr.created_at)}</td>
                <td className="whitespace-nowrap px-6 py-4 text-center">{getStatusBadge(agr.status)}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {agr.status === "draft" && (
                      <button
                        onClick={() => onShare(agr.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50"
                        title="Mark Shared"
                      >
                        <Share2 className="h-3.5 w-3.5" /> Share
                      </button>
                    )}
                    {agr.status === "shared" && (
                      <button
                        onClick={() => onUploadClick(agr)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                        title="Upload Signed Copy"
                      >
                        <Upload className="h-3.5 w-3.5" /> Upload Signed
                      </button>
                    )}
                    {agr.status === "signed" && (
                      <button
                        onClick={() => onDownloadSigned(agr.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                        title="Download Signed Copy"
                      >
                        <FileCheck className="h-3.5 w-3.5" /> Signed PDF
                      </button>
                    )}
                    <button
                      onClick={() => onDownloadPdf(agr.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      title="Download Unsigned PDF"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF Template
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
