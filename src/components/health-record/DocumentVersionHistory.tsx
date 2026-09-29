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

    // Group versions by document instance key: (doc_type, source_id)
    // Preserves order while ensuring each distinct document (e.g. OPD Invoice vs IPD Invoice)
    // has its own dedicated card and separate revision history.
    const instanceMap = new Map<string, DocumentVersion[]>();
    for (const v of versions) {
        const key = `${v.doc_type}:${v.source_id}`;
        if (!instanceMap.has(key)) instanceMap.set(key, []);
        instanceMap.get(key)!.push(v);
    }

    return (
        <>
            <div className="space-y-2.5">
                {[...instanceMap.entries()].map(([key, instanceVersions]) => (
                    <DocumentInstanceCard
                        key={key}
                        versions={instanceVersions}
                        onView={setViewing}
                    />
                ))}
            </div>

            <DocumentViewerModal version={viewing} onClose={() => setViewing(null)} />
        </>
    );
}

/**
 * One document instance (e.g. OPD Invoice INV-001 or Prescription RX-002) with its
 * current live version and expandable superseded history.
 */
function DocumentInstanceCard({
    versions,
    onView,
}: {
    versions: DocumentVersion[];
    onView: (v: DocumentVersion) => void;
}) {
    // Sort: current first, then superseded newest version first.
    const sorted = [...versions].sort((a, b) => {
        if (a.is_current && !b.is_current) return -1;
        if (!a.is_current && b.is_current) return 1;
        return b.version - a.version;
    });

    const current = sorted.find((v) => v.is_current) || sorted[0];
    const superseded = sorted.filter((v) => v.id !== current?.id);
    const [showHistory, setShowHistory] = useState(false);

    if (!current) return null;

    const docType = current.doc_type as HiType;
    const baseLabel = DOC_LABELS[docType] ?? docType;
    const displayTitle = current.title || baseLabel;
    const docNumber = current.document_number;
    const subType = current.sub_type?.toUpperCase();

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {/* Current version row */}
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-medium text-slate-800">
                                {displayTitle}
                            </p>
                            {docNumber && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-600">
                                    {docNumber}
                                </span>
                            )}
                            {subType && subType !== "OPD" && subType !== "IPD" && (
                                <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200">
                                    {subType}
                                </span>
                            )}
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
                            type="button"
                            onClick={() => setShowHistory((v) => !v)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 cursor-pointer"
                            title="Show earlier versions of this document"
                        >
                            <History className="h-3 w-3" />
                            {superseded.length} earlier
                        </button>
                    )}
                    <button
                        type="button"
                        id={`view-doc-${current.id}`}
                        onClick={() => onView(current)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
                    >
                        <Eye className="h-3.5 w-3.5" />
                        View
                    </button>
                </div>
            </div>

            {/* Superseded / historical versions */}
            {showHistory && superseded.length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Earlier versions of this document
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
                                type="button"
                                id={`view-doc-${v.id}`}
                                onClick={() => onView(v)}
                                className="inline-flex flex-shrink-0 items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 cursor-pointer"
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
