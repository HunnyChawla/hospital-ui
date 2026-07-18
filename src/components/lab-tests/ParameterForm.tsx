"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { CreateLabTestParameterRequest, UpdateLabTestParameterRequest, LabTestParameter } from "@/services/labTestsApi";
import { Loader2 } from "lucide-react";

interface ParameterFormProps {
  parameter?: LabTestParameter;
  onSubmit: (data: CreateLabTestParameterRequest | UpdateLabTestParameterRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ParameterForm({ parameter, onSubmit, onCancel, isSubmitting = false }: ParameterFormProps) {
  const isEditing = !!parameter;

  const predefinedUnits = [
    "g/dL",
    "mg/dL",
    "µg/dL",
    "ng/mL",
    "mmol/L",
    "mEq/L",
    "cells/µL",
    "cells/uL",
    "million/µL",
    "million/uL",
    "%",
    "fL",
    "pg",
    "sec",
    "min",
    "IU/L",
    "U/L",
    "µm",
    "mm²"
  ];

  const [customUnit, setCustomUnit] = useState(
    parameter && !predefinedUnits.includes(parameter.unit) ? parameter.unit : ""
  );

  const [options, setOptions] = useState<string[]>(
    parameter?.dropdown_options || []
  );
  const [newOption, setNewOption] = useState("");

  const addOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateLabTestParameterRequest>({
    defaultValues: parameter
      ? {
        parameter_code: parameter.parameter_code,
        parameter_name: parameter.parameter_name,
        unit: predefinedUnits.includes(parameter.unit) ? parameter.unit : "Other",
        normal_min: parameter.normal_min ?? undefined,
        normal_max: parameter.normal_max ?? undefined,
        normal_text: parameter.normal_text ?? undefined,
        gender: parameter.gender as "ALL" | "M" | "F",
        age_min: parameter.age_min,
        age_max: parameter.age_max,
        method: parameter.method ?? undefined,
        display_order: parameter.display_order,
        is_active: parameter.is_active,
        section_name: parameter.section_name ?? "",
        parameter_type: parameter.parameter_type ?? "number",
      }
      : {
        parameter_code: "",
        parameter_name: "",
        unit: "",
        normal_min: undefined,
        normal_max: undefined,
        normal_text: undefined,
        gender: "ALL",
        age_min: 0,
        age_max: 120,
        method: undefined,
        display_order: 1,
        is_active: true,
        section_name: "",
        parameter_type: "number",
      },
  });

  const normalMin = watch("normal_min");
  const normalMax = watch("normal_max");
  const normalText = watch("normal_text");
  const unit = watch("unit");
  const parameterType = watch("parameter_type");

  const isCustomUnit = unit === "Other";

  const handleFormSubmit = async (data: CreateLabTestParameterRequest) => {
    const formData: CreateLabTestParameterRequest | UpdateLabTestParameterRequest = {
      ...data,
      unit: data.unit === "Other" ? customUnit : data.unit,
      section_name: data.section_name?.trim() || null,
      parameter_type: data.parameter_type,
      dropdown_options: data.parameter_type === "dropdown" ? options : null,
      normal_min: data.parameter_type === "number" ? (data.normal_min !== undefined ? data.normal_min : null) : null,
      normal_max: data.parameter_type === "number" ? (data.normal_max !== undefined ? data.normal_max : null) : null,
      normal_text: data.parameter_type === "number"
        ? (normalText || (normalMin !== undefined && normalMax !== undefined
          ? `${normalMin}-${normalMax}`
          : undefined))
        : data.normal_text || undefined,
    };

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Parameter Code <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register("parameter_code", { required: "Parameter code is required" })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            placeholder="RBC"
          />
          {errors.parameter_code && (
            <p className="mt-1 text-xs text-rose-500">{errors.parameter_code.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Parameter Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register("parameter_name", { required: "Parameter name is required" })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            placeholder="Red Blood Cell Count"
          />
          {errors.parameter_name && (
            <p className="mt-1 text-xs text-rose-500">{errors.parameter_name.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Section Name</label>
          <input
            type="text"
            {...register("section_name")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            placeholder="e.g. Hematology, Lipid Profile"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Parameter Type <span className="text-rose-500">*</span>
          </label>
          <select
            {...register("parameter_type", { required: "Parameter type is required" })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          >
            <option value="number">Number</option>
            <option value="dropdown">Dropdown</option>
            <option value="text">Text</option>
            <option value="image">Image</option>
          </select>
          {errors.parameter_type && (
            <p className="mt-1 text-xs text-rose-500">{errors.parameter_type.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Unit <span className="text-rose-500">*</span>
          </label>
          <select
            {...register("unit", {
              required: "Unit is required",
              validate: (value) => {
                if (value === "Other" && !customUnit.trim()) {
                  return "Please enter a custom unit";
                }
                return true;
              },
            })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            onChange={(e) => {
              register("unit").onChange(e);
              if (e.target.value !== "Other") {
                setCustomUnit("");
              }
            }}
          >
            <option value="">Select unit</option>
            {predefinedUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
            <option value="Other">Other (custom)</option>
          </select>
          {isCustomUnit && (
            <input
              type="text"
              value={customUnit}
              onChange={(e) => {
                setCustomUnit(e.target.value);
                setValue("unit", e.target.value, { shouldValidate: true });
              }}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              placeholder="Enter custom unit"
            />
          )}
          {errors.unit && (
            <p className="mt-1 text-xs text-rose-500">{errors.unit.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Gender <span className="text-rose-500">*</span>
          </label>
          <select
            {...register("gender", { required: "Gender is required" })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          >
            <option value="ALL">All</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
          {errors.gender && (
            <p className="mt-1 text-xs text-rose-500">{errors.gender.message}</p>
          )}
        </div>
      </div>

      {parameterType === "dropdown" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">Dropdown Options</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              placeholder="e.g. Positive"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption();
                }
              }}
            />
            <button
              type="button"
              onClick={addOption}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              Add Option
            </button>
          </div>
          {options.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {options.map((opt, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-100"
                >
                  {opt}
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="text-sky-400 hover:text-sky-600 focus:outline-none"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No options added yet. Add at least one option.</p>
          )}
        </div>
      )}

      {parameterType === "number" ? (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Normal Min</label>
            <input
              type="number"
              step="any"
              {...register("normal_min", {
                valueAsNumber: true,
                validate: (val) => {
                  if (val !== undefined && isNaN(val)) return "Must be a valid number";
                  return true;
                },
              })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              placeholder="4.5"
            />
            {errors.normal_min && (
              <p className="mt-1 text-xs text-rose-500">{errors.normal_min.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Normal Max</label>
            <input
              type="number"
              step="any"
              {...register("normal_max", {
                valueAsNumber: true,
                validate: (val) => {
                  if (val !== undefined && isNaN(val)) return "Must be a valid number";
                  return true;
                },
              })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              placeholder="5.5"
            />
            {errors.normal_max && (
              <p className="mt-1 text-xs text-rose-500">{errors.normal_max.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Normal Text</label>
            <input
              type="text"
              {...register("normal_text")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              placeholder="4.5-5.5 (auto-generated if empty)"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Expected Normal Value / Text</label>
          <input
            type="text"
            {...register("normal_text")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            placeholder="e.g. Negative or Clear"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Age Min <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            {...register("age_min", {
              required: "Age min is required",
              valueAsNumber: true,
              min: { value: 0, message: "Age min must be >= 0" },
            })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
          {errors.age_min && (
            <p className="mt-1 text-xs text-rose-500">{errors.age_min.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Age Max <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            {...register("age_max", {
              required: "Age max is required",
              valueAsNumber: true,
              min: { value: 0, message: "Age max must be >= 0" },
              validate: (val, formValues) => {
                if (val === undefined || val === null) return true;
                if (formValues.age_min === undefined || formValues.age_min === null) return true;
                if (val < formValues.age_min) {
                  return "Age max must be >= age min";
                }
                return true;
              },
            })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
          {errors.age_max && (
            <p className="mt-1 text-xs text-rose-500">{errors.age_max.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Display Order <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            {...register("display_order", {
              required: "Display order is required",
              valueAsNumber: true,
              min: { value: 1, message: "Display order must be >= 1" },
            })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
          {errors.display_order && (
            <p className="mt-1 text-xs text-rose-500">{errors.display_order.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Method</label>
        <input
          type="text"
          {...register("method")}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          placeholder="Automated"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          {...register("is_active")}
          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
          Active
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Update Parameter" : "Add Parameter"}
        </button>
      </div>
    </form>
  );
}

