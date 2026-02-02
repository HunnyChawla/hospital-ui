"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { addARData, updateARData } from "@/redux/optometryDataSlice";
import { Plus, Save, X, RotateCcw, Scan, History, Settings } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { ARDataRecord } from "@/types";

// Import shared components
import { EyeValueInput, NumericStepper } from "../shared";
import { CopyFromPreviousButton } from "../templates";
import { handleError } from "@/utils/errorHandler";
import { ARDataHistorySection } from "./ARDataHistorySection";
import { useRefractionSettings } from "@/hooks/useRefractionSettings";
import { RefractionSettingsModal } from "./RefractionSettingsModal";

interface ARDataTabProps {
  patientId: string;
  visitId: string;
  optometristId: string;
  arDataRecords: ARDataRecord[];
  loading: boolean;
  onRefresh: () => void;
}

interface ARDataFormData {
  od: {
    sphere: number | string | null;
    cylinder: number | string | null;
    axis: number | string | null;
  };
  os: {
    sphere: number | string | null;
    cylinder: number | string | null;
    axis: number | string | null;
  };
  pupillary_distance: number | string | null;
  notes: string;
}

const initialFormData: ARDataFormData = {
  od: { sphere: null, cylinder: null, axis: null },
  os: { sphere: null, cylinder: null, axis: null },
  pupillary_distance: null,
  notes: "",
};

// Preset values - expanded for frequently used values
const PD_PRESETS = [54, 56, 58, 60, 61, 62, 63, 64, 65, 66, 68, 70];

export function ARDataTab({
  patientId,
  visitId,
  optometristId,
  arDataRecords,
  loading,
  onRefresh,
}: ARDataTabProps) {
  const dispatch = useAppDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ARDataFormData>(initialFormData);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Settings Hook
  const {
    settings,
    updateSettings,
    isSettingsOpen: showSettings,
    setIsSettingsOpen: setShowSettings,
    spherePresets,
    cylinderPresets,
    axisPresets
  } = useRefractionSettings();

  // Format display values
  const formatValue = (
    value: number | string | null | undefined,
    type: "sphere" | "cylinder" | "axis"
  ) => {
    if (value === null || value === undefined || value === "") return "—";
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(num)) return `${value}`;
    if (type === "axis") return `${Math.round(num)}°`;
    return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
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

  // Compute existing record for this visit (combined preferred; else merge per-eye)
  const visitCombinedRecord = useMemo(() => {
    return (arDataRecords as any[]).find(
      (r: any) => r?.visit_id === visitId && ("od_sphere" in r || ("os_sphere" in r))
    ) as any | undefined;
  }, [arDataRecords, visitId]);

  const visitOD = useMemo(() => arDataRecords.find((r: any) => r.visit_id === visitId && r.eye === "OD") as any | undefined, [arDataRecords, visitId]);
  const visitOS = useMemo(() => arDataRecords.find((r: any) => r.visit_id === visitId && r.eye === "OS") as any | undefined, [arDataRecords, visitId]);

  const hasExistingForVisit = !!visitCombinedRecord || !!visitOD || !!visitOS;

  // Prefill form when opening add/edit or when visit data arrives
  useEffect(() => {
    if (!visitId) return;

    if (visitCombinedRecord) {
      setFormData({
        od: {
          sphere: visitCombinedRecord.od_sphere ?? null,
          cylinder: visitCombinedRecord.od_cylinder ?? null,
          axis: visitCombinedRecord.od_axis ?? null,
        },
        os: {
          sphere: visitCombinedRecord.os_sphere ?? null,
          cylinder: visitCombinedRecord.os_cylinder ?? null,
          axis: visitCombinedRecord.os_axis ?? null,
        },
        pupillary_distance: visitCombinedRecord.pupillary_distance ?? null,
        notes: visitCombinedRecord.notes ?? "",
      });
      setEditingRecordId(visitCombinedRecord.id || null);
    } else if (visitOD || visitOS) {
      setFormData({
        od: {
          sphere: visitOD?.sphere ?? null,
          cylinder: visitOD?.cylinder ?? null,
          axis: visitOD?.axis ?? null,
        },
        os: {
          sphere: visitOS?.sphere ?? null,
          cylinder: visitOS?.cylinder ?? null,
          axis: visitOS?.axis ?? null,
        },
        pupillary_distance: visitOD?.pupillary_distance ?? visitOS?.pupillary_distance ?? null,
        notes: visitOD?.notes ?? visitOS?.notes ?? "",
      });
      // Use whichever per-eye record exists for update to enforce one-record-per-visit on subsequent save
      setEditingRecordId(visitOD?.id || visitOS?.id || null);
    } else {
      setFormData(initialFormData);
      setEditingRecordId(null);
    }
  }, [visitId, visitCombinedRecord, visitOD, visitOS]);

  // Submit form
  const handleSubmit = async () => {
    // Require a valid visit id
    if (!visitId) {
      toast.error("No active visit found. Please select/start a visit before saving AR data.");
      return;
    }

    // At least one eye should have data
    const odHasData = formData.od.sphere !== null && formData.od.sphere !== undefined && formData.od.sphere !== "";
    const osHasData = formData.os.sphere !== null && formData.os.sphere !== undefined && formData.os.sphere !== "";

    if (!odHasData && !osHasData) {
      toast.error("Please enter AR data for at least one eye");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        patient_id: patientId,
        visit_id: visitId,
        optometrist_id: optometristId,
        od_sphere: formData.od.sphere === "" || formData.od.sphere === null ? null : Number(formData.od.sphere),
        od_cylinder: formData.od.cylinder === "" || formData.od.cylinder === null ? null : Number(formData.od.cylinder),
        od_axis: formData.od.axis === "" || formData.od.axis === null ? null : Number(formData.od.axis),
        os_sphere: formData.os.sphere === "" || formData.os.sphere === null ? null : Number(formData.os.sphere),
        os_cylinder: formData.os.cylinder === "" || formData.os.cylinder === null ? null : Number(formData.os.cylinder),
        os_axis: formData.os.axis === "" || formData.os.axis === null ? null : Number(formData.os.axis),
        pupillary_distance: formData.pupillary_distance === "" || formData.pupillary_distance === null ? null : Number(formData.pupillary_distance),
        notes: formData.notes || null,
      };

      if (visitCombinedRecord && editingRecordId) {
        await dispatch(
          updateARData({ id: editingRecordId, data: payload })
        ).unwrap();
      } else {
        await dispatch(
          addARData({ data: payload })
        ).unwrap();
      }

      toast.success("AR data saved successfully");
      setIsAdding(false);
      handleReset();
      onRefresh();
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to save AR data",
        logError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get latest AR data from either combined records (od_*/os_*) or per-eye records
  const combinedRecords: any[] = (arDataRecords as any[]).filter(
    (r) => r && ("od_sphere" in r || ("os_sphere" in r))
  );

  let latestAR: any = null;
  if (combinedRecords.length > 0) {
    const latestCombined = [...combinedRecords].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    latestAR = latestCombined;
  } else {
    const latestOD = arDataRecords
      .filter((r) => r.eye === "OD")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const latestOS = arDataRecords
      .filter((r) => r.eye === "OS")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const latestCreatedAt = Math.max(
      latestOD ? new Date(latestOD.created_at).getTime() : 0,
      latestOS ? new Date(latestOS.created_at).getTime() : 0
    );
    latestAR = latestOD || latestOS
      ? {
        od_sphere: latestOD?.sphere ?? null,
        od_cylinder: latestOD?.cylinder ?? null,
        od_axis: latestOD?.axis ?? null,
        os_sphere: latestOS?.sphere ?? null,
        os_cylinder: latestOS?.cylinder ?? null,
        os_axis: latestOS?.axis ?? null,
        pupillary_distance: latestOD?.pupillary_distance ?? latestOS?.pupillary_distance ?? null,
        notes: latestOD?.notes ?? latestOS?.notes ?? null,
        created_at: latestCreatedAt ? new Date(latestCreatedAt).toISOString() : new Date().toISOString(),
      }
      : null;
  }

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
        <div className="flex items-center gap-2">
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-teal-600 transition"
            >
              <Plus className="h-4 w-4" />
              {hasExistingForVisit ? "Edit AR Data" : "Add AR Data"}
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            title="Configure Quick Buttons"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* This Visit's AR Data - Only show if data exists for current visit */}
      {!isAdding && hasExistingForVisit && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">
              This Visit&apos;s AR Data
            </h4>
            {(visitCombinedRecord?.pupillary_distance || visitOD?.pupillary_distance || visitOS?.pupillary_distance) && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                PD: {visitCombinedRecord?.pupillary_distance ?? visitOD?.pupillary_distance ?? visitOS?.pupillary_distance} mm
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
                    {formatValue(visitCombinedRecord?.od_sphere ?? visitOD?.sphere, "sphere")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">CYL</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatValue(visitCombinedRecord?.od_cylinder ?? visitOD?.cylinder, "cylinder")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">AXIS</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatValue(visitCombinedRecord?.od_axis ?? visitOD?.axis, "axis")}
                  </p>
                </div>
              </div>
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
                    {formatValue(visitCombinedRecord?.os_sphere ?? visitOS?.sphere, "sphere")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">CYL</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatValue(visitCombinedRecord?.os_cylinder ?? visitOS?.cylinder, "cylinder")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">AXIS</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatValue(visitCombinedRecord?.os_axis ?? visitOS?.axis, "axis")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {(visitCombinedRecord?.notes || visitOD?.notes || visitOS?.notes) && (
            <p className="mt-4 text-sm text-slate-600">
              <strong>Notes:</strong> {visitCombinedRecord?.notes ?? visitOD?.notes ?? visitOS?.notes}
            </p>
          )}
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
              odValue={formData.od.sphere === "" || formData.od.sphere === null ? null : Number(formData.od.sphere)}
              osValue={formData.os.sphere === "" || formData.os.sphere === null ? null : Number(formData.os.sphere)}
              onODChange={(v) => updateField("od", "sphere", v)}
              onOSChange={(v) => updateField("os", "sphere", v)}
              step={0.25}
              min={-30}
              max={30}
              unit="D"
              presets={spherePresets}
            />

            {/* Cylinder */}
            <EyeValueInput
              label="Cylinder (CYL)"
              odValue={formData.od.cylinder === "" || formData.od.cylinder === null ? null : Number(formData.od.cylinder)}
              osValue={formData.os.cylinder === "" || formData.os.cylinder === null ? null : Number(formData.os.cylinder)}
              onODChange={(v) => updateField("od", "cylinder", v)}
              onOSChange={(v) => updateField("os", "cylinder", v)}
              step={0.25}
              min={-10}
              max={0}
              unit="D"
              presets={cylinderPresets}
            />

            {/* Axis */}
            <EyeValueInput
              label="Axis"
              odValue={formData.od.axis === "" || formData.od.axis === null ? null : Number(formData.od.axis)}
              osValue={formData.os.axis === "" || formData.os.axis === null ? null : Number(formData.os.axis)}
              onODChange={(v) => updateField("od", "axis", v)}
              onOSChange={(v) => updateField("os", "axis", v)}
              step={1}
              min={0}
              max={180}
              unit="°"
              presets={axisPresets}
            />

            {/* Pupillary Distance */}
            <div className="border-t border-slate-200 pt-6">
              <NumericStepper
                label="Pupillary Distance (PD)"
                value={formData.pupillary_distance === "" || formData.pupillary_distance === null ? null : Number(formData.pupillary_distance)}
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
            Click &quot;Add AR Data&quot; to enter auto-refractor measurements.
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

      {/* AR Data History - Last 5 Visits */}
      {!isAdding && (
        <ARDataHistorySection
          patientId={patientId}
          currentVisitId={visitId}
        />
      )}

      {/* Tips */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm text-sky-900">
          <strong>Tip:</strong> AR data from the auto-refractor provides a
          starting point for subjective refraction. Use &quot;Copy Previous&quot; to load
          data from the last visit.
        </p>
      </div>

      {/* Settings Modal */}
      <RefractionSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentSettings={settings}
        onSave={updateSettings}
      />
    </div >
  );
}
