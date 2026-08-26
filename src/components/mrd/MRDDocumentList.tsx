"use client";

import { useState, useEffect } from "react";
import { mrdApi, MRDDocument, MRDDocumentsSearchParams, MRDDocumentCategory } from "@/services/mrdApi";
import { patientsApi, PatientApiResponse } from "@/services/patientsApi";
import { Patient } from "@/types";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  FileText,
  Download,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Calendar,
  User,
  Tag,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Ban,
  Info,
  Link2,
} from "lucide-react";
import { formatDate as formatDateUtil } from "@/utils/format";

interface MRDDocumentListProps {
  patientId?: string;
  category?: MRDDocumentCategory;
  dateFrom?: string;
  dateTo?: string;
  onDocumentClick?: (document: MRDDocument) => void;
  onDocumentEdit?: (document: MRDDocument) => void;
  onDocumentDelete?: (documentId: string) => void;
  refreshTrigger?: number;
}

const CATEGORY_LABELS: Record<MRDDocumentCategory, string> = {
  DISCHARGE_SUMMARY: "Discharge Summary",
  LAB_REPORT: "Lab Report",
  RADIOLOGY_REPORT: "Radiology Report",
  PRESCRIPTION: "Prescription",
  INSURANCE_DOCUMENT: "Insurance Document",
  ID_PROOF: "ID Proof",
  CONSENT_FORM: "Consent Form",
  ADMISSION_FORM: "Admission Form",
  MEDICAL_CERTIFICATE: "Medical Certificate",
  IPD_REPORT: "IPD Report",
  OPD_REPORT: "OPD Report",
  PATHOLOGY_REPORT: "Pathology Report",
  DIAGNOSTIC_REPORT: "Diagnostic Report",
  SURGICAL_REPORT: "Surgical Report",
  OTHER: "Other",
};

export function MRDDocumentList({
  patientId,
  category,
  dateFrom,
  dateTo,
  onDocumentClick,
  onDocumentEdit,
  onDocumentDelete,
  refreshTrigger,
}: MRDDocumentListProps) {
  const [documents, setDocuments] = useState<MRDDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const limit = 20;

  const renderAbhaLinkBadge = (document: MRDDocument) => {
    const status = document.abha_link_status;
    const isIdProof = document.category === "ID_PROOF";

    if (isIdProof || status === "excluded_id_proof") {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200"
          title="Identity proofs are administrative records and are strictly excluded from ABDM health records"
        >
          <Ban className="h-3 w-3 text-slate-400" />
          ID Proof (Excluded)
        </span>
      );
    }

    if (status === "linked") {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200 shadow-sm"
          title={`Linked to ABDM Care Context${document.care_context_reference ? ` (${document.care_context_reference})` : ""}`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Linked to ABHA
        </span>
      );
    }

    if (status === "pending") {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 border border-sky-200 animate-pulse"
          title="Sync job queued to link with ABDM"
        >
          <Clock className="h-3 w-3 text-sky-600" />
          Syncing to ABHA
        </span>
      );
    }

    if (status === "sms_sent") {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200"
          title="ABDM deep-link SMS sent to patient"
        >
          <Link2 className="h-3 w-3 text-blue-600" />
          SMS Sent
        </span>
      );
    }

    if (status === "failed") {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 border border-rose-200"
          title="Linking attempt failed. Will retry automatically"
        >
          <ShieldAlert className="h-3 w-3 text-rose-600" />
          Link Failed
        </span>
      );
    }

    if (status === "no_abha") {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200"
          title="Patient has no ABHA address on file"
        >
          <Info className="h-3 w-3 text-slate-400" />
          No ABHA
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200"
        title={
          document.care_context_reference
            ? `Care context ${document.care_context_reference} active`
            : "Will be linked upon episode finalisation"
        }
      >
        <Clock className="h-3 w-3 text-amber-500" />
        {document.care_context_reference ? "Care Context Active" : "Pending Sync"}
      </span>
    );
  };

  // Map API response to Patient type
  const mapApiPatientToPatient = (apiPatient: PatientApiResponse): Patient => {
    const fullName = `${apiPatient.first_name} ${apiPatient.last_name || ""}`.trim();
    return {
      id: apiPatient.id,
      name: fullName,
      age: 0,
      gender: "Other",
      mobile: apiPatient.mobile,
      healthId: apiPatient.uhid || apiPatient.abha_id || "",
      doctor: "",
      lastVisit: apiPatient.updated_at || apiPatient.created_at,
      outstanding: 0,
      status: "Active" as const,
    };
  };

  // Fetch patient names
  const fetchPatientName = async (patientId: string) => {
    if (patientNames[patientId]) {
      return patientNames[patientId];
    }

    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiPatient = await patientsApi.getById(patientId, tenantId || undefined);
      const patient = mapApiPatientToPatient(apiPatient);
      setPatientNames((prev) => ({ ...prev, [patientId]: patient.name }));
      return patient.name;
    } catch (error) {
      console.error("Failed to fetch patient:", error);
      return "Unknown Patient";
    }
  };

  // Fetch documents
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params: MRDDocumentsSearchParams = {
        page,
        limit,
        patient_id: patientId,
        category,
        date_from: dateFrom,
        date_to: dateTo,
      };

      const response = await mrdApi.list(params);
      setDocuments(response.items);
      setTotal(response.total);
      setHasNext(response.has_next);
      setHasPrev(response.has_prev);

      // Fetch patient names for all documents
      const uniquePatientIds = [...new Set(response.items.map((doc) => doc.patient_id))];
      for (const pid of uniquePatientIds) {
        if (!patientNames[pid]) {
          await fetchPatientName(pid);
        }
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to load documents: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, patientId, category, dateFrom, dateTo, refreshTrigger]);

  const handleDownload = async (doc: MRDDocument) => {
    setDownloadingId(doc.id);
    try {
      const blob = await mrdApi.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = doc.document_name || `document-${doc.id}`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      toast.success("Document downloaded successfully");
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to download document: ${errorMessage}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      await mrdApi.delete(documentId);
      toast.success("Document deleted successfully");
      
      // If we're on a page that might become empty after deletion, reset to page 1
      // Otherwise, refresh the current page
      if (documents.length === 1 && page > 1) {
        setPage(1);
      } else {
        // Refresh the list on current page
        await fetchDocuments();
      }
      
      // Notify parent
      onDocumentDelete?.(documentId);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to delete document: ${errorMessage}`);
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return formatDateUtil(dateString) + " " + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateString;
    }
  };

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        <span className="ml-2 text-sm text-slate-600">Loading documents...</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-slate-400" />
        <p className="mt-4 text-sm font-medium text-slate-700">No documents found</p>
        <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or upload a new document</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Documents Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  ABHA Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  File Info
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.map((document) => (
                <tr key={document.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sky-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{document.document_name}</p>
                        {document.description && (
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{document.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm text-slate-700">
                        {patientNames[document.patient_id] || "Loading..."}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                      {CATEGORY_LABELS[document.category] || document.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderAbhaLinkBadge(document)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-600">
                      <p>{formatFileSize(document.file_size)}</p>
                      <p className="mt-0.5 text-slate-500">{document.document_type}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(document.created_at)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onDocumentClick?.(document)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-sky-600"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(document)}
                        disabled={downloadingId === document.id}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-sky-600 disabled:opacity-50"
                        title="Download"
                      >
                        {downloadingId === document.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => onDocumentEdit?.(document)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-amber-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(document.id)}
                        disabled={deletingId === document.id}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600 disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === document.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {(hasNext || hasPrev) && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-600">
            Showing {documents.length} of {total} documents
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev || loading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext || loading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Confirm Delete</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700">
                Are you sure you want to delete this document? This action cannot be undone.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={deletingId === deleteConfirmId}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={deletingId === deleteConfirmId}
                  className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {deletingId === deleteConfirmId ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

