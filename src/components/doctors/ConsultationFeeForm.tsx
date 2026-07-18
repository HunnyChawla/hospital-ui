"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { doctorsApi, ConsultationFee, ConsultationFeeRequest } from "@/services/doctorsApi";
import { patientCategoriesApi, PatientCategoryResponse } from "@/services/patientCategoriesApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ConsultationFeeFormProps {
  doctorId: string;
  onSuccess?: () => void;
}

type Shift = "morning" | "evening" | "night" | "emergency";
type PatientType = "old" | "new";

interface FeeFormData {
  [key: string]: number; // key format: `${day}_${shift}_${patientType}`
}

const DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

const SHIFTS: { value: Shift; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
  { value: "emergency", label: "Emergency" },
];

const PATIENT_TYPES: { value: PatientType; label: string }[] = [
  { value: "old", label: "Old" },
  { value: "new", label: "New" },
];

function getFormKey(day: number, shift: Shift, patientType: PatientType): string {
  return `${day}_${shift}_${patientType}`;
}

export function ConsultationFeeForm({ doctorId, onSuccess }: ConsultationFeeFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FeeFormData>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingFees, setExistingFees] = useState<ConsultationFee[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("General");
  const [categories, setCategories] = useState<PatientCategoryResponse[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Track which days are expanded (default: all expanded)
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set(DAYS.map(d => d.value)));

  const toggleDay = (dayValue: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayValue)) {
        next.delete(dayValue);
      } else {
        next.add(dayValue);
      }
      return next;
    });
  };

  const isDayExpanded = (dayValue: number) => expandedDays.has(dayValue);

  // Fetch categories on mount
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

  // Fetch existing fees on mount
  useEffect(() => {
    const fetchFees = async () => {
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
    };

    if (doctorId) {
      fetchFees();
    }
  }, [doctorId]);

  // Update form inputs whenever selectedCategory or existingFees change
  useEffect(() => {
    if (loading) return;

    const formData: FeeFormData = {};
    const isGeneralSelected = selectedCategory === "General" || !selectedCategory;
    const normalizedCategory = isGeneralSelected ? null : selectedCategory;

    DAYS.forEach((day) => {
      SHIFTS.forEach((shift) => {
        PATIENT_TYPES.forEach((patientType) => {
          const key = getFormKey(day.value, shift.value, patientType.value);
          // Find existing fee for this combination & selected category
          const existingFee = existingFees.find(
            (f) =>
              f.day_of_week === day.value &&
              f.shift === shift.value &&
              f.patient_type === patientType.value &&
              (f.patient_category === normalizedCategory ||
                (!f.patient_category && !normalizedCategory))
          );

          if (existingFee) {
            formData[key] = parseFloat(existingFee.fee);
          } else {
            // For general, default to 0. For special categories, leave empty (blank)
            formData[key] = isGeneralSelected ? 0 : (undefined as any);
          }
        });
      });
    });

    reset(formData);
  }, [selectedCategory, existingFees, reset, loading]);

  const getPlaceholderFee = (day: number, shift: Shift, patientType: PatientType): string => {
    // General category fee is the placeholder for special categories
    const generalFee = existingFees.find(
      (f) =>
        f.day_of_week === day &&
        f.shift === shift &&
        f.patient_type === patientType &&
        (f.patient_category === null || f.patient_category === "General")
    );
    return generalFee ? parseFloat(generalFee.fee).toFixed(2) : "0.00";
  };

  const onSubmit = async (data: FeeFormData) => {
    try {
      setSubmitting(true);
      
      const fees: ConsultationFeeRequest[] = [];
      const isGeneralSelected = selectedCategory === "General" || !selectedCategory;
      const normalizedCategory = isGeneralSelected ? null : selectedCategory;

      DAYS.forEach((day) => {
        SHIFTS.forEach((shift) => {
          PATIENT_TYPES.forEach((patientType) => {
            const key = getFormKey(day.value, shift.value, patientType.value);
            const val = data[key];
            
            // For special categories, skip if it's empty (NaN, null, undefined)
            if (!isGeneralSelected && (val === undefined || val === null || isNaN(val) || (val as any) === "")) {
              return;
            }

            const feeValue = val !== undefined && val !== null && !isNaN(val) ? Number(val) : 0;
            
            fees.push({
              day_of_week: day.value,
              shift: shift.value,
              fee: feeValue,
              patient_type: patientType.value,
              patient_category: normalizedCategory,
            });
          });
        });
      });
      
      await doctorsApi.setConsultationFees(doctorId, fees);
      toast.success(`Consultation fees for "${selectedCategory}" updated successfully`);
      
      // Re-fetch all fees to update local state and placeholders
      const updatedFees = await doctorsApi.getConsultationFees(doctorId);
      setExistingFees(updatedFees);
      
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update consultation fees:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading consultation fees...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Category Selector Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Patient Category
          </label>
          <p className="text-xs text-slate-500">
            Configure different fee rates for specific patient categories. Non-configured slots default to General rate.
          </p>
        </div>
        <div className="relative min-w-[220px]">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-slate-800 outline-none shadow-sm transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100 hover:border-slate-300"
          >
            <option value="General">General (Default)</option>
            {categories
              .filter((c) => c.name.toLowerCase() !== "general" && c.is_active)
              .map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      </div>

      {DAYS.map((day) => {
        const isExpanded = isDayExpanded(day.value);
        return (
          <div key={day.value} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleDay(day.value)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-base font-semibold text-slate-900">{day.label}</h3>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-slate-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-500" />
              )}
            </button>
            {isExpanded && (
              <div className="p-4 space-y-3">
                {SHIFTS.map((shift) => (
                  <div key={shift.value} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-sm font-medium text-slate-700">{shift.label}</span>
                    </div>
                    <div className="ml-28 grid grid-cols-2 gap-4">
                      {PATIENT_TYPES.map((patientType) => {
                        const key = getFormKey(day.value, shift.value, patientType.value);
                        const isGeneralSelected = selectedCategory === "General" || !selectedCategory;
                        const placeholderValue = isGeneralSelected ? "0.00" : getPlaceholderFee(day.value, shift.value, patientType.value);
                        
                        return (
                          <div key={patientType.value} className="flex items-center gap-3">
                            <label className="w-12 text-sm text-slate-600">{patientType.label}</label>
                            <div className="flex-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder={placeholderValue}
                                {...register(key, {
                                  valueAsNumber: true,
                                  min: { value: 0, message: "Fee must be positive" },
                                })}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                              />
                              {errors[key] && (
                                <span className="mt-1 text-xs text-rose-500">{errors[key]?.message}</span>
                              )}
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

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2 font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Fees"}
        </button>
      </div>
    </form>
  );
}

