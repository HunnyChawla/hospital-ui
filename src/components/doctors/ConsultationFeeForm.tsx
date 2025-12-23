"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { doctorsApi, ConsultationFee, ConsultationFeeRequest } from "@/services/doctorsApi";
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

  // Fetch existing fees on mount
  useEffect(() => {
    const fetchFees = async () => {
      try {
        setLoading(true);
        const fees = await doctorsApi.getConsultationFees(doctorId);
        setExistingFees(fees);
        
        // Initialize form with existing fees
        const formData: FeeFormData = {};
        
        // Initialize all 56 combinations with 0 or existing value
        DAYS.forEach((day) => {
          SHIFTS.forEach((shift) => {
            PATIENT_TYPES.forEach((patientType) => {
              const key = getFormKey(day.value, shift.value, patientType.value);
              // Find existing fee for this combination
              // Only match entries where patient_type matches (ignore null entries)
              const existingFee = fees.find(
                (f) =>
                  f.day_of_week === day.value &&
                  f.shift === shift.value &&
                  f.patient_type === patientType.value
              );
              // Parse fee value, default to 0 if not found
              formData[key] = existingFee ? parseFloat(existingFee.fee) : 0;
            });
          });
        });
        
        // Reset form with prepopulated data
        reset(formData);
      } catch (error) {
        console.error("Failed to fetch consultation fees:", error);
        toast.error(getErrorMessage(error));
        // Initialize with zeros if fetch fails
        const formData: FeeFormData = {};
        DAYS.forEach((day) => {
          SHIFTS.forEach((shift) => {
            PATIENT_TYPES.forEach((patientType) => {
              const key = getFormKey(day.value, shift.value, patientType.value);
              formData[key] = 0;
            });
          });
        });
        reset(formData);
      } finally {
        setLoading(false);
      }
    };

    if (doctorId) {
      fetchFees();
    }
  }, [doctorId, reset]);

  const onSubmit = async (data: FeeFormData) => {
    try {
      setSubmitting(true);
      
      // Transform form data to API format
      const fees: ConsultationFeeRequest[] = [];
      
      DAYS.forEach((day) => {
        SHIFTS.forEach((shift) => {
          PATIENT_TYPES.forEach((patientType) => {
            const key = getFormKey(day.value, shift.value, patientType.value);
            const feeValue = data[key] || 0;
            
            // Include all fees (including 0 to clear existing fees)
            fees.push({
              day_of_week: day.value,
              shift: shift.value,
              fee: feeValue,
              patient_type: patientType.value,
            });
          });
        });
      });
      
      await doctorsApi.setConsultationFees(doctorId, fees);
      toast.success("Consultation fees updated successfully");
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update consultation fees:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading consultation fees...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                        return (
                          <div key={patientType.value} className="flex items-center gap-3">
                            <label className="w-12 text-sm text-slate-600">{patientType.label}</label>
                            <div className="flex-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                {...register(key, {
                                  valueAsNumber: true,
                                  min: { value: 0, message: "Fee must be positive" },
                                })}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                                placeholder="0.00"
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

