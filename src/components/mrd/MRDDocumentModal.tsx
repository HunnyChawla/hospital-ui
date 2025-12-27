"use client";

import { useState, useEffect } from "react";
import { mrdApi, MRDDocument, UpdateMRDDocumentRequest, MRDDocumentCategory } from "@/services/mrdApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "@/components/common/Modal";
import { FileText, Download, Trash2, Loader2, Save, X, Calendar, User, Tag, File } from "lucide-react";
import { formatDate as formatDateUtil } from "@/utils/format";

const DOCUMENT_CATEGORIES: { value: MRDDocumentCategory; label: string }[] = [
  { value: "DISCHARGE_SUMMARY", label: "Discharge Summary" },
  { value: "LAB_REPORT", label: "Lab Report" },
  { value: "RADIOLOGY_REPORT", label: "Radiology Report" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "INSURANCE_DOCUMENT", label: "Insurance Document" },
  { value: "ID_PROOF", label: "ID Proof" },
  { value: "CONSENT_FORM", label: "Consent Form" },
  { value: "ADMISSION_FORM", label: "Admission Form" },
  { value: "MEDICAL_CERTIFICATE", label: "Medical Certificate" },
  { value: "IPD_REPORT", label: "IPD Report" },
  { value: "OPD_REPORT", label: "OPD Report" },
  { value: "PATHOLOGY_REPORT", label: "Pathology Report" },
  { value: "DIAGNOSTIC_REPORT", label: "Diagnostic Report" },
  { value: "SURGICAL_REPORT", label: "Surgical Report" },
  { value: "OTHER", label: "Other" },
];

interface MRDDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export function MRDDocumentModal({
  isOpen,
  onClose,
  documentId,
  onUpdate,
  onDelete,
}: MRDDocumentModalProps) {
  const [document, setDocument] = useState<MRDDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [documentName, setDocumentName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MRDDocumentCategory>("OTHER");
  const [tags, setTags] = useState("");

  // Fetch document
  useEffect(() => {
    if (isOpen && documentId) {
      fetchDocument();
    } else {
      setDocument(null);
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, documentId]);

  const fetchDocument = async () => {
    if (!documentId) return;

    setLoading(true);
    try {
      const doc = await mrdApi.getById(documentId);
      setDocument(doc);
      setDocumentName(doc.document_name);
      setDescription(doc.description || "");
      setCategory(doc.category);
      setTags(doc.tags.join(", "));
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to load document: ${errorMessage}`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!document) return;

    setIsSaving(true);
    try {
      const updates: UpdateMRDDocumentRequest = {
        document_name: documentName.trim(),
        description: description.trim() || undefined,
        category,
        tags: tags.trim() ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      };

      const updated = await mrdApi.update(document.id, updates);
      setDocument(updated);
      setIsEditing(false);
      toast.success("Document updated successfully");
      onUpdate?.();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to update document: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!document) return;

    setIsDeleting(true);
    try {
      await mrdApi.delete(document.id);
      toast.success("Document deleted successfully");
      onDelete?.();
      onClose();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to delete document: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    setIsDownloading(true);
    try {
      const blob = await mrdApi.download(document.id);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.document_name || `document-${document.id}`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      toast.success("Document downloaded successfully");
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to download document: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
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

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Document Details" size="lg">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
          <span className="ml-2 text-sm text-slate-600">Loading document...</span>
        </div>
      </Modal>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Document Details" size="lg">
      <div className="space-y-6">
        {/* View Mode */}
        {!isEditing && (
          <>
            {/* Document Info */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100">
                  <FileText className="h-6 w-6 text-sky-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{document.document_name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                      {DOCUMENT_CATEGORIES.find((c) => c.value === document.category)?.label || document.category}
                    </span>
                    <span className="text-xs text-slate-500">{document.document_type}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-500">{formatFileSize(document.file_size)}</span>
                  </div>
                </div>
              </div>

              {document.description && (
                <div>
                  <p className="text-sm font-medium text-slate-700">Description</p>
                  <p className="mt-1 text-sm text-slate-600">{document.description}</p>
                </div>
              )}

              {document.tags && document.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700">Tags</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {document.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Uploaded</p>
                    <p className="text-sm font-medium text-slate-700">{formatDate(document.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">File Type</p>
                    <p className="text-sm font-medium text-slate-700">{document.mime_type || document.document_type}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-medium text-rose-900">Are you sure you want to delete this document?</p>
                <p className="mt-1 text-xs text-rose-700">This action cannot be undone.</p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Edit Mode */}
        {isEditing && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Document Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MRDDocumentCategory)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                required
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Enter tags separated by commas"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
              <p className="text-xs text-slate-500">e.g., id-proof, aadhaar, insurance</p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setDocumentName(document.document_name);
                  setDescription(document.description || "");
                  setCategory(document.category);
                  setTags(document.tags.join(", "));
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !documentName.trim()}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:shadow disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

