"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Undo2 } from "lucide-react";
import { useAppSelector } from "@/redux/hooks";
import { usePatientDetails } from "@/hooks/usePatientDetails";
import { VitalSignsPanel } from "@/components/doctors/patient-details/VitalSignsPanel";
import { QuickNotesPanel } from "@/components/doctors/patient-details/QuickNotesPanel";
import type { Pathway, QueueItem } from "@/services/pathwaysApi";
import { useStageObservations } from "@/hooks/queries/useObservations";
import { ObservationForm } from "@/components/observations/ObservationForm";
import { nextStagesFor } from "./PathwayQueueCard";

interface GenericStageBodyProps {
    item: QueueItem;
    pathway: Pathway;
    onAdvance: (toStageCode: string) => void;
    isAdvancing: boolean;
    /** True when the viewer is the one holding this patient. */
    heldByMe?: boolean;
    onRelease?: () => void;
    isReleasing?: boolean;
}

type Tab = "vitals" | "notes";

/**
 * The body for a stage nobody has written a speciality form for.
 *
 * Deliberately narrow. It does the things that are true of every clinical stage
 * in every speciality — see who the patient is, record their vitals, write a
 * note, move them on — and links out for anything that is not. A nurse stage in
 * a general hospital needs exactly this; inventing more would mean guessing at
 * a workflow nobody has described.
 */
export function GenericStageBody({
    item,
    pathway,
    onAdvance,
    isAdvancing,
    heldByMe = false,
    onRelease,
    isReleasing = false,
}: GenericStageBodyProps) {
    const [tab, setTab] = useState<Tab>("vitals");

    const doctors = useAppSelector((state) => state.doctors.list);
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    const currentDoctorId = doctors.find((d) => d.user_id === userId)?.id ?? "";

    const {
        vitalSigns,
        vitalsTrends,
        clinicalNotes,
        vitalsLoading,
        notesLoading,
        refreshVitals,
        refreshNotes,
    } = usePatientDetails({ patientId: item.patient_id });

    const nextStages = useMemo(
        () => nextStagesFor(item, pathway).sort((a, b) => a.display_order - b.display_order),
        [item, pathway]
    );

    // What this stage asks to have recorded. Configuration, so a hospital that
    // adds an observation gets a field for it without a release.
    const stage = pathway.stages.find((s) => s.code === item.stage.code) ?? null;
    const { data: asks } = useStageObservations(stage?.id ?? null);

    return (
        <div className="grid gap-4">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900">
                            {item.patient_name}
                        </h2>
                        <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                                backgroundColor: `${item.stage.colour ?? "#94a3b8"}22`,
                                color: item.stage.colour ?? "#475569",
                            }}
                        >
                            {item.stage.label}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        {item.visit_number}
                        {item.doctor_name && ` · ${item.doctor_name}`}
                        {item.waiting_minutes !== null && ` · waiting ${item.waiting_minutes} min`}
                    </p>
                    {item.chief_complaint && (
                        <p className="mt-1 text-sm text-slate-600">{item.chief_complaint}</p>
                    )}
                </div>

                <Link
                    href={`/patients/${item.patient_id}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Full record
                </Link>
            </header>

            {asks && asks.length > 0 && (
                <ObservationForm visitId={item.visit_id} stageCode={item.stage.code} asks={asks} />
            )}

            <div className="flex gap-2">
                {(["vitals", "notes"] as Tab[]).map((value) => (
                    <button
                        key={value}
                        onClick={() => setTab(value)}
                        className={`rounded-xl px-3 py-1.5 text-sm font-medium capitalize transition ${
                            tab === value
                                ? "bg-sky-500 text-white"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        {value}
                    </button>
                ))}
            </div>

            {tab === "vitals" ? (
                <VitalSignsPanel
                    patientId={item.patient_id}
                    vitalSigns={vitalSigns}
                    trends={vitalsTrends}
                    loading={vitalsLoading}
                    onRefresh={refreshVitals}
                />
            ) : (
                <QuickNotesPanel
                    patientId={item.patient_id}
                    doctorId={currentDoctorId}
                    visitId={item.visit_id}
                    notes={clinicalNotes}
                    loading={notesLoading}
                    onRefresh={refreshNotes}
                />
            )}

            {(nextStages.length > 0 || (heldByMe && onRelease)) && (
                <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    {nextStages.length > 0 && (
                        <span className="text-sm text-slate-500">Move to:</span>
                    )}
                    {nextStages.map((stage) => (
                        <button
                            key={stage.code}
                            onClick={() => onAdvance(stage.code)}
                            disabled={isAdvancing}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                        >
                            <ArrowRight className="h-3.5 w-3.5" />
                            {stage.label}
                        </button>
                    ))}

                    {/* Only offered to the person actually holding the patient,
                        and pushed to the right away from the ordinary moves —
                        it undoes a call, which is the rare case. A patient who
                        did not turn up is marked as a no-show instead, and that
                        is one of the moves above. */}
                    {heldByMe && onRelease && (
                        <button
                            onClick={onRelease}
                            disabled={isReleasing}
                            title="Undo the call — use this only if the wrong name was called"
                            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            <Undo2 className="h-3.5 w-3.5" />
                            {isReleasing ? "Releasing…" : "Called by mistake"}
                        </button>
                    )}
                </footer>
            )}
        </div>
    );
}
