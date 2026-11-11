"use client";

import { useState, useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import {
  addMedicalCondition,
  updateMedicalCondition,
  deleteMedicalCondition,
} from "@/redux/optometryDataSlice";
import {
  Heart,
  Activity,
  Sparkles,
  Check,
  AlertCircle,
  Stethoscope,
  RefreshCw,
  Clock,
  FileText,
  Plus,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { MedicalConditionRecord } from "@/types";
import { ToggleSwitch } from "../shared";
import {
  medicalHistoryPatterns,
  type MedicalHistoryPattern,
} from "../mock/mockTemplates";
import { ConfirmedMedicalHistorySummary } from "./ConfirmedMedicalHistorySummary";
import { ResizablePanel } from "../shared";
import { handleError } from "@/utils/errorHandler";

interface MedicalHistoryTabProps {
  patientId: string;
  visitId?: string;
  medicalConditions?: MedicalConditionRecord[];
  onRefresh?: () => void;
  loading?: boolean;
}

// ... (interfaces and constants)

interface ConditionDetails {
  duration?: string;
  medication?: string;
  controlled?: boolean;
  notes?: string;
}

interface MedicalHistoryFormData {
  // Metabolic
  diabetes: boolean;
  diabetesDetails: ConditionDetails;
  thyroid_disorder: boolean;
  thyroidDetails: ConditionDetails;
  // Cardiovascular
  hypertension: boolean;
  hypertensionDetails: ConditionDetails;
  heart_disease: boolean;
  heartDetails: ConditionDetails;
  // Respiratory
  asthma: boolean;
  asthmaDetails: ConditionDetails;
  tuberculosis: boolean;
  tbDetails: ConditionDetails;
  // Organ-specific
  kidney_disease: boolean;
  kidneyDetails: ConditionDetails;
  liver_disease: boolean;
  liverDetails: ConditionDetails;
  // Serious
  cancer: boolean;
  cancerDetails: ConditionDetails;
  hiv_aids: boolean;
  hivDetails: ConditionDetails;
  // Additional
  other_conditions: string;
  current_medications: string;
  family_history: string;
  lifestyle_notes: string;
}

const initialFormData: MedicalHistoryFormData = {
  diabetes: false,
  diabetesDetails: {},
  thyroid_disorder: false,
  thyroidDetails: {},
  hypertension: false,
  hypertensionDetails: {},
  heart_disease: false,
  heartDetails: {},
  asthma: false,
  asthmaDetails: {},
  tuberculosis: false,
  tbDetails: {},
  kidney_disease: false,
  kidneyDetails: {},
  liver_disease: false,
  liverDetails: {},
  cancer: false,
  cancerDetails: {},
  hiv_aids: false,
  hivDetails: {},
  other_conditions: "",
  current_medications: "",
  family_history: "",
  lifestyle_notes: "",
};

const allConditions = [
  { id: "diabetes", label: "Diabetes Mellitus", icon: Activity, category: "Metabolic" },
  { id: "hypertension", label: "Hypertension", icon: Heart, category: "Cardiovascular" },
  { id: "heart_disease", label: "Heart Disease", icon: Heart, category: "Cardiovascular" },
  { id: "thyroid_disorder", label: "Thyroid Disorder", icon: Activity, category: "Metabolic" },
  { id: "asthma", label: "Asthma", icon: Activity, category: "Respiratory" },
  { id: "tuberculosis", label: "Tuberculosis", icon: Activity, category: "Respiratory" },
  { id: "kidney_disease", label: "Kidney Disease", icon: Stethoscope, category: "Organ-Specific" },
  { id: "liver_disease", label: "Liver Disease", icon: Stethoscope, category: "Organ-Specific" },
  { id: "cancer", label: "Cancer", icon: AlertCircle, category: "Serious" },
  { id: "hiv_aids", label: "HIV/AIDS", icon: AlertCircle, category: "Serious" },
];

const conditionConfig = {
  diabetes: {
    label: "Diabetes Mellitus",
    icon: Activity,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    detailsKey: "diabetesDetails" as const,
  },
  thyroid_disorder: {
    label: "Thyroid Disorder",
    icon: Activity,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    detailsKey: "thyroidDetails" as const,
  },
  hypertension: {
    label: "Hypertension",
    icon: Heart,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    detailsKey: "hypertensionDetails" as const,
  },
  heart_disease: {
    label: "Heart Disease",
    icon: Heart,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    detailsKey: "heartDetails" as const,
  },
  asthma: {
    label: "Asthma",
    icon: Activity,
    color: "text-sky-600",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    detailsKey: "asthmaDetails" as const,
  },
  tuberculosis: {
    label: "Tuberculosis",
    icon: Activity,
    color: "text-sky-600",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    detailsKey: "tbDetails" as const,
  },
  kidney_disease: {
    label: "Kidney Disease",
    icon: Stethoscope,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    detailsKey: "kidneyDetails" as const,
  },
  liver_disease: {
    label: "Liver Disease",
    icon: Stethoscope,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    detailsKey: "liverDetails" as const,
  },
  cancer: {
    label: "Cancer",
    icon: AlertCircle,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    detailsKey: "cancerDetails" as const,
  },
  hiv_aids: {
    label: "HIV/AIDS",
    icon: AlertCircle,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    detailsKey: "hivDetails" as const,
  },
};

export function MedicalHistoryTab({
  patientId,
  visitId,
  medicalConditions = [],
  onRefresh,
  loading = false
}: MedicalHistoryTabProps) {
  const dispatch = useAppDispatch();
  // Removed local medicalConditions state
  const [formData, setFormData] = useState<MedicalHistoryFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conditionRecordMap, setConditionRecordMap] = useState<Map<string, MedicalConditionRecord>>(new Map());
  const [activeCondition, setActiveCondition] = useState<string | null>(null);

  // Sync form data with passed medicalConditions prop
  useEffect(() => {
    // Build form data from props
    const recordMap = new Map<string, MedicalConditionRecord>();
    const newFormData = { ...initialFormData };

    medicalConditions.forEach((condition) => {
      recordMap.set(condition.condition_name, condition);

      // Set the condition status
      if (condition.condition_name in newFormData) {
        (newFormData as any)[condition.condition_name] = condition.status ?? true;

        // Set the details
        const detailsKey = getDetailsKeyForCondition(condition.condition_name);
        if (detailsKey) {
          (newFormData as any)[detailsKey] = {
            duration: condition.duration,
            medication: condition.on_medication ? "yes" : "no",
            controlled: condition.is_controlled,
            notes: condition.remarks,
          };
        }
      }

      // Handle text fields
      if (condition.condition_name === "other_conditions") {
        newFormData.other_conditions = condition.remarks || "";
      } else if (condition.condition_name === "current_medications") {
        newFormData.current_medications = condition.remarks || "";
      } else if (condition.condition_name === "family_history") {
        newFormData.family_history = condition.remarks || "";
      } else if (condition.condition_name === "lifestyle_notes") {
        newFormData.lifestyle_notes = condition.remarks || "";
      }
    });

    setConditionRecordMap(recordMap);
    setFormData(newFormData);
  }, [medicalConditions]);


  const getDetailsKeyForCondition = (conditionType: string): string | null => {
    const mapping: Record<string, string> = {
      diabetes: "diabetesDetails",
      thyroid_disorder: "thyroidDetails",
      hypertension: "hypertensionDetails",
      heart_disease: "heartDetails",
      asthma: "asthmaDetails",
      tuberculosis: "tbDetails",
      kidney_disease: "kidneyDetails",
      liver_disease: "liverDetails",
      cancer: "cancerDetails",
      hiv_aids: "hivDetails",
    };
    return mapping[conditionType] || null;
  };

  const handleConditionToggle = (key: keyof MedicalHistoryFormData, value: boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleConditionDetailChange = (
    detailsKey: keyof MedicalHistoryFormData,
    field: keyof ConditionDetails,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [detailsKey]: {
        ...(prev[detailsKey] as ConditionDetails),
        [field]: value,
      },
    }));
  };

  const handleTextChange = (key: keyof MedicalHistoryFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleConditionButtonClick = (conditionId: string) => {
    if (activeCondition === conditionId) {
      // Clicking the same button closes the form
      setActiveCondition(null);
    } else {
      // Open form for this condition
      setActiveCondition(conditionId);
    }
  };

  // Save a single condition immediately when "Add" button is clicked
  const saveCondition = async (conditionType: string) => {
    const optometristId = localStorage.getItem("user_id");
    if (!optometristId) {
      toast.error("Optometrist ID not found");
      return;
    }

    const detailsKeyMap: Record<string, string> = {
      diabetes: "diabetesDetails",
      thyroid_disorder: "thyroidDetails",
      hypertension: "hypertensionDetails",
      heart_disease: "heartDetails",
      asthma: "asthmaDetails",
      tuberculosis: "tbDetails",
      kidney_disease: "kidneyDetails",
      liver_disease: "liverDetails",
      cancer: "cancerDetails",
      hiv_aids: "hivDetails",
    };

    const detailsKey = detailsKeyMap[conditionType];
    if (!detailsKey) return;

    const details = (formData as any)[detailsKey] as ConditionDetails;
    const existingRecord = conditionRecordMap.get(conditionType);

    setIsSubmitting(true);
    try {
      if (existingRecord) {
        // Update existing record
        await dispatch(updateMedicalCondition({
          id: existingRecord.id,
          data: {
            status: true,
            duration: details.duration || null,
            on_medication: details.medication === "yes",
            is_controlled: details.controlled ?? null,
            remarks: details.notes || null,
          },
        })).unwrap();
        toast.success("Condition updated");
      } else {
        // Create new record
        await dispatch(addMedicalCondition({
          data: {
            patient_id: patientId,
            optometrist_id: optometristId,
            visit_id: visitId || null,
            condition_name: conditionType,
            status: true,
            duration: details.duration || null,
            on_medication: details.medication === "yes",
            is_controlled: details.controlled ?? null,
            remarks: details.notes || null,
          },
        })).unwrap();
        toast.success("Condition added");
      }

      // Update local form state to mark as active
      setFormData((prev) => ({ ...prev, [conditionType]: true }));

      // Refresh data to get updated records
      if (onRefresh) {
        onRefresh();
      }

      // Close the form
      setActiveCondition(null);
    } catch (error: any) {
      handleError(error, {
        defaultMessage: "Failed to save condition",
        logError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveTextField = async (conditionType: string, text: string) => {
    const optometristId = localStorage.getItem("user_id");
    if (!optometristId) {
      toast.error("User ID not found");
      return;
    }

    const existingRecord = conditionRecordMap.get(conditionType);
    const trimmedText = text.trim();

    try {
      if (existingRecord) {
        if (!trimmedText) {
          // If text is cleared, delete the record
          await dispatch(deleteMedicalCondition({ id: existingRecord.id })).unwrap();
          
          // Remove from local record map
          const newMap = new Map(conditionRecordMap);
          newMap.delete(conditionType);
          setConditionRecordMap(newMap);
        } else {
          // Update existing record
          await dispatch(updateMedicalCondition({
            id: existingRecord.id,
            data: {
              status: true,
              remarks: trimmedText,
            },
          })).unwrap();
        }
      } else if (trimmedText) {
        // Create new record
        await dispatch(addMedicalCondition({
          data: {
            patient_id: patientId,
            optometrist_id: optometristId,
            visit_id: visitId || null,
            condition_name: conditionType,
            status: true,
            remarks: trimmedText,
          },
        })).unwrap();
      }

      toast.success("Saved successfully");

      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      handleError(error, {
        defaultMessage: `Failed to save ${conditionType.replace('_', ' ')}`,
        logError: true,
      });
    }
  };

  // Keyboard shortcut: Ctrl+S saves active condition, Escape closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (activeCondition) {
          saveCondition(activeCondition);
        }
      } else if (e.key === "Escape" && activeCondition) {
        e.preventDefault();
        setActiveCondition(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCondition, formData]);

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear all medical history data?")) return;

    try {
      // Delete all condition records
      const deletePromises = Array.from(conditionRecordMap.values()).map(record =>
        dispatch(deleteMedicalCondition({ id: record.id })).unwrap()
      );

      await Promise.all(deletePromises);

      setFormData(initialFormData);
      setConditionRecordMap(new Map());
      setActiveCondition(null);
      toast.success("Medical history cleared");
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to clear medical history",
        logError: true,
      });
    }
  };

  const handleEditCondition = (conditionKey: string) => {
    // Open the form for editing this condition
    setActiveCondition(conditionKey);
  };

  const handleDeleteCondition = async (conditionKey: string) => {
    if (!confirm(`Are you sure you want to delete this condition?`)) return;

    const record = conditionRecordMap.get(conditionKey);
    if (!record) {
      toast.error("Condition record not found");
      return;
    }

    try {
      await dispatch(deleteMedicalCondition({ id: record.id })).unwrap();

      // Reset the form state for this condition
      const detailsKey = getDetailsKeyForCondition(conditionKey);
      if (detailsKey) {
        setFormData((prev) => ({
          ...prev,
          [conditionKey]: false,
          [detailsKey]: {},
        }));
      }

      // Remove from the record map
      const newMap = new Map(conditionRecordMap);
      newMap.delete(conditionKey);
      setConditionRecordMap(newMap);

      toast.success("Condition deleted");
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to delete condition",
        logError: true,
      });
    }
  };

  const getActiveConditionsCount = () => {
    let count = 0;
    if (formData.diabetes) count++;
    if (formData.hypertension) count++;
    if (formData.thyroid_disorder) count++;
    if (formData.heart_disease) count++;
    if (formData.asthma) count++;
    if (formData.tuberculosis) count++;
    if (formData.kidney_disease) count++;
    if (formData.liver_disease) count++;
    if (formData.cancer) count++;
    if (formData.hiv_aids) count++;
    return count;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden animate-in fade-in duration-200">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">Medical History</h3>
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="mx-auto h-8 w-8 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium text-slate-600">Loading medical history...</p>
        </div>
      </div>
    );
  }

  const activeCount = getActiveConditionsCount();

  const leftContent = (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden h-full">
      <div className="p-4 space-y-4">

        {/* Medical Conditions */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {allConditions.map((condition) => {
              const Icon = condition.icon;
              const isActive = (formData as any)[condition.id];

              return (
                <button
                  key={condition.id}
                  type="button"
                  onClick={() => handleConditionButtonClick(condition.id)}
                  className={clsx(
                    "w-full rounded-lg border px-2.5 sm:px-3 py-2 text-xs font-semibold transition text-left cursor-pointer",
                    activeCondition === condition.id
                      ? "bg-sky-600 text-white border-sky-600 shadow-xs ring-2 ring-sky-500/20"
                      : isActive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/60"
                        : "bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-white hover:border-sky-300 hover:text-sky-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{condition.label}</span>
                    {isActive && activeCondition !== condition.id && (
                      <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 ml-auto" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Inline Form - appears below the grid */}
          {activeCondition && (
            <div className="mt-3 rounded-xl border border-sky-300/80 bg-gradient-to-b from-sky-50/50 to-white p-3.5 sm:p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              {Object.entries(conditionConfig).map(([key, config]) => {
                if (key !== activeCondition) return null;

                const Icon = config.icon;
                const isActive = (formData as any)[key];
                const details = (formData as any)[config.detailsKey] as ConditionDetails;

                return (
                  <div key={key} className="space-y-3.5">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={clsx("rounded-lg p-1.5 shadow-2xs border bg-white", config.borderColor)}>
                          <Icon className={clsx("h-4 w-4", config.color)} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">{config.label}</h4>
                          <p className="text-[11px] text-slate-500">Record duration, medication status & control</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveCondition(null)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title="Dismiss (Esc)"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Quick Smart Clinical Presets */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                        Quick Clinical Presets:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleConditionDetailChange(config.detailsKey, "medication", "yes");
                            handleConditionDetailChange(config.detailsKey, "controlled", true);
                          }}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                        >
                          Controlled on Meds
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleConditionDetailChange(config.detailsKey, "medication", "yes");
                            handleConditionDetailChange(config.detailsKey, "controlled", false);
                          }}
                          className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition shadow-2xs"
                        >
                          Uncontrolled
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleConditionDetailChange(config.detailsKey, "medication", "no");
                            handleConditionDetailChange(config.detailsKey, "controlled", true);
                          }}
                          className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition shadow-2xs"
                        >
                          Diet / Lifestyle Only
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Duration */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Duration
                        </label>
                        <select
                          value={details.duration || ""}
                          onChange={(e) =>
                            handleConditionDetailChange(config.detailsKey, "duration", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="">Select duration...</option>
                          <option value="less_than_1">{"< 1 year"}</option>
                          <option value="1_to_5">1-5 years</option>
                          <option value="5_to_10">5-10 years</option>
                          <option value="more_than_10">{"> 10 years"}</option>
                        </select>
                      </div>

                      {/* Medication */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          On Medication?
                        </label>
                        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleConditionDetailChange(config.detailsKey, "medication", "yes")
                            }
                            className={clsx(
                              "flex-1 rounded-md py-1 text-xs font-semibold transition text-center",
                              details.medication === "yes"
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleConditionDetailChange(config.detailsKey, "medication", "no")
                            }
                            className={clsx(
                              "flex-1 rounded-md py-1 text-xs font-semibold transition text-center",
                              details.medication === "no"
                                ? "bg-amber-600 text-white shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* Controlled */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Is Condition Controlled?
                        </label>
                        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleConditionDetailChange(config.detailsKey, "controlled", true)
                            }
                            className={clsx(
                              "flex-1 rounded-md py-1 text-xs font-semibold transition text-center",
                              details.controlled === true
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleConditionDetailChange(config.detailsKey, "controlled", false)
                            }
                            className={clsx(
                              "flex-1 rounded-md py-1 text-xs font-semibold transition text-center",
                              details.controlled === false
                                ? "bg-amber-600 text-white shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Clinical Remarks / Prescriptions
                      </label>
                      <input
                        type="text"
                        value={details.notes || ""}
                        onChange={(e) =>
                          handleConditionDetailChange(config.detailsKey, "notes", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        placeholder="e.g. Taking Metformin 500mg BD, HbA1c 6.8%..."
                      />
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-600">Quick Save:</span>
                        <kbd className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
                          Ctrl+S
                        </kbd>
                        <span>or</span>
                        <kbd className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
                          Enter
                        </kbd>
                        <span className="hidden sm:inline">•</span>
                        <kbd className="hidden sm:inline-block rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
                          Esc
                        </kbd>
                        <span className="hidden sm:inline">to cancel</span>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setActiveCondition(null)}
                          disabled={isSubmitting}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveCondition(key)}
                          disabled={isSubmitting}
                          className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          {isSubmitting ? "Saving..." : isActive ? "Update Condition" : "Save Condition"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom Condition Input */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-sky-600" />
            Other Conditions
          </label>
          <textarea
            value={formData.other_conditions}
            onChange={(e) => handleTextChange("other_conditions", e.target.value)}
            onBlur={(e) => saveTextField("other_conditions", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
            placeholder="Enter any other medical conditions not listed above..."
          />
        </div>

        {/* Additional Information */}
        <div>
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-sky-600" />
            Additional Information
          </label>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Current Medications</label>
              <textarea
                value={formData.current_medications}
                onChange={(e) => handleTextChange("current_medications", e.target.value)}
                onBlur={(e) => saveTextField("current_medications", e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                placeholder="List medications with dosage..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Family History</label>
              <textarea
                value={formData.family_history}
                onChange={(e) => handleTextChange("family_history", e.target.value)}
                onBlur={(e) => saveTextField("family_history", e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                placeholder="Family medical history..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const rightContent = (
    <ConfirmedMedicalHistorySummary
      medicalHistory={null}
      formData={formData}
      onClear={handleClear}
      onEdit={handleEditCondition}
      onDelete={handleDeleteCondition}
      loading={loading}
    />
  );

  return (
    <ResizablePanel
      leftContent={leftContent}
      rightContent={rightContent}
      defaultLeftWidthPercent={67}
      minLeftWidthPercent={40}
      maxLeftWidthPercent={80}
      storageKey="optometry-medical-panel-width"
    />
  );
}
