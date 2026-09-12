"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { ipdDoctorApi } from "@/services/ipdDoctorApi";
import { dayCareApi } from "@/services/dayCareApi";
import { admissionsApi } from "@/services/admissionsApi";
import { handleError } from "@/utils/errorHandler";

interface DischargeSummaryPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId?: string | null;
  dayCareVisitId?: string | null;
  patientName?: string | null;
  uhid?: string | null;
  documentTitle?: string;
}

export function DischargeSummaryPdfPreviewModal({
  isOpen,
  onClose,
  admissionId,
  dayCareVisitId,
  patientName,
  uhid,
  documentTitle = "Discharge Summary",
}: DischargeSummaryPdfPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [isDownloading, setIsDownloading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      window.URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const fetchPdf = useCallback(async () => {
    if (!admissionId && !dayCareVisitId) return;

    setLoading(true);
    setError(null);
    try {
      cleanupObjectUrl();

      let blob: Blob;
      if (dayCareVisitId) {
        blob = await dayCareApi.getDischargeSummaryPdf(dayCareVisitId);
      } else if (admissionId) {
        try {
          blob = await ipdDoctorApi.getDischargeSummaryPdf(admissionId);
        } catch {
          blob = await admissionsApi.getDischargeSummaryPdf(admissionId);
        }
      } else {
        return;
      }

      const url = window.URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setPdfUrl(url);
    } catch (err: any) {
      console.error("Failed to fetch discharge summary PDF:", err);
      const status = err?.response?.status;
      if (status === 404) {
        setError("No discharge summary record found.");
      } else {
        setError(
          err?.response?.data?.detail ||
            err?.response?.data?.message ||
            "Failed to load discharge summary PDF preview."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [admissionId, dayCareVisitId, cleanupObjectUrl]);

  useEffect(() => {
    if (isOpen && (admissionId || dayCareVisitId)) {
      fetchPdf();
    } else {
      cleanupObjectUrl();
      setPdfUrl(null);
      setError(null);
    }

    return () => {
      cleanupObjectUrl();
    };
  }, [isOpen, admissionId, dayCareVisitId, fetchPdf, cleanupObjectUrl]);

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const docName = `Discharge-Summary-${uhid || (admissionId || dayCareVisitId || "").slice(0, 8)}.pdf`;

      if (dayCareVisitId) {
        await dayCareApi.downloadDischargeSummaryPdf(dayCareVisitId, docName);
      } else if (admissionId) {
        await ipdDoctorApi.downloadDischargeSummaryPdf(admissionId, docName);
      }
    } catch (err) {
      handleError(err, { defaultMessage: "Failed to download PDF", logError: true });
    } finally {
      setIsDownloading(false);
    }
  };

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.0));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.6));
  const resetZoom = () => setZoom(1.0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-[92vh] overflow-hidden">
        {/* Header Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {documentTitle} Preview
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Server Rendered
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {patientName && <span className="font-semibold text-slate-700 dark:text-slate-300">{patientName}</span>}
                {patientName && uhid && " · "}
                {uhid && <span>UHID: {uhid}</span>}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom controls */}
            <div className="hidden sm:flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
              <button
                onClick={zoomOut}
                disabled={zoom <= 0.6 || loading}
                title="Zoom Out"
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={resetZoom}
                disabled={zoom === 1.0 || loading}
                title="Reset Zoom"
                className="px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50 cursor-pointer"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={zoomIn}
                disabled={zoom >= 2.0 || loading}
                title="Zoom In"
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Print button */}
            <button
              onClick={handlePrint}
              disabled={loading || !!error || !pdfUrl}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print Document</span>
            </button>

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={loading || !!error || isDownloading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative flex-1 bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 overflow-auto flex justify-center items-start">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/90 dark:bg-slate-950/90 z-20">
              <Loader2 className="h-10 w-10 animate-spin text-sky-600 dark:text-sky-400 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Generating Discharge Summary PDF...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Applying institutional branding and formatting clinical records
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center p-8 max-w-md text-center my-auto">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                Unable to Load PDF
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{error}</p>
              <button
                onClick={() => fetchPdf()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 rounded-xl cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {pdfUrl && !error && (
            <div
              className="bg-white rounded-lg shadow-xl overflow-hidden transition-transform origin-top duration-150"
              style={{
                width: `${Math.round(820 * zoom)}px`,
                height: `${Math.round(1120 * zoom)}px`,
                maxWidth: "100%",
              }}
            >
              <iframe
                ref={iframeRef}
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0"
                title="Discharge Summary PDF Preview"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
