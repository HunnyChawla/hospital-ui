"use client";

import React, { useEffect, useState } from "react";
import { X, Download, Printer, Loader2, AlertTriangle } from "lucide-react";
import { healthDocumentsApi, type DocumentVersion } from "@/services/healthRecordApi";
import { useTenantContext } from "@/lib/tenant-context";
import { getErrorMessage } from "@/utils/errorHandler";

interface DocumentViewerModalProps {
    version: DocumentVersion | null;
    onClose: () => void;
}

const DOC_LABELS: Record<string, string> = {
    Prescription: "Prescription",
    DiagnosticReport: "Lab report",
    OPConsultation: "Consultation",
    DischargeSummary: "Discharge summary",
    ImmunizationRecord: "Immunisation record",
    HealthDocumentRecord: "Health document",
    WellnessRecord: "Wellness record",
    Invoice: "Invoice",
};

/**
 * Views a finalised document version — the server-rendered PDF, not a
 * re-render in the browser.
 *
 * It has to be the server's bytes: Phase 7 sends an MD5 of exactly these to
 * the HIU, so what a doctor checks before publishing must be the same file
 * that is published. A browser-side re-render would look right and prove
 * nothing.
 *
 * The blob is fetched with the API client rather than pointed at with an
 * `<iframe src>`, because the endpoint needs an Authorization header and an
 * iframe sends none.
 */
export function DocumentViewerModal({ version, onClose }: DocumentViewerModalProps) {
    const { tenantId, isPlatformOwner } = useTenantContext();
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!version) {
            setUrl(null);
            setError(null);
            return;
        }

        let cancelled = false;
        let objectUrl: string | null = null;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const blob = await healthDocumentsApi.pdf(
                    version.id,
                    isPlatformOwner ? tenantId ?? undefined : undefined
                );
                if (cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setUrl(objectUrl);
            } catch (err) {
                if (!cancelled) setError(getErrorMessage(err) || "Could not load this document");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
            // Revoked on unmount: an object URL holds the whole PDF in memory
            // until it is, and a doctor flicking through ten versions would
            // otherwise accumulate all ten.
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [version, tenantId, isPlatformOwner]);

    if (!version) return null;

    const label = DOC_LABELS[version.doc_type] ?? version.doc_type;

    const download = () => {
        if (!url) return;
        const link = document.createElement("a");
        link.href = url;
        link.download = `${label.replace(/\s+/g, "-").toLowerCase()}-v${version.version}.pdf`;
        link.click();
    };

    const print = () => {
        // Print the PDF itself via its own frame, so the browser prints the
        // server's document rather than a screenshot of this modal.
        const frame = document.getElementById(
            "health-record-pdf-frame"
        ) as HTMLIFrameElement | null;
        frame?.contentWindow?.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
                <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">{label}</h2>
                        <p className="text-xs text-slate-500">
                            Version {version.version}
                            {version.superseded_at ? " · superseded" : " · current"}
                            {version.finalised_by ? ` · finalised by ${version.finalised_by}` : ""}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={print}
                            disabled={!url}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                        </button>
                        <button
                            onClick={download}
                            disabled={!url}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Download
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 bg-slate-100">
                    {loading && (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    )}

                    {error && (
                        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                            <AlertTriangle className="h-8 w-8 text-amber-500" />
                            <p className="mt-3 text-sm font-semibold text-slate-700">
                                This document could not be shown
                            </p>
                            <p className="mt-1 max-w-md text-xs text-slate-500">{error}</p>
                        </div>
                    )}

                    {url && !loading && !error && (
                        <iframe
                            id="health-record-pdf-frame"
                            src={url}
                            title={`${label} version ${version.version}`}
                            className="h-full w-full border-0"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
