"use client";

import React, { useState } from "react";
import { FileText, Eye, Loader2, History, CheckCircle2, Clock } from "lucide-react";
import { useEpisodeDocuments } from "@/hooks/queries/useHealthRecord";
import { DocumentViewerModal } from "./DocumentViewerModal";
import type { DocumentVersion, HiType } from "@/services/healthRecordApi";

interface DocumentVersionHistoryProps {
    episodeId: string | null;
    /** Pass the episode status so we can tailor the empty-state message. */
    episodeStatus?: "open" | "finalised" | "reopened";
}

const DOC_LABELS: Record<HiType, string> = {
    Prescription: "Prescription",
    DiagnosticReport: "Lab report",
    OPConsultation: "Consultation",
    DischargeSummary: "Discharge summary",
    ImmunizationRecord: "Immunisation",
    HealthDocumentRecord: "Document",
    WellnessRecord: "Wellness",
    Invoice: "Invoice",
};

/**
 * The documents frozen in one episode, and each one's version history.
 *
 * Documents are grouped by type so it is immediately clear how many versions
 * a Prescription or OPConsultation has — the version history is the audit
 * trail for "what did this say when the doctor signed it, and has it changed".
 *
 * Superseded versions are dimmed but still visible. A version exists precisely
 * because something changed after the record was signed, and hiding it would
 * defeat the purpose of keeping it.
 */
export function DocumentVersionHistory({
    episodeId,
    episodeStatus,
}: DocumentVersionHistoryProps) {
    const { data: documents, isLoading } = useEpisodeDocuments(episodeId);
    const [viewing, setViewing] = useState<DocumentVersion | null>(null);

    if (!episodeId) return null;

    if (isLoading) {
        return (
            <div className="flex h-20 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
        );
    }

    const versions = documents ?? [];

    if (versions.length === 0) {
        const isOpen = !episodeStatus || episodeStatus === "open";
        return (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
                <Clock className="mx-auto h-5 w-5 text-slate-300" />
                <p className="mt-2 text-xs text-slate-500">
                    {isOpen
                        ? "No health records finalised yet. Records are frozen and made available here when the visit is finalised."
                        : "No documents were recorded for this visit."}
                </p>
            </div>
        );
    }

    // Group versions by document type, preserving ABDM canonical order.
    const grouped = new Map<HiType, DocumentVersion[]>();
    for (const v of versions) {
        const type = v.doc_type as HiType;
        if (!grouped.has(type)) grouped.set(type, []);
        grouped.get(type)!.push(v);
    }

    return (
        <>
            <div className="space-y-3">
                {[...grouped.entries()].map(([type, typeVersions]) => (
                    <DocumentTypeGroup
                        key={type}
                        type={type}
                        versions={typeVersions}
                        onView={setViewing}
                    />
                ))}
            </div>

            <DocumentViewerModal version={viewing} onClose={() => setViewing(null)} />
        </>
    );
}

/**
 * All versions of one document type (e.g. all Prescription revisions).
 *
 * The current version is shown prominently at the top. Superseded versions
 * are indented beneath it with a "Superseded" label so it is clear they are
 * historical.
 */
function DocumentTypeGroup({
    type,
    versions,
    onView,
}: {
    type: HiType;
    versions: DocumentVersion[];
    onView: (v: DocumentVersion) => void;
}) {
    // Sort: current first, then superseded oldest-last.
    const sorted = [...versions].sort((a, b) => {
        if (a.is_current) return -1;
        if (b.is_current) return 1;
        return b.version - a.version;
    });

    const current = sorted.find((v) => v.is_current);
    const superseded = sorted.filter((v) => !v.is_current);
    const [showHistory, setShowHistory] = useState(false);

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {/* Current version row */}
            {current && (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-sm font-medium text-slate-800">
                                    {DOC_LABELS[type] ?? type}
                                </p>
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Current
                                </span>
                                {current.version > 1 && (
                                    <span className="text-[10px] text-slate-400">
                                        v{current.version}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Finalised {new Date(current.finalised_at).toLocaleString()}
                                {current.finalised_by && ` · ${current.finalised_by}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-2">
                        {/* Show version history toggle if there are older versions */}
                        {superseded.length > 0 && (
                            <button
                                onClick={() => setShowHistory((v) => !v)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50"
                                title="Show earlier versions of this document"
                            >
                                <History className="h-3 w-3" />
                                {superseded.length} earlier
                            </button>
                        )}
                        <button
                            id={`view-doc-${current.id}`}
                            onClick={() => onView(current)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            View
                        </button>
                    </div>
                </div>
            )}

            {/* If no current version exists yet, show a placeholder */}
            {!current && sorted.length > 0 && (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <FileText className="h-4 w-4 flex-shrink-0 text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">
                            {DOC_LABELS[type] ?? type}
                        </p>
                    </div>
                </div>
            )}

            {/* Superseded / historical versions */}
            {showHistory && superseded.length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Earlier versions
                    </p>
                    {superseded.map((v) => (
                        <div
                            key={v.id}
                            className="flex items-center justify-between gap-3 rounded border border-slate-100 bg-white px-2.5 py-2 opacity-70"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <History className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-600">
                                        v{v.version} — superseded
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                        {new Date(v.finalised_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <button
                                id={`view-doc-${v.id}`}
                                onClick={() => onView(v)}
                                className="inline-flex flex-shrink-0 items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50"
                            >
                                <Eye className="h-3 w-3" />
                                View
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
