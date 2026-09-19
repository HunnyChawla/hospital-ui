"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pill,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  X,
} from "lucide-react";
import { medicinesApi, Medicine } from "@/services/medicinesApi";
import { toast } from "sonner";

export interface PrescribedMedicineItem {
  medicine_id?: string | null;
  medicine_name?: string;
  name?: string;
  generic_name?: string | null;
  dose: string;
  route?: string;
  frequency: string;
  duration: string;
  timing?: string | null;
  instructions?: string | null;
  form?: string | null;
  strength?: string | null;
  frequency_structure?: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  } | null;
  is_prn?: boolean;
  [key: string]: any;
}

export const MEDICATION_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Cream",
  "Ointment",
  "Gel",
  "Drops",
  "Eye drops",
  "Ear drops",
  "Nasal drops/spray",
  "Inhaler",
  "Powder",
  "Sachet",
  "Suspension",
  "Suppository",
  "IV fluids",
] as const;

export const MEDICATION_ROUTES = [
  "Oral",
  "Topical",
  "Intravenous (IV)",
  "Intramuscular (IM)",
  "Subcutaneous (SC)",
  "Inhalation",
  "Nasal",
  "Ophthalmic",
  "Otic",
  "Sublingual",
  "Rectal",
  "Transdermal",
] as const;

export const MEDICATION_TIMINGS = [
  "After food",
  "Before food",
  "With food",
  "Empty stomach",
  "At bedtime",
  "As advised",
] as const;

export const QUICK_FREQUENCY_PRESETS = [
  {
    label: "1-0-1",
    sub: "Twice daily",
    struct: { morning: 1, afternoon: 0, evening: 1, night: 0 },
    freq: "1-0-1",
  },
  {
    label: "1-0-0",
    sub: "Once daily (Morning)",
    struct: { morning: 1, afternoon: 0, evening: 0, night: 0 },
    freq: "1-0-0",
  },
  {
    label: "1-1-1",
    sub: "Three times daily",
    struct: { morning: 1, afternoon: 1, evening: 1, night: 0 },
    freq: "1-1-1",
  },
  {
    label: "0-0-1",
    sub: "At bedtime",
    struct: { morning: 0, afternoon: 0, evening: 0, night: 1 },
    freq: "0-0-1",
  },
  {
    label: "1-1-1-1",
    sub: "Four times daily",
    struct: { morning: 1, afternoon: 1, evening: 1, night: 1 },
    freq: "1-1-1-1",
  },
  {
    label: "SOS",
    sub: "As needed",
    struct: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    freq: "SOS",
    isPrn: true,
  },
];

export const COMMON_DURATIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "1 month",
];

export const COMMON_INSTRUCTIONS = [
  "Take with water",
  "After meals",
  "Before meals",
  "With warm water",
  "With milk",
  "Empty stomach",
  "Dissolve in water",
];

export function getMedicineName(item: PrescribedMedicineItem): string {
  return item.medicine_name || item.name || "";
}

export function deriveDoseFromMedicine(med: Partial<Medicine> & { name: string }): string {
  if (med.default_dosage && med.default_dosage.trim()) {
    return med.default_dosage.trim();
  }
  if (med.strength && med.strength.trim()) {
    return med.strength.trim();
  }
  const name = med.name || "";
  const strengthMatch = name.match(
    /\b(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?\s*(?:mg|g|mcg|ml|iu|%|meq|iu\/ml|mg\/ml))\b/i
  );
  if (strengthMatch) {
    return strengthMatch[1].trim();
  }
  const formOrName = `${med.dosage_form || ""} ${name}`.toLowerCase();
  if (formOrName.includes("tab")) return "1 Tab";
  if (formOrName.includes("cap")) return "1 Cap";
  if (
    formOrName.includes("inj") ||
    formOrName.includes("vial") ||
    formOrName.includes("amp") ||
    formOrName.includes("infusion")
  ) {
    return "1 Vial";
  }
  if (
    formOrName.includes("syp") ||
    formOrName.includes("syrup") ||
    formOrName.includes("susp") ||
    formOrName.includes("liquid")
  ) {
    return "5 ml";
  }
  if (formOrName.includes("drop")) return "1-2 Drops";
  if (
    formOrName.includes("puff") ||
    formOrName.includes("inhal") ||
    formOrName.includes("respule") ||
    formOrName.includes("rotacap")
  ) {
    return "1-2 Puffs";
  }
  if (formOrName.includes("sachet") || formOrName.includes("powder")) return "1 Sachet";
  if (
    formOrName.includes("ointment") ||
    formOrName.includes("cream") ||
    formOrName.includes("gel") ||
    formOrName.includes("lotion")
  ) {
    return "Apply locally";
  }
  if (formOrName.includes("supposit") || formOrName.includes("rectal")) return "1 Suppository";
  return "1 Tab";
}

export function deriveRouteFromMedicine(med: Partial<Medicine> & { name: string }): string {
  const formOrName = `${med.dosage_form || ""} ${med.name || ""}`.toLowerCase();
  if (formOrName.includes("eye") || formOrName.includes("ophth") || formOrName.includes("drop")) {
    return "Ophthalmic";
  }
  if (
    formOrName.includes("inj") ||
    formOrName.includes("iv") ||
    formOrName.includes("infusion")
  ) {
    return "Intravenous (IV)";
  }
  if (formOrName.includes("im") || formOrName.includes("intramuscular")) {
    return "Intramuscular (IM)";
  }
  if (formOrName.includes("sc") || formOrName.includes("subcut")) {
    return "Subcutaneous (SC)";
  }
  if (
    formOrName.includes("inhal") ||
    formOrName.includes("respule") ||
    formOrName.includes("rotacap") ||
    formOrName.includes("spray")
  ) {
    return "Inhalation";
  }
  if (
    formOrName.includes("cream") ||
    formOrName.includes("ointment") ||
    formOrName.includes("gel") ||
    formOrName.includes("lotion") ||
    formOrName.includes("topical")
  ) {
    return "Topical";
  }
  if (formOrName.includes("ear") || formOrName.includes("otic")) {
    return "Otic";
  }
  if (formOrName.includes("nasal")) {
    return "Nasal";
  }
  if (formOrName.includes("supposit") || formOrName.includes("rectal")) {
    return "Rectal";
  }
  return "Oral";
}

export function parseFrequencyToStructure(freq?: string | null): {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
} {
  if (!freq) return { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const cleaned = freq.trim();

  if (/^[\d.]+-[\d.]+-[\d.]+(-[\d.]+)?$/.test(cleaned)) {
    const parts = cleaned.split("-").map((p) => parseFloat(p) || 0);
    if (parts.length === 3) {
      return { morning: parts[0], afternoon: parts[1], evening: parts[2], night: 0 };
    }
    if (parts.length >= 4) {
      return { morning: parts[0], afternoon: parts[1], evening: parts[2], night: parts[3] };
    }
  }

  const lower = cleaned.toLowerCase();
  if (lower.includes("once") || lower === "1 time daily" || lower === "od") {
    return { morning: 1, afternoon: 0, evening: 0, night: 0 };
  }
  if (lower.includes("twice") || lower === "2 times daily" || lower === "bid" || lower === "bd") {
    return { morning: 1, afternoon: 0, evening: 1, night: 0 };
  }
  if (lower.includes("thrice") || lower === "3 times daily" || lower === "tid" || lower === "tds") {
    return { morning: 1, afternoon: 1, evening: 1, night: 0 };
  }
  if (lower === "4 times daily" || lower === "qid" || lower.includes("four")) {
    return { morning: 1, afternoon: 1, evening: 1, night: 1 };
  }
  if (lower.includes("bedtime") || lower.includes("night") || lower === "hs") {
    return { morning: 0, afternoon: 0, evening: 0, night: 1 };
  }

  return { morning: 0, afternoon: 0, evening: 0, night: 0 };
}

export function formatFrequencyString(
  struct?: {
    morning?: number;
    afternoon?: number;
    evening?: number;
    night?: number;
  } | null,
  isPrn?: boolean | null
): string {
  if (isPrn) return "SOS";
  if (!struct) return "";
  const m = struct.morning ?? 0;
  const a = struct.afternoon ?? 0;
  const e = struct.evening ?? 0;
  const n = struct.night ?? 0;
  if (Number(n) > 0) {
    return `${m}-${a}-${e}-${n}`;
  }
  return `${m}-${a}-${e}`;
}

export interface GenericMedicinePrescriberProps<T extends PrescribedMedicineItem = PrescribedMedicineItem> {
  items: T[];
  onChange: (items: T[]) => void;
  readOnly?: boolean;
  title?: string;
  subtitle?: string;
  allowCustomMedicine?: boolean;
  className?: string;
  placeholder?: string;
}

export function GenericMedicinePrescriber<T extends PrescribedMedicineItem = PrescribedMedicineItem>({
  items,
  onChange,
  readOnly = false,
  title = "Discharge Medications (Rx on Discharge)",
  subtitle = "(Pre-filled from active medications)",
  allowCustomMedicine = true,
  className = "",
  placeholder = "Type medicine name to search catalog or add custom...",
}: GenericMedicinePrescriberProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});
  const [customSlotIndices, setCustomSlotIndices] = useState<Record<number, boolean>>({});

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      const timeoutId = setTimeout(async () => {
        setIsSearching(true);
        try {
          const response = await medicinesApi.search({
            q: searchTerm.trim(),
            page_size: 20,
            is_active: true,
          });
          setSearchResults(response.items || []);
          setShowDropdown(true);
        } catch (error) {
          console.error("Failed to search medicines:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 250);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchTerm]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddCatalogMedicine = (medicine: Medicine) => {
    const exists = items.some(
      (m) =>
        (medicine.id && m.medicine_id === medicine.id) ||
        getMedicineName(m).toLowerCase() === medicine.name.toLowerCase()
    );

    if (exists) {
      toast.error(`"${medicine.name}" is already in the list`);
      return;
    }

    const defaultForm = medicine.dosage_form || "Tablet";
    const defaultDose = deriveDoseFromMedicine(medicine);
    const defaultRoute = (medicine as any).route || deriveRouteFromMedicine(medicine);
    const defaultFreq = medicine.default_frequency || "1-0-1";
    const freqStruct = parseFrequencyToStructure(defaultFreq);
    const defaultDuration = medicine.default_duration || "5 days";
    const defaultInstructions = medicine.default_instructions || "Take with water";

    const newItem: PrescribedMedicineItem = {
      medicine_id: medicine.id,
      medicine_name: medicine.name,
      name: medicine.name,
      generic_name: medicine.generic_name || undefined,
      form: defaultForm,
      strength: medicine.strength || undefined,
      dose: defaultDose,
      route: defaultRoute,
      frequency_structure: freqStruct,
      frequency: defaultFreq,
      timing: "After food",
      duration: defaultDuration,
      instructions: defaultInstructions,
      is_prn: false,
    };

    onChange([...items, newItem as T]);
    setSearchTerm("");
    setShowDropdown(false);
    toast.success(`Added ${medicine.name}`);
  };

  const handleAddCustomMedicine = (customName: string) => {
    const trimmed = customName.trim();
    if (!trimmed) return;

    const exists = items.some(
      (m) => getMedicineName(m).toLowerCase() === trimmed.toLowerCase()
    );

    if (exists) {
      toast.error(`"${trimmed}" is already in the list`);
      return;
    }

    const derivedDose = deriveDoseFromMedicine({ name: trimmed });
    const derivedRoute = deriveRouteFromMedicine({ name: trimmed });

    const newItem: PrescribedMedicineItem = {
      medicine_id: null,
      medicine_name: trimmed,
      name: trimmed,
      generic_name: undefined,
      form: "Tablet",
      strength: undefined,
      dose: derivedDose,
      route: derivedRoute,
      frequency_structure: { morning: 1, afternoon: 0, evening: 1, night: 0 },
      frequency: "1-0-1",
      timing: "After food",
      duration: "5 days",
      instructions: "Take with water",
      is_prn: false,
    };

    onChange([...items, newItem as T]);
    setSearchTerm("");
    setShowDropdown(false);
    toast.success(`Added custom medicine: ${trimmed}`);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateItem = (index: number, updates: Partial<PrescribedMedicineItem>) => {
    const updated = [...items];
    const current = updated[index];
    const next = { ...current, ...updates };
    if (updates.medicine_name && !updates.name) {
      next.name = updates.medicine_name;
    } else if (updates.name && !updates.medicine_name) {
      next.medicine_name = updates.name;
    }
    updated[index] = next;
    onChange(updated);
  };

  const handleApplyQuickFrequency = (
    index: number,
    preset: (typeof QUICK_FREQUENCY_PRESETS)[number]
  ) => {
    const isPrn = Boolean(preset.isPrn);
    const newStruct = { ...preset.struct };
    handleUpdateItem(index, {
      frequency_structure: newStruct,
      frequency: preset.freq,
      is_prn: isPrn,
    });
  };

  const handleSlotChange = (
    index: number,
    slot: "morning" | "afternoon" | "evening" | "night",
    value: number | string
  ) => {
    const item = items[index];
    const curStruct = item.frequency_structure || parseFrequencyToStructure(item.frequency);
    const numVal = Math.max(0, parseFloat(value as string) || 0);
    const newStruct = {
      morning: slot === "morning" ? numVal : (Number(curStruct?.morning) || 0),
      afternoon: slot === "afternoon" ? numVal : (Number(curStruct?.afternoon) || 0),
      evening: slot === "evening" ? numVal : (Number(curStruct?.evening) || 0),
      night: slot === "night" ? numVal : (Number(curStruct?.night) || 0),
    };
    handleUpdateItem(index, {
      frequency_structure: newStruct,
      frequency: formatFrequencyString(newStruct),
      is_prn: false,
    });
  };

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleCustomSlots = (index: number) => {
    setCustomSlotIndices((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3.5 ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Pill className="h-4 w-4" />
          </div>
          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{title}</h4>
          {subtitle && (
            <span className="text-[11px] text-slate-400 font-normal">{subtitle}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
            {items.length} {items.length === 1 ? "Medicine" : "Medicines"}
          </span>
        </div>
      </div>

      {/* Search Input with Autocomplete */}
      {!readOnly && (
        <div ref={searchContainerRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => {
                if (searchResults.length > 0 || searchTerm.trim().length >= 2) {
                  setShowDropdown(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (searchResults.length > 0) {
                    handleAddCatalogMedicine(searchResults[0]);
                  } else if (allowCustomMedicine && searchTerm.trim()) {
                    handleAddCustomMedicine(searchTerm);
                  }
                } else if (e.key === "Escape") {
                  setShowDropdown(false);
                }
              }}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2 pl-9 pr-9 text-xs sm:text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 placeholder:text-slate-400 font-medium"
              placeholder={placeholder}
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sky-600" />
            ) : searchTerm ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setShowDropdown(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && (
            <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
              {searchResults.map((medicine) => (
                <button
                  key={medicine.id}
                  type="button"
                  onClick={() => handleAddCatalogMedicine(medicine)}
                  className="w-full text-left px-3.5 py-2 hover:bg-sky-50 transition cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-sky-700">
                        {medicine.name}
                      </span>
                      {medicine.dosage_form && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {medicine.dosage_form}
                        </span>
                      )}
                      {medicine.strength && (
                        <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-100">
                          {medicine.strength}
                        </span>
                      )}
                    </div>
                    {(medicine.generic_name || medicine.manufacturer) && (
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {[medicine.generic_name, medicine.manufacturer]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-sky-600 shrink-0 group-hover:underline flex items-center gap-0.5">
                    <Plus className="h-3 w-3" /> Add
                  </span>
                </button>
              ))}

              {/* Add Custom Medicine Option */}
              {allowCustomMedicine && searchTerm.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => handleAddCustomMedicine(searchTerm)}
                  className="w-full text-left px-3.5 py-2.5 bg-amber-50/70 hover:bg-amber-100/80 transition cursor-pointer flex items-center justify-between gap-2 text-amber-900 border-t border-amber-200/60"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="text-xs truncate">
                      Add custom medicine:{" "}
                      <strong className="font-bold">&quot;{searchTerm.trim()}&quot;</strong>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 shrink-0 uppercase tracking-wide bg-amber-200/70 px-2 py-0.5 rounded">
                    + Custom
                  </span>
                </button>
              )}

              {searchResults.length === 0 && !isSearching && !allowCustomMedicine && (
                <div className="px-4 py-3 text-center text-xs text-slate-400 italic">
                  No matching medicines found in catalog.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Medication Items List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-6 px-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
            <Pill className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-600">
            No discharge medications added.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {readOnly
              ? "No medicines were prescribed on discharge."
              : "Search above to prescribe medications for discharge."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((med, idx) => {
            const isExpanded = Boolean(expandedIndices[idx]);
            const showCustomSlots = Boolean(customSlotIndices[idx]);
            const freqStruct =
              med.frequency_structure || parseFrequencyToStructure(med.frequency);
            const medName = getMedicineName(med);

            return (
              <div
                key={idx}
                className="group rounded-xl border border-slate-200 bg-white shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs"
              >
                {/* Medicine Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-1.5 rounded-t-xl">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight truncate">
                      {medName}
                    </span>
                    {med.form && (
                      <span className="text-[10px] font-semibold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {med.form}
                      </span>
                    )}
                    {med.strength && (
                      <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                        {med.strength}
                      </span>
                    )}
                    {med.generic_name && (
                      <span className="text-[11px] text-slate-500 italic hidden md:inline truncate max-w-xs">
                        ({med.generic_name})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => toggleExpand(idx)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition cursor-pointer"
                      title={isExpanded ? "Hide advanced fields" : "Show advanced fields"}
                    >
                      <SlidersHorizontal className="h-3 w-3 text-slate-500" />
                      <span>{isExpanded ? "Fewer details" : "More details"}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-slate-500" />
                      )}
                    </button>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        title="Remove medication"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Primary Medicine Controls */}
                <div className="p-3 space-y-2.5">
                  {/* Row 1: Quick Frequency Presets + Custom Slots Toggle + Timing */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-0.5">
                        Freq:
                      </span>
                      {QUICK_FREQUENCY_PRESETS.map((p) => {
                        const isActive =
                          (p.isPrn && med.is_prn) ||
                          (!med.is_prn && med.frequency === p.freq);

                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => handleApplyQuickFrequency(idx, p)}
                            disabled={readOnly}
                            className={`rounded-lg px-2 py-0.5 text-xs font-semibold transition cursor-pointer ${
                              isActive
                                ? "bg-sky-600 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            } disabled:opacity-75`}
                            title={`${p.label} • ${p.sub}`}
                          >
                            {p.label}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => toggleCustomSlots(idx)}
                        disabled={readOnly}
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold border transition cursor-pointer ${
                          showCustomSlots
                            ? "border-sky-300 bg-sky-50 text-sky-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                        title="Customize individual morning/afternoon/evening/night doses"
                      >
                        {showCustomSlots ? "Hide Custom Slots" : "Custom Slots ▾"}
                      </button>
                    </div>

                    {/* Timing Selector */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Timing:
                      </span>
                      <select
                        value={med.timing || "After food"}
                        onChange={(e) => handleUpdateItem(idx, { timing: e.target.value })}
                        disabled={readOnly}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 font-medium focus:border-sky-500 focus:outline-none cursor-pointer"
                      >
                        {MEDICATION_TIMINGS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Custom 4-Slot Dosage Counters (Shown when toggled) */}
                  {showCustomSlots && (
                    <div className="rounded-lg border border-sky-100 bg-sky-50/40 p-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {/* Morning */}
                        <div className="flex items-center justify-between bg-white rounded border border-slate-200 px-2 py-1">
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                            <Sunrise className="h-3 w-3" /> M
                          </span>
                          <div className="flex items-center gap-1">
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSlotChange(
                                    idx,
                                    "morning",
                                    Math.max(0, (Number(freqStruct.morning) || 0) - 0.5)
                                  )
                                }
                                className="h-4 w-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                -
                              </button>
                            )}
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={freqStruct?.morning ?? 0}
                              onChange={(e) => handleSlotChange(idx, "morning", e.target.value)}
                              disabled={readOnly}
                              className="w-7 text-center text-xs font-bold text-slate-900 border-0 p-0 focus:outline-none"
                            />
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSlotChange(
                                    idx,
                                    "morning",
                                    (Number(freqStruct?.morning) || 0) + 1
                                  )
                                }
                                className="h-4 w-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Afternoon */}
                        <div className="flex items-center justify-between bg-white rounded border border-slate-200 px-2 py-1">
                          <span className="text-[10px] font-bold text-orange-600 flex items-center gap-1">
                            <Sun className="h-3 w-3" /> A
                          </span>
                          <div className="flex items-center gap-1">
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSlotChange(
                                    idx,
                                    "afternoon",
                                    Math.max(0, (Number(freqStruct.afternoon) || 0) - 0.5)
                                  )
                                }
                                className="h-4 w-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                -
                              </button>
                            )}
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={freqStruct?.afternoon ?? 0}
                              onChange={(e) => handleSlotChange(idx, "afternoon", e.target.value)}
                              disabled={readOnly}
                              className="w-7 text-center text-xs font-bold text-slate-900 border-0 p-0 focus:outline-none"
                            />
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSlotChange(
                                    idx,
                                    "afternoon",
                                    (Number(freqStruct?.afternoon) || 0) + 1
                                  )
                                }
                                className="h-4 w-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Evening */}
                        <div className="flex items-center justify-between bg-white rounded border border-slate-200 px-2 py-1">
                          <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                            <Sunset className="h-3 w-3" /> E
                          </span>
                          <div className="flex items-center gap-1">
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSlotChange(
                                    idx,
                                    "evening",
                                    Math.max(0, (Number(freqStruct.evening) || 0) - 0.5)
                                  )
                                }
                                className="h-4 w-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                -
                              </button>
                            )}
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={freqStruct?.evening ?? 0}
                              onChange={(e) => handleSlotChange(idx, "evening", e.target.value)}
                              disabled={readOnly}
                              className="w-7 text-center text-xs font-bold text-slate-900 border-0 p-0 focus:outline-none"
                            />
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSlotChange(
                                    idx,
                                    "evening",
                                    (Number(freqStruct?.evening) || 0) + 1
                                  )
                                }
                                className="h-4 w-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Night */}
                        <div className="flex items-center justify-between bg-white rounded border border-slate-200 px-2 py-1">
                          <span className="text-[10px] font-bold text-slate-800 flex items-center gap-1">
                            <Moon className="h-3 w-3" /> N
                          </span>
                          <div className="flex items-center gap-1">
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSlotChange(
                                    idx,
                                    "night",
                                    Math.max(0, (Number(freqStruct.night) || 0) - 0.5)
                                  )
                                }
                                className="h-4 w-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                -
                              </button>
                            )}
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={freqStruct?.night ?? 0}
                              onChange={(e) => handleSlotChange(idx, "night", e.target.value)}
                              disabled={readOnly}
                              className="w-7 text-center text-xs font-bold text-slate-900 border-0 p-0 focus:outline-none"
                            />
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSlotChange(
                                    idx,
                                    "night",
                                    (Number(freqStruct?.night) || 0) + 1
                                  )
                                }
                                className="h-4 w-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 2: Duration & Instructions */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    {/* Duration (5 cols) */}
                    <div className="sm:col-span-5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        Duration:
                      </span>
                      <input
                        type="text"
                        value={med.duration || ""}
                        onChange={(e) => handleUpdateItem(idx, { duration: e.target.value })}
                        disabled={readOnly}
                        placeholder="e.g. 5 days"
                        className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 font-semibold focus:border-sky-500 focus:outline-none"
                      />
                      {!readOnly && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {COMMON_DURATIONS.slice(0, 4).map((dur) => (
                            <button
                              key={dur}
                              type="button"
                              onClick={() => handleUpdateItem(idx, { duration: dur })}
                              className="rounded bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700 font-medium transition cursor-pointer"
                            >
                              {dur.replace(" days", "d")}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Instructions (7 cols) */}
                    <div className="sm:col-span-7 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        Instructions:
                      </span>
                      <input
                        type="text"
                        value={med.instructions || ""}
                        onChange={(e) => handleUpdateItem(idx, { instructions: e.target.value })}
                        disabled={readOnly}
                        placeholder="e.g. Take with water after meals"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span>
                        <strong className="text-slate-700">Dose:</strong>{" "}
                        <span className="font-semibold text-slate-900">{med.dose || "—"}</span>
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-slate-700">Route:</strong>{" "}
                        <span className="font-semibold text-slate-900">{med.route || "Oral"}</span>
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-slate-700">Freq:</strong>{" "}
                        <span className="font-semibold text-emerald-800">
                          {med.is_prn ? "PRN / SOS" : med.frequency || "—"}
                        </span>
                      </span>
                      {med.timing && (
                        <>
                          <span>•</span>
                          <span>
                            <strong className="text-slate-700">Timing:</strong> {med.timing}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expandable Advanced Drawer (Dose, Route, Generic Name) */}
                  {isExpanded && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5 mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center justify-between">
                        <span>Advanced Clinical Details</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Dose */}
                        <div>
                          <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Dosage / Unit
                          </label>
                          <input
                            type="text"
                            value={med.dose}
                            onChange={(e) => handleUpdateItem(idx, { dose: e.target.value })}
                            disabled={readOnly}
                            placeholder="e.g. 500mg, 1 Tab"
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 font-semibold focus:border-sky-500 focus:outline-none"
                          />
                        </div>

                        {/* Route */}
                        <div>
                          <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Route
                          </label>
                          <select
                            value={med.route || "Oral"}
                            onChange={(e) => handleUpdateItem(idx, { route: e.target.value })}
                            disabled={readOnly}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none cursor-pointer"
                          >
                            {MEDICATION_ROUTES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Generic Name */}
                        <div>
                          <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Generic Name
                          </label>
                          <input
                            type="text"
                            value={med.generic_name || ""}
                            onChange={(e) => handleUpdateItem(idx, { generic_name: e.target.value })}
                            disabled={readOnly}
                            placeholder="e.g. Paracetamol"
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
