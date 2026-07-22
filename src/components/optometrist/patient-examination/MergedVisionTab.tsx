"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { toast } from "sonner";
import clsx from "clsx";
import { Save, Copy, RotateCcw, Import, FileClock } from "lucide-react";
import { saveExamination } from "@/redux/optometryDataSlice";
import { handleError, getFieldErrors } from "@/utils/errorHandler";
import type {
  VisionRecord,
  ARDataRecord,
  RefractionRecord,
  CurrentSpecsRecord,
} from "@/types";

interface MergedVisionTabProps {
  patientId: string;
  visitId: string;
  optometristId: string;
  visionRecords: VisionRecord[];
  arDataRecords: ARDataRecord[];
  refractionRecords: RefractionRecord[];
  currentSpecsRecords: CurrentSpecsRecord[];
  loading: {
    vision: boolean;
    arData: boolean;
    refraction: boolean;
    currentSpecs: boolean;
  };
  onRefresh: () => void;
}

interface CombinedFormState {
  // Vision
  od_ucva_distance: string;
  od_ph_va: string;
  od_va_with_current_specs: string;
  od_near_ucva: string;
  od_near_with_current_specs: string;
  os_ucva_distance: string;
  os_ph_va: string;
  os_va_with_current_specs: string;
  os_near_ucva: string;
  os_near_with_current_specs: string;
  vision_notes: string;

  // Current Specs (POG)
  od_sph: string;
  od_cyl: string;
  od_axis: string;
  od_add: string;
  os_sph: string;
  os_cyl: string;
  os_axis: string;
  os_add: string;
  specs_lens_type: string;
  specs_usage: string;
  specs_measured_by: string;
  specs_is_comfortable: string; // "true" | "false" | ""
  specs_remarks: string;

  // DRY AR
  od_ar_sphere: string;
  od_ar_cylinder: string;
  od_ar_axis: string;
  os_ar_sphere: string;
  os_ar_cylinder: string;
  os_ar_axis: string;
  ar_pd: string;
  ar_notes: string;

  // WET AR
  od_wet_sphere: string;
  od_wet_cylinder: string;
  od_wet_axis: string;
  os_wet_sphere: string;
  os_wet_cylinder: string;
  os_wet_axis: string;

  // UnDilated Refraction
  od_ref_sphere: string;
  od_ref_cylinder: string;
  od_ref_axis: string;
  od_ref_add_power: string;
  od_ref_visual_acuity_uncorrected: string;
  od_ref_visual_acuity_corrected: string;
  od_ref_distance_bcva: string;
  od_ref_near_bcva: string;
  od_ref_prism: string;
  os_ref_sphere: string;
  os_ref_cylinder: string;
  os_ref_axis: string;
  os_ref_add_power: string;
  os_ref_visual_acuity_uncorrected: string;
  os_ref_visual_acuity_corrected: string;
  os_ref_distance_bcva: string;
  os_ref_near_bcva: string;
  os_ref_prism: string;
  ref_pd: string;
  ref_notes: string;

  // Dilated Acceptance
  od_dilated_sphere: string;
  od_dilated_cylinder: string;
  od_dilated_axis: string;
  od_dilated_visual_acuity: string;
  od_dilated_pinhole: string;
  os_dilated_sphere: string;
  os_dilated_cylinder: string;
  os_dilated_axis: string;
  os_dilated_visual_acuity: string;
  os_dilated_pinhole: string;
}

const initialFormState: CombinedFormState = {
  od_ucva_distance: "",
  od_ph_va: "",
  od_va_with_current_specs: "",
  od_near_ucva: "",
  od_near_with_current_specs: "",
  os_ucva_distance: "",
  os_ph_va: "",
  os_va_with_current_specs: "",
  os_near_ucva: "",
  os_near_with_current_specs: "",
  vision_notes: "",

  od_sph: "",
  od_cyl: "",
  od_axis: "",
  od_add: "",
  os_sph: "",
  os_cyl: "",
  os_axis: "",
  os_add: "",
  specs_lens_type: "SINGLE",
  specs_usage: "BOTH",
  specs_measured_by: "LENSOMETER",
  specs_is_comfortable: "true",
  specs_remarks: "",

  od_ar_sphere: "",
  od_ar_cylinder: "",
  od_ar_axis: "",
  os_ar_sphere: "",
  os_ar_cylinder: "",
  os_ar_axis: "",
  ar_pd: "",
  ar_notes: "",

  od_wet_sphere: "",
  od_wet_cylinder: "",
  od_wet_axis: "",
  os_wet_sphere: "",
  os_wet_cylinder: "",
  os_wet_axis: "",

  od_ref_sphere: "",
  od_ref_cylinder: "",
  od_ref_axis: "",
  od_ref_add_power: "",
  od_ref_visual_acuity_uncorrected: "",
  od_ref_visual_acuity_corrected: "",
  od_ref_distance_bcva: "",
  od_ref_near_bcva: "",
  od_ref_prism: "",
  os_ref_sphere: "",
  os_ref_cylinder: "",
  os_ref_axis: "",
  os_ref_add_power: "",
  os_ref_visual_acuity_uncorrected: "",
  os_ref_visual_acuity_corrected: "",
  os_ref_distance_bcva: "",
  os_ref_near_bcva: "",
  os_ref_prism: "",
  ref_pd: "",
  ref_notes: "",

  od_dilated_sphere: "",
  od_dilated_cylinder: "",
  od_dilated_axis: "",
  od_dilated_visual_acuity: "",
  od_dilated_pinhole: "",
  os_dilated_sphere: "",
  os_dilated_cylinder: "",
  os_dilated_axis: "",
  os_dilated_visual_acuity: "",
  os_dilated_pinhole: "",
};

const DIST_VA_OPTIONS = ["6/6", "6/5", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60", "5/60", "4/60", "3/60", "2/60", "1/60", "CF 6m", "CF 5m", "CF 4m", "CF 3m", "CF 2m", "CF 1m", "CF", "HM", "PL", "NPL"];
const NEAR_VA_OPTIONS = ["N5", "N6", "N8", "N10", "N12", "N14", "N18", "N24", "N36", "N48"];
const PRISM_OPTIONS = ["", "0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0"];

export function MergedVisionTab({
  patientId,
  visitId,
  optometristId,
  visionRecords,
  arDataRecords,
  refractionRecords,
  currentSpecsRecords,
  loading,
  onRefresh,
}: MergedVisionTabProps) {
  const dispatch = useAppDispatch();
  const [formState, setFormState] = useState<CombinedFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mapLocToFormKey = (loc: (string | number)[]): string | null => {
    const path = loc.filter((x): x is string => x !== "body" && typeof x === "string");
    if (path.length === 0) return null;

    const [section, ...rest] = path;

    if (section === "vision") {
      if (rest[0] === "notes") return "vision_notes";
      return rest[0] || null;
    }

    if (section === "current_specs") {
      if (rest.length === 2 && (rest[0] === "od" || rest[0] === "os")) {
        return `${rest[0]}_${rest[1]}`;
      }
      if (rest[0] === "remarks") return "specs_remarks";
      if (rest[0] === "lens_type") return "specs_lens_type";
      if (rest[0] === "usage") return "specs_usage";
      if (rest[0] === "measured_by") return "specs_measured_by";
      if (rest[0] === "is_comfortable") return "specs_is_comfortable";
      return rest[0] || null;
    }

    if (section === "ar_data") {
      if (rest[0] === "pupillary_distance") return "ar_pd";
      if (rest[0] === "notes") return "ar_notes";
      if (typeof rest[0] === "string") {
        const fieldName = rest[0];
        if (fieldName.includes("_wet_")) return fieldName;
        if (fieldName.startsWith("od_")) return fieldName.replace("od_", "od_ar_");
        if (fieldName.startsWith("os_")) return fieldName.replace("os_", "os_ar_");
      }
      return rest[0] || null;
    }

    if (section === "refraction") {
      if (rest.length === 2 && (rest[0] === "od" || rest[0] === "os")) {
        return `${rest[0]}_ref_${rest[1]}`;
      }
      if (rest[0] === "pupillary_distance") return "ref_pd";
      if (rest[0] === "notes") return "ref_notes";
      if (rest[0] === "od_prism" || rest[0] === "os_prism") {
        return rest[0].replace("prism", "ref_prism");
      }
      return rest[0] || null;
    }

    return path.join("_");
  };

  const getFieldError = (key: keyof CombinedFormState) => {
    if (errors[key]) {
      return "border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20 text-red-900";
    }
    return "";
  };

  // Find active records for this visit
  const visitVision = useMemo(() => visionRecords.find((r) => r.visit_id === visitId), [visionRecords, visitId]);
  const visitSpecs = useMemo(() => currentSpecsRecords.find((r) => r.visit_id === visitId), [currentSpecsRecords, visitId]);
  
  const visitAR = useMemo(() => {
    return arDataRecords.find((r: any) => r?.visit_id === visitId && ("od_sphere" in r || "os_sphere" in r)) as any | undefined;
  }, [arDataRecords, visitId]);

  const visitRef = useMemo(() => {
    return refractionRecords.find(
      (r: any) => r?.visit_id === visitId && (r.od && r.os || "od_sphere" in r || "os_sphere" in r)
    ) as any | undefined;
  }, [refractionRecords, visitId]);

  // Load active visit records into form state on mount or when data changes
  useEffect(() => {
    if (!visitId) return;

    const formatDiopterVal = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined || val === "") return "";
      const str = String(val).trim();
      if (str === "") return "";
      const num = parseFloat(str);
      if (isNaN(num)) return str;
      if (num > 0 && !str.startsWith("+")) {
        return `+${str}`;
      }
      return str;
    };

    const newFormState = { ...initialFormState };

    // 1. Load Vision
    if (visitVision) {
      newFormState.od_ucva_distance = visitVision.od_ucva_distance ?? "";
      newFormState.od_ph_va = visitVision.od_ph_va ?? "";
      newFormState.od_va_with_current_specs = visitVision.od_va_with_current_specs ?? "";
      newFormState.od_near_ucva = visitVision.od_near_ucva ?? "";
      newFormState.od_near_with_current_specs = visitVision.od_near_with_current_specs ?? "";
      newFormState.os_ucva_distance = visitVision.os_ucva_distance ?? "";
      newFormState.os_ph_va = visitVision.os_ph_va ?? "";
      newFormState.os_va_with_current_specs = visitVision.os_va_with_current_specs ?? "";
      newFormState.os_near_ucva = visitVision.os_near_ucva ?? "";
      newFormState.os_near_with_current_specs = visitVision.os_near_with_current_specs ?? "";
      newFormState.vision_notes = visitVision.notes ?? "";
    }

    // 2. Load Specs (POG)
    if (visitSpecs) {
      newFormState.od_sph = formatDiopterVal(visitSpecs.od_sph);
      newFormState.od_cyl = formatDiopterVal(visitSpecs.od_cyl);
      newFormState.od_axis = visitSpecs.od_axis != null ? visitSpecs.od_axis.toString() : "";
      newFormState.od_add = formatDiopterVal(visitSpecs.od_add);
      newFormState.os_sph = formatDiopterVal(visitSpecs.os_sph);
      newFormState.os_cyl = formatDiopterVal(visitSpecs.os_cyl);
      newFormState.os_axis = visitSpecs.os_axis != null ? visitSpecs.os_axis.toString() : "";
      newFormState.os_add = formatDiopterVal(visitSpecs.os_add);
      newFormState.specs_lens_type = visitSpecs.lens_type ?? "SINGLE";
      newFormState.specs_usage = visitSpecs.usage ?? "BOTH";
      newFormState.specs_measured_by = visitSpecs.measured_by ?? "LENSOMETER";
      newFormState.specs_is_comfortable = visitSpecs.is_comfortable === true ? "true" : visitSpecs.is_comfortable === false ? "false" : "";
      newFormState.specs_remarks = visitSpecs.remarks ?? "";
    }

    // 3. Load AR (DRY & WET)
    if (visitAR) {
      newFormState.od_ar_sphere = formatDiopterVal(visitAR.od_sphere);
      newFormState.od_ar_cylinder = formatDiopterVal(visitAR.od_cylinder);
      newFormState.od_ar_axis = visitAR.od_axis !== null && visitAR.od_axis !== undefined ? visitAR.od_axis.toString() : "";
      newFormState.os_ar_sphere = formatDiopterVal(visitAR.os_sphere);
      newFormState.os_ar_cylinder = formatDiopterVal(visitAR.os_cylinder);
      newFormState.os_ar_axis = visitAR.os_axis !== null && visitAR.os_axis !== undefined ? visitAR.os_axis.toString() : "";
      newFormState.ar_pd = visitAR.pupillary_distance !== null && visitAR.pupillary_distance !== undefined ? visitAR.pupillary_distance.toString() : "";
      newFormState.ar_notes = visitAR.notes ?? "";

      // Load WET AR from columns
      newFormState.od_wet_sphere = formatDiopterVal(visitAR.od_wet_sphere);
      newFormState.od_wet_cylinder = formatDiopterVal(visitAR.od_wet_cylinder);
      newFormState.od_wet_axis = visitAR.od_wet_axis !== null && visitAR.od_wet_axis !== undefined ? visitAR.od_wet_axis.toString() : "";
      newFormState.os_wet_sphere = formatDiopterVal(visitAR.os_wet_sphere);
      newFormState.os_wet_cylinder = formatDiopterVal(visitAR.os_wet_cylinder);
      newFormState.os_wet_axis = visitAR.os_wet_axis !== null && visitAR.os_wet_axis !== undefined ? visitAR.os_wet_axis.toString() : "";
    }

    // 4. Load Refraction (UnDilated & Dilated)
    if (visitRef) {
      const getRefVal = (eye: "od" | "os", fieldName: string, flatName: string) => {
        const eyeObj = visitRef[eye];
        if (eyeObj && eyeObj[fieldName] !== undefined && eyeObj[fieldName] !== null) {
          return formatDiopterVal(eyeObj[fieldName]);
        }
        if (visitRef[flatName] !== undefined && visitRef[flatName] !== null) {
          return formatDiopterVal(visitRef[flatName]);
        }
        return "";
      };

      const getRefStr = (eye: "od" | "os", fieldName: string, flatName: string) => {
        const eyeObj = visitRef[eye];
        if (eyeObj && eyeObj[fieldName] !== undefined && eyeObj[fieldName] !== null) {
          return eyeObj[fieldName];
        }
        if (visitRef[flatName] !== undefined && visitRef[flatName] !== null) {
          return visitRef[flatName];
        }
        return "";
      };

      newFormState.od_ref_sphere = getRefVal("od", "sphere", "od_sphere");
      newFormState.od_ref_cylinder = getRefVal("od", "cylinder", "od_cylinder");
      newFormState.od_ref_axis = visitRef.od?.axis != null ? visitRef.od.axis.toString() : visitRef.od_axis != null ? visitRef.od_axis.toString() : "";
      newFormState.od_ref_add_power = getRefVal("od", "add_power", "od_add_power");
      newFormState.od_ref_visual_acuity_uncorrected = getRefStr("od", "visual_acuity_uncorrected", "od_visual_acuity_uncorrected");
      newFormState.od_ref_visual_acuity_corrected = getRefStr("od", "visual_acuity_corrected", "od_visual_acuity_corrected");
      newFormState.od_ref_distance_bcva = getRefStr("od", "distance_bcva", "od_distance_bcva");
      newFormState.od_ref_near_bcva = getRefStr("od", "near_bcva", "od_near_bcva");
      newFormState.ref_pd = visitRef.pupillary_distance !== null && visitRef.pupillary_distance !== undefined ? visitRef.pupillary_distance.toString() : "";
      newFormState.ref_notes = visitRef.notes ?? "";

      // Load new fields
      newFormState.od_ref_prism = visitRef.od_prism ?? "";
      newFormState.os_ref_prism = visitRef.os_prism ?? "";
      newFormState.os_ref_sphere = getRefVal("os", "sphere", "os_sphere");
      newFormState.os_ref_cylinder = getRefVal("os", "cylinder", "os_cylinder");
      newFormState.os_ref_axis = visitRef.os?.axis != null ? visitRef.os.axis.toString() : visitRef.os_axis != null ? visitRef.os_axis.toString() : "";
      newFormState.os_ref_add_power = getRefVal("os", "add_power", "os_add_power");
      newFormState.os_ref_visual_acuity_uncorrected = getRefStr("os", "visual_acuity_uncorrected", "os_visual_acuity_uncorrected");
      newFormState.os_ref_visual_acuity_corrected = getRefStr("os", "visual_acuity_corrected", "os_visual_acuity_corrected");
      newFormState.os_ref_distance_bcva = getRefStr("os", "distance_bcva", "os_distance_bcva");
      newFormState.os_ref_near_bcva = getRefStr("os", "near_bcva", "os_near_bcva");

      newFormState.od_dilated_sphere = formatDiopterVal(visitRef.od_dilated_sphere);
      newFormState.od_dilated_cylinder = formatDiopterVal(visitRef.od_dilated_cylinder);
      newFormState.od_dilated_axis = visitRef.od_dilated_axis !== null && visitRef.od_dilated_axis !== undefined ? visitRef.od_dilated_axis.toString() : "";
      newFormState.od_dilated_visual_acuity = visitRef.od_dilated_visual_acuity ?? "";
      newFormState.od_dilated_pinhole = visitRef.od_dilated_pinhole ?? "";
      newFormState.os_dilated_sphere = formatDiopterVal(visitRef.os_dilated_sphere);
      newFormState.os_dilated_cylinder = formatDiopterVal(visitRef.os_dilated_cylinder);
      newFormState.os_dilated_axis = visitRef.os_dilated_axis !== null && visitRef.os_dilated_axis !== undefined ? visitRef.os_dilated_axis.toString() : "";
      newFormState.os_dilated_visual_acuity = visitRef.os_dilated_visual_acuity ?? "";
      newFormState.os_dilated_pinhole = visitRef.os_dilated_pinhole ?? "";
    }

    setFormState(newFormState);
    setErrors({});
  }, [visitId, visitVision, visitSpecs, visitAR, visitRef]);

  // Handle single field update
  const updateField = (key: keyof CombinedFormState, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  };

  const handleInputBlur = (key: keyof CombinedFormState, type: string) => {
    if (type === "sphere" || type === "cylinder" || type === "add_power") {
      const val = formState[key] as string;
      if (val !== "" && val !== "-" && val !== "+") {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          const formatted = num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
          updateField(key, formatted);
        }
      }
    }
  };

  // --- Macro copy operations ---

  const handleCopySectionODtoOS = (section: "vision" | "ar" | "wet_ar" | "specs" | "ref" | "dilated") => {
    setFormState((prev) => {
      const updated = { ...prev };
      if (section === "vision") {
        updated.os_ucva_distance = prev.od_ucva_distance;
        updated.os_ph_va = prev.od_ph_va;
        updated.os_va_with_current_specs = prev.od_va_with_current_specs;
        updated.os_near_ucva = prev.od_near_ucva;
        updated.os_near_with_current_specs = prev.od_near_with_current_specs;
      } else if (section === "ar") {
        updated.os_ar_sphere = prev.od_ar_sphere;
        updated.os_ar_cylinder = prev.od_ar_cylinder;
        updated.os_ar_axis = prev.od_ar_axis;
      } else if (section === "wet_ar") {
        updated.os_wet_sphere = prev.od_wet_sphere;
        updated.os_wet_cylinder = prev.od_wet_cylinder;
        updated.os_wet_axis = prev.od_wet_axis;
      } else if (section === "specs") {
        updated.os_sph = prev.od_sph;
        updated.os_cyl = prev.od_cyl;
        updated.os_axis = prev.od_axis;
        updated.os_add = prev.od_add;
      } else if (section === "ref") {
        updated.os_ref_sphere = prev.od_ref_sphere;
        updated.os_ref_cylinder = prev.od_ref_cylinder;
        updated.os_ref_axis = prev.od_ref_axis;
        updated.os_ref_add_power = prev.od_ref_add_power;
        updated.os_ref_distance_bcva = prev.od_ref_distance_bcva;
        updated.os_ref_near_bcva = prev.od_ref_near_bcva;
        updated.os_ref_prism = prev.od_ref_prism;
      } else if (section === "dilated") {
        updated.os_dilated_sphere = prev.od_dilated_sphere;
        updated.os_dilated_cylinder = prev.od_dilated_cylinder;
        updated.os_dilated_axis = prev.od_dilated_axis;
        updated.os_dilated_visual_acuity = prev.od_dilated_visual_acuity;
        updated.os_dilated_pinhole = prev.od_dilated_pinhole;
      }
      return updated;
    });
    toast.success(`Copied Right Eye (OD) to Left Eye (OS) for the entire ${section.toUpperCase()} section`);
  };

  const handleCopyARtoRefraction = () => {
    setFormState((prev) => ({
      ...prev,
      od_ref_sphere: prev.od_ar_sphere,
      od_ref_cylinder: prev.od_ar_cylinder,
      od_ref_axis: prev.od_ar_axis,
      os_ref_sphere: prev.os_ar_sphere,
      os_ref_cylinder: prev.os_ar_cylinder,
      os_ref_axis: prev.os_ar_axis,
      ref_pd: prev.ar_pd || prev.ref_pd,
    }));
    toast.success("Copied DRY AR measurements to Subjective Refraction");
  };

  const handleCopySpecsToRefraction = () => {
    setFormState((prev) => ({
      ...prev,
      od_ref_sphere: prev.od_sph,
      od_ref_cylinder: prev.od_cyl,
      od_ref_axis: prev.od_axis,
      od_ref_add_power: prev.od_add,
      os_ref_sphere: prev.os_sph,
      os_ref_cylinder: prev.os_cyl,
      os_ref_axis: prev.os_axis,
      os_ref_add_power: prev.os_add,
    }));
    toast.success("Copied Presenting Specs (POG) to Subjective Refraction");
  };

  const handleCopyUnDilatedToDilated = () => {
    setFormState((prev) => ({
      ...prev,
      od_dilated_sphere: prev.od_ref_sphere,
      od_dilated_cylinder: prev.od_ref_cylinder,
      od_dilated_axis: prev.od_ref_axis,
      od_dilated_visual_acuity: prev.od_ref_distance_bcva,
      os_dilated_sphere: prev.os_ref_sphere,
      os_dilated_cylinder: prev.os_ref_cylinder,
      os_dilated_axis: prev.os_ref_axis,
      os_dilated_visual_acuity: prev.os_ref_distance_bcva,
    }));
    toast.success("Copied UnDilated subjective measurements to Dilated Acceptance");
  };

  // Load Previous Visit Records
  const handleCopyPreviousVisit = () => {
    const prevVision = [...visionRecords]
      .filter((r) => r.visit_id !== visitId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
    const prevSpecs = [...currentSpecsRecords]
      .filter((r) => r.visit_id !== visitId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    const prevAR = [...arDataRecords]
      .filter((r: any) => r.visit_id !== visitId && ("od_sphere" in r || "os_sphere" in r))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] as any;

    const prevRef = [...refractionRecords]
      .filter((r: any) => r.visit_id !== visitId && ("od_sphere" in r || "os_sphere" in r))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] as any;

    if (!prevVision && !prevSpecs && !prevAR && !prevRef) {
      toast.error("No previous examination records found for this patient.");
      return;
    }

    setFormState((prev) => {
      const merged = { ...prev };
      
      if (prevVision) {
        merged.od_ucva_distance = prevVision.od_ucva_distance ?? "";
        merged.od_ph_va = prevVision.od_ph_va ?? "";
        merged.od_va_with_current_specs = prevVision.od_va_with_current_specs ?? "";
        merged.od_near_ucva = prevVision.od_near_ucva ?? "";
        merged.od_near_with_current_specs = prevVision.od_near_with_current_specs ?? "";
        merged.os_ucva_distance = prevVision.os_ucva_distance ?? "";
        merged.os_ph_va = prevVision.os_ph_va ?? "";
        merged.os_va_with_current_specs = prevVision.os_va_with_current_specs ?? "";
        merged.os_near_ucva = prevVision.os_near_ucva ?? "";
        merged.os_near_with_current_specs = prevVision.os_near_with_current_specs ?? "";
        merged.vision_notes = prevVision.notes ?? "";
      }

      if (prevSpecs) {
        merged.od_sph = prevSpecs.od_sph != null ? prevSpecs.od_sph.toString() : "";
        merged.od_cyl = prevSpecs.od_cyl != null ? prevSpecs.od_cyl.toString() : "";
        merged.od_axis = prevSpecs.od_axis != null ? prevSpecs.od_axis.toString() : "";
        merged.od_add = prevSpecs.od_add != null ? prevSpecs.od_add.toString() : "";
        merged.os_sph = prevSpecs.os_sph != null ? prevSpecs.os_sph.toString() : "";
        merged.os_cyl = prevSpecs.os_cyl != null ? prevSpecs.os_cyl.toString() : "";
        merged.os_axis = prevSpecs.os_axis != null ? prevSpecs.os_axis.toString() : "";
        merged.os_add = prevSpecs.os_add != null ? prevSpecs.os_add.toString() : "";
        merged.specs_lens_type = prevSpecs.lens_type ?? "SINGLE";
        merged.specs_usage = prevSpecs.usage ?? "BOTH";
        merged.specs_measured_by = prevSpecs.measured_by ?? "LENSOMETER";
        merged.specs_is_comfortable = prevSpecs.is_comfortable === true ? "true" : prevSpecs.is_comfortable === false ? "false" : "";
        merged.specs_remarks = prevSpecs.remarks ?? "";
      }

      if (prevAR) {
        merged.od_ar_sphere = prevAR.od_sphere !== null ? prevAR.od_sphere.toString() : "";
        merged.od_ar_cylinder = prevAR.od_cylinder !== null ? prevAR.od_cylinder.toString() : "";
        merged.od_ar_axis = prevAR.od_axis !== null ? prevAR.od_axis.toString() : "";
        merged.os_ar_sphere = prevAR.os_sphere !== null ? prevAR.os_sphere.toString() : "";
        merged.os_ar_cylinder = prevAR.os_cylinder !== null ? prevAR.os_cylinder.toString() : "";
        merged.os_ar_axis = prevAR.os_axis !== null ? prevAR.os_axis.toString() : "";
        merged.ar_pd = prevAR.pupillary_distance !== null ? prevAR.pupillary_distance.toString() : "";
        merged.ar_notes = prevAR.notes ?? "";

        merged.od_wet_sphere = prevAR.od_wet_sphere !== null && prevAR.od_wet_sphere !== undefined ? prevAR.od_wet_sphere.toString() : "";
        merged.od_wet_cylinder = prevAR.od_wet_cylinder !== null && prevAR.od_wet_cylinder !== undefined ? prevAR.od_wet_cylinder.toString() : "";
        merged.od_wet_axis = prevAR.od_wet_axis !== null && prevAR.od_wet_axis !== undefined ? prevAR.od_wet_axis.toString() : "";
        merged.os_wet_sphere = prevAR.os_wet_sphere !== null && prevAR.os_wet_sphere !== undefined ? prevAR.os_wet_sphere.toString() : "";
        merged.os_wet_cylinder = prevAR.os_wet_cylinder !== null && prevAR.os_wet_cylinder !== undefined ? prevAR.os_wet_cylinder.toString() : "";
        merged.os_wet_axis = prevAR.os_wet_axis !== null && prevAR.os_wet_axis !== undefined ? prevAR.os_wet_axis.toString() : "";
      }

      if (prevRef) {
        merged.od_ref_sphere = prevRef.od?.sphere !== undefined && prevRef.od?.sphere !== null ? prevRef.od.sphere.toString() : "";
        merged.od_ref_cylinder = prevRef.od?.cylinder !== undefined && prevRef.od?.cylinder !== null ? prevRef.od.cylinder.toString() : "";
        merged.od_ref_axis = prevRef.od?.axis !== undefined && prevRef.od?.axis !== null ? prevRef.od.axis.toString() : "";
        merged.od_ref_add_power = prevRef.od?.add_power !== undefined && prevRef.od?.add_power !== null ? prevRef.od.add_power.toString() : "";
        merged.od_ref_visual_acuity_uncorrected = prevRef.od?.visual_acuity_uncorrected ?? "";
        merged.od_ref_visual_acuity_corrected = prevRef.od?.visual_acuity_corrected ?? "";
        merged.od_ref_distance_bcva = prevRef.od?.distance_bcva ?? "";
        merged.od_ref_near_bcva = prevRef.od?.near_bcva ?? "";
        merged.ref_pd = prevRef.pupillary_distance !== null && prevRef.pupillary_distance !== undefined ? prevRef.pupillary_distance.toString() : "";
        merged.ref_notes = prevRef.notes ?? "";

        merged.od_ref_prism = prevRef.od_prism ?? "";
        merged.os_ref_prism = prevRef.os_prism ?? "";
        merged.os_ref_sphere = prevRef.os?.sphere !== undefined && prevRef.os?.sphere !== null ? prevRef.os.sphere.toString() : "";
        merged.os_ref_cylinder = prevRef.os?.cylinder !== undefined && prevRef.os?.cylinder !== null ? prevRef.os.cylinder.toString() : "";
        merged.os_ref_axis = prevRef.os?.axis !== undefined && prevRef.os?.axis !== null ? prevRef.os.axis.toString() : "";
        merged.os_ref_add_power = prevRef.os?.add_power !== undefined && prevRef.os?.add_power !== null ? prevRef.os.add_power.toString() : "";
        merged.os_ref_visual_acuity_uncorrected = prevRef.os?.visual_acuity_uncorrected ?? "";
        merged.os_ref_visual_acuity_corrected = prevRef.os?.visual_acuity_corrected ?? "";
        merged.os_ref_distance_bcva = prevRef.os?.distance_bcva ?? "";
        merged.os_ref_near_bcva = prevRef.os?.near_bcva ?? "";

        merged.od_dilated_sphere = prevRef.od_dilated_sphere !== null && prevRef.od_dilated_sphere !== undefined ? prevRef.od_dilated_sphere.toString() : "";
        merged.od_dilated_cylinder = prevRef.od_dilated_cylinder !== null && prevRef.od_dilated_cylinder !== undefined ? prevRef.od_dilated_cylinder.toString() : "";
        merged.od_dilated_axis = prevRef.od_dilated_axis !== null && prevRef.od_dilated_axis !== undefined ? prevRef.od_dilated_axis.toString() : "";
        merged.od_dilated_visual_acuity = prevRef.od_dilated_visual_acuity ?? "";
        merged.od_dilated_pinhole = prevRef.od_dilated_pinhole ?? "";
        merged.os_dilated_sphere = prevRef.os_dilated_sphere !== null && prevRef.os_dilated_sphere !== undefined ? prevRef.os_dilated_sphere.toString() : "";
        merged.os_dilated_cylinder = prevRef.os_dilated_cylinder !== null && prevRef.os_dilated_cylinder !== undefined ? prevRef.os_dilated_cylinder.toString() : "";
        merged.os_dilated_axis = prevRef.os_dilated_axis !== null && prevRef.os_dilated_axis !== undefined ? prevRef.os_dilated_axis.toString() : "";
        merged.os_dilated_visual_acuity = prevRef.os_dilated_visual_acuity ?? "";
        merged.os_dilated_pinhole = prevRef.os_dilated_pinhole ?? "";
      }

      return merged;
    });

    toast.success("Loaded all measurements from the previous visit.");
  };

  // Convert empty strings or null values to DB numbers/nulls
  const parseNumVal = (v: string): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const parseIntVal = (v: string): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  };

  // Handle Save — single API call for all sections
  const handleSaveAll = async () => {
    if (!visitId) {
      toast.error("No active visit ID found.");
      return;
    }

    // Pre-validate: Axis is required when Cylinder is non-zero
    const validationErrors: Record<string, string> = {};
    const checkCylAxis = (cylStr: string, axisStr: string, key: keyof CombinedFormState) => {
      const cyl = parseNumVal(cylStr);
      const axis = parseIntVal(axisStr);
      if (cyl !== null && cyl !== 0 && axis === null) {
        validationErrors[key] = "Axis is required when cylinder is specified";
      }
    };

    checkCylAxis(formState.od_sph ? formState.od_cyl : formState.od_cyl, formState.od_axis, "od_axis");
    checkCylAxis(formState.os_sph ? formState.os_cyl : formState.os_cyl, formState.os_axis, "os_axis");
    checkCylAxis(formState.od_ar_cylinder, formState.od_ar_axis, "od_ar_axis");
    checkCylAxis(formState.os_ar_cylinder, formState.os_ar_axis, "os_ar_axis");
    checkCylAxis(formState.od_wet_cylinder, formState.od_wet_axis, "od_wet_axis");
    checkCylAxis(formState.os_wet_cylinder, formState.os_wet_axis, "os_wet_axis");
    checkCylAxis(formState.od_ref_cylinder, formState.od_ref_axis, "od_ref_axis");
    checkCylAxis(formState.os_ref_cylinder, formState.os_ref_axis, "os_ref_axis");
    checkCylAxis(formState.od_dilated_cylinder, formState.od_dilated_axis, "od_dilated_axis");
    checkCylAxis(formState.os_dilated_cylinder, formState.os_dilated_axis, "os_dilated_axis");

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Axis is required when cylinder is specified. Please check highlighted fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      await dispatch(
        saveExamination({
          data: {
            patient_id: patientId,
            optometrist_id: optometristId ?? undefined,
            visit_id: visitId,

            vision: {
              od_ucva_distance: formState.od_ucva_distance || null,
              od_ph_va: formState.od_ph_va || null,
              od_va_with_current_specs: formState.od_va_with_current_specs || null,
              od_near_ucva: formState.od_near_ucva || null,
              od_near_with_current_specs: formState.od_near_with_current_specs || null,
              os_ucva_distance: formState.os_ucva_distance || null,
              os_ph_va: formState.os_ph_va || null,
              os_va_with_current_specs: formState.os_va_with_current_specs || null,
              os_near_ucva: formState.os_near_ucva || null,
              os_near_with_current_specs: formState.os_near_with_current_specs || null,
              notes: formState.vision_notes || null,
            },

            current_specs: {
              od: {
                sph: parseNumVal(formState.od_sph),
                cyl: parseNumVal(formState.od_cyl),
                axis: parseIntVal(formState.od_axis),
                add: parseNumVal(formState.od_add),
              },
              os: {
                sph: parseNumVal(formState.os_sph),
                cyl: parseNumVal(formState.os_cyl),
                axis: parseIntVal(formState.os_axis),
                add: parseNumVal(formState.os_add),
              },
              lens_type: formState.specs_lens_type || null,
              usage: formState.specs_usage || null,
              measured_by: formState.specs_measured_by || null,
              is_comfortable:
                formState.specs_is_comfortable === "true"
                  ? true
                  : formState.specs_is_comfortable === "false"
                  ? false
                  : null,
              remarks: formState.specs_remarks || null,
            },

            ar_data: {
              od_sphere: parseNumVal(formState.od_ar_sphere),
              od_cylinder: parseNumVal(formState.od_ar_cylinder),
              od_axis: parseIntVal(formState.od_ar_axis),
              os_sphere: parseNumVal(formState.os_ar_sphere),
              os_cylinder: parseNumVal(formState.os_ar_cylinder),
              os_axis: parseIntVal(formState.os_ar_axis),
              od_wet_sphere: parseNumVal(formState.od_wet_sphere),
              od_wet_cylinder: parseNumVal(formState.od_wet_cylinder),
              od_wet_axis: parseIntVal(formState.od_wet_axis),
              os_wet_sphere: parseNumVal(formState.os_wet_sphere),
              os_wet_cylinder: parseNumVal(formState.os_wet_cylinder),
              os_wet_axis: parseIntVal(formState.os_wet_axis),
              pupillary_distance: parseNumVal(formState.ar_pd),
              notes: formState.ar_notes || null,
            },

            refraction: {
              od: {
                sphere: parseNumVal(formState.od_ref_sphere),
                cylinder: parseNumVal(formState.od_ref_cylinder),
                axis: parseIntVal(formState.od_ref_axis),
                add_power: parseNumVal(formState.od_ref_add_power),
                visual_acuity_uncorrected: formState.od_ref_visual_acuity_uncorrected || null,
                visual_acuity_corrected: formState.od_ref_visual_acuity_corrected || null,
                distance_bcva: formState.od_ref_distance_bcva || null,
                near_bcva: formState.od_ref_near_bcva || null,
              },
              os: {
                sphere: parseNumVal(formState.os_ref_sphere),
                cylinder: parseNumVal(formState.os_ref_cylinder),
                axis: parseIntVal(formState.os_ref_axis),
                add_power: parseNumVal(formState.os_ref_add_power),
                visual_acuity_uncorrected: formState.os_ref_visual_acuity_uncorrected || null,
                visual_acuity_corrected: formState.os_ref_visual_acuity_corrected || null,
                distance_bcva: formState.os_ref_distance_bcva || null,
                near_bcva: formState.os_ref_near_bcva || null,
              },
              od_prism: formState.od_ref_prism || null,
              os_prism: formState.os_ref_prism || null,
              od_dilated_sphere: parseNumVal(formState.od_dilated_sphere),
              od_dilated_cylinder: parseNumVal(formState.od_dilated_cylinder),
              od_dilated_axis: parseIntVal(formState.od_dilated_axis),
              od_dilated_visual_acuity: formState.od_dilated_visual_acuity || null,
              od_dilated_pinhole: formState.od_dilated_pinhole || null,
              os_dilated_sphere: parseNumVal(formState.os_dilated_sphere),
              os_dilated_cylinder: parseNumVal(formState.os_dilated_cylinder),
              os_dilated_axis: parseIntVal(formState.os_dilated_axis),
              os_dilated_visual_acuity: formState.os_dilated_visual_acuity || null,
              os_dilated_pinhole: formState.os_dilated_pinhole || null,
              pupillary_distance: parseNumVal(formState.ref_pd),
              notes: formState.ref_notes || null,
            },

            existing_ids: {
              vision_id: visitVision?.id ?? null,
              ar_data_id: visitAR?.id ?? null,
              current_specs_id: visitSpecs?.id ?? null,
              refraction_id: visitRef?.id ?? null,
            },
          },
        })
      ).unwrap();

      toast.success("All measurements saved successfully.");
      onRefresh();
      setErrors({});
    } catch (e: any) {
      const detail = e?.detail || e?.response?.data?.detail;
      const mappedErrors: Record<string, string> = {};
      let firstErrorMsg = "";

      if (Array.isArray(detail)) {
        detail.forEach((err: any) => {
          let formKey = mapLocToFormKey(err.loc || []);

          // Fallback parsing for generic locs or Pydantic business_logic_error strings
          if (!formKey && typeof err.msg === "string") {
            const msg = err.msg;
            if (msg.includes("CurrentSpecsEyeMeasurements")) {
              if (msg.includes("axis")) {
                if (formState.od_cyl && !formState.od_axis) formKey = "od_axis";
                else if (formState.os_cyl && !formState.os_axis) formKey = "os_axis";
                else formKey = "od_axis";
              }
            } else if (msg.includes("ARData")) {
              if (msg.includes("axis")) {
                if (formState.od_ar_cylinder && !formState.od_ar_axis) formKey = "od_ar_axis";
                else if (formState.os_ar_cylinder && !formState.os_ar_axis) formKey = "os_ar_axis";
                else formKey = "od_ar_axis";
              }
            } else if (msg.includes("EyeMeasurements")) {
              if (msg.includes("axis")) {
                if (formState.od_ref_cylinder && !formState.od_ref_axis) formKey = "od_ref_axis";
                else if (formState.os_ref_cylinder && !formState.os_ref_axis) formKey = "os_ref_axis";
                else formKey = "od_ref_axis";
              }
            }
          }

          let cleanMsg = err.msg || "Invalid value";
          if (cleanMsg.includes("Axis is required when cylinder is specified")) {
            cleanMsg = "Axis is required when cylinder is specified";
          }

          if (formKey) {
            mappedErrors[formKey] = cleanMsg;
          }
          if (!firstErrorMsg) firstErrorMsg = cleanMsg;
        });
      }

      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
        toast.error(`Validation error: ${firstErrorMsg || "Please check highlighted fields."}`);
      } else {
        handleError(e, {
          defaultMessage: "Failed to save measurements.",
          logError: true,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eye block rendering helper
  const renderEyeColumn = (eyeLabel: "Right Eye (OD)" | "Left Eye (OS)", prefix: "od_" | "os_") => {
    const isOD = prefix === "od_";
    const eyeTheme = isOD ? "border-blue-100 bg-blue-50/20" : "border-green-100 bg-green-50/20";
    const headerText = isOD ? "text-blue-700" : "text-green-700";
    const headerDot = isOD ? "bg-blue-500" : "bg-green-500";

    return (
      <div className={clsx("flex flex-col gap-6 p-4 rounded-2xl border-2", eyeTheme)}>
        {/* Eye Column Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
          <div className="flex items-center gap-2">
            <span className={clsx("h-3 w-3 rounded-full", headerDot)} />
            <h3 className={clsx("text-base font-bold uppercase tracking-wider", headerText)}>{eyeLabel}</h3>
          </div>
          {/* Copy section OD to OS helper */}
          {isOD && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleCopySectionODtoOS("vision")}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition"
                title="Copy all Right Eye VA values to Left Eye"
              >
                Copy VA → OS
              </button>
              <button
                type="button"
                onClick={() => handleCopySectionODtoOS("ar")}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition"
                title="Copy all Right Eye AR values to Left Eye"
              >
                Copy AR → OS
              </button>
            </div>
          )}
        </div>

        {/* 1. Visual Acuity Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3.5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Acuity (Vision)</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Distance (UCVA)</label>
              <select
                value={formState[`${prefix}ucva_distance` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}ucva_distance` as keyof CombinedFormState, e.target.value)}
                className={clsx(
                  "w-full rounded-lg border px-3 py-2 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50 hover:bg-slate-50",
                  getFieldError(`${prefix}ucva_distance` as keyof CombinedFormState)
                )}
              >
                <option value="">—</option>
                {DIST_VA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {errors[`${prefix}ucva_distance`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ucva_distance`]}</span>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Near (UCVA)</label>
              <select
                value={formState[`${prefix}near_ucva` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}near_ucva` as keyof CombinedFormState, e.target.value)}
                className={clsx(
                  "w-full rounded-lg border px-3 py-2 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50 hover:bg-slate-50",
                  getFieldError(`${prefix}near_ucva` as keyof CombinedFormState)
                )}
              >
                <option value="">—</option>
                {NEAR_VA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {errors[`${prefix}near_ucva`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}near_ucva`]}</span>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">With Glasses (Dist)</label>
              <select
                value={formState[`${prefix}va_with_current_specs` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}va_with_current_specs` as keyof CombinedFormState, e.target.value)}
                className={clsx(
                  "w-full rounded-lg border px-3 py-2 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50 hover:bg-slate-50",
                  getFieldError(`${prefix}va_with_current_specs` as keyof CombinedFormState)
                )}
              >
                <option value="">—</option>
                {DIST_VA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {errors[`${prefix}va_with_current_specs`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}va_with_current_specs`]}</span>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">With Glasses (Near)</label>
              <select
                value={formState[`${prefix}near_with_current_specs` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}near_with_current_specs` as keyof CombinedFormState, e.target.value)}
                className={clsx(
                  "w-full rounded-lg border px-3 py-2 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50 hover:bg-slate-50",
                  getFieldError(`${prefix}near_with_current_specs` as keyof CombinedFormState)
                )}
              >
                <option value="">—</option>
                {NEAR_VA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {errors[`${prefix}near_with_current_specs`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}near_with_current_specs`]}</span>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">With Pinhole (PH)</label>
              <select
                value={formState[`${prefix}ph_va` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}ph_va` as keyof CombinedFormState, e.target.value)}
                className={clsx(
                  "w-full rounded-lg border px-3 py-2 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50 hover:bg-slate-50",
                  getFieldError(`${prefix}ph_va` as keyof CombinedFormState)
                )}
              >
                <option value="">—</option>
                {DIST_VA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {errors[`${prefix}ph_va`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ph_va`]}</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Auto Refraction Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Auto Refraction (AR)</h4>
          
          {/* DRY AR */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">DRY AR</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Sphere</label>
                <input
                  type="text"
                  value={formState[`${prefix}ar_sphere` as keyof CombinedFormState] as string}
                  onChange={(e) => updateField(`${prefix}ar_sphere` as keyof CombinedFormState, e.target.value)}
                  onBlur={() => handleInputBlur(`${prefix}ar_sphere` as keyof CombinedFormState, "sphere")}
                  placeholder="0.00"
                  className={clsx(
                    "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                    getFieldError(`${prefix}ar_sphere` as keyof CombinedFormState)
                  )}
                />
                {errors[`${prefix}ar_sphere`] && (
                  <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ar_sphere`]}</span>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Cylinder</label>
                <input
                  type="text"
                  value={formState[`${prefix}ar_cylinder` as keyof CombinedFormState] as string}
                  onChange={(e) => updateField(`${prefix}ar_cylinder` as keyof CombinedFormState, e.target.value)}
                  onBlur={() => handleInputBlur(`${prefix}ar_cylinder` as keyof CombinedFormState, "cylinder")}
                  placeholder="0.00"
                  className={clsx(
                    "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                    getFieldError(`${prefix}ar_cylinder` as keyof CombinedFormState)
                  )}
                />
                {errors[`${prefix}ar_cylinder`] && (
                  <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ar_cylinder`]}</span>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Axis</label>
                <input
                  type="text"
                  value={formState[`${prefix}ar_axis` as keyof CombinedFormState] as string}
                  onChange={(e) => updateField(`${prefix}ar_axis` as keyof CombinedFormState, e.target.value)}
                  placeholder="0"
                  className={clsx(
                    "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                    getFieldError(`${prefix}ar_axis` as keyof CombinedFormState)
                  )}
                />
                {errors[`${prefix}ar_axis`] && (
                  <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ar_axis`]}</span>
                )}
              </div>
            </div>
          </div>

          {/* WET AR */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">WET AR (Dilated)</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Sphere</label>
                <input
                  type="text"
                  value={formState[`${prefix}wet_sphere` as keyof CombinedFormState] as string}
                  onChange={(e) => updateField(`${prefix}wet_sphere` as keyof CombinedFormState, e.target.value)}
                  onBlur={() => handleInputBlur(`${prefix}wet_sphere` as keyof CombinedFormState, "sphere")}
                  placeholder="0.00"
                  className={clsx(
                    "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                    getFieldError(`${prefix}wet_sphere` as keyof CombinedFormState)
                  )}
                />
                {errors[`${prefix}wet_sphere`] && (
                  <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}wet_sphere`]}</span>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Cylinder</label>
                <input
                  type="text"
                  value={formState[`${prefix}wet_cylinder` as keyof CombinedFormState] as string}
                  onChange={(e) => updateField(`${prefix}wet_cylinder` as keyof CombinedFormState, e.target.value)}
                  onBlur={() => handleInputBlur(`${prefix}wet_cylinder` as keyof CombinedFormState, "cylinder")}
                  placeholder="0.00"
                  className={clsx(
                    "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                    getFieldError(`${prefix}wet_cylinder` as keyof CombinedFormState)
                  )}
                />
                {errors[`${prefix}wet_cylinder`] && (
                  <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}wet_cylinder`]}</span>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Axis</label>
                <input
                  type="text"
                  value={formState[`${prefix}wet_axis` as keyof CombinedFormState] as string}
                  onChange={(e) => updateField(`${prefix}wet_axis` as keyof CombinedFormState, e.target.value)}
                  placeholder="0"
                  className={clsx(
                    "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                    getFieldError(`${prefix}wet_axis` as keyof CombinedFormState)
                  )}
                />
                {errors[`${prefix}wet_axis`] && (
                  <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}wet_axis`]}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Presenting Specs Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3.5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Spectacles (POG)</h4>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Sphere</label>
              <input
                type="text"
                value={formState[`${prefix}sph` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}sph` as keyof CombinedFormState, e.target.value)}
                onBlur={() => handleInputBlur(`${prefix}sph` as keyof CombinedFormState, "sphere")}
                placeholder="0.00"
                className={clsx(
                  "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                  getFieldError(`${prefix}sph` as keyof CombinedFormState)
                )}
              />
              {errors[`${prefix}sph`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}sph`]}</span>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Cylinder</label>
              <input
                type="text"
                value={formState[`${prefix}cyl` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}cyl` as keyof CombinedFormState, e.target.value)}
                onBlur={() => handleInputBlur(`${prefix}cyl` as keyof CombinedFormState, "cylinder")}
                placeholder="0.00"
                className={clsx(
                  "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                  getFieldError(`${prefix}cyl` as keyof CombinedFormState)
                )}
              />
              {errors[`${prefix}cyl`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}cyl`]}</span>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Axis</label>
              <input
                type="text"
                value={formState[`${prefix}axis` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}axis` as keyof CombinedFormState, e.target.value)}
                placeholder="0"
                className={clsx(
                  "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                  getFieldError(`${prefix}axis` as keyof CombinedFormState)
                )}
              />
              {errors[`${prefix}axis`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}axis`]}</span>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Add Power</label>
              <input
                type="text"
                value={formState[`${prefix}add` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}add` as keyof CombinedFormState, e.target.value)}
                onBlur={() => handleInputBlur(`${prefix}add` as keyof CombinedFormState, "add_power")}
                placeholder="0.00"
                className={clsx(
                  "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                  getFieldError(`${prefix}add` as keyof CombinedFormState)
                )}
              />
              {errors[`${prefix}add`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}add`]}</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Subjective Refraction Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subjective Refraction (UnDilated)</h4>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleCopyARtoRefraction}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[9px] font-bold text-slate-600 transition"
              >
                Copy AR
              </button>
              <button
                type="button"
                onClick={handleCopySpecsToRefraction}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[9px] font-bold text-slate-600 transition"
              >
                Copy Specs
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Distance */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Distance (Dist)</span>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-1">
                  <label className="block text-[8px] font-medium text-slate-400 mb-0.5">SPH</label>
                  <input
                    type="text"
                    value={formState[`${prefix}ref_sphere` as keyof CombinedFormState] as string}
                    onChange={(e) => updateField(`${prefix}ref_sphere` as keyof CombinedFormState, e.target.value)}
                    onBlur={() => handleInputBlur(`${prefix}ref_sphere` as keyof CombinedFormState, "sphere")}
                    placeholder="0.00"
                    className={clsx(
                      "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                      getFieldError(`${prefix}ref_sphere` as keyof CombinedFormState)
                    )}
                  />
                  {errors[`${prefix}ref_sphere`] && (
                    <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ref_sphere`]}</span>
                  )}
                </div>
                <div className="col-span-1">
                  <label className="block text-[8px] font-medium text-slate-400 mb-0.5">CYL</label>
                  <input
                    type="text"
                    value={formState[`${prefix}ref_cylinder` as keyof CombinedFormState] as string}
                    onChange={(e) => updateField(`${prefix}ref_cylinder` as keyof CombinedFormState, e.target.value)}
                    onBlur={() => handleInputBlur(`${prefix}ref_cylinder` as keyof CombinedFormState, "cylinder")}
                    placeholder="0.00"
                    className={clsx(
                      "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                      getFieldError(`${prefix}ref_cylinder` as keyof CombinedFormState)
                    )}
                  />
                  {errors[`${prefix}ref_cylinder`] && (
                    <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ref_cylinder`]}</span>
                  )}
                </div>
                <div className="col-span-1">
                  <label className="block text-[8px] font-medium text-slate-400 mb-0.5">AXIS</label>
                  <input
                    type="text"
                    value={formState[`${prefix}ref_axis` as keyof CombinedFormState] as string}
                    onChange={(e) => updateField(`${prefix}ref_axis` as keyof CombinedFormState, e.target.value)}
                    placeholder="0"
                    className={clsx(
                      "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                      getFieldError(`${prefix}ref_axis` as keyof CombinedFormState)
                    )}
                  />
                  {errors[`${prefix}ref_axis`] && (
                    <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ref_axis`]}</span>
                  )}
                </div>
                <div className="col-span-1">
                  <label className="block text-[8px] font-medium text-slate-400 mb-0.5">PRISM</label>
                  <select
                    value={formState[`${prefix}ref_prism` as keyof CombinedFormState] as string}
                    onChange={(e) => updateField(`${prefix}ref_prism` as keyof CombinedFormState, e.target.value)}
                    className={clsx(
                      "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                      getFieldError(`${prefix}ref_prism` as keyof CombinedFormState)
                    )}
                  >
                    <option value="">—</option>
                    {PRISM_OPTIONS.filter(Boolean).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors[`${prefix}ref_prism`] && (
                    <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ref_prism`]}</span>
                  )}
                </div>
                <div className="col-span-1">
                  <label className="block text-[8px] font-medium text-slate-400 mb-0.5">BCVA (VA)</label>
                  <select
                    value={formState[`${prefix}ref_distance_bcva` as keyof CombinedFormState] as string}
                    onChange={(e) => updateField(`${prefix}ref_distance_bcva` as keyof CombinedFormState, e.target.value)}
                    className={clsx(
                      "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                      getFieldError(`${prefix}ref_distance_bcva` as keyof CombinedFormState)
                    )}
                  >
                    <option value="">—</option>
                    {DIST_VA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {errors[`${prefix}ref_distance_bcva`] && (
                    <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ref_distance_bcva`]}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Near Addition */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Near Addition (Add)</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Near ADD Sphere</label>
                  <input
                    type="text"
                    value={formState[`${prefix}ref_add_power` as keyof CombinedFormState] as string}
                    onChange={(e) => updateField(`${prefix}ref_add_power` as keyof CombinedFormState, e.target.value)}
                    onBlur={() => handleInputBlur(`${prefix}ref_add_power` as keyof CombinedFormState, "add_power")}
                    placeholder="0.00"
                    className={clsx(
                      "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                      getFieldError(`${prefix}ref_add_power` as keyof CombinedFormState)
                    )}
                  />
                  {errors[`${prefix}ref_add_power`] && (
                    <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ref_add_power`]}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] font-medium text-slate-400 mb-0.5">Near BCVA (N V)</label>
                  <select
                    value={formState[`${prefix}ref_near_bcva` as keyof CombinedFormState] as string}
                    onChange={(e) => updateField(`${prefix}ref_near_bcva` as keyof CombinedFormState, e.target.value)}
                    className={clsx(
                      "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                      getFieldError(`${prefix}ref_near_bcva` as keyof CombinedFormState)
                    )}
                  >
                    <option value="">—</option>
                    {NEAR_VA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {errors[`${prefix}ref_near_bcva`] && (
                    <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}ref_near_bcva`]}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Dilated Acceptance Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dilated Acceptance</h4>
            <button
              type="button"
              onClick={handleCopyUnDilatedToDilated}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[9px] font-bold text-slate-600 transition"
            >
              Copy UnDilated
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-1">
              <label className="block text-[8px] font-medium text-slate-400 mb-0.5">SPH</label>
              <input
                type="text"
                value={formState[`${prefix}dilated_sphere` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}dilated_sphere` as keyof CombinedFormState, e.target.value)}
                onBlur={() => handleInputBlur(`${prefix}dilated_sphere` as keyof CombinedFormState, "sphere")}
                placeholder="0.00"
                className={clsx(
                  "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                  getFieldError(`${prefix}dilated_sphere` as keyof CombinedFormState)
                )}
              />
              {errors[`${prefix}dilated_sphere`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}dilated_sphere`]}</span>
              )}
            </div>
            <div className="col-span-1">
              <label className="block text-[8px] font-medium text-slate-400 mb-0.5">CYL</label>
              <input
                type="text"
                value={formState[`${prefix}dilated_cylinder` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}dilated_cylinder` as keyof CombinedFormState, e.target.value)}
                onBlur={() => handleInputBlur(`${prefix}dilated_cylinder` as keyof CombinedFormState, "cylinder")}
                placeholder="0.00"
                className={clsx(
                  "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                  getFieldError(`${prefix}dilated_cylinder` as keyof CombinedFormState)
                )}
              />
              {errors[`${prefix}dilated_cylinder`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}dilated_cylinder`]}</span>
              )}
            </div>
            <div className="col-span-1">
              <label className="block text-[8px] font-medium text-slate-400 mb-0.5">AXIS</label>
              <input
                type="text"
                value={formState[`${prefix}dilated_axis` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}dilated_axis` as keyof CombinedFormState, e.target.value)}
                placeholder="0"
                className={clsx(
                  "w-full text-center rounded-lg border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                  getFieldError(`${prefix}dilated_axis` as keyof CombinedFormState)
                )}
              />
              {errors[`${prefix}dilated_axis`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}dilated_axis`]}</span>
              )}
            </div>
            <div className="col-span-1">
              <label className="block text-[8px] font-medium text-slate-400 mb-0.5">V/A (Dist)</label>
              <select
                value={formState[`${prefix}dilated_visual_acuity` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}dilated_visual_acuity` as keyof CombinedFormState, e.target.value)}
                className={clsx(
                  "w-full text-center rounded-md border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                  getFieldError(`${prefix}dilated_visual_acuity` as keyof CombinedFormState)
                )}
              >
                <option value="">—</option>
                {DIST_VA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {errors[`${prefix}dilated_visual_acuity`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}dilated_visual_acuity`]}</span>
              )}
            </div>
            <div className="col-span-1">
              <label className="block text-[8px] font-medium text-slate-400 mb-0.5">PH (Pinhole)</label>
              <select
                value={formState[`${prefix}dilated_pinhole` as keyof CombinedFormState] as string}
                onChange={(e) => updateField(`${prefix}dilated_pinhole` as keyof CombinedFormState, e.target.value)}
                className={clsx(
                  "w-full text-center rounded-md border py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50",
                  getFieldError(`${prefix}dilated_pinhole` as keyof CombinedFormState)
                )}
              >
                <option value="">—</option>
                {DIST_VA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {errors[`${prefix}dilated_pinhole`] && (
                <span className="text-[9px] text-red-600 font-medium block mt-0.5">{errors[`${prefix}dilated_pinhole`]}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-1 sm:p-2 max-w-[1400px] mx-auto min-h-full pb-32">
      {/* Top Combined Action & Settings Panel */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-4">
        {/* Header Title and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-800">Vision & Refraction Entry Sheet</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPreviousVisit}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm active:scale-95"
              title="Copy measurements from previous patient visit"
            >
              <FileClock className="h-3.5 w-3.5 text-slate-500" />
              Copy Previous Visit
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition active:scale-95 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isSubmitting ? "Saving..." : "Save All Measurements"}
            </button>
          </div>
        </div>

        {/* Global Common Measurements Form */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pupillary Distance (PD)</label>
            <input
              type="text"
              value={formState.ar_pd}
              onChange={(e) => {
                updateField("ar_pd", e.target.value);
                updateField("ref_pd", e.target.value);
              }}
              placeholder="PD mm"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700 bg-slate-50/50 hover:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Specs Lens Type</label>
            <select
              value={formState.specs_lens_type}
              onChange={(e) => updateField("specs_lens_type", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700"
            >
              <option value="SINGLE">Single Vision</option>
              <option value="BIFOCAL">Bifocal</option>
              <option value="PROGRESSIVE">Progressive</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Specs Usage</label>
            <select
              value={formState.specs_usage}
              onChange={(e) => updateField("specs_usage", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700"
            >
              <option value="DISTANCE">Distance Only</option>
              <option value="NEAR">Near Only</option>
              <option value="BOTH">Constant Wear</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Comfortable?</label>
            <select
              value={formState.specs_is_comfortable}
              onChange={(e) => updateField("specs_is_comfortable", e.target.value)}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-sky-500 outline-none font-semibold text-slate-700"
            >
              <option value="true">Comfortable</option>
              <option value="false">Uncomfortable</option>
              <option value="">Unknown</option>
            </select>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleCopyARtoRefraction}
              className="flex-1 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition"
              title="Copy DRY AR to Refraction"
            >
              Copy AR → Refraction
            </button>
            <button
              type="button"
              onClick={handleCopySpecsToRefraction}
              className="flex-1 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition"
              title="Copy Specs to Refraction"
            >
              Copy Specs → Refraction
            </button>
          </div>
        </div>

        {/* Global Remarks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={formState.vision_notes}
            onChange={(e) => updateField("vision_notes", e.target.value)}
            placeholder="Vision acuity notes / general remarks..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 outline-none font-medium text-slate-700 bg-slate-50/50"
          />
          <input
            type="text"
            value={formState.specs_remarks}
            onChange={(e) => updateField("specs_remarks", e.target.value)}
            placeholder="Spectacles details / physical condition notes..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 outline-none font-medium text-slate-700 bg-slate-50/50"
          />
          <input
            type="text"
            value={formState.ref_notes}
            onChange={(e) => updateField("ref_notes", e.target.value)}
            placeholder="Subjective refraction details / clinical notes..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 outline-none font-medium text-slate-700 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Side-by-side Eye Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Right Eye (OD) Column */}
        {renderEyeColumn("Right Eye (OD)", "od_")}

        {/* Left Eye (OS) Column */}
        {renderEyeColumn("Left Eye (OS)", "os_")}
      </div>
    </div>
  );
}
