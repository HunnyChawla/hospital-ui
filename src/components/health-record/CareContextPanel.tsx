"use client";

/**
 * CareContextPanel — the patient's ABDM health record view.
 *
 * Shows every episode (care context) for this patient, with:
 * - ABDM linking status per episode
 * - All document versions in each episode, with view buttons
 * - Manual "Link to ABDM" / "Retry" button when linking failed or was skipped
 *
 * Placed in the patient search / detail panel so staff always know what the
 * patient's ABHA app holds and can take action when something is wrong.
 *
 * ABDM rule: one care context per visit, never a second one for the same visit.
 * All updates go through `context/notify` (Phase 5), never by creating a new
 * care context.
 */

import React, { useState } from "react";
import {
    Stethoscope,
    BedDouble,
    Syringe,
    Scissors,
    FileText,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Clock,
    MessageSquare,
    WifiOff,
    Link2,
    RefreshCw,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import {
    usePatientTimeline,
    useManualLinkCareContext,
} from "@/hooks/queries/useHealthRecord";
import type {
    AbdmLinkStatus,
    Episode,
    EpisodeType,
    HiType,
} from "@/services/healthRecordApi";
import { DocumentVersionHistory } from "./DocumentVersionHistory";

interface CareContextPanelProps {
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

const ABDM_STATUS_CONFIG: Record<
    AbdmLinkStatus,
    { label: string; icon: React.ElementType; badge: string; dot: string }
> = {
    unlinked: {
        label: "Not linked to ABDM",
        icon: WifiOff,
        badge: "bg-slate-100 text-slate-500 border-slate-200",
        dot: "bg-slate-300",
    },
    pending: {
        label: "Linking in progress…",
        icon: Clock,
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-400",
    },
    linked: {
        label: "Linked to ABDM",
        icon: CheckCircle2,
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
    },
    sms_sent: {
        label: "SMS sent to patient",
        icon: MessageSquare,
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-400",
    },
    failed: {
        label: "Linking failed",
        icon: AlertCircle,
        badge: "bg-red-50 text-red-700 border-red-200",
        dot: "bg-red-500",
    },
    no_abha: {
        label: "No ABHA on file",
        icon: WifiOff,
        badge: "bg-slate-100 text-slate-400 border-slate-200",
        dot: "bg-slate-200",
    },
};

/**
 * A rich view of this patient's ABDM care contexts.
 *
 * Each card maps 1-to-1 to a visit episode. The status badge and
 * "Link / Retry" button make the ABDM state immediately actionable for staff.
 */
export function CareContextPanel({ patientId }: CareContextPanelProps) {
    const { data, isLoading } = usePatientTimeline(patientId);

    if (!patientId) return null;

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-28 animate-pulse rounded-xl bg-slate-100"
                    />
                ))}
            </div>
        );
    }

    const episodes = data?.items ?? [];

    if (episodes.length === 0) {
        return (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-600">No care contexts yet</p>
                <p className="mt-1 text-xs text-slate-500">
                    A care context opens automatically when a visit is registered.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {episodes.map((episode) => (
                <CareContextCard key={episode.id} episode={episode} />
            ))}
        </div>
    );
}

function CareContextCard({ episode }: { episode: Episode }) {
    // Auto-expand for finalised and reopened episodes — those have actual
    // health records the user needs to see without any extra click.
    const [expanded, setExpanded] = useState(episode.status !== "open");
    const linkCareContext = useManualLinkCareContext();

    const Icon = EPISODE_ICONS[episode.episode_type] ?? Stethoscope;
    const abdmStatus = episode.abdm_link_status ?? "unlinked";
    const config = ABDM_STATUS_CONFIG[abdmStatus] ?? ABDM_STATUS_CONFIG.unlinked;
    const AbdmIcon = config.icon;

    const isLinking = linkCareContext.isPending && linkCareContext.variables === episode.id;
    const canLink = abdmStatus === "failed" || abdmStatus === "unlinked";

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Card header */}
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="flex min-w-0 gap-3">
                    {/* Episode type icon with ABDM status dot */}
                    <div className="relative flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                            <Icon className="h-5 w-5" />
                        </div>
                        <span
                            className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white ${config.dot}`}
                            title={config.label}
                        />
                    </div>

                    <div className="min-w-0">
                        {/* Title row */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                                {EPISODE_LABELS[episode.episode_type]}
                            </span>
                            <span className="text-xs text-slate-500">
                                {episode.care_context_display || episode.reference_number}
                            </span>
                        </div>

                        {/* Date */}
                        <p className="mt-0.5 text-xs text-slate-500">
                            {new Date(episode.occurred_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                        </p>

                        {/* HI type pills */}
                        {episode.hi_types.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {episode.hi_types.map((type) => (
                                    <span
                                        key={type}
                                        className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"
                                    >
                                        {HI_TYPE_LABELS[type] ?? type}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* ABDM status badge */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${config.badge}`}
                            >
                                <AbdmIcon className="h-3 w-3" />
                                {config.label}
                            </span>
                            {episode.abdm_linked_at && (
                                <span className="text-[11px] text-slate-400">
                                    {new Date(episode.abdm_linked_at).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            )}
                        </div>

                        {/* Error detail */}
                        {abdmStatus === "failed" && episode.abdm_link_error && (
                            <p className="mt-1 text-[11px] text-red-600">
                                Error: {episode.abdm_link_error}
                            </p>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-shrink-0 items-center gap-2">
                    {/* Manual ABDM link button */}
                    {canLink && (
                        <button
                            id={`care-context-link-${episode.id}`}
                            onClick={() => linkCareContext.mutate(episode.id)}
                            disabled={isLinking}
                            title={
                                abdmStatus === "failed"
                                    ? "Retry ABDM linking"
                                    : "Link this care context to the patient's ABHA app"
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                        >
                            {isLinking ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : abdmStatus === "failed" ? (
                                <RefreshCw className="h-3.5 w-3.5" />
                            ) : (
                                <Link2 className="h-3.5 w-3.5" />
                            )}
                            {abdmStatus === "failed" ? "Retry" : "Link to ABDM"}
                        </button>
                    )}

                    {/* Expand / collapse documents */}
                    <button
                        id={`care-context-expand-${episode.id}`}
                        onClick={() => setExpanded((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        {expanded ? (
                            <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Hide
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Documents
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Document version list — uses the shared DocumentVersionHistory
                component so both the PatientEpisodeTimeline and this panel
                show the same grouped-by-type, current/superseded layout. */}
            {expanded && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <DocumentVersionHistory
                        episodeId={episode.id}
                        episodeStatus={episode.status}
                    />
                </div>
            )}
        </div>
    );
}
