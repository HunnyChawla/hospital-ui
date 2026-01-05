"use client";

import { useState } from "react";
import { EyeSelector } from "../shared";
import { Eye, Calendar, User, Building2, AlertCircle, FileText, Clock } from "lucide-react";
import clsx from "clsx";

interface InlineSurgeryFormProps {
  surgeryText: string;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  defaultValues?: any;
}

type EyeType = "OD" | "OS" | "OU";

// Generate year options (current year back to 1950)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1949 }, (_, i) =>
  String(currentYear - i)
);

const monthOptions = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function InlineSurgeryForm({
  surgeryText,
  onSave,
  onCancel,
  isSubmitting,
  defaultValues,
}: InlineSurgeryFormProps) {
  const [formData, setFormData] = useState({
    eye: defaultValues?.eye || "OD",
    surgery_year: defaultValues?.surgery_year || "",
    surgery_month: defaultValues?.surgery_month || "",
    surgeon_name: defaultValues?.surgeon_name || "",
    hospital_name: defaultValues?.hospital_name || "",
    complications: defaultValues?.complications || "",
    notes: defaultValues?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(formData);
    } catch (error) {
      // Error is handled by parent component
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = formData.eye !== "OD" && formData.surgery_year;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Surgery Name Display */}
      <div className="flex items-center gap-2 p-3 bg-sky-50 rounded-lg border border-sky-200">
        <Eye className="h-4 w-4 text-sky-600" />
        <span className="text-sm font-medium text-sky-900">{surgeryText}</span>
      </div>

      {/* Eye Selection and Date */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Eye Selection */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Eye className="h-4 w-4 text-slate-400" />
              Eye <span className="text-red-500">*</span>
            </label>
            <EyeSelector
              value={formData.eye as any}
              onChange={(eye) => handleChange("eye", eye)}
              label=""
            />
          </div>

          {/* Year */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              Year <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.surgery_year}
              onChange={(e) => handleChange("surgery_year", e.target.value)}
              className={clsx(
                "w-full rounded-lg border px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20",
                formData.surgery_year
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-300 bg-white"
              )}
              required
            >
              <option value="">Select year...</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Month - on separate line */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Clock className="h-4 w-4 text-slate-400" />
            Month <span className="text-xs text-slate-400">(optional)</span>
          </label>
          <select
            value={formData.surgery_month}
            onChange={(e) => handleChange("surgery_month", e.target.value)}
            disabled={!formData.surgery_year}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Not sure</option>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Surgeon and Hospital */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <User className="h-4 w-4 text-slate-400" />
            Surgeon Name <span className="text-xs text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.surgeon_name}
            onChange={(e) => handleChange("surgeon_name", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            placeholder="Dr. John Smith"
          />
        </div>
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Building2 className="h-4 w-4 text-slate-400" />
            Hospital/Clinic <span className="text-xs text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.hospital_name}
            onChange={(e) => handleChange("hospital_name", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            placeholder="City Eye Hospital"
          />
        </div>
      </div>

      {/* Complications and Notes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            Complications <span className="text-xs text-slate-400">(if any)</span>
          </label>
          <textarea
            value={formData.complications}
            onChange={(e) => handleChange("complications", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
            placeholder="Describe any complications..."
          />
        </div>
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <FileText className="h-4 w-4 text-slate-400" />
            Notes <span className="text-xs text-slate-400">(optional)</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
            placeholder="Additional details..."
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          {isFormValid ? (
            <span className="text-emerald-600">Ready to save</span>
          ) : (
            <span>Please fill required fields</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Surgery"}
          </button>
        </div>
      </div>
    </form>
  );
}
