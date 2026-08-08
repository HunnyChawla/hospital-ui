"use client";

import React, { useState } from "react";
import {
    Stethoscope,
    BedDouble,
    Syringe,
    Scissors,
    Lock,
    Unlock,
    Loader2,
    FileText,
} from "lucide-react";
import {
    usePatientTimeline,
    useFinaliseEpisode,
    useReopenEpisode,
} from "@/hooks/queries/useHealthRecord";
import { usePermissions } from "@/hooks/usePermissions";
import type {
    Episode,
    EpisodeType,
    HiType,
    ReopenReason,
} from "@/services/healthRecordApi";
import { DocumentVersionHistory } from "./DocumentVersionHistory";
import { FinaliseConfirmDialog, mayReopenEpisode } from "./FinaliseConfirmDialog";

interface PatientEpisodeTimelineProps {
    patientId: string | null;
}

const EPISODE_ICONS: Record<EpisodeType, React.ElementType> = {
    opd_visit: Stethoscope,
    ipd_admission: BedDouble,
    day_care_visit: Syringe,
    planned_surgery: Scissors,
};

const EPISODE_LABELS: Record<EpisodeType, string> = {
    opd_visit: "OPD visit",
    ipd_admission: "Admission",
    day_care_visit: "Day care",
    planned_surgery: "Surgery",
};

/**
 * What each HI type is called on screen.
 *
 * Not the ABDM code. "DiagnosticReport" is the wire value; a receptionist
 * reads "Lab report".
 */
const HI_TYPE_LABELS: Record<HiType, string> = {
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
 * Everything that has happened to this patient here, newest first.
 *
 * The episode is the unit ABDM links and publishes, so this screen is also
 * the answer to "what would this patient see in their health app" — which is
 * why it shows the finalised state rather than hiding it as a technicality.
 */
export function PatientEpisodeTimeline({ patientId }: PatientEpisodeTimelineProps) {
    const { data, isLoading } = usePatientTimeline(patientId);
    const finalise = useFinaliseEpisode();
    const reopen = useReopenEpisode();
    const { isAdmin, userRole } = usePermissions();
    const [confirming, setConfirming] = useState<{
        id: string;
        mode: "finalise" | "reopen";
    } | null>(null);

    const mayReopen = mayReopenEpisode(isAdmin, userRole);

    if (!patientId) return null;

    if (isLoading) {
        return (
            <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    const episodes = data?.items ?? [];

    if (episodes.length === 0) {
        return (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-600">No visits recorded yet</p>
                <p className="mt-1 text-xs text-slate-500">
                    Episodes are created automatically when a visit is registered.
                </p>
            </div>
        );
    }

    return (
        <ol className="space-y-3">
            {episodes.map((episode) => (
                <EpisodeRow
                    key={episode.id}
                    episode={episode}
                    mayReopen={mayReopen}
                    onFinalise={() => setConfirming({ id: episode.id, mode: "finalise" })}
                    onReopen={() => setConfirming({ id: episode.id, mode: "reopen" })}
                    isBusy={
                        (finalise.isPending && finalise.variables === episode.id) ||
                        (reopen.isPending && reopen.variables?.episodeId === episode.id)
                    }
                />
            ))}

            {/* Same dialog as every other finalise/reopen control in the
                product. This screen previously reopened a finalised record on
                a single click, with no confirmation, no reason and no
                permission check. */}
            {confirming && (
                <FinaliseConfirmDialog
                    mode={confirming.mode}
                    onCancel={() => setConfirming(null)}
                    onConfirm={(reason?: ReopenReason, note?: string) => {
                        if (confirming.mode === "finalise") finalise.mutate(confirming.id);
                        else if (reason)
                            reopen.mutate({ episodeId: confirming.id, reason, note });
                        setConfirming(null);
                    }}
                />
            )}
        </ol>
    );
}

function EpisodeRow({
    episode,
    mayReopen,
    onFinalise,
    onReopen,
    isBusy,
}: {
    episode: Episode;
    mayReopen: boolean;
    onFinalise: () => void;
    onReopen: () => void;
    isBusy: boolean;
}) {
    const [showDocuments, setShowDocuments] = useState(false);
    const Icon = EPISODE_ICONS[episode.episode_type] ?? Stethoscope;
    const finalised = episode.status === "finalised";

    return (
        <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                    <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                            finalised ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600"
                        }`}
                    >
                        <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                                {EPISODE_LABELS[episode.episode_type]}
                            </span>
                            <span className="text-xs text-slate-500">
                                {episode.reference_number}
                            </span>
                            <StatusChip status={episode.status} />
                        </div>

                        <p className="mt-0.5 text-xs text-slate-500">
                            {new Date(episode.occurred_at).toLocaleString()}
                        </p>

                        {episode.hi_types.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {episode.hi_types.map((type) => (
                                    <span
                                        key={type}
                                        className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                                    >
                                        {HI_TYPE_LABELS[type] ?? type}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-2 text-xs text-slate-400">
                                Nothing recorded against this visit yet
                            </p>
                        )}

                        {/* Only once something has been frozen. An expander
                            offering an empty list on every open visit is noise. */}
                        {episode.status !== "open" && (
                            <button
                                onClick={() => setShowDocuments((open) => !open)}
                                className="mt-2 text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                            >
                                {showDocuments ? "Hide documents" : "View documents"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                    {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : finalised ? (
                        mayReopen && (
                        <button
                            onClick={onReopen}
                            title="Reopen so late documentation can be added. Recorded in the audit trail."
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            <Unlock className="h-3.5 w-3.5" />
                            Reopen
                        </button>
                        )
                    ) : (
                        <button
                            onClick={onFinalise}
                            title="Freeze this visit's documents"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                        >
                            <Lock className="h-3.5 w-3.5" />
                            Finalise
                        </button>
                    )}
                </div>
            </div>

            {showDocuments && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                    <DocumentVersionHistory episodeId={episode.id} />
                </div>
            )}
        </li>
    );
}

function StatusChip({ status }: { status: Episode["status"] }) {
    const styles: Record<Episode["status"], string> = {
        open: "bg-sky-100 text-sky-700",
        finalised: "bg-emerald-100 text-emerald-700",
        // Amber rather than red: reopening is legitimate, not an error state.
        reopened: "bg-amber-100 text-amber-700",
    };
    const labels: Record<Episode["status"], string> = {
        open: "Open",
        finalised: "Finalised",
        reopened: "Reopened",
    };
    return (
        <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${styles[status]}`}>
            {labels[status]}
        </span>
    );
}
