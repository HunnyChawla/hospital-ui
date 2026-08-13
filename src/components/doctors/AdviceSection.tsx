"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, FlaskConical, ClipboardList, Loader2, Sparkles, Settings } from "lucide-react";
import type { AdviceItemRequest } from "@/services/prescriptionsApi";
import { quickPresetsApi, type QuickAdvice, type QuickLabTest } from "@/services/quickPresetsApi";
import { advicesApi } from "@/services/advicesApi";
import { labTestsApi } from "@/services/labTestsApi";
import { AdviceQuickChips, LabTestQuickChips } from "../optometrist/prescriptions/QuickSelectChips";
import { QuickPresetsSettingsModal } from "../optometrist/prescriptions/settings/QuickPresetsSettingsModal";
import { toast } from "sonner";

interface AdviceSectionProps {
    value: AdviceItemRequest[];
    onChange: (items: AdviceItemRequest[]) => void;
    followupDate: string | null;
    onFollowupDateChange: (value: string | null) => void;
    doctorId?: string;
    disabled?: boolean;
}

export function AdviceSection({
    value,
    onChange,
    followupDate,
    onFollowupDateChange,
    doctorId,
    disabled = false,
}: AdviceSectionProps) {
    const [draft, setDraft] = useState("");
    const [draftType, setDraftType] = useState<"instruction" | "test">("instruction");

    // Presets and search state
    const [advicesOptions, setAdvicesOptions] = useState<any[]>([]);
    const [labTestsOptions, setLabTestsOptions] = useState<any[]>([]);
    const [addedAdviceIds, setAddedAdviceIds] = useState<string[]>([]);
    const [addedLabTestIds, setAddedLabTestIds] = useState<string[]>([]);

    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);

    // Fetch presets on load if doctorId is present
    useEffect(() => {
        if (doctorId) {
            loadPresets();
        }
    }, [doctorId]);

    const loadPresets = async () => {
        if (!doctorId) return;
        try {
            const [advs, labTests] = await Promise.all([
                quickPresetsApi.getAdvices(doctorId),
                quickPresetsApi.getLabTests(doctorId)
            ]);

            setAdvicesOptions(advs.map(a => ({
                id: a.id || a.value,
                label: a.label,
                category: a.category || "General",
                value: a.value
            })));

            setLabTestsOptions(labTests.map(t => ({
                id: t.id || t.value,
                label: t.label,
                category: t.category || "Other",
                value: t.value,
                lab_test_id: t.lab_test_id
            })));
        } catch (error) {
            console.error("Failed to load advice/test presets", error);
        }
    };

    // Debounced autocomplete search
    useEffect(() => {
        const performSearch = async () => {
            if (!draft || draft.trim().length < 2) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }

            setSearching(true);
            try {
                if (draftType === "test") {
                    const response = await labTestsApi.list({
                        search: draft.trim(),
                        page_size: 10,
                        is_active: true
                    });
                    setSearchResults(response.items.map(t => ({
                        id: t.id,
                        label: t.test_name,
                        value: t.test_name,
                        category: t.category || "Other",
                        code: t.test_code
                    })));
                } else {
                    const response = await advicesApi.list({
                        search: draft.trim(),
                        page_size: 10
                    });
                    setSearchResults(response.items.map(a => ({
                        id: a.id,
                        label: a.advice_name,
                        value: a.advice_name,
                        category: a.category || "General"
                    })));
                }
                setShowDropdown(true);
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                setSearching(false);
            }
        };

        const timeout = setTimeout(performSearch, 300);
        return () => clearTimeout(timeout);
    }, [draft, draftType]);

    // Close search dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync addedIds based on value items
    useEffect(() => {
        // Find matching preset IDs for currently active items
        const addedAdvs = value
            .filter(item => item.advice_type === "instruction")
            .map(item => advicesOptions.find(opt => opt.value === item.description)?.id)
            .filter(Boolean) as string[];
        
        const addedLabs = value
            .filter(item => item.advice_type === "test")
            .map(item => labTestsOptions.find(opt => opt.value === item.description)?.id)
            .filter(Boolean) as string[];

        setAddedAdviceIds(addedAdvs);
        setAddedLabTestIds(addedLabs);
    }, [value, advicesOptions, labTestsOptions]);

    const add = () => {
        const description = draft.trim();
        if (!description) return;
        
        // Avoid duplicate descriptions for same type
        if (value.some(item => item.advice_type === draftType && item.description.toLowerCase() === description.toLowerCase())) {
            toast.error("This advice/test is already added");
            return;
        }

        onChange([...value, { advice_type: draftType, description }]);
        setDraft("");
        setShowDropdown(false);
    };

    const handleQuickSelectAdd = (id: string) => {
        if (draftType === "test") {
            const preset = labTestsOptions.find(t => t.id === id);
            if (preset) {
                if (value.some(item => item.advice_type === "test" && item.description === preset.value)) {
                    toast.error("Test already added");
                    return;
                }
                onChange([...value, {
                    advice_type: "test",
                    description: preset.value,
                    lab_test_id: preset.lab_test_id
                }]);
                toast.success(`Added test: ${preset.label}`);
            }
        } else {
            const preset = advicesOptions.find(a => a.id === id);
            if (preset) {
                if (value.some(item => item.advice_type === "instruction" && item.description === preset.value)) {
                    toast.error("Advice already added");
                    return;
                }
                onChange([...value, {
                    advice_type: "instruction",
                    description: preset.value
                }]);
                toast.success(`Added advice: ${preset.label}`);
            }
        }
    };

    const handleSelectFromSearch = (item: any) => {
        if (value.some(x => x.advice_type === draftType && x.description === item.value)) {
            toast.error("Already added");
            return;
        }

        onChange([...value, {
            advice_type: draftType,
            description: item.value,
            lab_test_id: draftType === "test" ? item.id : undefined
        }]);
        setDraft("");
        setShowDropdown(false);
        toast.success(`Added: ${item.label}`);
    };

    const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Advice &amp; Follow-up
                </h3>
                {doctorId && (
                    <button
                        type="button"
                        onClick={() => setShowSettingsModal(true)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                        title="Configure Quick Presets"
                    >
                        <Settings className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="space-y-4 p-4">
                {/* Mode Selector & Quick presets */}
                <div className="space-y-3">
                    <div className="flex overflow-hidden rounded-lg border border-slate-300 w-fit">
                        {(["instruction", "test"] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => {
                                    setDraftType(type);
                                    setDraft("");
                                    setSearchResults([]);
                                    setShowDropdown(false);
                                }}
                                disabled={disabled}
                                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${
                                    draftType === type
                                        ? "bg-sky-500 text-white"
                                        : "bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {type === "test" ? (
                                    <FlaskConical className="h-3.5 w-3.5" />
                                ) : (
                                    <ClipboardList className="h-3.5 w-3.5" />
                                )}
                                {type === "test" ? "Test" : "Advice"}
                            </button>
                        ))}
                    </div>

                    {/* Quick Presets Section */}
                    {doctorId && (
                        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                            <div className="flex items-center gap-1.5 mb-2 text-slate-500">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Quick Presets</span>
                            </div>
                            {draftType === "test" ? (
                                labTestsOptions.length > 0 ? (
                                    <LabTestQuickChips
                                        options={labTestsOptions}
                                        addedIds={addedLabTestIds}
                                        onAdd={handleQuickSelectAdd}
                                    />
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No lab test presets configured.</p>
                                )
                            ) : (
                                advicesOptions.length > 0 ? (
                                    <AdviceQuickChips
                                        options={advicesOptions}
                                        addedIds={addedAdviceIds}
                                        onAdd={handleQuickSelectAdd}
                                    />
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No advice presets configured.</p>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Input & Search box */}
                <div ref={searchRef} className="relative flex flex-wrap gap-2">
                    <div className="relative min-w-0 flex-1">
                        <input
                            value={draft}
                            onChange={(e) => {
                                setDraft(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => draft.length >= 2 && setShowDropdown(true)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    add();
                                }
                            }}
                            disabled={disabled}
                            placeholder={
                                draftType === "test"
                                    ? "Search lab tests or type custom test..."
                                    : "Search advices or type custom advice..."
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                        {searching && (
                            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={add}
                        disabled={disabled || !draft.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        Add
                    </button>

                    {/* Autocomplete Dropdown */}
                    {showDropdown && searchResults.length > 0 && (
                        <div className="absolute left-0 top-full z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                            {searchResults.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelectFromSearch(item)}
                                    className="cursor-pointer border-b border-slate-100 px-4 py-2.5 text-sm hover:bg-sky-50 last:border-0"
                                >
                                    <div className="font-semibold text-slate-900">{item.label}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {item.code && (
                                            <span className="text-[10px] font-mono bg-slate-100 px-1 rounded text-slate-500">{item.code}</span>
                                        )}
                                        {item.category && (
                                            <span className="text-xs text-slate-400 capitalize">{item.category}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Added items list */}
                {value.length > 0 && (
                    <ul className="space-y-1.5">
                        {value.map((item, index) => (
                            <li
                                key={`${item.advice_type}-${item.description}-${index}`}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-150"
                            >
                                <span
                                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${
                                        item.advice_type === "test"
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-sky-100 text-sky-700"
                                    }`}
                                >
                                    {item.advice_type === "test" ? "Test" : "Advice"}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                    {item.description}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeAt(index)}
                                    disabled={disabled}
                                    className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                    title="Remove"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Review/Followup date */}
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Review on <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                        type="date"
                        value={followupDate ?? ""}
                        onChange={(e) => onFollowupDateChange(e.target.value || null)}
                        disabled={disabled}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                </div>
            </div>

            {/* Quick Presets Settings modal */}
            {showSettingsModal && doctorId && (
                <QuickPresetsSettingsModal
                    isOpen={showSettingsModal}
                    onClose={() => {
                        setShowSettingsModal(false);
                        loadPresets();
                    }}
                    doctorId={doctorId}
                    onSaved={loadPresets}
                />
            )}
        </div>
    );
}
