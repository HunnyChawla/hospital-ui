"use client";

import React, { useState } from "react";
import {
    Stethoscope,
    BedDouble,
    Syringe,
    Scissors,
    FlaskConical,
    Unlock,
    Loader2,
    FileText,
    Link2,
    CheckCircle2,
    AlertCircle,
    Clock,
    MessageSquare,
    WifiOff,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    HeartPulse,
} from "lucide-react";
import {
    usePatientTimeline,
    useReopenEpisode,
    useManualLinkCareContext,
} from "@/hooks/queries/useHealthRecord";
import { usePermissions } from "@/hooks/usePermissions";
import type {
    AbdmLinkStatus,
    Episode,
    EpisodeType,
    HiType,
    ReopenReason,
} from "@/services/healthRecordApi";
import { DocumentVersionHistory } from "./DocumentVersionHistory";
import { FinaliseConfirmDialog, mayReopenEpisode } from "./FinaliseConfirmDialog";
import { RecordWellnessModal } from "./RecordWellnessModal";
import { toast } from "sonner";

interface PatientEpisodeTimelineProps {
    patientId: string | null;
}

const EPISODE_ICONS: Record<EpisodeType, React.ElementType> = {
    opd_visit: Stethoscope,
    ipd_admission: BedDouble,
    day_care_visit: Syringe,
    planned_surgery: Scissors,
    lab_booking: FlaskConical,
    wellness_record: HeartPulse,
    health_document: FileText,
};

const EPISODE_LABELS: Record<EpisodeType, string> = {
    opd_visit: "OPD visit",
    ipd_admission: "Admission",
    day_care_visit: "Day care",
    planned_surgery: "Surgery",
    lab_booking: "Lab booking",
    wellness_record: "Wellness & Vitals",
    health_document: "Medical Document",
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
 * Episodes are automatically finalised by the backend when a visit is completed
 * (`visit.completed` event). There is no "Finalise" button — documents are
 * written to the health record automatically as each clinical event fires.
 *
 * The "Reopen" button is kept for late documentation (lab results arriving
 * after visit completion, corrected notes, etc.).
 */
export function PatientEpisodeTimeline({ patientId }: PatientEpisodeTimelineProps) {
    const { data, isLoading, isFetching, refetch } = usePatientTimeline(patientId);
    const reopen = useReopenEpisode();
    const { isAdmin, userRole } = usePermissions();
    const [confirming, setConfirming] = useState<{
        id: string;
        mode: "reopen";
    } | null>(null);
    const [isWellnessModalOpen, setIsWellnessModalOpen] = useState(false);

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

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">Health Records & Care Contexts</h3>
                    <p className="text-xs text-slate-500">
                        Chronological encounter history, clinical documents, and ABDM care contexts.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={async () => {
                            await refetch();
                            toast.success("Health records refreshed");
                        }}
                        disabled={isFetching}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
                        title="Refresh Health Records"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsWellnessModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition cursor-pointer"
                    >
                        <HeartPulse className="h-4 w-4" />
                        <span>Record Vitals & Wellness</span>
                    </button>
                </div>
            </div>

            {episodes.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                    <FileText className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-600">No encounters or visits recorded yet</p>
                    <p className="mt-1 text-xs text-slate-500">
                        Episodes are created automatically when visits occur, or you can record vitals above anytime.
                    </p>
                </div>
            ) : (
                <ol className="space-y-3">
                    {episodes.map((episode) => (
                        <EpisodeRow
                            key={episode.id}
                            episode={episode}
                            mayReopen={mayReopen}
                            onReopen={() => setConfirming({ id: episode.id, mode: "reopen" })}
                            isBusy={reopen.isPending && reopen.variables?.episodeId === episode.id}
                        />
                    ))}
                </ol>
            )}

            {confirming && (
                <FinaliseConfirmDialog
                    mode={confirming.mode}
                    onCancel={() => setConfirming(null)}
                    onConfirm={(reason?: ReopenReason, note?: string) => {
                        if (reason)
                            reopen.mutate({ episodeId: confirming.id, reason, note });
                        setConfirming(null);
                    }}
                />
            )}

            <RecordWellnessModal
                isOpen={isWellnessModalOpen}
                onClose={() => setIsWellnessModalOpen(false)}
                patientId={patientId}
            />
        </div>
    );
}

function EpisodeRow({
    episode,
    mayReopen,
    onReopen,
    isBusy,
}: {
    episode: Episode;
    mayReopen: boolean;
    onReopen: () => void;
    isBusy: boolean;
}) {
    // Auto-expand for finalised and reopened episodes — those have actual health
    // records the user needs to see without any extra click. Open episodes start
    // collapsed since they typically have no finalised documents yet.
    const [showDocuments, setShowDocuments] = useState(episode.status !== "open");
    const linkCareContext = useManualLinkCareContext();
    const Icon = EPISODE_ICONS[episode.episode_type] ?? Stethoscope;
    const finalised = episode.status === "finalised";

    const isLinking = linkCareContext.isPending && linkCareContext.variables === episode.id;
    const canRetryLink =
        episode.abdm_link_status === "failed" || episode.abdm_link_status === "unlinked";

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
                            {/* ABDM status badge — always shown so staff know ABHA linking state */}
                            <AbdmStatusChip
                                status={episode.abdm_link_status ?? "unlinked"}
                                linkedAt={episode.abdm_linked_at}
                            />
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

                        {/* ABDM error detail */}
                        {episode.abdm_link_status === "failed" && episode.abdm_link_error && (
                            <p className="mt-1.5 text-[11px] text-red-600">
                                Error: {episode.abdm_link_error}
                            </p>
                        )}

                        {/* Documents toggle — available for all episode statuses.
                            Documents are written as events fire: invoice on creation,
                            consultation + prescription on visit completion, lab
                            reports when results arrive. */}
                        <button
                            onClick={() => setShowDocuments((v) => !v)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                        >
                            {showDocuments ? (
                                <><ChevronUp className="h-3.5 w-3.5" /> Hide documents</>
                            ) : (
                                <><ChevronDown className="h-3.5 w-3.5" /> View documents</>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                    {/* Manual ABDM link button — shown only when linking failed or never tried */}
                    {canRetryLink && (
                        <button
                            id={`link-abdm-${episode.id}`}
                            onClick={() => linkCareContext.mutate(episode.id)}
                            disabled={isLinking}
                            title={
                                episode.abdm_link_status === "failed"
                                    ? "Retry ABDM linking for this care context"
                                    : "Link this care context to ABDM"
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                        >
                            {isLinking ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : episode.abdm_link_status === "failed" ? (
                                <RefreshCw className="h-3.5 w-3.5" />
                            ) : (
                                <Link2 className="h-3.5 w-3.5" />
                            )}
                            {episode.abdm_link_status === "failed" ? "Retry ABDM" : "Link to ABDM"}
                        </button>
                    )}

                    {/* Reopen button — for late documentation.
                        No Finalise button: episodes auto-finalise on visit completion. */}
                    {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                        finalised &&
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
                    )}
                </div>
            </div>

            {showDocuments && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                    <DocumentVersionHistory
                        episodeId={episode.id}
                        episodeStatus={episode.status}
                    />
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
    // User-friendly labels: staff care about clinical state, not system state.
    const labels: Record<Episode["status"], string> = {
        open: "In progress",
        finalised: "Completed",
        reopened: "Reopened",
    };
    return (
        <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${styles[status]}`}>
            {labels[status]}
        </span>
    );
}

/**
 * ABDM care-context linking status badge.
 *
 * Shown on every episode card so staff can immediately tell whether a visit's
 * records have reached the patient's ABHA app — the primary ABDM integration
 * concern from the hospital's perspective.
 */
function AbdmStatusChip({
    status,
    linkedAt,
}: {
    status: AbdmLinkStatus;
    linkedAt: string | null;
}) {
    const config: Record<
        AbdmLinkStatus,
        { label: string; icon: React.ElementType; className: string }
    > = {
        unlinked: {
            label: "Not linked",
            icon: WifiOff,
            className: "bg-slate-100 text-slate-500",
        },
        pending: {
            label: "Linking…",
            icon: Clock,
            className: "bg-amber-100 text-amber-700",
        },
        linked: {
            label: linkedAt
                ? `Linked ${new Date(linkedAt).toLocaleDateString()}`
                : "Linked",
            icon: CheckCircle2,
            className: "bg-emerald-100 text-emerald-700",
        },
        sms_sent: {
            label: "SMS sent",
            icon: MessageSquare,
            className: "bg-blue-100 text-blue-700",
        },
        failed: {
            label: "Link failed",
            icon: AlertCircle,
            className: "bg-red-100 text-red-700",
        },
        no_abha: {
            label: "No ABHA",
            icon: WifiOff,
            className: "bg-slate-100 text-slate-400",
        },
    };

    const { label, icon: Icon, className } = config[status] ?? config.unlinked;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${className}`}
            title={`ABDM status: ${status}`}
        >
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}
