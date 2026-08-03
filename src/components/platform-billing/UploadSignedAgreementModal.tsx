"use client";

import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { platformBillingApi } from "@/services/platformBillingApi";
import { Agreement } from "@/types/platformBilling";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Upload, FileText, AlertCircle } from "lucide-react";

interface UploadSignedAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agreement: Agreement | null;
}

export function UploadSignedAgreementModal({
  isOpen,
  onClose,
  onSuccess,
  agreement,
}: UploadSignedAgreementModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== "application/pdf") {
        toast.error("Invalid file format. Please upload a PDF agreement.");
        setFile(null);
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB limit.");
        setFile(null);
        return;
      }
      setFile(selected);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreement || !file) return;

    setSubmitting(true);
    try {
      await platformBillingApi.agreements.uploadSigned(agreement.id, file);
      toast.success("Signed agreement uploaded successfully");
      setFile(null);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Signed Agreement" size="md">
      {agreement && (
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-sm text-amber-800">
            <div className="flex gap-2 items-start">
              <AlertCircle className="h-4.5 w-4.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                Please upload the signed PDF copy for <strong>{agreement.title}</strong> of{" "}
                <strong>{agreement.tenant_name}</strong> ({agreement.agreement_number}).
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Signed Document File (PDF)</span>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:bg-slate-50 hover:border-sky-400 transition">
              <Upload className="h-10 w-10 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-600">
                {file ? file.name : "Click to browse or drop signed PDF file here"}
              </span>
              <span className="text-xs text-slate-400 mt-1">PDF file format only (Max 10MB)</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                required
              />
            </label>
          </div>

          {file && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 border border-slate-200">
              <FileText className="h-5 w-5 text-sky-500 flex-shrink-0" />
              <div className="flex-grow min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{file.name}</p>
                <p className="text-[10px] text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !file}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
            >
              {submitting ? "Uploading..." : "Upload Copy"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
