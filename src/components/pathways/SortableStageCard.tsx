"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ClipboardList, GripVertical, Lock, Pencil, Trash2 } from "lucide-react";
import { PathwayStage, StageType } from "@/services/pathwaysApi";

interface SortableStageCardProps {
    stage: PathwayStage;
    /** Seeded pathways never lose a stage — live visits point at its code. */
    isSystemPathway: boolean;
    onEdit: (stage: PathwayStage) => void;
    onDelete: (stage: PathwayStage) => void;
    onEditObservations: (stage: PathwayStage) => void;
}

/**
 * Colours per stage *type*, not per status string.
 *
 * The old screens keyed colour off `awaiting_optometrist` and friends, which is
 * why every pathway that was not the eye one rendered grey. A type is something
 * every pathway has.
 */
const TYPE_STYLES: Record<StageType, { chip: string; label: string }> = {
    waiting: { chip: "bg-slate-100 text-slate-600", label: "Waiting" },
    assisted: { chip: "bg-violet-100 text-violet-700", label: "Assisted" },
    consultation: { chip: "bg-sky-100 text-sky-700", label: "Consultation" },
    procedure: { chip: "bg-amber-100 text-amber-700", label: "Procedure" },
    terminal: { chip: "bg-emerald-100 text-emerald-700", label: "End" },
};

export function SortableStageCard({
    stage,
    isSystemPathway,
    onEdit,
    onDelete,
    onEditObservations,
}: SortableStageCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: stage.code,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
    };

    const typeStyle = TYPE_STYLES[stage.stage_type] ?? TYPE_STYLES.waiting;

    // Two different reasons a stage cannot be removed, and the admin needs to
    // know which one applies — one is permanent, the other clears itself.
    const deleteBlockedReason = isSystemPathway
        ? "Part of a built-in pathway. Its code is the status on live visits and in the waiting-room displays, so it cannot be removed."
        : stage.visit_count > 0
          ? `${stage.visit_count} visit${stage.visit_count === 1 ? " is" : "s are"} recorded at this stage. Removing it would leave their status meaning nothing.`
          : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative flex items-start gap-3 rounded-xl border bg-white p-3 ${
                isDragging ? "border-sky-300 shadow-lg" : "border-slate-200"
            }`}
        >
            <button
                {...attributes}
                {...listeners}
                className="mt-0.5 cursor-move touch-none rounded p-1 text-slate-300 transition hover:text-slate-500"
                title="Drag to reorder"
                aria-label={`Reorder ${stage.label}`}
            >
                <GripVertical className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{stage.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeStyle.chip}`}>
                        {typeStyle.label}
                    </span>
                    {stage.is_initial && (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                            Start
                        </span>
                    )}
                    {stage.is_terminal && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Finish
                        </span>
                    )}
                    {stage.assigned_role && (
                        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                            {stage.assigned_role}
                        </span>
                    )}
                    {/* Only shown when it differs — on most stages the same role
                        does the work and holds the queue, and repeating it would
                        bury the handoffs, which are the interesting ones. */}
                    {stage.waiting_for_role &&
                        stage.waiting_for_role !== stage.assigned_role && (
                            <span
                                className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700"
                                title="The patient is in this role's queue at this stage"
                            >
                                → {stage.waiting_for_role}
                            </span>
                        )}
                    {stage.is_abandonment && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                            Did not attend
                        </span>
                    )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <code className="rounded bg-slate-50 px-1 py-0.5">{stage.code}</code>
                    {stage.visit_count > 0 && (
                        <span>
                            {stage.visit_count} visit{stage.visit_count === 1 ? "" : "s"}
                        </span>
                    )}
                    {stage.entry_from_codes && (
                        <span>Only from: {stage.entry_from_codes.join(", ")}</span>
                    )}
                    {stage.entry_blocked_from_codes && (
                        <span>Never from: {stage.entry_blocked_from_codes.join(", ")}</span>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <button
                    onClick={() => onEditObservations(stage)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    title="Choose what is recorded here, and what cannot be skipped"
                    aria-label={`Observations recorded at ${stage.label}`}
                >
                    <ClipboardList className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onEdit(stage)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={`Edit ${stage.label}`}
                >
                    <Pencil className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onDelete(stage)}
                    disabled={!!deleteBlockedReason}
                    title={deleteBlockedReason ?? `Remove ${stage.label}`}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-200"
                    aria-label={`Remove ${stage.label}`}
                >
                    {deleteBlockedReason ? (
                        <Lock className="h-4 w-4" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}
                </button>
            </div>
        </div>
    );
}
