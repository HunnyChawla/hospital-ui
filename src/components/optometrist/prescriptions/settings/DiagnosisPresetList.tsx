"use client";

import React, { useState } from "react";
import { Plus, X, ArrowUp, ArrowDown, Edit2, Check, GripVertical, Trash2 } from "lucide-react";
import type { QuickDiagnosis } from "@/services/quickPresetsApi";

interface DiagnosisPresetListProps {
    items: QuickDiagnosis[];
    onChange: (items: QuickDiagnosis[]) => void;
}

export function DiagnosisPresetList({ items, onChange }: DiagnosisPresetListProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [addingNew, setAddingNew] = useState(false);

    // Form state
    const [label, setLabel] = useState("");
    const [value, setValue] = useState("");
    const [category, setCategory] = useState<QuickDiagnosis["category"]>("other");

    const startEdit = (index: number) => {
        const item = items[index];
        setLabel(item.label);
        setValue(item.value);
        setCategory(item.category);
        setEditingIndex(index);
        setAddingNew(false);
    };

    const startAdd = () => {
        setLabel("");
        setValue("");
        setCategory("other");
        setAddingNew(true);
        setEditingIndex(null);
    };

    const cancelForm = () => {
        setEditingIndex(null);
        setAddingNew(false);
    };

    const saveItem = () => {
        if (!label.trim() || !value.trim()) return;

        const newItem: QuickDiagnosis = {
            label: label.trim(),
            value: value.trim(),
            category,
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

    // Categories for badge colors
    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case "refractive": return "bg-blue-100 text-blue-700";
            case "surface": return "bg-amber-100 text-amber-700";
            case "lens": return "bg-slate-100 text-slate-700";
            case "retina": return "bg-rose-100 text-rose-700";
            default: return "bg-slate-100 text-slate-600";
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    Customize quick selection chips for diagnosis. Reorder with arrows.
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
                            <div>
                                <label className="text-xs font-medium text-indigo-900 mb-1 block">Label (Chip Text)</label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={e => setLabel(e.target.value)}
                                    placeholder="e.g. Myopia"
                                    className="w-full text-xs rounded border border-indigo-200 px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-indigo-900 mb-1 block">Full Diagnosis</label>
                                <input
                                    type="text"
                                    value={value}
                                    onChange={e => setValue(e.target.value)}
                                    placeholder="e.g. Simple Myopia"
                                    className="w-full text-xs rounded border border-indigo-200 px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-indigo-900">Category:</label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value as any)}
                                    className="text-xs rounded border border-indigo-200 px-2 py-1 focus:border-indigo-500 focus:outline-none bg-white"
                                >
                                    <option value="refractive">Refractive</option>
                                    <option value="surface">Surface/Cornea</option>
                                    <option value="lens">Lens/Cataract</option>
                                    <option value="retina">Retina</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={cancelForm}
                                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 bg-white rounded border border-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveItem}
                                    disabled={!label.trim() || !value.trim()}
                                    className="px-2 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded flex items-center gap-1 shadow-sm disabled:opacity-50"
                                >
                                    <Check className="h-3 w-3" />
                                    {addingNew ? "Add" : "Update"}
                                </button>
                            </div>
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
                        className={`flex items-center gap-3 p-3 rounded-lg border bg-white shadow-sm transition-colors ${editingIndex === index ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        {/* Reorder Controls */}
                        <div className="flex flex-col gap-0.5">
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
                                <span className="font-medium text-sm text-slate-800">{item.label}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-medium ${getCategoryColor(item.category)}`}>
                                    {item.category}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{item.value}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
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
