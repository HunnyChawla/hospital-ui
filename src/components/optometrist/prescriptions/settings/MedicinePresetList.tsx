"use client";

import React, { useState } from "react";
import {
    Plus,
    X,
    ArrowUp,
    ArrowDown,
    Edit2,
    Check,
    Trash2,
    Droplets,
    Pill,
    Eye,
    Syringe,
    Search,
    Loader2,
    Activity,
    TrendingDown,
    Sun,
    Sunrise,
    Sunset,
    Moon,
    Clock,
    AlertCircle,
    FileText,
} from "lucide-react";
import { toast } from "sonner";
import type { QuickMedicine } from "@/services/quickPresetsApi";
import { medicinesApi, type Medicine } from "@/services/medicinesApi";
import { SearchableDropdown } from "../SearchableDropdown";
import {
    MEDICATION_FORMS,
    MEDICATION_ROUTES,
    MEDICATION_TIMINGS,
    QUICK_FREQUENCY_PRESETS,
    COMMON_DURATIONS,
    COMMON_INSTRUCTIONS,
    COMMON_SPECIAL_INSTRUCTIONS,
    parseFrequencyToStructure,
    formatFrequencyString,
    calculateQuantity,
} from "@/components/doctors/PrescriptionForm";
import { usePrescriptionSettings } from "@/hooks/usePrescriptionSettings";
import {
    getTaperingFrequencyOptions,
    formatFrequencyByPreference,
} from "@/utils/frequencyDisplay";
import type { StructuredFrequency } from "@/services/prescriptionsApi";

const DOSAGES = [
    "1 drop",
    "2 drops",
    "1 tablet",
    "2 tablets",
    "1 capsule",
    "5 ml",
    "10 ml",
    "Apply local application",
];

const FREQUENCIES = [
    "1-0-1",
    "1-0-0",
    "1-1-1",
    "0-0-1",
    "1-1-1-1",
    "0-1-0",
    "SOS",
    "1 time daily",
    "2 times daily",
    "3 times daily",
    "4 times daily",
    "Every 4 hours",
    "Every 6 hours",
    "Every 8 hours",
    "At bedtime",
    "As needed",
];

const MEDICINE_INSTRUCTIONS = [
    "After food",
    "Before food",
    "With water",
    "With warm water",
    "Empty stomach",
    "At bedtime",
    "Both Eyes",
    "Affected Eye",
    "Instill 1 drop",
    "Instill 2 drops",
    "Apply locally",
    "Shake well before use",
    "For external use only",
];

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
    const [brand, setBrand] = useState("");
    const [form, setForm] = useState("Tablet");
    const [strength, setStrength] = useState("");
    const [route, setRoute] = useState("Oral");
    const [dose, setDose] = useState("1 tablet");
    const [frequency, setFrequency] = useState("1-0-1");
    const [frequencyStructure, setFrequencyStructure] = useState<StructuredFrequency>({
        morning: 1,
        afternoon: 0,
        evening: 1,
        night: 0,
    });
    const [isPrn, setIsPrn] = useState(false);
    const [prnReason, setPrnReason] = useState("");
    const [timing, setTiming] = useState("After food");
    const [duration, setDuration] = useState("5 days");
    const [quantity, setQuantity] = useState("");
    const [instructions, setInstructions] = useState("Take with water");
    const [specialInstructions, setSpecialInstructions] = useState("");
    const [taperingSteps, setTaperingSteps] = useState<any[] | undefined>(undefined);
    const [icon, setIcon] = useState<QuickMedicine["icon"]>("pill");
    const [color, setColor] = useState<QuickMedicine["color"]>("sky");
    const { frequencyFormat } = usePrescriptionSettings();

    // Search state
    const [searchResults, setSearchResults] = useState<Medicine[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleSearch = (query: string) => {
        if (!label || label === medicineName) {
            setLabel(query);
        }
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
        if (!label || label === medicineName || addingNew) {
            setLabel(med.name);
        }
        setGenericName(med.generic_name || "");
        if (med.manufacturer) setBrand(med.manufacturer);
        if (med.dosage_form) {
            setForm(med.dosage_form);
            if (med.dosage_form.toLowerCase().includes("drop")) {
                setIcon("droplets");
                setRoute("Ophthalmic");
            } else if (med.dosage_form.toLowerCase().includes("syrup")) {
                setIcon("droplets");
                setRoute("Oral");
            } else if (med.dosage_form.toLowerCase().includes("inject")) {
                setIcon("injection");
                setRoute("Intramuscular (IM)");
            } else if (med.dosage_form.toLowerCase().includes("ointment") || med.dosage_form.toLowerCase().includes("cream")) {
                setIcon("ointment");
                setRoute("Topical");
            } else {
                setIcon("pill");
                setRoute("Oral");
            }
        }
        if (med.strength) setStrength(med.strength);
        if ((med as any).route) setRoute((med as any).route);

        const defForm = med.dosage_form || "tablet";
        const defDose = med.default_dosage || `1 ${defForm.toLowerCase()}`;
        setDose(defDose);

        const defFreq = med.default_frequency || "1-0-1";
        setFrequency(defFreq);
        const parsedStruct = parseFrequencyToStructure(defFreq);
        setFrequencyStructure(parsedStruct);

        const isSos = defFreq.toUpperCase() === "SOS" || defFreq.toLowerCase().includes("as needed");
        setIsPrn(isSos);
        if (isSos) setPrnReason("Fever / Pain");

        if (med.default_duration) setDuration(med.default_duration);
        if (med.default_instructions) setInstructions(med.default_instructions);
        setTiming("After food");

        // Auto-calculate quantity
        const calcQty = calculateQuantity(parsedStruct, med.default_duration || "5 days", defDose, med.dosage_form || "Tablet");
        if (calcQty) setQuantity(calcQty);

        setShowSuggestions(false);
    };

    const startEdit = (index: number) => {
        const item = items[index];
        setLabel(item.label);
        setMedicineName(item.medicine_name);
        setGenericName(item.generic_name || "");
        setBrand(item.brand || "");
        setForm(item.form || "Tablet");
        setStrength(item.strength || "");
        setRoute(item.route || "Oral");
        setDose(item.dose || item.dosage || "1 tablet");
        setFrequency(item.frequency || "1-0-1");
        setFrequencyStructure(item.frequency_structure || parseFrequencyToStructure(item.frequency || "1-0-1"));
        setIsPrn(Boolean(item.is_prn));
        setPrnReason(item.prn_reason || "");
        setTiming(item.timing || "After food");
        setDuration(item.duration || "5 days");
        setQuantity(item.quantity || "");
        setInstructions(item.instructions || "Take with water");
        setSpecialInstructions(item.special_instructions || "");
        setTaperingSteps(item.tapering_steps || undefined);
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
        setBrand("");
        setForm("Tablet");
        setStrength("");
        setRoute("Oral");
        setDose("1 tablet");
        setFrequency("1-0-1");
        setFrequencyStructure({ morning: 1, afternoon: 0, evening: 1, night: 0 });
        setIsPrn(false);
        setPrnReason("");
        setTiming("After food");
        setDuration("5 days");
        setQuantity("10 tablets");
        setInstructions("Take with water");
        setSpecialInstructions("");
        setTaperingSteps(undefined);
        setIcon("pill");
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

    const handleFrequencyPresetClick = (preset: typeof QUICK_FREQUENCY_PRESETS[number]) => {
        setFrequency(preset.freq);
        setFrequencyStructure(preset.struct);
        if (preset.isPrn) {
            setIsPrn(true);
            if (!prnReason) setPrnReason("Fever / Pain");
        } else {
            setIsPrn(false);
        }
        const calcQty = calculateQuantity(preset.struct, duration, dose, form);
        if (calcQty && !preset.isPrn) setQuantity(calcQty);
    };

    const handleDoseFieldChange = (field: keyof StructuredFrequency, delta: number) => {
        const currentVal = Number(frequencyStructure[field] || 0);
        const nextVal = Math.max(0, currentVal + delta);
        const updatedStruct = { ...frequencyStructure, [field]: nextVal };
        setFrequencyStructure(updatedStruct);
        const freqStr = formatFrequencyString(updatedStruct, isPrn);
        setFrequency(freqStr);
        const calcQty = calculateQuantity(updatedStruct, duration, dose, form);
        if (calcQty && !isPrn) setQuantity(calcQty);
    };

    const saveItem = () => {
        const effectiveMedicine = medicineName.trim();
        const effectiveLabel = label.trim() || effectiveMedicine;
        if (!effectiveMedicine || !effectiveLabel) return;

        const normalizedLabel = effectiveLabel.toLowerCase();
        const normalizedMedicine = effectiveMedicine.toLowerCase();

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

        const hasTapering = taperingSteps && taperingSteps.length > 0;
        const finalFreq = isPrn ? "SOS" : formatFrequencyString(frequencyStructure, isPrn) || frequency;
        const calculatedQty = isPrn ? "As needed" : (quantity.trim() || calculateQuantity(frequencyStructure, duration, dose, form));

        const newItem: QuickMedicine = {
            label: effectiveLabel,
            medicine_name: effectiveMedicine,
            generic_name: genericName.trim() || undefined,
            brand: brand.trim() || undefined,
            form: form.trim() || undefined,
            strength: strength.trim() || undefined,
            route: route.trim() || undefined,
            dose: dose.trim() || undefined,
            frequency_structure: isPrn ? { morning: 0, afternoon: 0, evening: 0, night: 0 } : frequencyStructure,
            timing: timing.trim() || undefined,
            dosage: hasTapering ? "Refer steps" : (dose.trim() || "1 tablet"),
            frequency: hasTapering ? "Refer steps" : finalFreq,
            duration: hasTapering ? "Refer steps" : (duration.trim() || "5 days"),
            quantity: hasTapering ? undefined : (calculatedQty || undefined),
            is_prn: isPrn,
            prn_reason: isPrn ? (prnReason.trim() || "As needed") : undefined,
            instructions: hasTapering ? "Refer steps" : (instructions.trim() || undefined),
            special_instructions: hasTapering ? undefined : (specialInstructions.trim() || undefined),
            tapering_steps: taperingSteps,
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
        { id: "sky", class: "bg-sky-500", bgLight: "bg-sky-50", text: "text-sky-700" },
        { id: "purple", class: "bg-purple-500", bgLight: "bg-purple-50", text: "text-purple-700" },
        { id: "emerald", class: "bg-emerald-500", bgLight: "bg-emerald-50", text: "text-emerald-700" },
        { id: "amber", class: "bg-amber-500", bgLight: "bg-amber-50", text: "text-amber-700" },
        { id: "rose", class: "bg-rose-500", bgLight: "bg-rose-50", text: "text-rose-700" },
        { id: "slate", class: "bg-slate-500", bgLight: "bg-slate-50", text: "text-slate-700" },
        { id: "blue", class: "bg-blue-600", bgLight: "bg-blue-50", text: "text-blue-700" },
        { id: "indigo", class: "bg-indigo-600", bgLight: "bg-indigo-50", text: "text-indigo-700" },
    ] as const;

    const renderIcon = (name: string, className = "h-4 w-4") => {
        switch (name) {
            case "droplets": return <Droplets className={className} />;
            case "pill": return <Pill className={className} />;
            case "eye": return <Eye className={className} />;
            case "ointment": return <Syringe className={className} />;
            case "injection": return <Syringe className={className} />;
            default: return <Pill className={className} />;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">Quick Medicine Presets</h3>
                    <p className="text-xs text-slate-500">
                        Configure structured medicine presets with dose, timing, frequency breakdown, and warnings.
                    </p>
                </div>
                <button
                    onClick={startAdd}
                    disabled={addingNew || editingIndex !== null}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add Preset
                </button>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {/* Edit/Add Form */}
                {(addingNew || editingIndex !== null) && (
                    <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-md mb-3 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                            <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-indigo-600" />
                                {addingNew ? "Create New Quick Preset" : `Edit Preset: ${label || "Medicine"}`}
                            </span>
                            <button
                                onClick={cancelForm}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Top: Medicine Search (Primary) & Chip Button Label (Defaults to Med Name, Customizable) */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-7 relative">
                                <label className="text-[11px] font-bold text-slate-800 mb-1 block flex items-center justify-between">
                                    <span>Medicine Name <span className="text-rose-500">*</span></span>
                                    <span className="text-[10px] text-slate-400 font-normal">Search from catalog</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={medicineName}
                                        onChange={e => handleSearch(e.target.value)}
                                        onFocus={() => {
                                            if (medicineName) handleSearch(medicineName);
                                        }}
                                        placeholder="Type name or brand from catalog..."
                                        className="w-full text-xs rounded-lg border border-slate-300 pl-3 pr-8 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                        autoFocus={addingNew}
                                    />
                                    {isSearching ? (
                                        <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-indigo-500" />
                                    ) : (
                                        <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    )}

                                    {showSuggestions && searchResults.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                                            {searchResults.map((med) => (
                                                <button
                                                    key={med.id}
                                                    type="button"
                                                    onClick={() => selectMedicine(med)}
                                                    className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50/80 border-b border-slate-100 last:border-0 transition"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-semibold text-slate-900">{med.name}</span>
                                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                                                            {[med.dosage_form, med.strength].filter(Boolean).join(" • ")}
                                                        </span>
                                                    </div>
                                                    {med.generic_name && (
                                                        <p className="text-[10px] text-slate-500 italic mt-0.5">{med.generic_name}</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {showSuggestions && (
                                        <div
                                            className="fixed inset-0 z-40 bg-transparent"
                                            onClick={() => setShowSuggestions(false)}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-5">
                                <label className="text-[11px] font-bold text-slate-800 mb-1 block flex items-center justify-between">
                                    <span>Chip Button Label <span className="text-rose-500">*</span></span>
                                    <span className="text-[10px] text-indigo-600 font-medium">Customizable</span>
                                </label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={e => setLabel(e.target.value)}
                                    placeholder="Defaults to medicine name (e.g. Paracetamol 500)"
                                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Middle: Brand, Generic, Form, Strength, Route, Dose */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Generic Name</label>
                                <input
                                    type="text"
                                    value={genericName}
                                    onChange={e => setGenericName(e.target.value)}
                                    placeholder="e.g. Paracetamol"
                                    className="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Brand</label>
                                <input
                                    type="text"
                                    value={brand}
                                    onChange={e => setBrand(e.target.value)}
                                    placeholder="e.g. Crocin"
                                    className="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Form</label>
                                <SearchableDropdown
                                    value={form}
                                    onChange={setForm}
                                    options={MEDICATION_FORMS as any}
                                    placeholder="Form"
                                    inputClassName="w-full text-xs rounded border border-slate-300 bg-white px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Strength</label>
                                <input
                                    type="text"
                                    value={strength}
                                    onChange={e => setStrength(e.target.value)}
                                    placeholder="e.g. 500 mg"
                                    className="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Route</label>
                                <SearchableDropdown
                                    value={route}
                                    onChange={setRoute}
                                    options={MEDICATION_ROUTES as any}
                                    placeholder="Route"
                                    inputClassName="w-full text-xs rounded border border-slate-300 bg-white px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {taperingSteps && taperingSteps.length > 0 ? (
                            <div className="flex justify-between items-center bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <span className="text-xs font-bold text-purple-950 flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-purple-600 animate-ping" />
                                    Tapering Regimen Configured ({taperingSteps.length} Steps)
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setTaperingSteps(undefined)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white text-purple-700 hover:bg-purple-50 px-3 py-1.5 text-xs font-bold transition shadow-sm"
                                >
                                    <Activity className="h-3.5 w-3.5" />
                                    Disable Tapering Schedule
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Structured Frequency & Dose */}
                                <div className="space-y-2.5 border border-slate-200 p-3 rounded-lg bg-slate-50/40">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 text-indigo-600" />
                                            Dosage & Structured Frequency
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                                <input
                                                    type="checkbox"
                                                    checked={isPrn}
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        setIsPrn(checked);
                                                        if (checked) {
                                                            setFrequency("SOS");
                                                            if (!prnReason) setPrnReason("Fever / Pain");
                                                        } else {
                                                            setFrequency(formatFrequencyString(frequencyStructure, false) || "1-0-1");
                                                        }
                                                    }}
                                                    className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 h-3.5 w-3.5"
                                                />
                                                SOS / PRN (As Needed)
                                            </label>
                                        </div>
                                    </div>

                                    {/* Quick Frequency Presets */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {QUICK_FREQUENCY_PRESETS.map((p) => (
                                            <button
                                                key={p.label}
                                                type="button"
                                                onClick={() => handleFrequencyPresetClick(p)}
                                                className={`px-2 py-1 text-[11px] font-medium rounded-md border transition ${
                                                    (p.isPrn && isPrn) || (!isPrn && frequency === p.freq)
                                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                                }`}
                                            >
                                                {p.label}
                                                <span className="text-[9px] opacity-75 ml-1">({p.sub})</span>
                                            </button>
                                        ))}
                                    </div>

                                    {isPrn ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-700 mb-1 block">Dose Per Intake</label>
                                                <SearchableDropdown
                                                    value={dose}
                                                    onChange={setDose}
                                                    options={DOSAGES}
                                                    placeholder="e.g. 1 tablet"
                                                    inputClassName="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-700 mb-1 block">PRN Trigger / Reason</label>
                                                <input
                                                    type="text"
                                                    value={prnReason}
                                                    onChange={e => setPrnReason(e.target.value)}
                                                    placeholder="e.g. For fever > 100°F or severe pain"
                                                    className="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 pt-1 items-end">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-700 mb-1 block">Dose Per Intake</label>
                                                <SearchableDropdown
                                                    value={dose}
                                                    onChange={setDose}
                                                    options={DOSAGES}
                                                    placeholder="e.g. 1 tablet"
                                                    inputClassName="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-semibold text-amber-900 mb-1 flex items-center gap-1">
                                                    <Sunrise className="h-3 w-3 text-amber-500" /> Morning
                                                </label>
                                                <div className="flex items-center rounded border border-slate-300 bg-white overflow-hidden">
                                                    <button type="button" onClick={() => handleDoseFieldChange("morning", -0.5)} className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold">-</button>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        value={frequencyStructure.morning ?? 0}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            const updated = { ...frequencyStructure, morning: val };
                                                            setFrequencyStructure(updated);
                                                            setFrequency(formatFrequencyString(updated, false));
                                                        }}
                                                        className="w-full text-center text-xs py-1 focus:outline-none"
                                                    />
                                                    <button type="button" onClick={() => handleDoseFieldChange("morning", 0.5)} className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold">+</button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-semibold text-amber-900 mb-1 flex items-center gap-1">
                                                    <Sun className="h-3 w-3 text-amber-600" /> Afternoon
                                                </label>
                                                <div className="flex items-center rounded border border-slate-300 bg-white overflow-hidden">
                                                    <button type="button" onClick={() => handleDoseFieldChange("afternoon", -0.5)} className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold">-</button>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        value={frequencyStructure.afternoon ?? 0}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            const updated = { ...frequencyStructure, afternoon: val };
                                                            setFrequencyStructure(updated);
                                                            setFrequency(formatFrequencyString(updated, false));
                                                        }}
                                                        className="w-full text-center text-xs py-1 focus:outline-none"
                                                    />
                                                    <button type="button" onClick={() => handleDoseFieldChange("afternoon", 0.5)} className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold">+</button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                                                    <Sunset className="h-3 w-3 text-indigo-500" /> Evening
                                                </label>
                                                <div className="flex items-center rounded border border-slate-300 bg-white overflow-hidden">
                                                    <button type="button" onClick={() => handleDoseFieldChange("evening", -0.5)} className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold">-</button>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        value={frequencyStructure.evening ?? 0}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            const updated = { ...frequencyStructure, evening: val };
                                                            setFrequencyStructure(updated);
                                                            setFrequency(formatFrequencyString(updated, false));
                                                        }}
                                                        className="w-full text-center text-xs py-1 focus:outline-none"
                                                    />
                                                    <button type="button" onClick={() => handleDoseFieldChange("evening", 0.5)} className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold">+</button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-semibold text-purple-900 mb-1 flex items-center gap-1">
                                                    <Moon className="h-3 w-3 text-purple-600" /> Night
                                                </label>
                                                <div className="flex items-center rounded border border-slate-300 bg-white overflow-hidden">
                                                    <button type="button" onClick={() => handleDoseFieldChange("night", -0.5)} className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold">-</button>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        value={frequencyStructure.night ?? 0}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            const updated = { ...frequencyStructure, night: val };
                                                            setFrequencyStructure(updated);
                                                            setFrequency(formatFrequencyString(updated, false));
                                                        }}
                                                        className="w-full text-center text-xs py-1 focus:outline-none"
                                                    />
                                                    <button type="button" onClick={() => handleDoseFieldChange("night", 0.5)} className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold">+</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Timing, Duration, Quantity */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-700 mb-1 block">Timing</label>
                                        <SearchableDropdown
                                            value={timing}
                                            onChange={setTiming}
                                            options={MEDICATION_TIMINGS as any}
                                            placeholder="Timing"
                                            inputClassName="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-700 mb-1 block">Duration</label>
                                        <SearchableDropdown
                                            value={duration}
                                            onChange={(val) => {
                                                setDuration(val);
                                                const calcQty = calculateQuantity(frequencyStructure, val, dose, form);
                                                if (calcQty && !isPrn) setQuantity(calcQty);
                                            }}
                                            options={COMMON_DURATIONS}
                                            placeholder="Duration"
                                            inputClassName="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-700 mb-1 block">Total Quantity</label>
                                        <input
                                            type="text"
                                            value={quantity}
                                            onChange={e => setQuantity(e.target.value)}
                                            placeholder="e.g. 10 tablets"
                                            className="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Instructions and Special Instructions */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-700 mb-1 block">General Instructions</label>
                                        <SearchableDropdown
                                            value={instructions}
                                            onChange={setInstructions}
                                            options={MEDICINE_INSTRUCTIONS}
                                            placeholder="e.g. Take with water"
                                            inputClassName="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 text-amber-600" /> Special Note / Warning (Optional)
                                        </label>
                                        <SearchableDropdown
                                            value={specialInstructions}
                                            onChange={setSpecialInstructions}
                                            options={COMMON_SPECIAL_INSTRUCTIONS}
                                            placeholder="e.g. Complete the full course"
                                            inputClassName="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Tapering Regimen Trigger */}
                        <div className="border-t border-slate-200 pt-2.5">
                            {!taperingSteps && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTaperingSteps([
                                            {
                                                sequence: 1,
                                                dosage: dose || "1 drop",
                                                frequency: "3 times daily",
                                                duration: "7 days",
                                                instructions: instructions || "",
                                            },
                                            {
                                                sequence: 2,
                                                dosage: dose || "1 drop",
                                                frequency: "2 times daily",
                                                duration: "7 days",
                                                instructions: instructions || "",
                                            },
                                            {
                                                sequence: 3,
                                                dosage: dose || "1 drop",
                                                frequency: "1 time daily",
                                                duration: "7 days",
                                                instructions: instructions || "",
                                            },
                                        ]);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                                >
                                    <Activity className="h-3.5 w-3.5" />
                                    Enable Tapering Regimen Builder
                                </button>
                            )}

                            {taperingSteps && (
                                <div className="rounded-lg border border-purple-200 bg-purple-50/40 p-3 space-y-2">
                                    <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                                        <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1">
                                            <TrendingDown className="h-3.5 w-3.5 text-purple-600" />
                                            Tapering Schedule Steps
                                        </span>
                                        <button
                                             type="button"
                                             onClick={() => {
                                                 const lastStep = taperingSteps[taperingSteps.length - 1];
                                                 const defaultFreq = taperingSteps.length === 0
                                                     ? formatFrequencyByPreference(null, "3 times daily", false, frequencyFormat)
                                                     : taperingSteps.length === 1
                                                     ? formatFrequencyByPreference(null, "2 times daily", false, frequencyFormat)
                                                     : formatFrequencyByPreference(null, "1 time daily", false, frequencyFormat);

                                                 setTaperingSteps([
                                                     ...taperingSteps,
                                                     {
                                                         sequence: taperingSteps.length + 1,
                                                         dosage: lastStep?.dosage || "1 drop",
                                                         frequency: lastStep?.frequency || defaultFreq,
                                                         duration: lastStep?.duration || "1 week",
                                                         instructions: lastStep?.instructions || "",
                                                     },
                                                 ]);
                                             }}
                                             className="inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-purple-700"
                                         >
                                             <Plus className="h-3 w-3" />
                                             Add Step
                                         </button>
                                    </div>

                                    <div className="space-y-2">
                                        {taperingSteps.map((step, stepIndex) => (
                                            <div key={stepIndex} className="flex gap-2 items-end bg-white p-2.5 rounded-lg border border-purple-100">
                                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-purple-950 mb-0.5 block uppercase">
                                                            Step {stepIndex + 1} Dose
                                                        </label>
                                                        <SearchableDropdown
                                                            value={step.dosage || ""}
                                                            onChange={(val) => {
                                                                const newSteps = [...taperingSteps];
                                                                newSteps[stepIndex].dosage = val;
                                                                setTaperingSteps(newSteps);
                                                            }}
                                                            options={DOSAGES}
                                                            placeholder="Dose"
                                                            inputClassName="w-full rounded border border-purple-200 bg-white px-2 py-1 text-[11px] focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-purple-950 mb-0.5 block uppercase">
                                                            Frequency
                                                        </label>
                                                        <SearchableDropdown
                                                            value={formatFrequencyByPreference(null, step.frequency, false, frequencyFormat) || step.frequency || ""}
                                                            onChange={(val) => {
                                                                const newSteps = [...taperingSteps];
                                                                newSteps[stepIndex].frequency = val;
                                                                setTaperingSteps(newSteps);
                                                            }}
                                                            options={getTaperingFrequencyOptions(frequencyFormat)}
                                                            placeholder={frequencyFormat === "descriptive" ? "Three times a day" : frequencyFormat === "both" ? "1-1-1 (Three times a day)" : "1-1-1"}
                                                            inputClassName="w-full rounded border border-purple-200 bg-white px-2 py-1 text-[11px] focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-purple-950 mb-0.5 block uppercase">
                                                            Duration
                                                        </label>
                                                        <SearchableDropdown
                                                            value={step.duration || ""}
                                                            onChange={(val) => {
                                                                const newSteps = [...taperingSteps];
                                                                newSteps[stepIndex].duration = val;
                                                                setTaperingSteps(newSteps);
                                                            }}
                                                            options={COMMON_DURATIONS}
                                                            placeholder="Duration"
                                                            inputClassName="w-full rounded border border-purple-200 bg-white px-2 py-1 text-[11px] focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-purple-950 mb-0.5 block uppercase">
                                                            Instructions
                                                        </label>
                                                        <SearchableDropdown
                                                            value={step.instructions || ""}
                                                            onChange={(val) => {
                                                                const newSteps = [...taperingSteps];
                                                                newSteps[stepIndex].instructions = val;
                                                                setTaperingSteps(newSteps);
                                                            }}
                                                            options={MEDICINE_INSTRUCTIONS}
                                                            placeholder="Instructions"
                                                            inputClassName="w-full rounded border border-purple-200 bg-white px-2 py-1 text-[11px] focus:outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                {taperingSteps.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newSteps = taperingSteps.filter((_, sIdx) => sIdx !== stepIndex)
                                                                .map((s, newIdx) => ({ ...s, sequence: newIdx + 1 }));
                                                            setTaperingSteps(newSteps);
                                                        }}
                                                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Visual Styling: Icon & Color */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-3">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700">Icon:</span>
                                    <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                                        {(["pill", "droplets", "eye", "ointment", "injection"] as const).map((i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setIcon(i)}
                                                className={`p-1.5 rounded-md transition ${icon === i ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
                                            >
                                                {renderIcon(i, "h-3.5 w-3.5")}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700">Color:</span>
                                    <div className="flex gap-1.5">
                                        {colors.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => setColor(c.id as any)}
                                                className={`h-5 w-5 rounded-full ${c.class} ${color === c.id ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "opacity-75 hover:opacity-100"} transition-all`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={cancelForm}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white rounded-lg border border-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveItem}
                                    disabled={!label.trim() || !medicineName.trim()}
                                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition"
                                >
                                    <Check className="h-4 w-4" />
                                    {addingNew ? "Save Preset" : "Update Preset"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* List Items */}
                {items.length === 0 && !addingNew && (
                    <div className="text-center py-10 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        No medicine presets defined yet. Click <strong>Add Preset</strong> above to create your first quick preset.
                    </div>
                )}

                {items.map((item, index) => {
                    const colorStyle = colors.find(c => c.id === item.color) || colors[0];
                    const doseStr = item.dose || item.dosage || "";
                    const freqDisplay = item.is_prn
                        ? `SOS${item.prn_reason ? ` (${item.prn_reason})` : ""}`
                        : (item.frequency || formatFrequencyString(item.frequency_structure, false));

                    return (
                        <div
                            key={index}
                            className={`flex items-start gap-3 p-3 rounded-xl border bg-white shadow-sm transition ${
                                editingIndex === index
                                    ? "border-indigo-400 ring-2 ring-indigo-100"
                                    : "border-slate-200 hover:border-slate-300 hover:shadow"
                            }`}
                        >
                            {/* Reorder Controls */}
                            <div className="flex flex-col gap-0.5 mt-0.5">
                                <button
                                    onClick={() => moveItem(index, "up")}
                                    disabled={index === 0}
                                    className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition"
                                >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => moveItem(index, "down")}
                                    disabled={index === items.length - 1}
                                    className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition"
                                >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${colorStyle.bgLight} ${colorStyle.text} border border-${item.color}-200`}>
                                        {renderIcon(item.icon, "h-3.5 w-3.5")}
                                        {item.label}
                                    </span>
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                        {item.medicine_name}
                                    </span>
                                    {item.generic_name && (
                                        <span className="text-[11px] text-slate-500 italic">
                                            ({item.generic_name})
                                        </span>
                                    )}
                                    {item.brand && (
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200 font-medium">
                                            Brand: {item.brand}
                                        </span>
                                    )}
                                    {(item.form || item.strength) && (
                                        <span className="text-[10px] text-slate-600 font-semibold">
                                            • {[item.form, item.strength].filter(Boolean).join(" ")}
                                        </span>
                                    )}
                                </div>

                                <div className="text-[11px] text-slate-600 space-y-0.5 mt-1">
                                    {item.tapering_steps && item.tapering_steps.length > 0 ? (
                                        <div className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                                            <Activity className="h-3 w-3 text-purple-500" />
                                            Tapering Schedule ({item.tapering_steps.length} Steps)
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-700">
                                            {doseStr && <span><strong>Dose:</strong> {doseStr}</span>}
                                            {item.route && <span>• <strong>Route:</strong> {item.route}</span>}
                                            {freqDisplay && <span>• <strong>Freq:</strong> {freqDisplay}</span>}
                                            {item.timing && <span>• <strong>Timing:</strong> {item.timing}</span>}
                                            {item.duration && <span>• <strong>Duration:</strong> {item.duration}</span>}
                                            {item.quantity && <span>• <strong>Qty:</strong> {item.quantity}</span>}
                                        </div>
                                    )}

                                    {(item.instructions || item.special_instructions) && (
                                        <div className="text-[10px] text-slate-500 italic flex flex-wrap gap-x-2">
                                            {item.instructions && <span>Instructions: {item.instructions}</span>}
                                            {item.special_instructions && (
                                                <span className="text-amber-700 font-normal">
                                                    • Special: {item.special_instructions}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 mt-0.5">
                                <button
                                    onClick={() => startEdit(index)}
                                    disabled={editingIndex !== null}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-30"
                                    title="Edit preset"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => deleteItem(index)}
                                    disabled={editingIndex !== null}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                                    title="Delete preset"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
