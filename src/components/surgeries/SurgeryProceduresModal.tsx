"use client";

import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Plus, Trash2, CheckCircle2, Star, Loader2, Link2, Sparkles } from "lucide-react";
import { Surgery } from "@/types";
import { surgeriesApi, ProcedurePerformedOption } from "@/services/surgeriesApi";
import { Combobox } from "@/components/common/Combobox";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import clsx from "clsx";

interface SurgeryProceduresModalProps {
    isOpen: boolean;
    onClose: () => void;
    surgery: Surgery | null;
}

export function SurgeryProceduresModal({
    isOpen,
    onClose,
    surgery,
}: SurgeryProceduresModalProps) {
    const [mappedProcedures, setMappedProcedures] = useState<ProcedurePerformedOption[]>([]);
    const [allProcedures, setAllProcedures] = useState<ProcedurePerformedOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Selected existing procedure to link
    const [selectedToLink, setSelectedToLink] = useState<string>("");

    // Form for creating brand-new procedure
    const [showCreateNew, setShowCreateNew] = useState(false);
    const [newProcName, setNewProcName] = useState("");
    const [newProcCode, setNewProcCode] = useState("");
    const [newProcDesc, setNewProcDesc] = useState("");
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    const loadData = async () => {
        if (!surgery) return;
        try {
            setIsLoading(true);
            const [mapped, all] = await Promise.all([
                surgeriesApi.listSurgeryProcedures(surgery.id),
                surgeriesApi.listProcedures({ is_active: true }),
            ]);
            setMappedProcedures(mapped);
            setAllProcedures(all);
        } catch (error) {
            toast.error(getErrorMessage(error) || "Failed to load procedures");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && surgery) {
            loadData();
            setSelectedToLink("");
            setShowCreateNew(false);
            setNewProcName("");
            setNewProcCode("");
            setNewProcDesc("");
        }
    }, [isOpen, surgery]);

    // Available procedures that are not yet mapped to this surgery
    const mappedIds = new Set(mappedProcedures.map((p) => p.id));
    const unmappedOptions = allProcedures
        .filter((p) => !mappedIds.has(p.id))
        .map((p) => ({ label: p.name, value: p.id }));

    const handleLinkExisting = async () => {
        if (!selectedToLink || !surgery) return;
        const target = allProcedures.find((p) => p.id === selectedToLink);
        if (!target) return;

        const updated = [
            ...mappedProcedures,
            {
                ...target,
                is_default: mappedProcedures.length === 0,
                display_order: mappedProcedures.length + 1,
            },
        ];

        await saveMappingList(updated, `Linked "${target.name}"`);
        setSelectedToLink("");
    };

    const handleRemove = async (procId: string) => {
        if (!surgery) return;
        const updated = mappedProcedures.filter((p) => p.id !== procId);
        // If the removed procedure was default, make the first one default
        if (updated.length > 0 && !updated.some((p) => p.is_default)) {
            updated[0].is_default = true;
        }
        await saveMappingList(updated, "Procedure removed from surgery");
    };

    const handleSetDefault = async (procId: string) => {
        if (!surgery) return;
        const updated = mappedProcedures.map((p) => ({
            ...p,
            is_default: p.id === procId,
        }));
        await saveMappingList(updated, "Default procedure updated");
    };

    const saveMappingList = async (list: ProcedurePerformedOption[], successMsg: string) => {
        if (!surgery) return;
        try {
            setIsSaving(true);
            const payload = {
                procedures: list.map((p, idx) => ({
                    procedure_id: p.id,
                    is_default: p.is_default,
                    display_order: idx + 1,
                })),
            };
            const res = await surgeriesApi.updateSurgeryProcedures(surgery.id, payload);
            setMappedProcedures(res);
            toast.success(successMsg);
        } catch (error) {
            toast.error(getErrorMessage(error) || "Failed to update procedures");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateNewProcedure = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!surgery || !newProcName.trim()) return;

        try {
            setIsCreatingNew(true);
            const created = await surgeriesApi.createProcedure({
                name: newProcName.trim(),
                code: newProcCode.trim() || undefined,
                description: newProcDesc.trim() || undefined,
                category: surgery.category || "Ophthalmology",
                surgery_id: surgery.id,
                is_default: mappedProcedures.length === 0,
                display_order: mappedProcedures.length + 1,
            });

            toast.success(`Created & linked "${created.name}"`);
            setNewProcName("");
            setNewProcCode("");
            setNewProcDesc("");
            setShowCreateNew(false);
            await loadData();
        } catch (error) {
            toast.error(getErrorMessage(error) || "Failed to create procedure");
        } finally {
            setIsCreatingNew(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-slate-100">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                            <Link2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <Dialog.Title
                                                as="h3"
                                                className="text-lg font-bold text-slate-900"
                                            >
                                                Linked Procedures
                                            </Dialog.Title>
                                            <p className="text-xs text-slate-500">
                                                Surgery:{" "}
                                                <span className="font-semibold text-slate-800">
                                                    {surgery?.name}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mt-5 space-y-6">
                                    {/* Action: Link existing procedure */}
                                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                Link Existing Procedure
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setShowCreateNew(!showCreateNew)}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
                                            >
                                                <Sparkles className="h-3.5 w-3.5" />
                                                {showCreateNew
                                                    ? "Cancel New Procedure"
                                                    : "+ Create Brand New Procedure"}
                                            </button>
                                        </div>

                                        {!showCreateNew ? (
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <Combobox
                                                        value={selectedToLink}
                                                        onChange={(val) => setSelectedToLink(val)}
                                                        options={unmappedOptions}
                                                        placeholder="Search procedures to link..."
                                                        allowCustomValue={false}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={!selectedToLink || isSaving}
                                                    onClick={handleLinkExisting}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50 transition-all"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Link
                                                </button>
                                            </div>
                                        ) : (
                                            <form
                                                onSubmit={handleCreateNewProcedure}
                                                className="space-y-3 pt-2 border-t border-slate-200"
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                            Procedure Name *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={newProcName}
                                                            onChange={(e) =>
                                                                setNewProcName(e.target.value)
                                                            }
                                                            placeholder="e.g. Femtosecond Laser Assisted Cataract Surgery"
                                                            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none focus:border-sky-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                            Code (Optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={newProcCode}
                                                            onChange={(e) =>
                                                                setNewProcCode(e.target.value)
                                                            }
                                                            placeholder="e.g. FLACS_CATARACT"
                                                            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none focus:border-sky-400"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                        Description (Optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newProcDesc}
                                                        onChange={(e) =>
                                                            setNewProcDesc(e.target.value)
                                                        }
                                                        placeholder="Brief clinical description"
                                                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none focus:border-sky-400"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCreateNew(false)}
                                                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={
                                                            !newProcName.trim() || isCreatingNew
                                                        }
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50"
                                                    >
                                                        {isCreatingNew && (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        )}
                                                        Create & Link
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>

                                    {/* Mapped procedures list */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                Currently Linked ({mappedProcedures.length})
                                            </span>
                                            {isSaving && (
                                                <span className="inline-flex items-center gap-1 text-xs text-sky-600 font-medium">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Saving...
                                                </span>
                                            )}
                                        </div>

                                        {isLoading ? (
                                            <div className="py-8 flex justify-center">
                                                <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                                            </div>
                                        ) : mappedProcedures.length === 0 ? (
                                            <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                                                <p className="text-sm font-medium text-slate-600">
                                                    No procedures linked yet
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Link existing procedures or create a new one
                                                    above to populate options in Day Care.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                                                {mappedProcedures.map((proc) => (
                                                    <div
                                                        key={proc.id}
                                                        className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={clsx(
                                                                    "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold",
                                                                    proc.is_default
                                                                        ? "bg-amber-100 text-amber-700"
                                                                        : "bg-slate-100 text-slate-500"
                                                                )}
                                                            >
                                                                {proc.is_default ? (
                                                                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                                                ) : (
                                                                    <CheckCircle2 className="h-4 w-4 text-slate-400" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-slate-800">
                                                                        {proc.name}
                                                                    </span>
                                                                    {proc.is_default && (
                                                                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                                                            Default
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {proc.code && (
                                                                    <span className="text-xs text-slate-400 font-mono">
                                                                        {proc.code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1.5">
                                                            {!proc.is_default && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleSetDefault(proc.id)
                                                                    }
                                                                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                                                    title="Set as default procedure for this surgery"
                                                                >
                                                                    Set as Default
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRemove(proc.id)
                                                                }
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                title="Remove procedure from surgery"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all"
                                    >
                                        Done
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
