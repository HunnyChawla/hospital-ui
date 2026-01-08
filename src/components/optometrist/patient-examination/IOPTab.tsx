"use client";

import { useMemo, useState, useEffect } from "react";
import { Plus, Save, X, RotateCcw, Activity, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { IOPRecord } from "@/types";
import { iopApi } from "@/services/iopApi";

// Import shared components
import { NumericStepper, QuickSelectButtons } from "../shared";
import { CopyFromPreviousButton } from "../templates";
import { handleError } from "@/utils/errorHandler";

interface IOPTabProps {
  patientId: string;
  visitId: string;
  iopRecords: IOPRecord[];
  iopTrends: any; // TODO: Fix type - should be IOPTrendSummary with latest_od, latest_os, average_od, average_os
  loading: boolean;
  onRefresh: () => void;
}

interface IOPFormData {
  od_pressure: number | null;
  os_pressure: number | null;
  measurement_method: string;
  notes: string;
}

const initialFormData: IOPFormData = {
  od_pressure: null,
  os_pressure: null,
  measurement_method: "NCT",
  notes: "",
};

// Measurement methods
const MEASUREMENT_METHODS = [
  { label: "NCT", value: "NCT", description: "Non-Contact Tonometry" },
  { label: "Goldmann", value: "Goldmann", description: "Goldmann Applanation" },
  { label: "Tonopen", value: "Tonopen", description: "Tonopen" },
  { label: "iCare", value: "iCare", description: "iCare Rebound" },
];

// Pressure presets
const PRESSURE_PRESETS = [12, 14, 16, 18, 20];

export function IOPTab({
  patientId,
  visitId,
  iopRecords,
  iopTrends,
  loading,
  onRefresh,
}: IOPTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<IOPFormData>(initialFormData);
  const [editingODId, setEditingODId] = useState<string | null>(null);
  const [editingOSId, setEditingOSId] = useState<string | null>(null);
  const [visitIOPItems, setVisitIOPItems] = useState<any[]>([]);

  const toNumberOrNull = (v: any): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const formatNumber = (value: number | string | null | undefined, digits: number = 1): string => {
    if (value === null || value === undefined || value === "") return "—";
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(n)) return "—";
    return n.toFixed(digits);
  };

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const getRecordDateString = (r: any): string => {
    const ts: string | undefined = r?.recorded_at ?? r?.measurement_time ?? r?.created_at ?? r?.updated_at;
    if (!ts) return "—";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "—";
    const today = startOfDay(new Date());
    const day = startOfDay(d);
    const diffDays = Math.floor((today.getTime() - day.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  const normalizeCombined = (r: any) => {
    if (!r) return null;
    const hasFlat = "od_pressure" in r || "os_pressure" in r;
    if (!hasFlat) return null;
    return {
      id: r.id,
      recorded_at: r.recorded_at,
      od_pressure: toNumberOrNull(r.od_pressure),
      os_pressure: toNumberOrNull(r.os_pressure),
      measurement_time: r.measurement_time ?? r.recorded_at,
      measurement_method: r.measurement_method ?? "NCT",
      notes: r.notes ?? "",
    };
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!visitId) {
        if (mounted) setVisitIOPItems([]);
        return;
      }
      try {
        const res = await iopApi.list({ visit_id: visitId });
        if (mounted) setVisitIOPItems(res.items || []);
      } catch (e) { }
    })();
    return () => {
      mounted = false;
    };
  }, [visitId]);

  // Get IOP status with color coding
  const getIOPStatus = (pressure: number) => {
    if (pressure < 10) {
      return { label: "Low", color: "text-blue-600", bgColor: "bg-blue-100", borderColor: "border-blue-300" };
    } else if (pressure >= 10 && pressure <= 21) {
      return { label: "Normal", color: "text-emerald-600", bgColor: "bg-emerald-100", borderColor: "border-emerald-300" };
    } else if (pressure > 21 && pressure <= 30) {
      return { label: "Elevated", color: "text-amber-600", bgColor: "bg-amber-100", borderColor: "border-amber-300" };
    } else {
      return { label: "High", color: "text-red-600", bgColor: "bg-red-100", borderColor: "border-red-300" };
    }
  };

  // Handle copy from previous
  const handleCopyFromPrevious = (data: unknown) => {
    const prevData = data as {
      od_pressure: number;
      os_pressure: number;
      measurement_method: string;
    };

    setFormData((prev) => ({
      ...prev,
      od_pressure: prevData.od_pressure,
      os_pressure: prevData.os_pressure,
      measurement_method: prevData.measurement_method || "NCT",
    }));
    toast.success("Copied previous IOP data");
  };

  // Reset form
  const handleReset = () => {
    setFormData(initialFormData);
    setEditingODId(null);
    setEditingOSId(null);
  };

  // Detect existing visit records and prefill when visit changes or when starting to add/edit
  const visitSource = (visitIOPItems && visitIOPItems.length > 0) ? visitIOPItems : (iopRecords as any[]);
  const visitCombined = useMemo(() => {
    const rec = (visitSource as any[]).find((r: any) => r.visit_id === visitId && ("od_pressure" in r || "os_pressure" in r));
    return rec ? normalizeCombined(rec) : undefined;
  }, [visitSource, visitId]) as any | undefined;
  const visitOD = useMemo(() => (visitSource as any[]).find((r: any) => r.visit_id === visitId && r.eye === "OD"), [visitSource, visitId]) as any | undefined;
  const visitOS = useMemo(() => (visitSource as any[]).find((r: any) => r.visit_id === visitId && r.eye === "OS"), [visitSource, visitId]) as any | undefined;
  const hasExistingForVisit = !!visitCombined || !!visitOD || !!visitOS;

  useEffect(() => {
    if (!visitId) {
      handleReset();
      return;
    }

    if (visitCombined || visitOD || visitOS) {
      setFormData((prev) => ({
        ...prev,
        od_pressure: visitCombined?.od_pressure ?? visitOD?.pressure ?? null,
        os_pressure: visitCombined?.os_pressure ?? visitOS?.pressure ?? null,
        measurement_method: visitCombined?.measurement_method ?? visitOD?.measurement_method ?? visitOS?.measurement_method ?? "NCT",
        notes: visitCombined?.notes ?? visitOD?.notes ?? visitOS?.notes ?? "",
      }));
      setEditingODId(visitOD?.id || null);
      setEditingOSId(visitOS?.id || null);
    } else {
      setFormData(initialFormData);
      setEditingODId(null);
      setEditingOSId(null);
    }
  }, [visitId, visitOD, visitOS, visitCombined]);

  // Submit form
  const handleSubmit = async () => {
    if (!visitId) {
      toast.error("No active visit found. Please select/start a visit before saving IOP.");
      return;
    }
    if (formData.od_pressure === null || formData.os_pressure === null) {
      toast.error("Please enter IOP for both eyes");
      return;
    }

    const optometristId = localStorage.getItem("user_id");
    if (!optometristId) {
      toast.error("Optometrist ID not found");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        patient_id: patientId,
        visit_id: visitId,
        optometrist_id: optometristId,
        od_pressure: formData.od_pressure!,
        os_pressure: formData.os_pressure!,
        measurement_time: new Date().toISOString(),
        measurement_method: formData.measurement_method,
        notes: formData.notes || null,
      };

      if (visitCombined) {
        await iopApi.updateCombined(visitCombined.id, payload);
      } else {
        await iopApi.createCombined(payload);
      }

      toast.success("IOP measurements saved successfully");
      setIsAdding(false);
      handleReset();
      onRefresh();
      try {
        const res = await iopApi.list({ visit_id: visitId });
        setVisitIOPItems(res.items || []);
      } catch (e) { }
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to save IOP measurements",
        logError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get latest IOP record
  const latestIOP = iopRecords.length > 0
    ? iopRecords.sort(
      (a, b) =>
        new Date(b.recorded_at).getTime() -
        new Date(a.recorded_at).getTime()
    )[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Intraocular Pressure (IOP)
          </h3>
          <p className="text-sm text-slate-600">
            Normal range: 10-21 mmHg
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-teal-600 transition"
          >
            <Plus className="h-4 w-4" />
            {hasExistingForVisit ? "Edit IOP" : "Add IOP"}
          </button>
        )}
      </div>

      {/* Trend Summary Cards */}
      {!isAdding && iopTrends && iopTrends.latest_od != null && iopTrends.latest_os != null && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Latest OD */}
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">OD (Right)</span>
              <div className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
            <p className="text-4xl font-bold text-slate-900">
              {iopTrends.latest_od}
              <span className="ml-1 text-lg font-normal text-slate-500">mmHg</span>
            </p>
            <div className={clsx(
              "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              getIOPStatus(iopTrends.latest_od).bgColor,
              getIOPStatus(iopTrends.latest_od).color
            )}>
              {getIOPStatus(iopTrends.latest_od).label}
            </div>
          </div>

          {/* Latest OS */}
          <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-green-700">OS (Left)</span>
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </div>
            <p className="text-4xl font-bold text-slate-900">
              {iopTrends.latest_os}
              <span className="ml-1 text-lg font-normal text-slate-500">mmHg</span>
            </p>
            <div className={clsx(
              "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              getIOPStatus(iopTrends.latest_os).bgColor,
              getIOPStatus(iopTrends.latest_os).color
            )}>
              {getIOPStatus(iopTrends.latest_os).label}
            </div>
          </div>

          {/* 6-Month Average */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">6-Month Avg</span>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-4xl font-bold text-slate-900">
              {iopTrends.average_od != null && iopTrends.average_os != null
                ? ((Number(iopTrends.average_od) + Number(iopTrends.average_os)) / 2).toFixed(1)
                : "—"}
              <span className="ml-1 text-lg font-normal text-slate-500">mmHg</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              OD: {formatNumber(iopTrends.average_od, 1)} / OS: {formatNumber(iopTrends.average_os, 1)}
            </p>
          </div>
        </div>
      )}

      {/* Add IOP Form */}
      {isAdding && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Form Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-sky-600" />
              <h4 className="text-base font-semibold text-slate-900">
                New IOP Measurement
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <CopyFromPreviousButton
                patientId={patientId}
                dataType="iop"
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
            {/* IOP Values - Large Display */}
            <div className="grid grid-cols-2 gap-6">
              {/* OD Pressure */}
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="font-semibold text-blue-900">OD (Right Eye)</span>
                  </div>
                  {formData.od_pressure !== null && (
                    <span className={clsx(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      getIOPStatus(formData.od_pressure).bgColor,
                      getIOPStatus(formData.od_pressure).color
                    )}>
                      {getIOPStatus(formData.od_pressure).label}
                    </span>
                  )}
                </div>

                {/* Large Display */}
                <div className="mb-4 text-center">
                  <span className="text-5xl font-bold text-slate-900">
                    {formData.od_pressure !== null ? formData.od_pressure.toFixed(1) : "—"}
                  </span>
                  <span className="ml-2 text-xl text-slate-500">mmHg</span>
                </div>

                <NumericStepper
                  value={formData.od_pressure}
                  onChange={(v) => setFormData((prev) => ({ ...prev, od_pressure: v }))}
                  step={0.5}
                  min={5}
                  max={50}
                  presets={PRESSURE_PRESETS}
                  colorScheme="blue"
                  size="lg"
                  placeholder="16.0"
                />
              </div>

              {/* OS Pressure */}
              <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="font-semibold text-green-900">OS (Left Eye)</span>
                  </div>
                  {formData.os_pressure !== null && (
                    <span className={clsx(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      getIOPStatus(formData.os_pressure).bgColor,
                      getIOPStatus(formData.os_pressure).color
                    )}>
                      {getIOPStatus(formData.os_pressure).label}
                    </span>
                  )}
                </div>

                {/* Large Display */}
                <div className="mb-4 text-center">
                  <span className="text-5xl font-bold text-slate-900">
                    {formData.os_pressure !== null ? formData.os_pressure.toFixed(1) : "—"}
                  </span>
                  <span className="ml-2 text-xl text-slate-500">mmHg</span>
                </div>

                <NumericStepper
                  value={formData.os_pressure}
                  onChange={(v) => setFormData((prev) => ({ ...prev, os_pressure: v }))}
                  step={0.5}
                  min={5}
                  max={50}
                  presets={PRESSURE_PRESETS}
                  colorScheme="green"
                  size="lg"
                  placeholder="16.0"
                />
              </div>
            </div>

            {/* Measurement Method */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-900">
                Measurement Method
              </label>
              <QuickSelectButtons
                options={MEASUREMENT_METHODS}
                value={formData.measurement_method}
                onChange={(v) => setFormData((prev) => ({ ...prev, measurement_method: v as string }))}
                size="md"
                colorScheme="sky"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
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
                disabled={isSubmitting || formData.od_pressure === null || formData.os_pressure === null}
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
                    Save IOP
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAdding && iopRecords.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Activity className="mx-auto h-12 w-12 text-slate-400" />
          <h4 className="mt-4 text-lg font-semibold text-slate-900">
            No IOP Recorded
          </h4>
          <p className="mt-2 text-sm text-slate-600">
            Click "Add IOP" to record intraocular pressure.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add IOP
          </button>
        </div>
      )}

      {/* History */}
      {!isAdding && iopRecords.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="mb-4 text-base font-semibold text-slate-900">
            Measurement History
          </h4>
          <div className="space-y-3">
            {iopRecords.slice(0, 5).map((record) => {
              const hasAlert =
                record.pressure > 21 ||
                record.pressure < 10;

              return (
                <div
                  key={record.id}
                  className={clsx(
                    "flex items-center justify-between rounded-lg border p-4",
                    hasAlert
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-100 bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-6">
                    {/* Time */}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="h-4 w-4" />
                      {getRecordDateString(record)}
                    </div>

                    {/* Eye and Pressure */}
                    <div className="flex items-center gap-2">
                      <div className={clsx(
                        "h-2 w-2 rounded-full",
                        record.eye === "OD" ? "bg-blue-500" : "bg-green-500"
                      )} />
                      <span className="text-sm font-medium text-slate-900">
                        {record.eye}: {record.pressure} mmHg
                      </span>
                      <span className={clsx("text-xs font-medium", getIOPStatus(record.pressure).color)}>
                        ({getIOPStatus(record.pressure).label})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                      {record.measurement_method}
                    </span>
                    {hasAlert && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reference Info */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm text-sky-900">
          <strong>Reference:</strong> Normal IOP is 10-21 mmHg. Elevated IOP
          (21-30 mmHg) may indicate glaucoma risk. Values above 30 mmHg or below
          10 mmHg require immediate attention.
        </p>
      </div>
    </div>
  );
}
