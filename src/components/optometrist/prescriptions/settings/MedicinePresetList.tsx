"use client";

import React, { useState } from "react";
import { Plus, X, ArrowUp, ArrowDown, Edit2, Check, GripVertical, Trash2, Droplets, Pill, Eye, Syringe, Tablets, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { QuickMedicine } from "@/services/quickPresetsApi";
import { medicinesApi, type Medicine } from "@/services/medicinesApi";

interface MedicinePresetListProps {
    items: QuickMedicine[];
    onChange: (items: QuickMedicine[]) => void;
}

export function MedicinePresetList({ items, onChange }: MedicinePresetListProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [addingNew, setAddingNew] = useState(false);

    // Form state
    const [label, setLabel] = useState("");
    const [medicineName, setMedicineName] = useState("");
    const [genericName, setGenericName] = useState("");
    const [dosage, setDosage] = useState("");
    const [frequency, setFrequency] = useState("");
    const [duration, setDuration] = useState("");
    const [instructions, setInstructions] = useState("");
    const [icon, setIcon] = useState<QuickMedicine["icon"]>("droplets");
    const [color, setColor] = useState<QuickMedicine["color"]>("sky");

    // Search state
    const [searchResults, setSearchResults] = useState<Medicine[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleSearch = (query: string) => {
        setMedicineName(query);
        setShowSuggestions(true);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (!query.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await medicinesApi.search({ q: query, page_size: 5 });
                setSearchResults(res.items);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const selectMedicine = (med: Medicine) => {
        setMedicineName(med.name);
        setGenericName(med.generic_name || "");
        if (med.default_dosage) setDosage(med.default_dosage);
        if (med.default_frequency) setFrequency(med.default_frequency);
        if (med.default_duration) setDuration(med.default_duration);
        if (med.default_instructions) setInstructions(med.default_instructions);

        setShowSuggestions(false);
    };

    const startEdit = (index: number) => {
        const item = items[index];
        setLabel(item.label);
        setMedicineName(item.medicine_name);
        setGenericName(item.generic_name || "");
        setDosage(item.dosage);
        setFrequency(item.frequency);
        setDuration(item.duration);
        setInstructions(item.instructions || "");
        setIcon(item.icon);
        setColor(item.color);
        setEditingIndex(index);
        setAddingNew(false);
        setSearchResults([]);
        setShowSuggestions(false);
    };

    const startAdd = () => {
        setLabel("");
        setMedicineName("");
        setGenericName("");
        setDosage("1 drop");
        setFrequency("4 times daily");
        setDuration("1 month");
        setInstructions("");
        setIcon("droplets");
        setColor("sky");
        setAddingNew(true);
        setEditingIndex(null);
        setSearchResults([]);
        setShowSuggestions(false);
    };

    const cancelForm = () => {
        setEditingIndex(null);
        setAddingNew(false);
    };

    const saveItem = () => {
        if (!label.trim() || !medicineName.trim()) return;

        const normalizedLabel = label.trim().toLowerCase();
        const normalizedMedicine = medicineName.trim().toLowerCase();

        // Check for duplicates
        const isDuplicate = items.some((item, index) => {
            if (!addingNew && index === editingIndex) return false;
            return (
                item.label.trim().toLowerCase() === normalizedLabel ||
                item.medicine_name.trim().toLowerCase() === normalizedMedicine
            );
        });

        if (isDuplicate) {
            toast.error("A preset with this label or medicine name already exists.");
            return;
        }

        const newItem: QuickMedicine = {
            label: label.trim(),
            medicine_name: medicineName.trim(),
            generic_name: genericName.trim() || undefined,
            dosage,
            frequency,
            duration,
            instructions: instructions.trim() || undefined,
            icon,
            color,
        };

        if (addingNew) {
            onChange([...items, newItem]);
        } else if (editingIndex !== null) {
            const updated = [...items];
            updated[editingIndex] = { ...updated[editingIndex], ...newItem };
            onChange(updated);
        }

        cancelForm();
    };

    const moveItem = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === items.length - 1) return;

        const newItems = [...items];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        onChange(newItems);
    };

    const deleteItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        onChange(newItems);
    };

    const colors = [
        { id: "sky", class: "bg-sky-500" },
        { id: "purple", class: "bg-purple-500" },
        { id: "emerald", class: "bg-emerald-500" },
        { id: "amber", class: "bg-amber-500" },
        { id: "rose", class: "bg-rose-500" },
        { id: "slate", class: "bg-slate-500" },
        { id: "blue", class: "bg-blue-600" },
        { id: "indigo", class: "bg-indigo-600" },
    ] as const;

    const renderIcon = (name: string, className = "h-4 w-4") => {
        switch (name) {
            case "droplets": return <Droplets className={className} />;
            case "pill": return <Pill className={className} />;
            case "eye": return <Eye className={className} />;
            case "ointment": return <Syringe className={className} />; // Close enough for now
            default: return <Pill className={className} />;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    Customize quick medicine templates.
                </p>
                <button
                    onClick={startAdd}
                    disabled={addingNew || editingIndex !== null}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add New
                </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {/* Edit/Add Form */}
                {(addingNew || editingIndex !== null) && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 mb-2 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="col-span-1">
                                <label className="text-xs font-medium text-indigo-900 mb-1 block">Button Label</label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={e => setLabel(e.target.value)}
                                    placeholder="e.g. Antibiotic"
                                    className="w-full text-xs rounded border border-indigo-200 px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>
                            <div className="col-span-1 relative">
                                <label className="text-xs font-medium text-indigo-900 mb-1 block">Medicine Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={medicineName}
                                        onChange={e => handleSearch(e.target.value)}
                                        onFocus={() => {
                                            if (medicineName) handleSearch(medicineName);
                                        }}
                                        placeholder="Type to search..."
                                        className="w-full text-xs rounded border border-indigo-200 pl-2 pr-7 py-1.5 focus:border-indigo-500 focus:outline-none"
                                    />
                                    {isSearching ? (
                                        <Loader2 className="absolute right-2 top-2 h-3.5 w-3.5 animate-spin text-indigo-400" />
                                    ) : (
                                        <Search className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" />
                                    )}

                                    {showSuggestions && searchResults.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                            {searchResults.map((med) => (
                                                <button
                                                    key={med.id}
                                                    type="button"
                                                    onClick={() => selectMedicine(med)}
                                                    className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 border-b border-slate-100 last:border-0"
                                                >
                                                    <p className="font-medium text-slate-900">{med.name}</p>
                                                    {med.generic_name && (
                                                        <p className="text-[10px] text-slate-500">{med.generic_name}</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {/* Overlay to close suggestions when clicking outside */}
                                    {showSuggestions && (
                                        <div
                                            className="fixed inset-0 z-40 bg-transparent"
                                            onClick={() => setShowSuggestions(false)}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-indigo-900 mb-1 block">Generic Name (Optional)</label>
                                <input
                                    type="text"
                                    value={genericName}
                                    onChange={e => setGenericName(e.target.value)}
                                    placeholder="Generic composition"
                                    className="w-full text-xs rounded border border-indigo-200 px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            {/* Dosage Row */}
                            <div className="col-span-2 grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-[10px] font-medium text-indigo-900 mb-1 block">Dosage</label>
                                    <input
                                        type="text"
                                        value={dosage}
                                        onChange={e => setDosage(e.target.value)}
                                        className="w-full text-xs rounded border border-indigo-200 px-2 py-1.5"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium text-indigo-900 mb-1 block">Frequency</label>
                                    <input
                                        type="text"
                                        value={frequency}
                                        onChange={e => setFrequency(e.target.value)}
                                        className="w-full text-xs rounded border border-indigo-200 px-2 py-1.5"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium text-indigo-900 mb-1 block">Duration</label>
                                    <input
                                        type="text"
                                        value={duration}
                                        onChange={e => setDuration(e.target.value)}
                                        className="w-full text-xs rounded border border-indigo-200 px-2 py-1.5"
                                    />
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="text-xs font-medium text-indigo-900 mb-1 block">Instructions</label>
                                <input
                                    type="text"
                                    value={instructions}
                                    onChange={e => setInstructions(e.target.value)}
                                    placeholder="e.g. Both Eyes, After food"
                                    className="w-full text-xs rounded border border-indigo-200 px-2 py-1.5"
                                />
                            </div>

                            {/* Styling */}
                            <div className="col-span-2 flex items-center gap-4 mt-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-indigo-900">Icon:</span>
                                    <div className="flex bg-white rounded border border-indigo-200 p-0.5">
                                        {["droplets", "pill", "eye"].map((i) => (
                                            <button
                                                key={i}
                                                onClick={() => setIcon(i as any)}
                                                className={`p-1.5 rounded ${icon === i ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {renderIcon(i, "h-4 w-4")}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-indigo-900">Color:</span>
                                    <div className="flex gap-1">
                                        {colors.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => setColor(c.id as any)}
                                                className={`h-5 w-5 rounded-full ${c.class} ${color === c.id ? 'ring-2 ring-indigo-400 ring-offset-1' : 'opacity-70 hover:opacity-100'} transition-all`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-indigo-200">
                            <button
                                onClick={cancelForm}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 bg-white rounded border border-slate-200 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveItem}
                                disabled={!label.trim() || !medicineName.trim()}
                                className="px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded flex items-center gap-1.5 shadow-sm disabled:opacity-50 font-medium"
                            >
                                <Check className="h-3.5 w-3.5" />
                                {addingNew ? "Add Preset" : "Update Preset"}
                            </button>
                        </div>
                    </div>
                )}

                {/* List Items */}
                {items.length === 0 && !addingNew && (
                    <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                        No presets found. Add one to get started.
                    </div>
                )}

                {items.map((item, index) => (
                    <div
                        key={index}
                        className={`flex items-start gap-3 p-3 rounded-lg border bg-white shadow-sm transition-colors ${editingIndex === index ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        {/* Reorder Controls */}
                        <div className="flex flex-col gap-0.5 mt-0.5">
                            <button
                                onClick={() => moveItem(index, 'up')}
                                disabled={index === 0}
                                className="text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                            >
                                <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => moveItem(index, 'down')}
                                disabled={index === items.length - 1}
                                className="text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                            >
                                <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-${item.color}-100 text-${item.color}-700`}>
                                    {renderIcon(item.icon, "h-3 w-3")}
                                    {item.label}
                                </span>
                                <span className="text-xs font-medium text-slate-900 truncate">
                                    {item.medicine_name}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                                {item.dosage} • {item.frequency} • {item.duration}
                                {item.instructions && <span className="text-slate-400 ml-1">({item.instructions})</span>}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-0.5">
                            <button
                                onClick={() => startEdit(index)}
                                disabled={editingIndex !== null}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition disabled:opacity-30"
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => deleteItem(index)}
                                disabled={editingIndex !== null}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition disabled:opacity-30"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
