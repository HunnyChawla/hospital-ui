"use client";

import { useState, useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import {
  fetchMedicalConditions,
  addMedicalCondition,
  updateMedicalCondition,
  deleteMedicalCondition,
} from "@/redux/optometryDataSlice";
import {
  Save,
  Heart,
  Activity,
  Pill,
  Users,
  Sparkles,
  Check,
  AlertCircle,
  Stethoscope,
  RefreshCw,
  Clock,
  FileText,
  Plus,
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

interface MedicalHistoryTabProps {
  patientId: string;
  visitId?: string;
}

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

export function MedicalHistoryTab({ patientId, visitId }: MedicalHistoryTabProps) {
  const dispatch = useAppDispatch();
  const [medicalConditions, setMedicalConditions] = useState<MedicalConditionRecord[]>([]);
  const [formData, setFormData] = useState<MedicalHistoryFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [conditionRecordMap, setConditionRecordMap] = useState<Map<string, MedicalConditionRecord>>(new Map());
  const [activeCondition, setActiveCondition] = useState<string | null>(null);

  // Fetch medical conditions on mount
  useEffect(() => {
    fetchConditions();
  }, [patientId]);

  const fetchConditions = async () => {
    setIsLoading(true);
    try {
      const result = await dispatch(fetchMedicalConditions({ patient_id: patientId })).unwrap();
      
      // Handle different possible response formats
      let conditions: MedicalConditionRecord[] = [];
      
      if (Array.isArray(result)) {
        // Direct array response
        conditions = result;
      } else if (result && typeof result === 'object') {
        // Object with data/items properties
        const resultObj = result as any;
        if (Array.isArray(resultObj.data)) {
          conditions = resultObj.data;
        } else if (Array.isArray(resultObj.items)) {
          conditions = resultObj.items;
        }
      }
      
      setMedicalConditions(conditions);

      // Build form data from fetched conditions
      const recordMap = new Map<string, MedicalConditionRecord>();
      const newFormData = { ...initialFormData };

      conditions.forEach((condition) => {
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
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to fetch medical conditions:", error);
      toast.error("Failed to load medical conditions");
    } finally {
      setIsLoading(false);
    }
  };

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
    setHasChanges(true);
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
    setHasChanges(true);
  };

  const handleTextChange = (key: keyof MedicalHistoryFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
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

  const saveAllChanges = async () => {
    const optometristId = localStorage.getItem("user_id");
    if (!optometristId) {
      toast.error("Optometrist ID not found");
      return;
    }

    setIsSubmitting(true);
    try {
      const savePromises: Promise<any>[] = [];
      
      // Process each condition
      for (const [conditionType, detailsKey] of Object.entries({
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
      })) {
        const status = (formData as any)[conditionType] as boolean;
        const details = (formData as any)[detailsKey] as ConditionDetails;
        const existingRecord = conditionRecordMap.get(conditionType);

        if (status) {
          // Create or update condition
          if (existingRecord) {
            savePromises.push(
              dispatch(updateMedicalCondition({
                id: existingRecord.id,
                data: {
                  status: true,
                  duration: details.duration || null,
                  on_medication: details.medication === "yes",
                  is_controlled: details.controlled ?? null,
                  remarks: details.notes || null,
                },
              })).unwrap()
            );
          } else {
            savePromises.push(
              dispatch(addMedicalCondition({
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
              })).unwrap()
            );
          }
        } else {
          // Delete condition if it exists
          if (existingRecord) {
            savePromises.push(
              dispatch(deleteMedicalCondition({ id: existingRecord.id })).unwrap()
            );
          }
        }
      }

      await Promise.all(savePromises);
      
      // Refresh data to get updated records
      await fetchConditions();
      
      setHasChanges(false);
      toast.success("All changes saved successfully");
    } catch (error: any) {
      console.error("Batch save error:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      setHasChanges(false);
      setActiveCondition(null);
      toast.success("Medical history cleared");
    } catch (error) {
      toast.error("Failed to clear medical history");
      console.error("Clear error:", error);
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-lg overflow-hidden backdrop-blur-sm animate-in fade-in duration-300">
        <div className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-100 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 shadow-md shadow-sky-500/30">
                <Stethoscope className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Medical History</h3>
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="mx-auto h-10 w-10 border-3 border-sky-600/30 border-t-sky-600 rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-600">Loading medical history...</p>
        </div>
      </div>
    );
  }

  const activeCount = getActiveConditionsCount();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Left Column: Add Medical Conditions Section (2/3 width on large screens) */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-slate-200/60 bg-white shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
          {/* Section Header */}
          <div className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-100 px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 shadow-md shadow-sky-500/30">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Add Medical Conditions
                </h3>
              </div>
              {hasChanges && (
                <button
                  type="button"
                  onClick={saveAllChanges}
                  disabled={!hasChanges || isSubmitting}
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all shadow-md",
                    hasChanges 
                      ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-700 hover:to-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 shadow-sky-500/30" 
                      : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                  )}
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* Medical Conditions */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                Common Medical Conditions
              </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {allConditions.map((condition) => {
                const Icon = condition.icon;
                const isActive = (formData as any)[condition.id];
                const isDisabled = Boolean(activeCondition && activeCondition !== condition.id);
                
                return (
                  <button
                    key={condition.id}
                    type="button"
                    onClick={() => handleConditionButtonClick(condition.id)}
                    disabled={isDisabled}
                    className={clsx(
                      "w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 text-left",
                      activeCondition === condition.id
                        ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white border-sky-600 shadow-lg shadow-sky-500/30 scale-105"
                        : isActive
                        ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-300 shadow-sm"
                        : isDisabled
                        ? "bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-sky-300 hover:text-sky-700 hover:shadow-md hover:scale-105 active:scale-95"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={clsx("h-3.5 w-3.5 flex-shrink-0", isDisabled && "text-slate-400")} />
                      <span className="truncate">{condition.label}</span>
                      {isActive && activeCondition !== condition.id && !isDisabled && (
                        <Check className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
              {/* Inline Form - appears below the grid */}
              {activeCondition && (
                <div className="mt-4 rounded-lg border border-sky-200/60 bg-gradient-to-br from-white to-sky-50/20 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-3">
                  {Object.entries(conditionConfig).map(([key, config]) => {
                    if (key !== activeCondition) return null;
                    
                    const Icon = config.icon;
                    const isActive = (formData as any)[key];
                    const details = (formData as any)[config.detailsKey] as ConditionDetails;
                    
                    return (
                      <div key={key} className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <div className={clsx("rounded-lg p-1 shadow-sm border", config.borderColor)}>
                            <Icon className={clsx("h-3 w-3", config.color)} />
                          </div>
                          <h4 className="text-xs font-bold text-slate-900">{config.label}</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Duration
                            </label>
                            <select
                              value={details.duration || ""}
                              onChange={(e) =>
                                handleConditionDetailChange(config.detailsKey, "duration", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            >
                              <option value="">Select...</option>
                              <option value="less_than_1">{"< 1 year"}</option>
                              <option value="1_to_5">1-5 years</option>
                              <option value="5_to_10">5-10 years</option>
                              <option value="more_than_10">{"> 10 years"}</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Medication
                            </label>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleConditionDetailChange(config.detailsKey, "medication", "yes")
                                }
                                className={clsx(
                                  "flex-1 rounded-lg border px-2 py-1.5 text-xs transition",
                                  details.medication === "yes"
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-medium"
                                    : "bg-white border-slate-300 hover:bg-emerald-50"
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
                                  "flex-1 rounded-lg border px-2 py-1.5 text-xs transition",
                                  details.medication === "no"
                                    ? "bg-slate-50 border-slate-300 text-slate-700 font-medium"
                                    : "bg-white border-slate-300 hover:bg-slate-50"
                                )}
                              >
                                No
                              </button>
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Controlled
                            </label>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleConditionDetailChange(config.detailsKey, "controlled", true)
                                }
                                className={clsx(
                                  "flex-1 rounded-lg border px-2 py-1.5 text-xs transition",
                                  details.controlled === true
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-medium"
                                    : "bg-white border-slate-300 hover:bg-emerald-50"
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
                                  "flex-1 rounded-lg border px-2 py-1.5 text-xs transition",
                                  details.controlled === false
                                    ? "bg-amber-50 border-amber-300 text-amber-700 font-medium"
                                    : "bg-white border-slate-300 hover:bg-amber-50"
                                )}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Notes
                          </label>
                          <textarea
                            value={details.notes || ""}
                            onChange={(e) =>
                              handleConditionDetailChange(config.detailsKey, "notes", e.target.value)
                            }
                            rows={2}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                            placeholder="Add notes..."
                          />
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setActiveCondition(null)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, [key]: true }));
                              setHasChanges(true);
                              setActiveCondition(null);
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:from-sky-700 hover:to-blue-700 transition"
                          >
                            <Check className="h-3.5 w-3.5" />
                            {isActive ? "Update" : "Add"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
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
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                    placeholder="Family medical history..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Summary (1/3 width on large screens) */}
      <div className="lg:col-span-1">
        <ConfirmedMedicalHistorySummary
          medicalHistory={null}
          formData={formData}
          onClear={handleClear}
          loading={isLoading}
          hasChanges={hasChanges}
        />
      </div>
    </div>
  );
}
