"use client";

import { useEffect, useState } from "react";
import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AlertTriangle, Info, Plus, ShieldCheck } from "lucide-react";
import { Pathway, PathwayStage } from "@/services/pathwaysApi";
import { useDeleteStage, useReorderStages, useUpdatePathway } from "@/hooks/queries/usePathways";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { SortableStageCard } from "./SortableStageCard";
import { StageFormModal } from "./StageFormModal";
import { StageObservationsModal } from "./StageObservationsModal";

interface PathwayBuilderProps {
    pathway: Pathway;
}

export function PathwayBuilder({ pathway }: PathwayBuilderProps) {
    const reorderStages = useReorderStages();
    const deleteStage = useDeleteStage();
    const updatePathway = useUpdatePathway();
    const { confirm, confirmState } = useConfirm();

    const [editingStage, setEditingStage] = useState<PathwayStage | null>(null);
    const [isStageFormOpen, setIsStageFormOpen] = useState(false);
    const [observationsStage, setObservationsStage] = useState<PathwayStage | null>(null);

    // The drag has to move something immediately, so the order is held locally
    // and reconciled with the server's answer. `pathway.stages` is the source of
    // truth — it is re-synced on every change, including a rejected reorder.
    const [order, setOrder] = useState<PathwayStage[]>(pathway.stages);
    useEffect(() => setOrder(pathway.stages), [pathway.stages]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = order.findIndex((s) => s.code === active.id);
        const newIndex = order.findIndex((s) => s.code === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const next = arrayMove(order, oldIndex, newIndex);
        setOrder(next);
        // Saved immediately rather than behind a Save button: a half-reordered
        // pathway left unsaved is worse than either state, and the server
        // returns the whole pathway so the screen re-renders from truth.
        reorderStages.mutate({
            pathwayId: pathway.id,
            stageCodes: next.map((s) => s.code),
        });
    };

    const handleDelete = async (stage: PathwayStage) => {
        const confirmed = await confirm({
            title: `Remove "${stage.label}"?`,
            message:
                "Patients will no longer pass through this step. Any entry rule naming it must be updated first.",
            confirmText: "Remove",
            variant: "danger",
        });
        if (confirmed) {
            deleteStage.mutate({ pathwayId: pathway.id, stageCode: stage.code });
        }
    };

    const openAddStage = () => {
        setEditingStage(null);
        setIsStageFormOpen(true);
    };

    const openEditStage = (stage: PathwayStage) => {
        setEditingStage(stage);
        setIsStageFormOpen(true);
    };

    // The two conditions the backend enforces before a pathway can go live.
    // Shown here so the admin sees what is missing while building, rather than
    // discovering it when the activate toggle refuses.
    const hasStart = order.some((s) => s.is_initial);
    const hasFinish = order.some((s) => s.is_terminal);
    const canActivate = hasStart && hasFinish;

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900">{pathway.name}</h2>
                        {pathway.is_default && (
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                                Hospital default
                            </span>
                        )}
                        {pathway.is_system && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                                title="Built in. Stages can be added, renamed and reordered, but not removed."
                            >
                                <ShieldCheck className="h-3 w-3" />
                                Built in
                            </span>
                        )}
                        <span
                            className={
                                pathway.is_active
                                    ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                                    : "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                            }
                        >
                            {pathway.is_active ? "In use" : "Not in use"}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        {pathway.description ||
                            "The steps a patient moves through, in order. Drag to rearrange."}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Used by {pathway.department_count} department
                        {pathway.department_count === 1 ? "" : "s"}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {!pathway.is_active && (
                        <button
                            onClick={() =>
                                updatePathway.mutate({
                                    id: pathway.id,
                                    data: { is_active: true },
                                })
                            }
                            disabled={!canActivate || updatePathway.isPending}
                            title={
                                canActivate
                                    ? "Make this pathway available to departments"
                                    : "Mark a starting stage and a finishing stage first"
                            }
                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Turn on
                        </button>
                    )}
                    <button
                        onClick={openAddStage}
                        className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                    >
                        <Plus className="h-4 w-4" />
                        Add stage
                    </button>
                </div>
            </div>

            {!canActivate && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="text-sm text-amber-800">
                        <p className="font-medium">Not ready to use yet</p>
                        <ul className="mt-1 list-inside list-disc text-amber-700">
                            {!hasStart && <li>No stage is marked as a place patients start</li>}
                            {!hasFinish && (
                                <li>No stage is marked as finishing the visit, so nobody could leave</li>
                            )}
                        </ul>
                    </div>
                </div>
            )}

            {pathway.is_system && (
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <p className="text-sm text-slate-600">
                        This is a built-in pathway. You can rename its stages, reorder them and add
                        new ones — but its existing stages cannot be removed, because their codes
                        are the status recorded on live visits and the values the waiting-room
                        screens ask for. To build something different, copy it.
                    </p>
                </div>
            )}

            {order.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="font-medium text-slate-700">No stages yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                        Add the steps a patient goes through — waiting, seen, finished.
                    </p>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={order.map((s) => s.code)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="grid gap-2">
                            {order.map((stage) => (
                                <SortableStageCard
                                    key={stage.code}
                                    stage={stage}
                                    isSystemPathway={pathway.is_system}
                                    onEdit={openEditStage}
                                    onDelete={handleDelete}
                                    onEditObservations={setObservationsStage}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            <StageFormModal
                isOpen={isStageFormOpen}
                onClose={() => setIsStageFormOpen(false)}
                pathway={pathway}
                stage={editingStage}
            />
            {observationsStage && (
                <StageObservationsModal
                    isOpen
                    onClose={() => setObservationsStage(null)}
                    stage={observationsStage}
                />
            )}
            <ConfirmationDialog {...confirmState} />
        </div>
    );
}
