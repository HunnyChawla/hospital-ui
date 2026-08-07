"use client";

import React, { useState } from "react";
import { FileText, Eye, Loader2, History } from "lucide-react";
import { useEpisodeDocuments } from "@/hooks/queries/useHealthRecord";
import { DocumentViewerModal } from "./DocumentViewerModal";
import type { DocumentVersion, HiType } from "@/services/healthRecordApi";

interface DocumentVersionHistoryProps {
    episodeId: string | null;
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
 * Superseded versions are kept visible rather than hidden behind the current
 * one. A version exists precisely because something changed after the record
 * was signed, and "what did this say when I signed it" is the question the
 * history is for — hiding the answer defeats it.
 */
export function DocumentVersionHistory({ episodeId }: DocumentVersionHistoryProps) {
    const { data: documents, isLoading } = useEpisodeDocuments(episodeId);
    const [viewing, setViewing] = useState<DocumentVersion | null>(null);

    if (!episodeId) return null;

    if (isLoading) {
        return (
            <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
        );
    }

    const versions = documents ?? [];

    if (versions.length === 0) {
        return (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                Nothing has been finalised for this visit yet. Finalising freezes its documents
                and makes them available here.
            </p>
        );
    }

    return (
        <>
            <ul className="space-y-2">
                {versions.map((version) => (
                    <li
                        key={version.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    >
                        <div className="flex min-w-0 items-center gap-2.5">
                            <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-800">
                                    {DOC_LABELS[version.doc_type] ?? version.doc_type}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {version.version > 1 && (
                                        <span className="mr-1.5 inline-flex items-center gap-1 text-amber-600">
                                            <History className="h-3 w-3" />
                                            version {version.version}
                                        </span>
                                    )}
                                    finalised {new Date(version.finalised_at).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setViewing(version)}
                            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            View
                        </button>
                    </li>
                ))}
            </ul>

            <DocumentViewerModal version={viewing} onClose={() => setViewing(null)} />
        </>
    );
}
