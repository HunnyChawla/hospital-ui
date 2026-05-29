"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { addRefractionRecord, updateRefractionRecord, updateRefractionCombinedRecord } from "@/redux/optometryDataSlice";
import { Plus, Save, X, RotateCcw, Eye, Settings } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { RefractionRecord } from "@/types";

// Import shared components
import { EyeValueInput, NumericStepper, VASelector } from "../shared";
import { TemplateSelector, CopyFromPreviousButton } from "../templates";
import { refractionTemplates, type RefractionTemplate } from "../mock";
import { refractionApi } from "@/services/refractionApi";
import { handleError } from "@/utils/errorHandler";
import { RefractionHistorySection } from "./RefractionHistorySection";
import { useRefractionSettings } from "@/hooks/useRefractionSettings";
import { RefractionSettingsModal } from "./RefractionSettingsModal";

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
    visual_acuity_uncorrected: string;
    visual_acuity_corrected: string;
    distance_bcva: string;
    near_bcva: string;
    add_power: number | null;
  };
  os: {
    sphere: number | null;
    cylinder: number | null;
    axis: number | null;
    visual_acuity_uncorrected: string;
    visual_acuity_corrected: string;
    distance_bcva: string;
    near_bcva: string;
    add_power: number | null;
  };
  pupillary_distance: number | null;
  notes: string;
}

const initialFormData: RefractionFormData = {
  od: {
    sphere: null,
    cylinder: null,
    axis: null,
    visual_acuity_uncorrected: "",
    visual_acuity_corrected: "",
    distance_bcva: "",
    near_bcva: "",
    add_power: null,
  },
  os: {
    sphere: null,
    cylinder: null,
    axis: null,
    visual_acuity_uncorrected: "",
    visual_acuity_corrected: "",
    distance_bcva: "",
    near_bcva: "",
    add_power: null,
  },
  pupillary_distance: null,
  notes: "",
};


// Preset values for quick selection - expanded for frequently used values
// const SPHERE_PRESETS = [-8, -6, -4, -3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3, 4, 6];
// const CYLINDER_PRESETS = [0, -0.25, -0.5, -0.75, -1, -1.25, -1.5, -1.75, -2, -2.5, -3, -4];
// const AXIS_PRESETS = [0, 10, 20, 30, 45, 60, 70, 80, 90, 100, 110, 120, 135, 150, 160, 170, 180];
// const ADD_POWER_PRESETS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5];
const PD_PRESETS = [54, 56, 58, 60, 61, 62, 63, 64, 65, 66, 68, 70];
const NEAR_VA_OPTIONS = ["N5", "N6", "N8", "N10", "N12", "N14", "N18", "N24", "N36", "N48"];

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
  const [editingODId, setEditingODId] = useState<string | null>(null);
  const [editingOSId, setEditingOSId] = useState<string | null>(null);
  const [visitRefractions, setVisitRefractions] = useState<any[]>([]);

  // Settings Hook
  const {
    settings,
    updateSettings,
    isSettingsOpen: showSettings,
    setIsSettingsOpen: setShowSettings,
    spherePresets,
    cylinderPresets,
    axisPresets,
    addPowerPresets
  } = useRefractionSettings();

  const toNumberOrNull = (v: any): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const normalizeCombined = (r: any) => {
    const hasNested = r && r.od && r.os;
    const hasFlat = r && ("od_sphere" in r || "os_sphere" in r);
    if (!hasNested && !hasFlat) return null;
    return {
      id: r.id,
      recorded_at: r.recorded_at,
      notes: r.notes ?? null,
      od: {
        sphere: hasNested ? toNumberOrNull(r.od.sphere) : toNumberOrNull(r.od_sphere),
        cylinder: hasNested ? toNumberOrNull(r.od.cylinder) : toNumberOrNull(r.od_cylinder),
        axis: hasNested ? toNumberOrNull(r.od.axis) : toNumberOrNull(r.od_axis),
        visual_acuity_uncorrected: hasNested ? r.od.visual_acuity_uncorrected ?? "" : r.od_visual_acuity_uncorrected ?? "",
        visual_acuity_corrected: hasNested ? r.od.visual_acuity_corrected ?? "" : r.od_visual_acuity_corrected ?? "",
        distance_bcva: hasNested ? r.od.distance_bcva ?? "" : r.od_distance_bcva ?? "",
        near_bcva: hasNested ? r.od.near_bcva ?? "" : r.od_near_bcva ?? "",
        add_power: hasNested ? toNumberOrNull(r.od.add_power) : toNumberOrNull(r.od_add_power),
      },
      os: {
        sphere: hasNested ? toNumberOrNull(r.os.sphere) : toNumberOrNull(r.os_sphere),
        cylinder: hasNested ? toNumberOrNull(r.os.cylinder) : toNumberOrNull(r.os_cylinder),
        axis: hasNested ? toNumberOrNull(r.os.axis) : toNumberOrNull(r.os_axis),
        visual_acuity_uncorrected: hasNested ? r.os.visual_acuity_uncorrected ?? "" : r.os_visual_acuity_uncorrected ?? "",
        visual_acuity_corrected: hasNested ? r.os.visual_acuity_corrected ?? "" : r.os_visual_acuity_corrected ?? "",
        distance_bcva: hasNested ? r.os.distance_bcva ?? "" : r.os_distance_bcva ?? "",
        near_bcva: hasNested ? r.os.near_bcva ?? "" : r.os_near_bcva ?? "",
        add_power: hasNested ? toNumberOrNull(r.os.add_power) : toNumberOrNull(r.os_add_power),
      },
      pupillary_distance: toNumberOrNull(r.pupillary_distance),
    };
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!visitId) {
        if (mounted) setVisitRefractions([]);
        return;
      }
      try {
        const res = await refractionApi.list({ visit_id: visitId });
        if (mounted) setVisitRefractions(res.items || []);
      } catch (e) {
      }
    })();
    return () => {
      mounted = false;
    };
  }, [visitId]);

  const combinedRecords = useMemo(() => {
    const src = refractionRecords as any[];
    const mapped = src
      .map((r: any) => normalizeCombined(r))
      .filter((c: any) => !!c);
    return mapped as any[];
  }, [refractionRecords]) as any[];

  const latestCombined = useMemo(() => {
    if (!combinedRecords.length) return undefined as any | undefined;
    return [...combinedRecords].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    )[0];
  }, [combinedRecords]);

  const latestPerEyeOD = useMemo(
    () =>
      refractionRecords
        .filter((r) => (r as any).eye === "OD")
        .sort(
          (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        )[0],
    [refractionRecords]
  );

  const latestPerEyeOS = useMemo(
    () =>
      refractionRecords
        .filter((r) => (r as any).eye === "OS")
        .sort(
          (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        )[0],
    [refractionRecords]
  );


  // Format refraction values for display
  const formatValue = (
    value: number | string | null | undefined,
    type: "sphere" | "cylinder" | "axis" | "add"
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
        visual_acuity_uncorrected: (template.data.od as any).visual_acuity_uncorrected || "",
        visual_acuity_corrected: (template.data.od as any).visual_acuity_corrected || "",
        distance_bcva: (template.data.od as any).distance_bcva || "",
        near_bcva: (template.data.od as any).near_bcva || "",
        add_power: template.data.od.add_power,
      },
      os: {
        ...prev.os,
        sphere: template.data.os.sphere,
        cylinder: template.data.os.cylinder,
        axis: template.data.os.axis,
        visual_acuity_uncorrected: (template.data.os as any).visual_acuity_uncorrected || "",
        visual_acuity_corrected: (template.data.os as any).visual_acuity_corrected || "",
        distance_bcva: (template.data.os as any).distance_bcva || "",
        near_bcva: (template.data.os as any).near_bcva || "",
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
          visual_acuity_uncorrected: (prevData.od as any).visual_acuity_uncorrected || "",
          visual_acuity_corrected: (prevData.od as any).visual_acuity_corrected || "",
          distance_bcva: (prevData.od as any).distance_bcva || "",
          near_bcva: (prevData.od as any).near_bcva || "",
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
          visual_acuity_uncorrected: (prevData.os as any).visual_acuity_uncorrected || "",
          visual_acuity_corrected: (prevData.os as any).visual_acuity_corrected || "",
          distance_bcva: (prevData.os as any).distance_bcva || "",
          near_bcva: (prevData.os as any).near_bcva || "",
          add_power: prevData.os!.add_power,
        },
      }));
    }
    setFormData((prev) => ({
      ...prev,
      pupillary_distance: (prevData as any).pupillary_distance || prev.pupillary_distance,
    }));
    toast.success("Copied previous refraction data");
  };

  // Reset form
  const handleReset = () => {
    setFormData(initialFormData);
    setErrors({});
    setEditingODId(null);
    setEditingOSId(null);
  };

  // Detect existing visit records and prefill when visit changes or when starting to add/edit
  const visitSource = (visitRefractions && visitRefractions.length > 0) ? visitRefractions : (refractionRecords as any[]);
  const visitCombined = useMemo(() => {
    const rec = (visitSource as any[]).find((r: any) => r.visit_id === visitId && (r.od && r.os || "od_sphere" in r || "os_sphere" in r));
    return rec ? normalizeCombined(rec) : undefined;
  }, [visitSource, visitId]) as any | undefined;
  const visitOD = useMemo(
    () => (visitSource as any[]).find((r: any) => r.visit_id === visitId && r.eye === "OD"),
    [visitSource, visitId]
  ) as any | undefined;
  const visitOS = useMemo(
    () => (visitSource as any[]).find((r: any) => r.visit_id === visitId && r.eye === "OS"),
    [visitSource, visitId]
  ) as any | undefined;
  const hasExistingForVisit = !!visitCombined || !!visitOD || !!visitOS;

  const displayCombined = visitCombined || latestCombined;
  const latestOD: any = latestPerEyeOD || (displayCombined ? { ...displayCombined.od, recorded_at: displayCombined.recorded_at } : undefined);
  const latestOS: any = latestPerEyeOS || (displayCombined ? { ...displayCombined.os, recorded_at: displayCombined.recorded_at } : undefined);

  useEffect(() => {
    if (!visitId) {
      handleReset();
      return;
    }

    if (visitCombined || visitOD || visitOS) {
      setFormData({
        od: {
          sphere: visitCombined?.od?.sphere ?? visitOD?.sphere ?? null,
          cylinder: visitCombined?.od?.cylinder ?? visitOD?.cylinder ?? null,
          axis: visitCombined?.od?.axis ?? visitOD?.axis ?? null,
          visual_acuity_uncorrected: visitCombined?.od?.visual_acuity_uncorrected ?? visitOD?.visual_acuity_uncorrected ?? "",
          visual_acuity_corrected: visitCombined?.od?.visual_acuity_corrected ?? visitOD?.visual_acuity_corrected ?? "",
          distance_bcva: visitCombined?.od?.distance_bcva ?? visitOD?.distance_bcva ?? "",
          near_bcva: visitCombined?.od?.near_bcva ?? visitOD?.near_bcva ?? "",
          add_power: visitCombined?.od?.add_power ?? visitOD?.add_power ?? null,
        },
        os: {
          sphere: visitCombined?.os?.sphere ?? visitOS?.sphere ?? null,
          cylinder: visitCombined?.os?.cylinder ?? visitOS?.cylinder ?? null,
          axis: visitCombined?.os?.axis ?? visitOS?.axis ?? null,
          visual_acuity_uncorrected: visitCombined?.os?.visual_acuity_uncorrected ?? visitOS?.visual_acuity_uncorrected ?? "",
          visual_acuity_corrected: visitCombined?.os?.visual_acuity_corrected ?? visitOS?.visual_acuity_corrected ?? "",
          distance_bcva: visitCombined?.os?.distance_bcva ?? visitOS?.distance_bcva ?? "",
          near_bcva: visitCombined?.os?.near_bcva ?? visitOS?.near_bcva ?? "",
          add_power: visitCombined?.os?.add_power ?? visitOS?.add_power ?? null,
        },
        pupillary_distance: visitCombined?.pupillary_distance ?? visitOD?.pupillary_distance ?? visitOS?.pupillary_distance ?? null,
        notes: visitCombined?.notes ?? visitOD?.notes ?? visitOS?.notes ?? "",
      });
      setEditingODId(visitOD?.id || null);
      setEditingOSId(visitOS?.id || null);
    } else {
      // No existing records for this visit
      setFormData(initialFormData);
      setEditingODId(null);
      setEditingOSId(null);
    }
  }, [visitId, visitOD, visitOS, visitCombined]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // All fields are now optional - no validation required
    // Axis is only relevant if cylinder is specified, but not required

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!visitId) {
      toast.error("No active visit found. Please select/start a visit before saving refraction.");
      return;
    }
    // Validate form (currently always returns true since all fields are optional)
    validateForm();

    setIsSubmitting(true);

    try {
      if (visitCombined) {
        await dispatch(
          updateRefractionCombinedRecord({
            id: visitCombined.id,
            data: {
              patient_id: patientId,
              optometrist_id: optometristId,
              visit_id: visitId,
              od: {
                sphere: formData.od.sphere,
                cylinder: formData.od.cylinder,
                axis: formData.od.axis,
                visual_acuity_uncorrected: formData.od.visual_acuity_uncorrected,
                visual_acuity_corrected: formData.od.visual_acuity_corrected,
                distance_bcva: formData.od.distance_bcva,
                near_bcva: formData.od.near_bcva,
                add_power: formData.od.add_power,
              },
              os: {
                sphere: formData.os.sphere,
                cylinder: formData.os.cylinder,
                axis: formData.os.axis,
                visual_acuity_uncorrected: formData.os.visual_acuity_uncorrected,
                visual_acuity_corrected: formData.os.visual_acuity_corrected,
                distance_bcva: formData.os.distance_bcva,
                near_bcva: formData.os.near_bcva,
                add_power: formData.os.add_power,
              },
              pupillary_distance: formData.pupillary_distance,
              notes: formData.notes || null,
              recorded_at: new Date().toISOString(),
            },
          })
        ).unwrap();
      } else if (editingODId || editingOSId) {
        if (editingODId) {
          await dispatch(
            updateRefractionRecord({
              id: editingODId,
              data: {
                sphere: formData.od.sphere ?? undefined,
                cylinder: formData.od.cylinder ?? undefined,
                axis: formData.od.axis ?? undefined,
                visual_acuity_uncorrected: formData.od.visual_acuity_uncorrected,
                visual_acuity_corrected: formData.od.visual_acuity_corrected,
                distance_bcva: formData.od.distance_bcva,
                near_bcva: formData.od.near_bcva,
                add_power: formData.od.add_power ?? undefined,
                pupillary_distance: formData.pupillary_distance ?? undefined,
                notes: formData.notes || null,
              },
            })
          ).unwrap();
        }
        if (editingOSId) {
          await dispatch(
            updateRefractionRecord({
              id: editingOSId,
              data: {
                sphere: formData.os.sphere ?? undefined,
                cylinder: formData.os.cylinder ?? undefined,
                axis: formData.os.axis ?? undefined,
                visual_acuity_uncorrected: formData.os.visual_acuity_uncorrected,
                visual_acuity_corrected: formData.os.visual_acuity_corrected,
                distance_bcva: formData.os.distance_bcva,
                near_bcva: formData.os.near_bcva,
                add_power: formData.os.add_power ?? undefined,
                pupillary_distance: formData.pupillary_distance ?? undefined,
                notes: formData.notes || null,
              },
            })
          ).unwrap();
        }
      } else {
        await dispatch(
          addRefractionRecord({
            data: {
              patient_id: patientId,
              optometrist_id: optometristId,
              visit_id: visitId,
              od: {
                sphere: formData.od.sphere,
                cylinder: formData.od.cylinder,
                axis: formData.od.axis,
                visual_acuity_uncorrected: formData.od.visual_acuity_uncorrected,
                visual_acuity_corrected: formData.od.visual_acuity_corrected,
                distance_bcva: formData.od.distance_bcva,
                near_bcva: formData.od.near_bcva,
                add_power: formData.od.add_power,
              },
              os: {
                sphere: formData.os.sphere,
                cylinder: formData.os.cylinder,
                axis: formData.os.axis,
                visual_acuity_uncorrected: formData.os.visual_acuity_uncorrected,
                visual_acuity_corrected: formData.os.visual_acuity_corrected,
                distance_bcva: formData.os.distance_bcva,
                near_bcva: formData.os.near_bcva,
                add_power: formData.os.add_power,
              },
              pupillary_distance: formData.pupillary_distance,
              notes: formData.notes || null,
              recorded_at: new Date().toISOString(),
            },
          })
        ).unwrap();
      }

      toast.success("Refraction saved");
      setIsAdding(false);
      handleReset();
      onRefresh();
      try {
        const res = await refractionApi.list({ visit_id: visitId });
        setVisitRefractions(res.items || []);
      } catch (e) { }
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to save refraction data",
        logError: true,
      });
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
        <div className="flex items-center gap-2">
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-teal-600 transition"
            >
              <Plus className="h-4 w-4" />
              {hasExistingForVisit ? "Edit Refraction" : "Add Refraction"}
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

      {/* Current Visit Refraction Display - Only show when there's data for THIS visit */}
      {!isAdding && hasExistingForVisit && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="mb-4 text-base font-semibold text-slate-900">
            This Visit&apos;s Refraction
            {visitCombined?.pupillary_distance && (
              <span className="ml-4 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                PD: {visitCombined.pupillary_distance} mm
              </span>
            )}
          </h4>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* OD Display */}
            <div
              className={clsx(
                "rounded-lg border-2 p-4",
                (visitCombined?.od || visitOD)
                  ? "border-blue-200 bg-blue-50"
                  : "border-dashed border-slate-200 bg-slate-50"
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <h5 className="font-semibold text-blue-900">OD (Right Eye)</h5>
              </div>
              {(visitCombined?.od || visitOD) ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-slate-500">SPH</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(visitCombined?.od?.sphere ?? visitOD?.sphere, "sphere")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">CYL</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(visitCombined?.od?.cylinder ?? visitOD?.cylinder, "cylinder")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">AXIS</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(visitCombined?.od?.axis ?? visitOD?.axis, "axis")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">ADD</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(visitCombined?.od?.add_power ?? visitOD?.add_power, "add")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-blue-200 pt-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Dist. BCVA</p>
                      <p className="text-sm font-bold text-slate-700">
                        {visitCombined?.od?.distance_bcva ?? visitOD?.distance_bcva ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Near BCVA</p>
                      <p className="text-sm font-bold text-slate-700">
                        {visitCombined?.od?.near_bcva ?? visitOD?.near_bcva ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-blue-200 pt-2">
                    <span className="text-xs text-slate-500">
                      {new Date(visitCombined?.recorded_at ?? visitOD?.recorded_at).toLocaleDateString()}
                    </span>
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
                (visitCombined?.os || visitOS)
                  ? "border-green-200 bg-green-50"
                  : "border-dashed border-slate-200 bg-slate-50"
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <h5 className="font-semibold text-green-900">OS (Left Eye)</h5>
              </div>
              {(visitCombined?.os || visitOS) ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-slate-500">SPH</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(visitCombined?.os?.sphere ?? visitOS?.sphere, "sphere")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">CYL</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(visitCombined?.os?.cylinder ?? visitOS?.cylinder, "cylinder")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">AXIS</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(visitCombined?.os?.axis ?? visitOS?.axis, "axis")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">ADD</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatValue(visitCombined?.os?.add_power ?? visitOS?.add_power, "add")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-green-200 pt-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Dist. BCVA</p>
                      <p className="text-sm font-bold text-slate-700">
                        {visitCombined?.os?.distance_bcva ?? visitOS?.distance_bcva ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Near BCVA</p>
                      <p className="text-sm font-bold text-slate-700">
                        {visitCombined?.os?.near_bcva ?? visitOS?.near_bcva ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-green-200 pt-2">
                    <span className="text-xs text-slate-500">
                      {new Date(visitCombined?.recorded_at ?? visitOS?.recorded_at).toLocaleDateString()}
                    </span>
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

      {/* Refraction History - Last 5 Visits */}
      {!isAdding && (
        <RefractionHistorySection
          patientId={patientId}
          currentVisitId={visitId}
        />
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
              min={settings.sphere.min}
              max={settings.sphere.max}
              unit="D"
              presets={spherePresets}
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
              min={settings.cylinder.min}
              max={settings.cylinder.max}

              unit="D"
              presets={cylinderPresets}
            />

            {/* Axis */}
            <EyeValueInput
              label="Axis"
              odValue={formData.od.axis}
              osValue={formData.os.axis}
              onODChange={(v) => updateField("od", "axis", v)}
              onOSChange={(v) => updateField("os", "axis", v)}
              step={1}
              min={settings.axis.min}
              max={settings.axis.max}
              unit="°"
              presets={axisPresets}
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
              min={settings.add_power.min}
              max={settings.add_power.max}

              unit="D"
              presets={addPowerPresets}
            />

            {/* Distance BCVA */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-900">
                Distance BCVA (Best Corrected)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <VASelector
                  value={formData.od.distance_bcva || null}
                  onChange={(v) => updateField("od", "distance_bcva", v)}
                  colorScheme="blue"
                  placeholder="OD BCVA"
                />
                <VASelector
                  value={formData.os.distance_bcva || null}
                  onChange={(v) => updateField("os", "distance_bcva", v)}
                  colorScheme="green"
                  placeholder="OS BCVA"
                />
              </div>
            </div>

            {/* Near BCVA */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-900">
                Near BCVA (Best Corrected Near)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-blue-700">OD (Right)</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {NEAR_VA_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const newValue = formData.od.near_bcva === opt ? "" : opt;
                          updateField("od", "near_bcva", newValue);
                        }}
                        className={clsx(
                          "rounded-md border px-2 py-1 text-xs font-medium transition",
                          formData.od.near_bcva === opt
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border border-green-200 bg-green-50/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold text-green-700">OS (Left)</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {NEAR_VA_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const newValue = formData.os.near_bcva === opt ? "" : opt;
                          updateField("os", "near_bcva", newValue);
                        }}
                        className={clsx(
                          "rounded-md border px-2 py-1 text-xs font-medium transition",
                          formData.os.near_bcva === opt
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pupillary Distance */}
            <div className="border-t border-slate-200 pt-6">
              <NumericStepper
                label="Pupillary Distance (PD)"
                value={formData.pupillary_distance === null ? null : toNumberOrNull(formData.pupillary_distance)}
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
            Click &quot;Add Refraction&quot; to enter subjective refraction values for
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
          from previous visit for returning patients. The &quot;Same as OD&quot; button
          copies values when both eyes are similar. Use +/- buttons or type
          directly for precise values.
        </p>
      </div>
      <RefractionSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentSettings={settings}
        onSave={updateSettings}
      />
    </div>
  );
}
