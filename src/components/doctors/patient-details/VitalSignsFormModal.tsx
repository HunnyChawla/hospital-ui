"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { X, Save } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { VitalSigns } from "@/types";

interface VitalSignsFormData {
  systolic_bp: number | null;
  diastolic_bp: number | null;
  pulse_rate: number | null;
  temperature: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  weight: number | null;
  height: number | null;
  notes: string;
}

interface VitalSignsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VitalSignsFormData) => void;
  defaultValues?: VitalSigns | null;
  loading?: boolean;
}

export const VitalSignsFormModal: React.FC<VitalSignsFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  loading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VitalSignsFormData>({
    defaultValues: {
      systolic_bp: null,
      diastolic_bp: null,
      pulse_rate: null,
      temperature: null,
      spo2: null,
      respiratory_rate: null,
      weight: null,
      height: null,
      notes: "",
    },
  });

  const weight = watch("weight");
  const height = watch("height");

  // Auto-calculate BMI
  useEffect(() => {
    if (weight && height && weight > 0 && height > 0) {
      const heightInMeters = height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      // BMI is calculated but not editable, we'll include it in the form data
    }
  }, [weight, height]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (defaultValues) {
        reset({
          systolic_bp: defaultValues.systolic_bp,
          diastolic_bp: defaultValues.diastolic_bp,
          pulse_rate: defaultValues.pulse_rate,
          temperature: defaultValues.temperature,
          spo2: defaultValues.spo2,
          respiratory_rate: defaultValues.respiratory_rate,
          weight: defaultValues.weight,
          height: defaultValues.height,
          notes: defaultValues.notes || "",
        });
      } else {
        reset();
      }
    }
  }, [isOpen, defaultValues, reset]);

  const handleFormSubmit = (data: VitalSignsFormData) => {
    onSubmit(data);
  };

  const getBMI = () => {
    if (weight && height && weight > 0 && height > 0) {
      const heightInMeters = height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return "-";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues ? "Edit Vital Signs" : "Record Vital Signs"}
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
        <div className="space-y-4">
          {/* Blood Pressure */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Systolic BP <span className="text-slate-400">(mmHg)</span>
              </label>
              <input
                type="number"
                step="1"
                {...register("systolic_bp", {
                  valueAsNumber: true,
                  min: { value: 40, message: "Value too low" },
                  max: { value: 250, message: "Value too high" },
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
                placeholder="120"
              />
              {errors.systolic_bp && (
                <p className="mt-1 text-xs text-rose-600">{errors.systolic_bp.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Diastolic BP <span className="text-slate-400">(mmHg)</span>
              </label>
              <input
                type="number"
                step="1"
                {...register("diastolic_bp", {
                  valueAsNumber: true,
                  min: { value: 30, message: "Value too low" },
                  max: { value: 150, message: "Value too high" },
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
                placeholder="80"
              />
              {errors.diastolic_bp && (
                <p className="mt-1 text-xs text-rose-600">{errors.diastolic_bp.message}</p>
              )}
            </div>
          </div>

          {/* Pulse and Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Pulse Rate <span className="text-slate-400">(bpm)</span>
              </label>
              <input
                type="number"
                step="1"
                {...register("pulse_rate", {
                  valueAsNumber: true,
                  min: { value: 30, message: "Value too low" },
                  max: { value: 200, message: "Value too high" },
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
                placeholder="72"
              />
              {errors.pulse_rate && (
                <p className="mt-1 text-xs text-rose-600">{errors.pulse_rate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Temperature <span className="text-slate-400">(°F)</span>
              </label>
              <input
                type="number"
                step="0.1"
                {...register("temperature", {
                  valueAsNumber: true,
                  min: { value: 90, message: "Value too low" },
                  max: { value: 110, message: "Value too high" },
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
                placeholder="98.6"
              />
              {errors.temperature && (
                <p className="mt-1 text-xs text-rose-600">{errors.temperature.message}</p>
              )}
            </div>
          </div>

          {/* SpO2 and Respiratory Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                SpO2 <span className="text-slate-400">(%)</span>
              </label>
              <input
                type="number"
                step="1"
                {...register("spo2", {
                  valueAsNumber: true,
                  min: { value: 70, message: "Value too low" },
                  max: { value: 100, message: "Cannot exceed 100%" },
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
                placeholder="98"
              />
              {errors.spo2 && (
                <p className="mt-1 text-xs text-rose-600">{errors.spo2.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Respiratory Rate <span className="text-slate-400">(breaths/min)</span>
              </label>
              <input
                type="number"
                step="1"
                {...register("respiratory_rate", {
                  valueAsNumber: true,
                  min: { value: 8, message: "Value too low" },
                  max: { value: 60, message: "Value too high" },
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
                placeholder="16"
              />
              {errors.respiratory_rate && (
                <p className="mt-1 text-xs text-rose-600">{errors.respiratory_rate.message}</p>
              )}
            </div>
          </div>

          {/* Weight and Height */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Weight <span className="text-slate-400">(kg)</span>
              </label>
              <input
                type="number"
                step="0.1"
                {...register("weight", {
                  valueAsNumber: true,
                  min: { value: 1, message: "Value too low" },
                  max: { value: 300, message: "Value too high" },
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
                placeholder="70"
              />
              {errors.weight && (
                <p className="mt-1 text-xs text-rose-600">{errors.weight.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Height <span className="text-slate-400">(cm)</span>
              </label>
              <input
                type="number"
                step="0.1"
                {...register("height", {
                  valueAsNumber: true,
                  min: { value: 30, message: "Value too low" },
                  max: { value: 250, message: "Value too high" },
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
                placeholder="170"
              />
              {errors.height && (
                <p className="mt-1 text-xs text-rose-600">{errors.height.message}</p>
              )}
            </div>
          </div>

          {/* BMI Display */}
          {weight && height && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm font-medium text-sky-900">
                Calculated BMI: <span className="text-lg font-bold">{getBMI()}</span>
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Notes <span className="text-slate-400">(Optional)</span>
            </label>
            <textarea
              {...register("notes")}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
              placeholder="Any additional observations..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save Vital Signs"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
