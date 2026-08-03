import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition, Switch } from "@headlessui/react";
import { X } from "lucide-react";
import { CreateSurgeryRequest, Surgery, UpdateSurgeryRequest } from "@/types";
import { BodyPart, bodyPartsApi } from "@/services/bodyPartsApi";
import { BodyPartMultiSelect } from "./BodyPartMultiSelect";

interface SurgeryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateSurgeryRequest | UpdateSurgeryRequest) => Promise<void>;
    initialData?: Surgery | null;
}

export function SurgeryFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
}: SurgeryFormModalProps) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [selectedBodyPartIds, setSelectedBodyPartIds] = useState<string[]>([]);
    const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        bodyPartsApi
            .list({ is_active: true, page_size: 200 })
            .then((res) => setBodyParts(res.items))
            .catch((err) => console.error("Failed to load body parts:", err));
    }, [isOpen]);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setCategory(initialData.category || "");
            setDescription(initialData.description || "");
            setIsActive(initialData.is_active);
            setSelectedBodyPartIds(initialData.body_parts?.map((bp) => bp.id) || []);
        } else {
            setName("");
            setCategory("");
            setDescription("");
            setIsActive(true);
            setSelectedBodyPartIds([]);
        }
    }, [initialData, isOpen]);

    const handleBodyPartsChange = (ids: string[]) => {
        setSelectedBodyPartIds(ids);
        // Soft auto-fill category from the first selection's department, only
        // when category is still empty - never overwrites a value the admin typed.
        if (!category.trim() && ids.length > 0) {
            const first = bodyParts.find((bp) => bp.id === ids[0]);
            if (first) setCategory(first.department);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await onSubmit({
                name,
                category: category || null,
                description: description || null,
                is_active: isActive,
                body_part_ids: selectedBodyPartIds,
            });
            onClose();
        } catch (error) {
            console.error("Failed to submit surgery:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
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
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-100">
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
                                    <Dialog.Title className="text-lg font-semibold text-slate-900">
                                        {initialData ? "Edit Surgery" : "Add New Surgery"}
                                    </Dialog.Title>
                                    <button
                                        type="button"
                                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-500 transition-colors"
                                        onClick={onClose}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="px-4 py-5 sm:p-6 space-y-4">
                                        {/* Name */}
                                        <div>
                                            <label
                                                htmlFor="name"
                                                className="block text-sm font-medium leading-6 text-slate-900"
                                            >
                                                Surgery Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="mt-2">
                                                <input
                                                    type="text"
                                                    name="name"
                                                    id="name"
                                                    required
                                                    className="block w-full rounded-lg border-0 px-3 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6"
                                                    placeholder="e.g. Cataract Surgery"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Category */}
                                        <div>
                                            <label
                                                htmlFor="category"
                                                className="block text-sm font-medium leading-6 text-slate-900"
                                            >
                                                Category
                                            </label>
                                            <div className="mt-2">
                                                <input
                                                    type="text"
                                                    name="category"
                                                    id="category"
                                                    className="block w-full rounded-lg border-0 px-3 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6"
                                                    placeholder="e.g. Ophthalmology"
                                                    value={category}
                                                    onChange={(e) => setCategory(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label
                                                htmlFor="description"
                                                className="block text-sm font-medium leading-6 text-slate-900"
                                            >
                                                Description
                                            </label>
                                            <div className="mt-2">
                                                <textarea
                                                    id="description"
                                                    name="description"
                                                    rows={3}
                                                    className="block w-full rounded-lg border-0 px-3 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6"
                                                    placeholder="Brief description of the surgery..."
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Applicable Body Parts */}
                                        <div>
                                            <label className="block text-sm font-medium leading-6 text-slate-900">
                                                Applicable Body Parts
                                            </label>
                                            <div className="mt-2">
                                                <BodyPartMultiSelect
                                                    bodyParts={bodyParts}
                                                    selectedIds={selectedBodyPartIds}
                                                    onChange={handleBodyPartsChange}
                                                />
                                            </div>
                                        </div>

                                        {/* Active Status */}
                                        <div className="flex items-center justify-between">
                                            <span className="flex flex-grow flex-col">
                                                <span className="text-sm font-medium leading-6 text-slate-900">
                                                    Active Status
                                                </span>
                                                <span className="text-sm text-slate-500">
                                                    Enable or disable this surgery
                                                </span>
                                            </span>
                                            <Switch
                                                checked={isActive}
                                                onChange={setIsActive}
                                                className={`${isActive ? "bg-sky-600" : "bg-slate-200"
                                                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2`}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`${isActive ? "translate-x-5" : "translate-x-0"
                                                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                                />
                                            </Switch>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="inline-flex w-full justify-center rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 sm:ml-3 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2"
                                        >
                                            {isSubmitting && (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            )}
                                            {initialData ? "Update Surgery" : "Create Surgery"}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-colors"
                                            onClick={onClose}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
