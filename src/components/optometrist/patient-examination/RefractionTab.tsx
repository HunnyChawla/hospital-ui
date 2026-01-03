"use client";

import { useState, useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { addRefractionRecord } from "@/redux/optometryDataSlice";
import { Plus, Save, X, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { RefractionRecord } from "@/types";

// Import shared components
import { EyeValueInput, VASelector } from "../shared";
import { TemplateSelector, CopyFromPreviousButton } from "../templates";
import { refractionTemplates, type RefractionTemplate } from "../mock";

interface RefractionTabProps {
  patientId: string;
  visitId: string;
  optometristId: string;
  refractionRecords: RefractionRecord[];
  loading: boolean;
  onRefresh: () => void;
}

interface RefractionFormData {
  od: {
    sphere: number | null;
    cylinder: number | null;
    axis: number | null;
    add_power: number | null;
    va_uncorrected: string | null;
    va_corrected: string | null;
  };
  os: {
    sphere: number | null;
    cylinder: number | null;
    axis: number | null;
    add_power: number | null;
    va_uncorrected: string | null;
    va_corrected: string | null;
  };
  notes: string;
}

const initialFormData: RefractionFormData = {
  od: {
    sphere: null,
    cylinder: null,
    axis: null,
    add_power: null,
    va_uncorrected: null,
    va_corrected: null,
  },
  os: {
    sphere: null,
    cylinder: null,
    axis: null,
    add_power: null,
    va_uncorrected: null,
    va_corrected: null,
  },
  notes: "",
};

// Preset values for quick selection
const SPHERE_PRESETS = [-6, -3, -1, 0, 1, 2, 3];
const CYLINDER_PRESETS = [0, -0.25, -0.5, -0.75, -1, -1.5, -2];
const AXIS_PRESETS = [0, 45, 90, 135, 180];
const ADD_POWER_PRESETS = [1, 1.5, 2, 2.5, 3];

export function RefractionTab({
  patientId,
  visitId,
  optometristId,
  refractionRecords,
  loading,
  onRefresh,
}: RefractionTabProps) {
  const dispatch = useAppDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<RefractionFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get latest refraction for each eye
  const latestOD = refractionRecords
    .filter((r) => r.eye === "OD")
    .sort(
      (a, b) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    )[0];

  const latestOS = refractionRecords
    .filter((r) => r.eye === "OS")
    .sort(
      (a, b) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    )[0];

  // Format refraction values for display
  const formatValue = (
    value: number | null,
    type: "sphere" | "cylinder" | "axis" | "add"
  ) => {
    if (value === null) return "—";
    if (type === "axis") return `${value}°`;
    return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  };

  // Update form field
  const updateField = (
    eye: "od" | "os",
    field: keyof RefractionFormData["od"],
    value: number | string | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        [field]: value,
      },
    }));
    // Clear error when field is updated
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${eye}_${field}`];
      return newErrors;
    });
  };

  // Apply template
  const handleApplyTemplate = (template: RefractionTemplate) => {
    setFormData((prev) => ({
      ...prev,
      od: {
        ...prev.od,
        sphere: template.data.od.sphere,
        cylinder: template.data.od.cylinder,
        axis: template.data.od.axis,
        add_power: template.data.od.add_power,
      },
      os: {
        ...prev.os,
        sphere: template.data.os.sphere,
        cylinder: template.data.os.cylinder,
        axis: template.data.os.axis,
        add_power: template.data.os.add_power,
      },
    }));
    toast.success(`Applied template: ${template.name}`);
  };

  // Handle copy from previous
  const handleCopyFromPrevious = (data: unknown) => {
    const prevData = data as {
      od: { sphere: number; cylinder: number | null; axis: number | null; add_power: number | null } | null;
      os: { sphere: number; cylinder: number | null; axis: number | null; add_power: number | null } | null;
    };

    if (prevData.od) {
      setFormData((prev) => ({
        ...prev,
        od: {
          ...prev.od,
          sphere: prevData.od!.sphere,
          cylinder: prevData.od!.cylinder,
          axis: prevData.od!.axis,
          add_power: prevData.od!.add_power,
        },
      }));
    }
    if (prevData.os) {
      setFormData((prev) => ({
        ...prev,
        os: {
          ...prev.os,
          sphere: prevData.os!.sphere,
          cylinder: prevData.os!.cylinder,
          axis: prevData.os!.axis,
          add_power: prevData.os!.add_power,
        },
      }));
    }
    toast.success("Copied previous refraction data");
  };

  // Reset form
  const handleReset = () => {
    setFormData(initialFormData);
    setErrors({});
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Check OD required fields
    if (formData.od.sphere === null) {
      newErrors.od_sphere = "OD Sphere is required";
    }
    if (formData.od.va_uncorrected === null) {
      newErrors.od_va_uncorrected = "OD VA Uncorrected is required";
    }
    if (formData.od.va_corrected === null) {
      newErrors.od_va_corrected = "OD VA Corrected is required";
    }
    // Axis required if cylinder is specified
    if (
      formData.od.cylinder !== null &&
      formData.od.cylinder !== 0 &&
      formData.od.axis === null
    ) {
      newErrors.od_axis = "Axis is required when cylinder is specified";
    }

    // Check OS required fields
    if (formData.os.sphere === null) {
      newErrors.os_sphere = "OS Sphere is required";
    }
    if (formData.os.va_uncorrected === null) {
      newErrors.os_va_uncorrected = "OS VA Uncorrected is required";
    }
    if (formData.os.va_corrected === null) {
      newErrors.os_va_corrected = "OS VA Corrected is required";
    }
    // Axis required if cylinder is specified
    if (
      formData.os.cylinder !== null &&
      formData.os.cylinder !== 0 &&
      formData.os.axis === null
    ) {
      newErrors.os_axis = "Axis is required when cylinder is specified";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Save OD refraction
      await dispatch(
        addRefractionRecord({
          patient_id: patientId,
          optometrist_id: optometristId,
          visit_id: visitId,
          eye: "OD",
          sphere: formData.od.sphere!,
          cylinder: formData.od.cylinder,
          axis: formData.od.axis,
          visual_acuity_uncorrected: formData.od.va_uncorrected!,
          visual_acuity_corrected: formData.od.va_corrected!,
          add_power: formData.od.add_power,
          notes: formData.notes || null,
        })
      ).unwrap();

      // Save OS refraction
      await dispatch(
        addRefractionRecord({
          patient_id: patientId,
          optometrist_id: optometristId,
          visit_id: visitId,
          eye: "OS",
          sphere: formData.os.sphere!,
          cylinder: formData.os.cylinder,
          axis: formData.os.axis,
          visual_acuity_uncorrected: formData.os.va_uncorrected!,
          visual_acuity_corrected: formData.os.va_corrected!,
          add_power: formData.os.add_power,
          notes: formData.notes || null,
        })
      ).unwrap();

      toast.success("Refraction saved for both eyes");
      setIsAdding(false);
      handleReset();
      onRefresh();
    } catch (error) {
      toast.error("Failed to save refraction data");
      console.error("Save refraction error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Subjective Refraction
          </h3>
          <p className="text-sm text-slate-600">
            Enter refraction values for both eyes simultaneously
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-teal-600 transition"
          >
            <Plus className="h-4 w-4" />
            Add Refraction
          </button>
        )}
      </div>

      {/* Current Prescription Display */}
      {!isAdding && (latestOD || latestOS) && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="mb-4 text-base font-semibold text-slate-900">
            Current Prescription
          </h4>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* OD Display */}
            <div
              className={clsx(
                "rounded-lg border-2 p-4",
                latestOD
                  ? "border-blue-200 bg-blue-50"
                  : "border-dashed border-slate-200 bg-slate-50"
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <h5 className="font-semibold text-blue-900">OD (Right Eye)</h5>
              </div>
              {latestOD ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-slate-500">SPH</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(latestOD.sphere, "sphere")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">CYL</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(latestOD.cylinder, "cylinder")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">AXIS</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(latestOD.axis, "axis")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">ADD</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(latestOD.add_power, "add")}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-blue-200 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        VA: {latestOD.visual_acuity_uncorrected} →{" "}
                        {latestOD.visual_acuity_corrected}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(latestOD.recorded_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-500">
                  No OD refraction recorded
                </p>
              )}
            </div>

            {/* OS Display */}
            <div
              className={clsx(
                "rounded-lg border-2 p-4",
                latestOS
                  ? "border-green-200 bg-green-50"
                  : "border-dashed border-slate-200 bg-slate-50"
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <h5 className="font-semibold text-green-900">OS (Left Eye)</h5>
              </div>
              {latestOS ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-slate-500">SPH</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(latestOS.sphere, "sphere")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">CYL</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(latestOS.cylinder, "cylinder")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">AXIS</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(latestOS.axis, "axis")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">ADD</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(latestOS.add_power, "add")}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-green-200 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        VA: {latestOS.visual_acuity_uncorrected} →{" "}
                        {latestOS.visual_acuity_corrected}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(latestOS.recorded_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-500">
                  No OS refraction recorded
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Refraction Form */}
      {isAdding && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Form Header with Actions */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-sky-600" />
              <h4 className="text-base font-semibold text-slate-900">
                New Refraction Entry
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <CopyFromPreviousButton
                patientId={patientId}
                dataType="refraction"
                onDataLoaded={handleCopyFromPrevious}
                size="sm"
              />
              <TemplateSelector
                templateType="refraction"
                templates={refractionTemplates}
                onApply={handleApplyTemplate}
                size="sm"
              />
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Sphere */}
            <EyeValueInput
              label="Sphere (SPH)"
              odValue={formData.od.sphere}
              osValue={formData.os.sphere}
              onODChange={(v) => updateField("od", "sphere", v)}
              onOSChange={(v) => updateField("os", "sphere", v)}
              step={0.25}
              min={-30}
              max={30}
              unit="D"
              presets={SPHERE_PRESETS}
              required
              odError={errors.od_sphere}
              osError={errors.os_sphere}
            />

            {/* Cylinder */}
            <EyeValueInput
              label="Cylinder (CYL)"
              odValue={formData.od.cylinder}
              osValue={formData.os.cylinder}
              onODChange={(v) => updateField("od", "cylinder", v)}
              onOSChange={(v) => updateField("os", "cylinder", v)}
              step={0.25}
              min={-10}
              max={0}
              unit="D"
              presets={CYLINDER_PRESETS}
            />

            {/* Axis */}
            <EyeValueInput
              label="Axis"
              odValue={formData.od.axis}
              osValue={formData.os.axis}
              onODChange={(v) => updateField("od", "axis", v)}
              onOSChange={(v) => updateField("os", "axis", v)}
              step={1}
              min={0}
              max={180}
              unit="°"
              presets={AXIS_PRESETS}
              required={
                (formData.od.cylinder !== null && formData.od.cylinder !== 0) ||
                (formData.os.cylinder !== null && formData.os.cylinder !== 0)
              }
              odError={errors.od_axis}
              osError={errors.os_axis}
            />

            {/* Add Power */}
            <EyeValueInput
              label="Add Power (Reading)"
              odValue={formData.od.add_power}
              osValue={formData.os.add_power}
              onODChange={(v) => updateField("od", "add_power", v)}
              onOSChange={(v) => updateField("os", "add_power", v)}
              step={0.25}
              min={0.5}
              max={4}
              unit="D"
              presets={ADD_POWER_PRESETS}
            />

            {/* Visual Acuity Section */}
            <div className="border-t border-slate-200 pt-6">
              <h5 className="mb-4 text-sm font-semibold text-slate-900">
                Visual Acuity
              </h5>

              <div className="grid grid-cols-2 gap-6">
                {/* OD Visual Acuity */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-blue-700">
                      OD (Right)
                    </span>
                  </div>
                  <VASelector
                    label="Uncorrected"
                    value={formData.od.va_uncorrected}
                    onChange={(v) => updateField("od", "va_uncorrected", v)}
                    required
                    colorScheme="blue"
                    error={errors.od_va_uncorrected}
                  />
                  <VASelector
                    label="Corrected"
                    value={formData.od.va_corrected}
                    onChange={(v) => updateField("od", "va_corrected", v)}
                    required
                    colorScheme="blue"
                    error={errors.od_va_corrected}
                  />
                </div>

                {/* OS Visual Acuity */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold text-green-700">
                      OS (Left)
                    </span>
                  </div>
                  <VASelector
                    label="Uncorrected"
                    value={formData.os.va_uncorrected}
                    onChange={(v) => updateField("os", "va_uncorrected", v)}
                    required
                    colorScheme="green"
                    error={errors.os_va_uncorrected}
                  />
                  <VASelector
                    label="Corrected"
                    value={formData.os.va_corrected}
                    onChange={(v) => updateField("os", "va_corrected", v)}
                    required
                    colorScheme="green"
                    error={errors.os_va_corrected}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="Any additional notes..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  handleReset();
                }}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-teal-600 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Both Eyes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAdding && !latestOD && !latestOS && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Eye className="mx-auto h-12 w-12 text-slate-400" />
          <h4 className="mt-4 text-lg font-semibold text-slate-900">
            No Refraction Recorded
          </h4>
          <p className="mt-2 text-sm text-slate-600">
            Click "Add Refraction" to enter subjective refraction values for
            both eyes.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Refraction
          </button>
        </div>
      )}

      {/* Quick Tips */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm text-sky-900">
          <strong>Tips:</strong> Use templates for common prescriptions, or copy
          from previous visit for returning patients. The "Same as OD" button
          copies values when both eyes are similar. Use +/- buttons or type
          directly for precise values.
        </p>
      </div>
    </div>
  );
}
