"use client";

import React, { useState } from "react";
import { Plus, X, ArrowUp, ArrowDown, Edit2, Check, GripVertical, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { QuickAdvice } from "@/services/quickPresetsApi";
import { advicesApi, type Advice } from "@/services/advicesApi";

interface AdvicePresetListProps {
    items: QuickAdvice[];
    onChange: (items: QuickAdvice[]) => void;
}

const emptyForm: QuickAdvice = {
    id: "", // Will be generated or assigned on save
    label: "",
    value: "",
    category: "General",
};

export function AdvicePresetList({ items, onChange }: AdvicePresetListProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<QuickAdvice>>(emptyForm);

    // Search state
    const [searchResults, setSearchResults] = useState<Advice[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleSearch = (query: string) => {
        setEditForm(prev => ({ ...prev, value: query }));
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
                // Assuming advicesApi.list supports search
                const res = await advicesApi.list({ search: query, page_size: 5 });
                setSearchResults(res.items);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const selectAdvice = (advice: Advice) => {
        setEditForm(prev => {
            const newForm = { ...prev, value: advice.advice_name };
            // Auto-fill label if empty
            if (!newForm.label) {
                newForm.label = advice.advice_name;
            }
            // Auto-select category if possible based on some logic or default
            if (advice.category) {
                const lowerCat = advice.category.toLowerCase();
                if (lowerCat.includes("investigation") || lowerCat.includes("test")) {
                    newForm.category = "General"; // Tests usually go to General in this schema if no specific Test category
                } else if (lowerCat.includes("lifestyle")) {
                    newForm.category = "General"; // Map to allowed categories
                } else if (lowerCat.includes("referral")) {
                    newForm.category = "General";
                } else {
                    newForm.category = "General";
                }
                // Allowed: "General" | "Post-Op" | "Pre-Op" | "Infection" | "Allergy"
                // Ideally we should try to map better, but General is safe fallback
                if (lowerCat.includes("post-op")) newForm.category = "Post-Op";
                else if (lowerCat.includes("pre-op")) newForm.category = "Pre-Op";
                else if (lowerCat.includes("infection")) newForm.category = "Infection";
                else if (lowerCat.includes("allergy")) newForm.category = "Allergy";
            }
            return newForm;
        });
        setShowSuggestions(false);
    };

    const startEdit = (item: QuickAdvice) => {
        setEditForm(item);
        setEditingId(item.id || "");
        setSearchResults([]);
        setShowSuggestions(false);
    };

    const startAdd = () => {
        setEditForm({ ...emptyForm, id: `new-${Date.now()}` }); // Assign a temporary ID for new items
        setEditingId(null); // Indicate adding new
        setSearchResults([]);
        setShowSuggestions(false);
    };

    const cancelForm = () => {
        setEditingId(null);
        setEditForm(emptyForm);
    };

    const saveItem = () => {
        if (!editForm.label?.trim() || !editForm.value?.trim()) return;

        const normalizedLabel = editForm.label.trim().toLowerCase();
        const normalizedValue = editForm.value.trim().toLowerCase();

        // Check for duplicates
        const isDuplicate = items.some((item) => {
            if (editingId !== null && item.id === editingId) return false;
            return (
                item.label.trim().toLowerCase() === normalizedLabel ||
                item.value.trim().toLowerCase() === normalizedValue
            );
        });

        if (isDuplicate) {
            toast.error("A preset with this label or advice already exists.");
            return;
        }

        const newItem: QuickAdvice = {
            id: editForm.id || `new-${Date.now()}`, // Ensure ID exists
            label: editForm.label.trim(),
            value: editForm.value.trim(),
            category: editForm.category || "General",
        };

        if (editingId === null) { // Adding new
            onChange([...items, newItem]);
        } else { // Editing existing
            const updated = items.map(item =>
                item.id === editingId ? { ...item, ...newItem } : item
            );
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

    const deleteItem = (id: string) => {
        const newItems = items.filter(item => item.id !== id);
        onChange(newItems);
    };

    // Categories for badge colors
    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case "General": return "bg-slate-100 text-slate-700";
            case "Post-Op": return "bg-blue-100 text-blue-700";
            case "Pre-Op": return "bg-indigo-100 text-indigo-700";
            case "Infection": return "bg-red-100 text-red-700";
            case "Allergy": return "bg-orange-100 text-orange-700";
            default: return "bg-slate-100 text-slate-600";
        }
    };

    const isAddingNew = editingId === null && editForm.id !== ""; // Check if form is open for new item
    const isEditingExisting = editingId !== null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    Customize quick selection chips for advice. Reorder with arrows.
                </p>
                <button
                    onClick={startAdd}
                    disabled={isAddingNew || isEditingExisting}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add New
                </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {/* Edit/Add Form */}
                {(isAddingNew || isEditingExisting) && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 mb-2 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-xs font-medium text-indigo-900 mb-1 block">Label (Chip Text)</label>
                                <input
                                    type="text"
                                    value={editForm.label || ""}
                                    onChange={e => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                                    placeholder="e.g. Fundus Exam"
                                    className="w-full text-xs rounded border border-indigo-200 px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div className="relative">
                                <label className="text-xs font-medium text-indigo-900 mb-1 block">Advice Description</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={editForm.value || ""}
                                        onChange={e => handleSearch(e.target.value)}
                                        onFocus={() => {
                                            if (editForm.value) handleSearch(editForm.value);
                                        }}
                                        placeholder="Type to search..."
                                        className="w-full text-xs rounded border border-indigo-200 pl-2 pr-7 py-1.5 focus:border-indigo-500 focus:outline-none"
                                        autoFocus={isAddingNew || isEditingExisting}
                                    />
                                    {isSearching ? (
                                        <Loader2 className="absolute right-2 top-2 h-3.5 w-3.5 animate-spin text-indigo-400" />
                                    ) : (
                                        <Search className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" />
                                    )}

                                    {showSuggestions && searchResults.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                            {searchResults.map((adv) => (
                                                <button
                                                    key={adv.id}
                                                    type="button"
                                                    onClick={() => selectAdvice(adv)}
                                                    className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 border-b border-slate-100 last:border-0"
                                                >
                                                    <p className="font-medium text-slate-900">{adv.advice_name}</p>
                                                    <p className="text-[10px] text-slate-500">{adv.category}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {/* Overlay to close suggestions */}
                                    {showSuggestions && (
                                        <div
                                            className="fixed inset-0 z-40 bg-transparent"
                                            onClick={() => setShowSuggestions(false)}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-indigo-900">Category:</label>
                                <select
                                    value={editForm.category}
                                    onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value as any }))}
                                    className="text-xs rounded border border-indigo-200 px-2 py-1 focus:border-indigo-500 focus:outline-none bg-white"
                                >
                                    <option value="General">General</option>
                                    <option value="Post-Op">Post-Op</option>
                                    <option value="Pre-Op">Pre-Op</option>
                                    <option value="Infection">Infection</option>
                                    <option value="Allergy">Allergy</option>
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
                                    disabled={!editForm.label?.trim() || !editForm.value?.trim()}
                                    className="px-2 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded flex items-center gap-1 shadow-sm disabled:opacity-50"
                                >
                                    <Check className="h-3 w-3" />
                                    {isAddingNew ? "Add" : "Update"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* List Items */}
                {items.length === 0 && !isAddingNew && (
                    <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                        No presets found. Add one to get started.
                    </div>
                )}

                {items.map((item, index) => (
                    <div
                        key={item.id || index}
                        className={`flex items-center gap-3 p-3 rounded-lg border bg-white shadow-sm transition-colors ${editingId === item.id ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
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
                                onClick={() => startEdit(item)}
                                disabled={editingId !== null}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition disabled:opacity-30"
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => deleteItem(item.id || "")}
                                disabled={editingId !== null}
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
