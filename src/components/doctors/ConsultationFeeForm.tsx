"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { doctorsApi, ConsultationFee, ConsultationFeeRequest, Doctor } from "@/services/doctorsApi";
import { patientCategoriesApi, PatientCategoryResponse } from "@/services/patientCategoriesApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  ChevronDown,
  ChevronUp,
  SunMedium,
  Sunset,
  Moon,
  AlertCircle,
  Zap,
  Calendar,
  RotateCcw,
  Percent,
  Copy,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Info,
  Check,
  CheckCircle2,
  Trash2,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

interface ConsultationFeeFormProps {
  doctorId: string;
  doctor?: Doctor;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type Shift = "morning" | "evening" | "night" | "emergency";
type PatientType = "new" | "old";

const DAYS = [
  { value: 0, label: "Monday", short: "Mon", isWeekend: false },
  { value: 1, label: "Tuesday", short: "Tue", isWeekend: false },
  { value: 2, label: "Wednesday", short: "Wed", isWeekend: false },
  { value: 3, label: "Thursday", short: "Thu", isWeekend: false },
  { value: 4, label: "Friday", short: "Fri", isWeekend: false },
  { value: 5, label: "Saturday", short: "Sat", isWeekend: true },
  { value: 6, label: "Sunday", short: "Sun", isWeekend: true },
];

const SHIFTS: {
  value: Shift;
  label: string;
  shortLabel: string;
  icon: typeof SunMedium;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    value: "morning",
    label: "Morning",
    shortLabel: "Morn",
    icon: SunMedium,
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    badgeText: "text-amber-600",
  },
  {
    value: "evening",
    label: "Evening",
    shortLabel: "Eve",
    icon: Sunset,
    badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
    badgeText: "text-orange-600",
  },
  {
    value: "night",
    label: "Night",
    shortLabel: "Night",
    icon: Moon,
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    badgeText: "text-indigo-600",
  },
  {
    value: "emergency",
    label: "Emergency",
    shortLabel: "Emerg",
    icon: AlertCircle,
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    badgeText: "text-rose-600",
  },
];

const PATIENT_TYPES: { value: PatientType; label: string; short: string }[] = [
  { value: "new", label: "New Patient", short: "New" },
  { value: "old", label: "Old Patient", short: "Old" },
];

function getFormKey(day: number, shift: Shift, patientType: PatientType): string {
  return `${day}_${shift}_${patientType}`;
}

export function ConsultationFeeForm({
  doctorId,
  doctor,
  onSuccess,
  onCancel,
}: ConsultationFeeFormProps) {
  // Core data states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingFees, setExistingFees] = useState<ConsultationFee[]>([]);
  const [categories, setCategories] = useState<PatientCategoryResponse[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("General");

  // Form values: map of `${day}_${shift}_${patientType}` -> string
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // View mode: matrix (table grid) vs cards (accordion)
  const [viewMode, setViewMode] = useState<"matrix" | "cards">("matrix");

  // Quick fill toolbar state
  const [quickNew, setQuickNew] = useState<string>("500");
  const [quickOld, setQuickOld] = useState<string>("300");
  const [showCustomBulk, setShowCustomBulk] = useState(false);
  const [bulkSelectedDays, setBulkSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [bulkSelectedShifts, setBulkSelectedShifts] = useState<Shift[]>([
    "morning",
    "evening",
    "night",
    "emergency",
  ]);

  // Card view expanded days
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    new Set(DAYS.map((d) => d.value))
  );

  // Percentage adjustment popover state
  const [showPercentModal, setShowPercentModal] = useState(false);
  const [percentValue, setPercentValue] = useState<string>("-20");

  // Fetch patient categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const list = await patientCategoriesApi.list();
        setCategories(list);
      } catch (error) {
        console.error("Failed to fetch patient categories:", error);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch existing fees
  const fetchFees = useCallback(async () => {
    if (!doctorId) return;
    try {
      setLoading(true);
      const fees = await doctorsApi.getConsultationFees(doctorId);
      setExistingFees(fees);
    } catch (error) {
      console.error("Failed to fetch consultation fees:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  // Initialize / Populate form when category or existingFees change
  const populateFormData = useCallback(
    (category: string, fees: ConsultationFee[]) => {
      const data: Record<string, string> = {};
      const isGeneral = category === "General" || !category;
      const normalizedCategory = isGeneral ? null : category;

      DAYS.forEach((day) => {
        SHIFTS.forEach((shift) => {
          PATIENT_TYPES.forEach((pt) => {
            const key = getFormKey(day.value, shift.value, pt.value);
            const found = fees.find(
              (f) =>
                f.day_of_week === day.value &&
                f.shift === shift.value &&
                f.patient_type === pt.value &&
                (f.patient_category === normalizedCategory ||
                  (!f.patient_category && !normalizedCategory))
            );

            if (found) {
              data[key] = parseFloat(found.fee).toString();
            } else {
              // For General, default to "0" if empty; for special categories, leave empty "" to inherit
              data[key] = isGeneral ? "0" : "";
            }
          });
        });
      });

      setFormData(data);
      setIsDirty(false);
    },
    []
  );

  useEffect(() => {
    if (!loading) {
      populateFormData(selectedCategory, existingFees);
    }
  }, [selectedCategory, existingFees, loading, populateFormData]);

  // Helper: Get General category fee for placeholder display
  const getGeneralFee = useCallback(
    (day: number, shift: Shift, pt: PatientType): string => {
      const found = existingFees.find(
        (f) =>
          f.day_of_week === day &&
          f.shift === shift &&
          f.patient_type === pt &&
          (f.patient_category === null || f.patient_category === "General")
      );
      return found ? parseFloat(found.fee).toFixed(0) : "0";
    },
    [existingFees]
  );

  // Statistics for the current category
  const stats = useMemo(() => {
    const isGeneral = selectedCategory === "General" || !selectedCategory;
    let configuredSlots = 0;
    let totalSlots = DAYS.length * SHIFTS.length * PATIENT_TYPES.length; // 56
    let minFee = Infinity;
    let maxFee = -Infinity;

    DAYS.forEach((day) => {
      SHIFTS.forEach((shift) => {
        PATIENT_TYPES.forEach((pt) => {
          const key = getFormKey(day.value, shift.value, pt.value);
          const val = formData[key];
          if (val !== undefined && val !== "") {
            const num = parseFloat(val);
            if (!isNaN(num)) {
              if (isGeneral || num > 0) {
                configuredSlots++;
              }
              if (num < minFee) minFee = num;
              if (num > maxFee) maxFee = num;
            }
          }
        });
      });
    });

    return {
      configuredSlots,
      totalSlots,
      minFee: minFee === Infinity ? 0 : minFee,
      maxFee: maxFee === -Infinity ? 0 : maxFee,
      isGeneral,
    };
  }, [formData, selectedCategory]);

  // Handle cell value change
  const handleCellChange = (dayVal: number, shiftVal: Shift, ptVal: PatientType, val: string) => {
    const key = getFormKey(dayVal, shiftVal, ptVal);
    setFormData((prev) => ({
      ...prev,
      [key]: val,
    }));
    setIsDirty(true);
  };

  // Keyboard navigation for spreadsheet-like grid
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    dayVal: number,
    colIdx: number // 0..7
  ) => {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      const nextDay = Math.min(dayVal + 1, 6);
      const target = document.getElementById(`cell-${nextDay}-${colIdx}`);
      target?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevDay = Math.max(dayVal - 1, 0);
      const target = document.getElementById(`cell-${prevDay}-${colIdx}`);
      target?.focus();
    } else if (e.key === "ArrowRight") {
      if (colIdx < 7) {
        e.preventDefault();
        const target = document.getElementById(`cell-${dayVal}-${colIdx + 1}`);
        target?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      if (colIdx > 0) {
        e.preventDefault();
        const target = document.getElementById(`cell-${dayVal}-${colIdx - 1}`);
        target?.focus();
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleFormSubmit();
    }
  };

  // ==========================================
  // BULK ACTIONS & PRESETS
  // ==========================================

  // Apply Quick Fill values to selected days and shifts
  const applyBulkFill = (days: number[], shifts: Shift[], newFee: string, oldFee: string) => {
    if (!newFee && !oldFee) {
      toast.error("Please enter a New Patient fee or Old Patient fee first");
      return;
    }

    setFormData((prev) => {
      const next = { ...prev };
      days.forEach((dayVal) => {
        shifts.forEach((shiftVal) => {
          if (newFee !== "") {
            next[getFormKey(dayVal, shiftVal, "new")] = newFee;
          }
          if (oldFee !== "") {
            next[getFormKey(dayVal, shiftVal, "old")] = oldFee;
          }
        });
      });
      return next;
    });

    setIsDirty(true);
    toast.success(`Applied ₹${newFee || "0"} (New) & ₹${oldFee || "0"} (Old) to ${days.length} day(s)`);
  };

  // Preset 1: Apply to All Days & All Shifts
  const handleApplyToAll = () => {
    applyBulkFill(
      DAYS.map((d) => d.value),
      SHIFTS.map((s) => s.value),
      quickNew,
      quickOld
    );
  };

  // Preset 2: Apply to Weekdays (Mon-Fri)
  const handleApplyToWeekdays = () => {
    applyBulkFill(
      [0, 1, 2, 3, 4],
      SHIFTS.map((s) => s.value),
      quickNew,
      quickOld
    );
  };

  // Preset 3: Apply to Mon-Sat
  const handleApplyToMonSat = () => {
    applyBulkFill(
      [0, 1, 2, 3, 4, 5],
      SHIFTS.map((s) => s.value),
      quickNew,
      quickOld
    );
  };

  // Preset 4: Regular OPD (Morning + Evening)
  const handleApplyToRegularOPD = () => {
    applyBulkFill(
      [0, 1, 2, 3, 4, 5],
      ["morning", "evening"],
      quickNew,
      quickOld
    );
  };

  // Preset 5: Emergency Only
  const handleApplyToEmergency = () => {
    applyBulkFill(
      DAYS.map((d) => d.value),
      ["emergency"],
      quickNew,
      quickOld
    );
  };

  // Auto-calculate Old Fee as 60% of New Fee
  const handleAutoCalcOldFee = (ratio: number = 0.6) => {
    const num = parseFloat(quickNew);
    if (!isNaN(num) && num > 0) {
      setQuickOld(Math.round(num * ratio).toString());
    } else {
      toast.error("Please enter a valid New Patient Fee first");
    }
  };

  // Copy one day's fees to all other days
  const handleCopyDayToAll = (sourceDay: number) => {
    setFormData((prev) => {
      const next = { ...prev };
      const otherDays = DAYS.filter((d) => d.value !== sourceDay);

      otherDays.forEach((targetDay) => {
        SHIFTS.forEach((shift) => {
          PATIENT_TYPES.forEach((pt) => {
            const srcKey = getFormKey(sourceDay, shift.value, pt.value);
            const tgtKey = getFormKey(targetDay.value, shift.value, pt.value);
            next[tgtKey] = prev[srcKey] || "";
          });
        });
      });
      return next;
    });

    setIsDirty(true);
    const dayName = DAYS.find((d) => d.value === sourceDay)?.label;
    toast.success(`Copied ${dayName}'s fees to all other days`);
  };

  // Copy one day's fees to weekdays (Mon-Fri)
  const handleCopyDayToWeekdays = (sourceDay: number) => {
    setFormData((prev) => {
      const next = { ...prev };
      const weekdayTargets = [0, 1, 2, 3, 4].filter((d) => d !== sourceDay);

      weekdayTargets.forEach((targetDay) => {
        SHIFTS.forEach((shift) => {
          PATIENT_TYPES.forEach((pt) => {
            const srcKey = getFormKey(sourceDay, shift.value, pt.value);
            const tgtKey = getFormKey(targetDay, shift.value, pt.value);
            next[tgtKey] = prev[srcKey] || "";
          });
        });
      });
      return next;
    });

    setIsDirty(true);
    const dayName = DAYS.find((d) => d.value === sourceDay)?.label;
    toast.success(`Copied ${dayName}'s fees to Monday - Friday`);
  };

  // Clear fees for a single day
  const handleClearDay = (dayVal: number) => {
    const isGeneral = selectedCategory === "General" || !selectedCategory;
    setFormData((prev) => {
      const next = { ...prev };
      SHIFTS.forEach((shift) => {
        PATIENT_TYPES.forEach((pt) => {
          const key = getFormKey(dayVal, shift.value, pt.value);
          next[key] = isGeneral ? "0" : "";
        });
      });
      return next;
    });
    setIsDirty(true);
    const dayName = DAYS.find((d) => d.value === dayVal)?.label;
    toast.info(`Cleared fees for ${dayName}`);
  };

  // ==========================================
  // SPECIAL CATEGORY ACTIONS
  // ==========================================

  // Copy all fees from General category into current category
  const handleCopyFromGeneral = () => {
    const data: Record<string, string> = { ...formData };
    DAYS.forEach((day) => {
      SHIFTS.forEach((shift) => {
        PATIENT_TYPES.forEach((pt) => {
          const key = getFormKey(day.value, shift.value, pt.value);
          const genFee = getGeneralFee(day.value, shift.value, pt.value);
          data[key] = genFee;
        });
      });
    });
    setFormData(data);
    setIsDirty(true);
    toast.success(`Cloned all General category fees into "${selectedCategory}"`);
  };

  // Apply percentage adjustment relative to General category
  const handleApplyPercentage = () => {
    const pct = parseFloat(percentValue);
    if (isNaN(pct)) {
      toast.error("Please enter a valid percentage number");
      return;
    }

    const multiplier = 1 + pct / 100;
    const data: Record<string, string> = { ...formData };

    DAYS.forEach((day) => {
      SHIFTS.forEach((shift) => {
        PATIENT_TYPES.forEach((pt) => {
          const key = getFormKey(day.value, shift.value, pt.value);
          const genFee = parseFloat(getGeneralFee(day.value, shift.value, pt.value));
          if (!isNaN(genFee) && genFee > 0) {
            data[key] = Math.round(genFee * multiplier).toString();
          }
        });
      });
    });

    setFormData(data);
    setIsDirty(true);
    setShowPercentModal(false);
    toast.success(
      `Applied ${pct >= 0 ? `+${pct}%` : `${pct}%`} adjustment relative to General fees`
    );
  };

  // Clear all overrides for this category (reverts to General fallback)
  const handleRevertToGeneral = () => {
    const data: Record<string, string> = {};
    DAYS.forEach((day) => {
      SHIFTS.forEach((shift) => {
        PATIENT_TYPES.forEach((pt) => {
          const key = getFormKey(day.value, shift.value, pt.value);
          data[key] = "";
        });
      });
    });
    setFormData(data);
    setIsDirty(true);
    toast.info(`Cleared all overrides. "${selectedCategory}" will now inherit General rates.`);
  };

  // ==========================================
  // SUBMISSION
  // ==========================================

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSubmitting(true);

      const isGeneral = selectedCategory === "General" || !selectedCategory;
      const normalizedCategory = isGeneral ? null : selectedCategory;
      const fees: ConsultationFeeRequest[] = [];

      DAYS.forEach((day) => {
        SHIFTS.forEach((shift) => {
          PATIENT_TYPES.forEach((pt) => {
            const key = getFormKey(day.value, shift.value, pt.value);
            const val = formData[key];

            // If special category and blank, skip so it inherits
            if (!isGeneral && (val === undefined || val === "" || isNaN(Number(val)))) {
              return;
            }

            const numVal =
              val !== undefined && val !== "" && !isNaN(Number(val)) ? Number(val) : 0;

            if (numVal < 0) {
              throw new Error("Consultation fees must be 0 or positive.");
            }

            fees.push({
              day_of_week: day.value,
              shift: shift.value,
              fee: numVal,
              patient_type: pt.value,
              patient_category: normalizedCategory,
            });
          });
        });
      });

      await doctorsApi.setConsultationFees(doctorId, fees);
      toast.success(
        `Consultation fees for "${selectedCategory}" updated successfully (${fees.length} slots configured)`
      );

      // Re-fetch to ensure sync
      await fetchFees();
      setIsDirty(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update consultation fees:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle day expansion in card view
  const toggleDayExpansion = (dayVal: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayVal)) {
        next.delete(dayVal);
      } else {
        next.add(dayVal);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedDays(new Set(DAYS.map((d) => d.value)));
  };

  const handleCollapseAll = () => {
    setExpandedDays(new Set());
  };

  if (loading || categoriesLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-slate-600">
          Loading doctor consultation fee schedule...
        </p>
      </div>
    );
  }

  const isGeneralCategory = selectedCategory === "General" || !selectedCategory;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {/* 1. TOP HEADER & CATEGORY BAR */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Category Selector with Status Badge */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>Patient Category:</span>
              </label>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isGeneralCategory
                    ? "bg-sky-100 text-sky-800"
                    : stats.configuredSlots > 0
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isGeneralCategory ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    General (Base Rates)
                  </>
                ) : stats.configuredSlots > 0 ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {stats.configuredSlots} custom override
                    {stats.configuredSlots > 1 ? "s" : ""}
                  </>
                ) : (
                  <>
                    <Info className="h-3.5 w-3.5" />
                    Inheriting 100% from General
                  </>
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    if (isDirty) {
                      if (!confirm("You have unsaved changes. Switch category and discard edits?")) {
                        return;
                      }
                    }
                    setSelectedCategory(e.target.value);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2 pr-9 text-sm font-semibold text-slate-800 outline-none shadow-sm transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="General">General (Default Base Rate)</option>
                  {categories
                    .filter((c) => c.name.toLowerCase() !== "general" && c.is_active)
                    .map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Special Category Quick Tools */}
              {!isGeneralCategory && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyFromGeneral}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100"
                    title="Clone all General category rates as starting point for this category"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy from General
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPercentModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 shadow-sm transition hover:bg-purple-100"
                    title="Adjust all rates by a percentage (+/-%) of General"
                  >
                    <Percent className="h-3.5 w-3.5" />
                    Apply % Adjust
                  </button>

                  {stats.configuredSlots > 0 && (
                    <button
                      type="button"
                      onClick={handleRevertToGeneral}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 text-rose-600 hover:text-rose-700"
                      title="Clear custom overrides and revert to inheriting General rates"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Revert to General
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center justify-end gap-2 border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-200">
            <span className="text-xs font-medium text-slate-500 mr-1">View Mode:</span>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("matrix")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "matrix"
                    ? "bg-sky-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Weekly Matrix
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "cards"
                    ? "bg-sky-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Day Cards
              </button>
            </div>
          </div>
        </div>

        {/* Informative Note for Special Categories */}
        {!isGeneralCategory && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50/80 border border-amber-200/80 px-3.5 py-2 text-xs text-amber-800">
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              <strong>Special Category Inheritance:</strong> Any slot left blank will automatically
              fall back to the doctor's <strong>General Base Rate</strong>. You only need to enter
              custom amounts for shifts where rates differ.
            </p>
          </div>
        )}
      </div>

      {/* 2. EXPRESS QUICK-FILL TOOLBAR (Saves ~90% of Time!) */}
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/80 via-white to-teal-50/60 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Rate Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 uppercase tracking-wide">
              <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span>Quick Fill:</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="New (e.g. 500)"
                  value={quickNew}
                  onChange={(e) => setQuickNew(e.target.value)}
                  className="w-28 rounded-lg border border-slate-200 bg-white py-1.5 pl-6 pr-2 text-xs font-semibold text-slate-800 outline-none shadow-xs transition hover:border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Old (e.g. 300)"
                  value={quickOld}
                  onChange={(e) => setQuickOld(e.target.value)}
                  className="w-28 rounded-lg border border-slate-200 bg-white py-1.5 pl-6 pr-2 text-xs font-semibold text-slate-800 outline-none shadow-xs transition hover:border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleAutoCalcOldFee(0.6)}
                className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                title="Calculate Old Patient fee as 60% of New Patient fee"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                Old = 60%
              </button>
            </div>
          </div>

          {/* 1-Click Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleApplyToAll}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 active:scale-95"
              title="Populate all 7 days and all 4 shifts with these fees"
            >
              <Zap className="h-3.5 w-3.5 fill-white" />
              Apply to All (7 Days)
            </button>

            <button
              type="button"
              onClick={handleApplyToWeekdays}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95"
              title="Populate Monday through Friday"
            >
              <Calendar className="h-3.5 w-3.5 text-sky-500" />
              Weekdays (Mon–Fri)
            </button>

            <button
              type="button"
              onClick={handleApplyToMonSat}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95"
              title="Populate Monday through Saturday"
            >
              Mon–Sat
            </button>

            <button
              type="button"
              onClick={handleApplyToRegularOPD}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95"
              title="Apply to Morning and Evening shifts only"
            >
              <SunMedium className="h-3.5 w-3.5 text-amber-500" />
              Morn + Eve Only
            </button>

            <button
              type="button"
              onClick={handleApplyToEmergency}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95"
              title="Apply to Emergency shifts across all days"
            >
              <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
              Emergency Only
            </button>

            <button
              type="button"
              onClick={() => setShowCustomBulk(!showCustomBulk)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                showCustomBulk
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              Custom Selection
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showCustomBulk ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Custom Bulk Selection Popover / Accordion */}
        {showCustomBulk && (
          <div className="mt-3.5 rounded-xl border border-sky-200 bg-white p-3.5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800">
                Custom Target Selection for Quick Fill:
              </span>
              <button
                type="button"
                onClick={() => setShowCustomBulk(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Day selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-600">Select Days:</span>
                  <div className="flex gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setBulkSelectedDays(DAYS.map((d) => d.value))}
                      className="text-sky-600 hover:underline"
                    >
                      All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setBulkSelectedDays([0, 1, 2, 3, 4])}
                      className="text-sky-600 hover:underline"
                    >
                      Weekdays
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setBulkSelectedDays([5, 6])}
                      className="text-sky-600 hover:underline"
                    >
                      Weekends
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((day) => {
                    const isSelected = bulkSelectedDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          setBulkSelectedDays((prev) =>
                            isSelected ? prev.filter((d) => d !== day.value) : [...prev, day.value]
                          );
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                          isSelected
                            ? "bg-sky-500 text-white font-semibold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shift selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-600">Select Shifts:</span>
                  <div className="flex gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setBulkSelectedShifts(["morning", "evening", "night", "emergency"])
                      }
                      className="text-sky-600 hover:underline"
                    >
                      All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setBulkSelectedShifts(["morning", "evening"])}
                      className="text-sky-600 hover:underline"
                    >
                      OPD Only
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SHIFTS.map((shift) => {
                    const isSelected = bulkSelectedShifts.includes(shift.value);
                    return (
                      <button
                        key={shift.value}
                        type="button"
                        onClick={() => {
                          setBulkSelectedShifts((prev) =>
                            isSelected ? prev.filter((s) => s !== shift.value) : [...prev, shift.value]
                          );
                        }}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                          isSelected
                            ? "bg-teal-600 text-white font-semibold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <shift.icon className="h-3 w-3" />
                        {shift.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
              <button
                type="button"
                onClick={() => {
                  applyBulkFill(bulkSelectedDays, bulkSelectedShifts, quickNew, quickOld);
                  setShowCustomBulk(false);
                }}
                disabled={bulkSelectedDays.length === 0 || bulkSelectedShifts.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-700 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Apply Fee to Selected ({bulkSelectedDays.length} days × {bulkSelectedShifts.length}{" "}
                shifts)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. MAIN FORM CONTENT: WEEKLY MATRIX VS DAY CARDS */}
      {viewMode === "matrix" ? (
        /* ========================================================
           A) HIGH-EFFICIENCY WEEKLY MATRIX GRID (Spreadsheet View)
           ======================================================== */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Table Grouped Header */}
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200">
                  <th className="sticky left-0 z-10 bg-slate-100/90 px-3 py-2.5 font-bold text-slate-700 min-w-[130px] border-r border-slate-200">
                    Day of Week
                  </th>
                  {SHIFTS.map((shift) => (
                    <th
                      key={shift.value}
                      colSpan={2}
                      className="px-3 py-2 font-bold text-slate-700 text-center border-r border-slate-200 last:border-r-0"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <shift.icon className={`h-3.5 w-3.5 ${shift.badgeText}`} />
                        <span>{shift.label}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2 font-bold text-slate-700 text-center min-w-[110px]">
                    Actions
                  </th>
                </tr>

                {/* Sub-header: New vs Old */}
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
                  <th className="sticky left-0 z-10 bg-slate-50 px-3 py-1.5 font-medium border-r border-slate-200 text-slate-400">
                    Shift / Type:
                  </th>
                  {SHIFTS.map((shift) => (
                    <FragmentWrapper key={shift.value}>
                      <th className="px-2 py-1.5 text-center font-semibold text-sky-800 bg-sky-50/40 border-r border-slate-200/60 w-24">
                        New (₹)
                      </th>
                      <th className="px-2 py-1.5 text-center font-semibold text-emerald-800 bg-emerald-50/30 border-r border-slate-200 w-24">
                        Old (₹)
                      </th>
                    </FragmentWrapper>
                  ))}
                  <th className="px-2 py-1.5 text-center font-medium text-slate-400">
                    Quick Copy
                  </th>
                </tr>
              </thead>

              {/* Table Body (7 Days) */}
              <tbody className="divide-y divide-slate-100">
                {DAYS.map((day) => {
                  const isWeekend = day.isWeekend;

                  return (
                    <tr
                      key={day.value}
                      className={`hover:bg-sky-50/30 transition-colors group ${
                        isWeekend ? "bg-slate-50/50" : "bg-white"
                      }`}
                    >
                      {/* Sticky Day Column */}
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-2 font-semibold text-slate-800 border-r border-slate-200">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold">{day.label}</span>
                          {isWeekend && (
                            <span className="rounded bg-slate-200/70 px-1 py-0.2 text-[10px] font-medium text-slate-600">
                              Wkd
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4 Shifts × 2 Patient Types = 8 Cells */}
                      {SHIFTS.map((shift, shiftIdx) => {
                        return PATIENT_TYPES.map((pt, ptIdx) => {
                          const colIdx = shiftIdx * 2 + ptIdx;
                          const key = getFormKey(day.value, shift.value, pt.value);
                          const value = formData[key] ?? "";
                          const genFee = getGeneralFee(day.value, shift.value, pt.value);
                          const placeholder = isGeneralCategory ? "0" : genFee;
                          const hasCustomValue = value !== "" && value !== undefined;

                          return (
                            <td
                              key={`${shift.value}_${pt.value}`}
                              className="px-1.5 py-1.5 border-r border-slate-200/80 last:border-r-0"
                            >
                              <div className="relative">
                                <input
                                  id={`cell-${day.value}-${colIdx}`}
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={value}
                                  placeholder={placeholder}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) =>
                                    handleCellChange(
                                      day.value,
                                      shift.value,
                                      pt.value,
                                      e.target.value
                                    )
                                  }
                                  onKeyDown={(e) => handleCellKeyDown(e, day.value, colIdx)}
                                  className={`w-full rounded-md px-2 py-1 text-xs text-center font-medium outline-none transition ${
                                    hasCustomValue
                                      ? "bg-white border border-sky-300 font-bold text-slate-900 shadow-2xs focus:border-sky-500 focus:ring-1 focus:ring-sky-400"
                                      : isGeneralCategory
                                      ? "bg-slate-50/70 border border-slate-200 text-slate-700 hover:border-slate-300 focus:bg-white focus:border-sky-400"
                                      : "bg-slate-50/50 border border-dashed border-slate-200 text-slate-400 hover:border-slate-300 focus:bg-white focus:border-sky-400"
                                  }`}
                                  title={
                                    !hasCustomValue && !isGeneralCategory
                                      ? `Inherits General fee: ₹${genFee}`
                                      : `${day.label} ${shift.label} (${pt.label}): ₹${value || 0}`
                                  }
                                />
                              </div>
                            </td>
                          );
                        });
                      })}

                      {/* Row Actions */}
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleCopyDayToAll(day.value)}
                            className="rounded p-1 text-slate-500 hover:bg-sky-100 hover:text-sky-700 transition"
                            title={`Copy ${day.label}'s fees to all other 6 days`}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyDayToWeekdays(day.value)}
                            className="rounded p-1 text-slate-500 hover:bg-teal-100 hover:text-teal-700 transition"
                            title={`Copy ${day.label}'s fees to Monday - Friday`}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleClearDay(day.value)}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title={`Clear ${day.label}'s fees`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Matrix Footer Hint */}
          <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                💡 <strong>Tip:</strong> Use <strong>Arrow keys</strong> or <strong>Enter</strong> to
                navigate between cells. Text is automatically selected on focus.
              </span>
              <span>•</span>
              <span>
                Shortcut: <kbd className="rounded border bg-white px-1 font-mono text-[10px]">Ctrl+S</kbd> /{" "}
                <kbd className="rounded border bg-white px-1 font-mono text-[10px]">Cmd+S</kbd> to save.
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
           B) DAY CARDS ACCORDION VIEW (Focused / Compact View)
           ======================================================== */
        <div className="space-y-3">
          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-sky-600 font-semibold hover:underline"
            >
              Expand All
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-slate-500 hover:underline"
            >
              Collapse All
            </button>
          </div>

          {DAYS.map((day) => {
            const isExpanded = expandedDays.has(day.value);
            return (
              <div
                key={day.value}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition"
              >
                {/* Accordion Day Header */}
                <div
                  onClick={() => toggleDayExpansion(day.value)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/90 hover:bg-slate-100 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{day.label}</h3>
                    {day.isWeekend && (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        Weekend
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center gap-1 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleCopyDayToAll(day.value)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                        title="Copy to all other days"
                      >
                        <Copy className="h-3 w-3" />
                        Copy to All
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClearDay(day.value)}
                        className="rounded border border-slate-200 bg-white p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Clear day"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Day Details (4 Shifts) */}
                {isExpanded && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white">
                    {SHIFTS.map((shift) => (
                      <div
                        key={shift.value}
                        className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <shift.icon className={`h-4 w-4 ${shift.badgeText}`} />
                            <span className="text-xs font-bold text-slate-800">{shift.label}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {PATIENT_TYPES.map((pt) => {
                            const key = getFormKey(day.value, shift.value, pt.value);
                            const val = formData[key] ?? "";
                            const genFee = getGeneralFee(day.value, shift.value, pt.value);
                            const placeholder = isGeneralCategory ? "0" : genFee;

                            return (
                              <div
                                key={pt.value}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="text-xs text-slate-600">{pt.label}:</span>
                                <div className="relative w-28">
                                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-xs font-bold text-slate-400">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={val}
                                    placeholder={placeholder}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) =>
                                      handleCellChange(
                                        day.value,
                                        shift.value,
                                        pt.value,
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white py-1 pl-5 pr-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-sky-500"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. FOOTER & SAVE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 pt-4">
        {/* Dirty State & Configuration Summary */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          )}
          <span className="text-xs text-slate-500">
            {isGeneralCategory ? (
              <>Configuring base consultation fees for all regular patients.</>
            ) : (
              <>Configuring overrides for <strong>{selectedCategory}</strong>.</>
            )}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5">
          {onCancel && (
            <button
              type="button"
              onClick={() => {
                if (isDirty) {
                  if (!confirm("You have unsaved changes. Discard and close?")) {
                    return;
                  }
                }
                onCancel();
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow hover:from-sky-600 hover:to-teal-600 disabled:opacity-50 active:scale-95"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving Schedule...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Save Consultation Fees</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. MODAL: PERCENTAGE ADJUSTMENT (FOR SPECIAL CATEGORIES) */}
      {showPercentModal && (
        <div
          className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowPercentModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <Percent className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Percentage Adjustment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPercentModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Calculate all fees for <strong>"{selectedCategory}"</strong> by adjusting the Base
              General rates by a percentage (+ for markup, - for discount):
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjustment Percentage (%):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    placeholder="e.g. -20 for 20% discount"
                    value={percentValue}
                    onChange={(e) => setPercentValue(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>

              {/* Quick shortcut chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
                {["-50", "-25", "-20", "-15", "-10", "+10", "+20", "+25"].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPercentValue(pct)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowPercentModal(false)}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPercentage}
                className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

/**
 * Small helper to wrap table cells without triggering React fragment key warnings
 */
function FragmentWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
