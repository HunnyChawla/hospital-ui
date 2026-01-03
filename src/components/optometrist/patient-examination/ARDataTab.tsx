"use client";

import { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { addARData } from "@/redux/optometryDataSlice";
import { Plus, Save, X, RotateCcw, Scan, History } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { ARDataRecord } from "@/types";

// Import shared components
import { EyeValueInput, NumericStepper, VASelector } from "../shared";
import { CopyFromPreviousButton } from "../templates";

interface ARDataTabProps {
  patientId: string;
  visitId: string;
  arDataRecords: ARDataRecord[];
  loading: boolean;
  onRefresh: () => void;
}

interface ARDataFormData {
  od: {
    sphere: number | null;
    cylinder: number | null;
    axis: number | null;
    visual_acuity: string | null;
  };
  os: {
    sphere: number | null;
    cylinder: number | null;
    axis: number | null;
    visual_acuity: string | null;
  };
  pupillary_distance: number | null;
  notes: string;
}

const initialFormData: ARDataFormData = {
  od: { sphere: null, cylinder: null, axis: null, visual_acuity: null },
  os: { sphere: null, cylinder: null, axis: null, visual_acuity: null },
  pupillary_distance: null,
  notes: "",
};

// Preset values
const SPHERE_PRESETS = [-6, -3, -1, 0, 1, 2, 3];
const CYLINDER_PRESETS = [0, -0.25, -0.5, -0.75, -1, -1.5, -2];
const AXIS_PRESETS = [0, 45, 90, 135, 180];
const PD_PRESETS = [58, 60, 62, 64, 66, 68];

export function ARDataTab({
  patientId,
  visitId,
  arDataRecords,
  loading,
  onRefresh,
}: ARDataTabProps) {
  const dispatch = useAppDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ARDataFormData>(initialFormData);

  // Format display values
  const formatValue = (
    value: number | null,
    type: "sphere" | "cylinder" | "axis"
  ) => {
    if (value === null) return "—";
    if (type === "axis") return `${value}°`;
    return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  };

  // Update form field
  const updateField = (
    eye: "od" | "os",
    field: keyof ARDataFormData["od"],
    value: number | string | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [eye]: { ...prev[eye], [field]: value },
    }));
  };

  // Handle copy from previous
  const handleCopyFromPrevious = (data: unknown) => {
    const prevData = data as {
      od: { sphere: number; cylinder: number | null; axis: number | null; pupillary_distance: number | null } | null;
      os: { sphere: number; cylinder: number | null; axis: number | null; pupillary_distance: number | null } | null;
    };

    if (prevData.od) {
      setFormData((prev) => ({
        ...prev,
        od: {
          ...prev.od,
          sphere: prevData.od!.sphere,
          cylinder: prevData.od!.cylinder,
          axis: prevData.od!.axis,
        },
        pupillary_distance: prevData.od!.pupillary_distance || prev.pupillary_distance,
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
        },
      }));
    }
    toast.success("Copied previous AR data");
  };

  // Reset form
  const handleReset = () => {
    setFormData(initialFormData);
  };

  // Submit form
  const handleSubmit = async () => {
    // At least one eye should have data
    if (
      formData.od.sphere === null &&
      formData.os.sphere === null
    ) {
      toast.error("Please enter AR data for at least one eye");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Fix this - should create two separate AR data records (one for OD, one for OS)
      await dispatch(
        addARData({
          data: {
            patient_id: patientId,
            visit_id: visitId,
            od_sphere: formData.od.sphere,
            od_cylinder: formData.od.cylinder,
            od_axis: formData.od.axis,
            od_visual_acuity: formData.od.visual_acuity,
            os_sphere: formData.os.sphere,
            os_cylinder: formData.os.cylinder,
            os_axis: formData.os.axis,
            os_visual_acuity: formData.os.visual_acuity,
            pupillary_distance: formData.pupillary_distance,
            notes: formData.notes || null,
          } as any, // Temporary fix - API expects separate records per eye
        })
      ).unwrap();

      toast.success("AR data saved successfully");
      setIsAdding(false);
      handleReset();
      onRefresh();
    } catch (error) {
      toast.error("Failed to save AR data");
      console.error("Save AR data error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get latest AR data
  // TODO: Fix type - AR Data API structure mismatch with component expectations
  const latestAR: any = arDataRecords.length > 0
    ? arDataRecords.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Auto-Refraction (AR) Data
          </h3>
          <p className="text-sm text-slate-600">
            Record auto-refractor measurements for both eyes
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-teal-600 transition"
          >
            <Plus className="h-4 w-4" />
            Add AR Data
          </button>
        )}
      </div>

      {/* Latest AR Display */}
      {!isAdding && latestAR && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">
              Latest AR Measurement
            </h4>
            {latestAR.pupillary_distance && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                PD: {latestAR.pupillary_distance} mm
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* OD Display */}
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <h5 className="font-semibold text-blue-900">OD (Right Eye)</h5>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-slate-500">SPH</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatValue(latestAR.od_sphere, "sphere")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">CYL</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatValue(latestAR.od_cylinder, "cylinder")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">AXIS</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatValue(latestAR.od_axis, "axis")}
                  </p>
                </div>
              </div>
              {latestAR.od_visual_acuity && (
                <p className="mt-2 text-center text-sm text-slate-600">
                  VA: {latestAR.od_visual_acuity}
                </p>
              )}
            </div>

            {/* OS Display */}
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <h5 className="font-semibold text-green-900">OS (Left Eye)</h5>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-slate-500">SPH</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatValue(latestAR.os_sphere, "sphere")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">CYL</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatValue(latestAR.os_cylinder, "cylinder")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">AXIS</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatValue(latestAR.os_axis, "axis")}
                  </p>
                </div>
              </div>
              {latestAR.os_visual_acuity && (
                <p className="mt-2 text-center text-sm text-slate-600">
                  VA: {latestAR.os_visual_acuity}
                </p>
              )}
            </div>
          </div>

          {latestAR.notes && (
            <p className="mt-4 text-sm text-slate-600">
              <strong>Notes:</strong> {latestAR.notes}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Recorded: {new Date(latestAR.created_at).toLocaleString()}
          </p>
        </div>
      )}

      {/* Add AR Data Form */}
      {isAdding && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Form Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-sky-600" />
              <h4 className="text-base font-semibold text-slate-900">
                New AR Measurement
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <CopyFromPreviousButton
                patientId={patientId}
                dataType="ar_data"
                onDataLoaded={handleCopyFromPrevious}
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
            />

            {/* Visual Acuity */}
            <div className="border-t border-slate-200 pt-6">
              <h5 className="mb-4 text-sm font-semibold text-slate-900">
                Visual Acuity (Optional)
              </h5>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-blue-700">OD</span>
                  </div>
                  <VASelector
                    value={formData.od.visual_acuity}
                    onChange={(v) => updateField("od", "visual_acuity", v)}
                    colorScheme="blue"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold text-green-700">OS</span>
                  </div>
                  <VASelector
                    value={formData.os.visual_acuity}
                    onChange={(v) => updateField("os", "visual_acuity", v)}
                    colorScheme="green"
                  />
                </div>
              </div>
            </div>

            {/* Pupillary Distance */}
            <div className="border-t border-slate-200 pt-6">
              <NumericStepper
                label="Pupillary Distance (PD)"
                value={formData.pupillary_distance}
                onChange={(v) =>
                  setFormData((prev) => ({ ...prev, pupillary_distance: v }))
                }
                step={0.5}
                min={50}
                max={80}
                unit="mm"
                presets={PD_PRESETS}
                colorScheme="neutral"
                placeholder="63.0"
              />
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
                    Save AR Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAdding && arDataRecords.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Scan className="mx-auto h-12 w-12 text-slate-400" />
          <h4 className="mt-4 text-lg font-semibold text-slate-900">
            No AR Data Recorded
          </h4>
          <p className="mt-2 text-sm text-slate-600">
            Click "Add AR Data" to enter auto-refractor measurements.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add AR Data
          </button>
        </div>
      )}

      {/* History - Only show if there are multiple records */}
      {!isAdding && arDataRecords.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-700">
              Previous AR Records ({arDataRecords.length - 1})
            </h4>
          </div>
          <div className="space-y-3">
            {arDataRecords.slice(1, 4).map((record: any) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">
                    OD: {formatValue(record.od_sphere, "sphere")} /{" "}
                    {formatValue(record.od_cylinder, "cylinder")}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-sm text-slate-600">
                    OS: {formatValue(record.os_sphere, "sphere")} /{" "}
                    {formatValue(record.os_cylinder, "cylinder")}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(record.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm text-sky-900">
          <strong>Tip:</strong> AR data from the auto-refractor provides a
          starting point for subjective refraction. Use "Copy Previous" to load
          data from the last visit.
        </p>
      </div>
    </div>
  );
}
