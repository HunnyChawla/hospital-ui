"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { labBookingsApi, type LabBooking } from "@/services/labBookingsApi";
import { getErrorMessage } from "@/utils/errorHandler";

let activePrintIframe: HTMLIFrameElement | null = null;
let activePrintBlobUrl: string | null = null;

function cleanupActivePrintFrame() {
  if (activePrintIframe && activePrintIframe.parentNode) {
    activePrintIframe.parentNode.removeChild(activePrintIframe);
  }
  activePrintIframe = null;

  if (activePrintBlobUrl) {
    window.URL.revokeObjectURL(activePrintBlobUrl);
    activePrintBlobUrl = null;
  }
}

export async function printServerLabReportPdf(
  bookingId: string,
  options?: {
    tenantId?: string;
    onFallbackPreview?: () => void;
  }
): Promise<void> {
  const blob = await labBookingsApi.getReportPdf(bookingId, options?.tenantId);
  const blobUrl = window.URL.createObjectURL(blob);

  cleanupActivePrintFrame();

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.title = "Diagnostic Report Print Frame";

  activePrintIframe = iframe;
  activePrintBlobUrl = blobUrl;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    iframe.onload = () => {
      // Allow browser PDF viewer a moment to initialize before invoking print()
      window.setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          finish();
        } catch {
          if (options?.onFallbackPreview) {
            options.onFallbackPreview();
          } else {
            window.open(blobUrl, "_blank", "noopener,noreferrer");
          }
          finish();
        }
      }, 250);
    };

    iframe.onerror = () => {
      if (options?.onFallbackPreview) {
        options.onFallbackPreview();
      } else {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      }
      finish();
    };

    iframe.src = blobUrl;
    document.body.appendChild(iframe);
  });
}

interface LabReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: LabBooking | null;
  tenantId?: string;
}

export function LabReportPdfModal({
  isOpen,
  onClose,
  booking,
  tenantId,
}: LabReportPdfModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      cleanupActivePrintFrame();
    };
  }, []);

  const fetchPdf = useCallback(async () => {
    if (!booking?.id) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const blob = await labBookingsApi.getReportPdf(booking.id, tenantId);
      const nextUrl = window.URL.createObjectURL(blob);
      setPdfUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return nextUrl;
      });
    } catch (error) {
      setErrorMsg(getErrorMessage(error) || "Failed to load diagnostic report PDF");
    } finally {
      setLoading(false);
    }
  }, [booking?.id, tenantId]);

  useEffect(() => {
    if (isOpen && booking?.id) {
      fetchPdf();
    } else {
      setPdfUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return null;
      });
      setErrorMsg(null);
    }
  }, [isOpen, booking?.id, fetchPdf]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handlePrintFromModal = () => {
    if (!pdfUrl) return;
    try {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
    } catch {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownloadPdf = async () => {
    if (!booking?.id) return;
    setDownloading(true);
    try {
      await labBookingsApi.downloadReportPdf(
        booking.id,
        `Diagnostic_Report_${booking.booking_number || booking.id.slice(0, 8)}.pdf`,
        tenantId
      );
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to download PDF report");
    } finally {
      setDownloading(false);
    }
  };

  if (!mounted || !isOpen || !booking) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-report-pdf-modal-title"
    >
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="lab-report-pdf-modal-title"
                className="truncate text-sm font-bold text-slate-900 sm:text-base"
              >
                Diagnostic Report — {booking.booking_number}
              </h2>
              <p className="text-xs text-slate-500">
                Server-generated official PDF report
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintFromModal}
              disabled={!pdfUrl || loading}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              Print
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:from-sky-600 hover:to-teal-600 disabled:opacity-60 cursor-pointer"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download PDF
            </button>

            {pdfUrl && (
              <button
                type="button"
                onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Tab
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close report preview"
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative flex-1 bg-slate-100 p-2 sm:p-3">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              <p className="text-sm font-medium">Loading Diagnostic Report PDF...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                Could not load report PDF
              </p>
              <p className="max-w-md text-xs text-slate-500">{errorMsg}</p>
              <button
                type="button"
                onClick={fetchPdf}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          ) : pdfUrl ? (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              title={`Diagnostic Report ${booking.booking_number}`}
              className="h-full w-full rounded-xl border border-slate-200 bg-white"
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
