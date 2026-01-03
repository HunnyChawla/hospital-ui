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

const conditionGroups = [
  {
    id: "metabolic",
    label: "Metabolic Disorders",
    icon: Activity,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    conditions: [
      {
        key: "diabetes" as const,
        label: "Diabetes Mellitus",
        description: "Type 1 or Type 2 diabetes",
        detailsKey: "diabetesDetails" as const,
      },
      {
        key: "thyroid_disorder" as const,
        label: "Thyroid Disorder",
        description: "Hypo/Hyperthyroidism",
        detailsKey: "thyroidDetails" as const,
      },
    ],
  },
  {
    id: "cardiovascular",
    label: "Cardiovascular",
    icon: Heart,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    conditions: [
      {
        key: "hypertension" as const,
        label: "Hypertension",
        description: "High blood pressure",
        detailsKey: "hypertensionDetails" as const,
      },
      {
        key: "heart_disease" as const,
        label: "Heart Disease",
        description: "CAD, CHF, Arrhythmia, etc.",
        detailsKey: "heartDetails" as const,
      },
    ],
  },
  {
    id: "respiratory",
    label: "Respiratory",
    icon: Activity,
    color: "text-sky-600",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    conditions: [
      {
        key: "asthma" as const,
        label: "Asthma",
        description: "Bronchial asthma",
        detailsKey: "asthmaDetails" as const,
      },
      {
        key: "tuberculosis" as const,
        label: "Tuberculosis",
        description: "Active or history of TB",
        detailsKey: "tbDetails" as const,
      },
    ],
  },
  {
    id: "organs",
    label: "Organ-Specific",
    icon: Stethoscope,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    conditions: [
      {
        key: "kidney_disease" as const,
        label: "Kidney Disease",
        description: "CKD, Dialysis, Transplant",
        detailsKey: "kidneyDetails" as const,
      },
      {
        key: "liver_disease" as const,
        label: "Liver Disease",
        description: "Hepatitis, Cirrhosis, etc.",
        detailsKey: "liverDetails" as const,
      },
    ],
  },
  {
    id: "serious",
    label: "Serious Conditions",
    icon: AlertCircle,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    conditions: [
      {
        key: "cancer" as const,
        label: "Cancer",
        description: "Any type of malignancy",
        detailsKey: "cancerDetails" as const,
      },
      {
        key: "hiv_aids" as const,
        label: "HIV/AIDS",
        description: "HIV positive status",
        detailsKey: "hivDetails" as const,
      },
    ],
  },
];

const quickPatterns = [
  { id: "healthy", label: "No Conditions", icon: Check },
  { id: "diabetic", label: "Diabetic Only", icon: Activity },
  { id: "diabetic_htn", label: "DM + HTN", icon: Heart },
  { id: "elderly", label: "Elderly Pattern", icon: Users },
];

export function MedicalHistoryTab({ patientId, visitId }: MedicalHistoryTabProps) {
  const dispatch = useAppDispatch();
  const [medicalConditions, setMedicalConditions] = useState<MedicalConditionRecord[]>([]);
  const [formData, setFormData] = useState<MedicalHistoryFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [conditionRecordMap, setConditionRecordMap] = useState<Map<string, MedicalConditionRecord>>(new Map());

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

  const handleConditionToggle = async (
    key: keyof MedicalHistoryFormData,
    value: boolean
  ) => {
    // Get the current details before updating form
    const detailsKey = getDetailsKeyForCondition(key as string);
    const currentDetails = detailsKey ? (formData as any)[detailsKey] : {};
    
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    
    // Remove immediate save - will be saved with save button
  };

  const handleConditionDetailChange = async (
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
    
    // Remove immediate save - will be saved with save button
  };

  const handleTextChange = (key: keyof MedicalHistoryFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleTextFieldSave = async (fieldName: string, value: string) => {
    const optometristId = localStorage.getItem("user_id");
    if (!optometristId) {
      toast.error("Optometrist ID not found");
      return;
    }

    try {
      const existingRecord = conditionRecordMap.get(fieldName);

      if (value.trim()) {
        // Create or update
        if (existingRecord) {
          await dispatch(updateMedicalCondition({
            id: existingRecord.id,
            data: { remarks: value, status: true },
          })).unwrap();
        } else {
          const created = await dispatch(addMedicalCondition({
            data: {
              patient_id: patientId,
              optometrist_id: optometristId,
              visit_id: visitId || null,
              condition_name: fieldName,
              status: true,
              remarks: value,
            },
          })).unwrap();

          setConditionRecordMap(prev => new Map(prev).set(fieldName, created));
        }
      } else {
        // Delete if empty
        if (existingRecord) {
          await dispatch(deleteMedicalCondition({ id: existingRecord.id })).unwrap();
          setConditionRecordMap(prev => {
            const newMap = new Map(prev);
            newMap.delete(fieldName);
            return newMap;
          });
        }
      }

      setHasChanges(false);
      toast.success("Saved successfully");
    } catch (error) {
      toast.error("Failed to save");
      console.error("Save error:", error);
    }
  };

  const handleApplyPattern = (patternId: string) => {
    const pattern = medicalHistoryPatterns.find((p) => p.id === `pattern_${patternId}`);
    if (pattern) {
      setFormData((prev) => ({
        ...prev,
        diabetes: pattern.conditions.diabetes,
        hypertension: pattern.conditions.hypertension,
        heart_disease: pattern.conditions.heart_disease,
        thyroid_disorder: pattern.conditions.thyroid_disorder,
        asthma: pattern.conditions.asthma,
        tuberculosis: pattern.conditions.tuberculosis,
        kidney_disease: pattern.conditions.kidney_disease,
        liver_disease: pattern.conditions.liver_disease,
        cancer: pattern.conditions.cancer,
        hiv_aids: pattern.conditions.hiv_aids,
      }));
      setHasChanges(true);
      toast.success(`Applied "${pattern.name}" pattern`);
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
      toast.success("Medical history cleared");
    } catch (error) {
      toast.error("Failed to clear medical history");
      console.error("Clear error:", error);
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

      // Handle text fields
      const textFields = [
        { key: "other_conditions", value: formData.other_conditions },
        { key: "current_medications", value: formData.current_medications },
        { key: "family_history", value: formData.family_history },
        { key: "lifestyle_notes", value: formData.lifestyle_notes },
      ];

      for (const field of textFields) {
        const existingRecord = conditionRecordMap.get(field.key);
        
        if (field.value.trim()) {
          // Create or update
          if (existingRecord) {
            savePromises.push(
              dispatch(updateMedicalCondition({
                id: existingRecord.id,
                data: { remarks: field.value, status: true },
              })).unwrap()
            );
          } else {
            savePromises.push(
              dispatch(addMedicalCondition({
                data: {
                  patient_id: patientId,
                  optometrist_id: optometristId,
                  visit_id: visitId || null,
                  condition_name: field.key,
                  status: true,
                  remarks: field.value,
                },
              })).unwrap()
            );
          }
        } else {
          // Delete if empty
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
      
      if (error.response?.status === 201) {
        // API returned 201 but Redux Toolkit unwrap still threw
        setHasChanges(false);
        toast.success("All changes saved successfully");
      } else if (error.response?.data?.message) {
        toast.error(`Failed to save: ${error.response.data.message}`);
      } else if (error.message) {
        toast.error(`Failed to save: ${error.message}`);
      } else {
        toast.error("Failed to save changes");
      }
    } finally {
      setIsSubmitting(false);
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
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-3 h-8 w-8 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
        <p className="text-slate-600">Loading medical history...</p>
      </div>
    );
  }

  const activeCount = getActiveConditionsCount();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column - Input Form (2/3 width on large screens) */}
      <div className="lg:col-span-2">
        <div className="space-y-6">
          {/* Header with Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Medical History
              </h3>
              <p className="text-sm text-slate-600">
                Record systemic conditions and medications
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchConditions}
                disabled={isLoading || isSubmitting}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                <RefreshCw className={clsx("h-4 w-4", isLoading && "animate-spin")} />
                Refresh
              </button>
              <button
                type="button"
                onClick={saveAllChanges}
                disabled={!hasChanges || isSubmitting}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  hasChanges 
                    ? "bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50" 
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

      {/* Quick Patterns */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-slate-700">
              Quick Patterns
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Click to apply common condition sets
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickPatterns.map((pattern) => {
            const Icon = pattern.icon;
            return (
              <button
                key={pattern.id}
                type="button"
                onClick={() => handleApplyPattern(pattern.id)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition"
              >
                <Icon className="h-4 w-4" />
                {pattern.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditions Summary */}
      <div className="flex items-center gap-4 rounded-lg bg-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-slate-600" />
          <span className="font-medium text-slate-700">
            Active Conditions:
          </span>
        </div>
        <div
          className={clsx(
            "rounded-full px-3 py-1 text-sm font-semibold",
            activeCount === 0
              ? "bg-emerald-100 text-emerald-700"
              : activeCount <= 2
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
          )}
        >
          {activeCount === 0 ? "None" : activeCount}
        </div>
        {hasChanges && (
          <span className="ml-auto text-xs text-amber-600 font-medium">
            {isSubmitting ? "Saving..." : "Unsaved changes"}
          </span>
        )}
      </div>

      {/* Condition Groups */}
      <div className="space-y-4">
        {conditionGroups.map((group) => {
          const Icon = group.icon;
          return (
            <div
              key={group.id}
              className={clsx(
                "rounded-xl border bg-white shadow-sm overflow-hidden",
                group.borderColor
              )}
            >
              {/* Group Header */}
              <div
                className={clsx(
                  "flex items-center gap-3 px-5 py-3",
                  group.bgColor
                )}
              >
                <Icon className={clsx("h-5 w-5", group.color)} />
                <span className="font-semibold text-slate-900">
                  {group.label}
                </span>
              </div>

              {/* Conditions */}
              <div className="divide-y divide-slate-100">
                {group.conditions.map((condition) => {
                  const isActive =
                    formData[condition.key as keyof MedicalHistoryFormData] as boolean;
                  return (
                    <div key={condition.key} className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <ToggleSwitch
                            checked={isActive}
                            onChange={(checked) =>
                              handleConditionToggle(condition.key, checked)
                            }
                            label={condition.label}
                            description={condition.description}
                            showLabels
                            onLabel="Yes"
                            offLabel="No"
                          />
                        </div>
                      </div>

                      {/* Conditional Details - shown when condition is active */}
                      {isActive && (
                        <div className="mt-3 ml-14 grid grid-cols-1 gap-3 md:grid-cols-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Duration
                            </label>
                            <select
                              value={
                                (formData[condition.detailsKey] as ConditionDetails)
                                  ?.duration || ""
                              }
                              onChange={(e) =>
                                handleConditionDetailChange(
                                  condition.detailsKey,
                                  "duration",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                            >
                              <option value="">Select...</option>
                              <option value="less_than_1">{"< 1 year"}</option>
                              <option value="1_to_5">1-5 years</option>
                              <option value="5_to_10">5-10 years</option>
                              <option value="more_than_10">{"> 10 years"}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              On Medication?
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleConditionDetailChange(
                                    condition.detailsKey,
                                    "medication",
                                    "yes"
                                  )
                                }
                                className={clsx(
                                  "flex-1 rounded-lg border px-3 py-1.5 text-sm transition",
                                  (formData[condition.detailsKey] as ConditionDetails)
                                    ?.medication === "yes"
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-medium"
                                    : "border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                                )}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleConditionDetailChange(
                                    condition.detailsKey,
                                    "medication",
                                    "no"
                                  )
                                }
                                className={clsx(
                                  "flex-1 rounded-lg border px-3 py-1.5 text-sm transition",
                                  (formData[condition.detailsKey] as ConditionDetails)
                                    ?.medication === "no"
                                    ? "bg-slate-100 border-slate-400 text-slate-700 font-medium"
                                    : "border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                No
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Well Controlled?
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleConditionDetailChange(
                                    condition.detailsKey,
                                    "controlled",
                                    true
                                  )
                                }
                                className={clsx(
                                  "flex-1 rounded-lg border px-3 py-1.5 text-sm transition",
                                  (formData[condition.detailsKey] as ConditionDetails)
                                    ?.controlled === true
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-medium"
                                    : "border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                                )}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleConditionDetailChange(
                                    condition.detailsKey,
                                    "controlled",
                                    false
                                  )
                                }
                                className={clsx(
                                  "flex-1 rounded-lg border px-3 py-1.5 text-sm transition",
                                  (formData[condition.detailsKey] as ConditionDetails)
                                    ?.controlled === false
                                    ? "bg-amber-50 border-amber-500 text-amber-700 font-medium"
                                    : "border-slate-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700"
                                )}
                              >
                                No
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Remarks
                            </label>
                            <textarea
                              value={
                                (formData[condition.detailsKey] as ConditionDetails)
                                  ?.notes || ""
                              }
                              onChange={(e) =>
                                handleConditionDetailChange(
                                  condition.detailsKey,
                                  "notes",
                                  e.target.value
                                )
                              }
                              rows={1}
                              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20 resize-none"
                              placeholder="Add notes..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Other Conditions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            Other Conditions
          </label>
          <textarea
            value={formData.other_conditions}
            onChange={(e) =>
              handleTextChange("other_conditions", e.target.value)
            }
            onBlur={() => handleTextFieldSave("other_conditions", formData.other_conditions)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            placeholder="Any other medical conditions not listed above..."
          />
        </div>

        {/* Current Medications */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Pill className="h-4 w-4 text-sky-500" />
            Current Medications
          </label>
          <textarea
            value={formData.current_medications}
            onChange={(e) =>
              handleTextChange("current_medications", e.target.value)
            }
            onBlur={() => handleTextFieldSave("current_medications", formData.current_medications)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            placeholder="List medications with dosage (e.g., Metformin 500mg BD)..."
          />
        </div>

        {/* Family History */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Users className="h-4 w-4 text-purple-500" />
            Family History
          </label>
          <textarea
            value={formData.family_history}
            onChange={(e) => handleTextChange("family_history", e.target.value)}
            onBlur={() => handleTextFieldSave("family_history", formData.family_history)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            placeholder="Family history of diabetes, glaucoma, retinal diseases..."
          />
        </div>

        {/* Lifestyle Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Activity className="h-4 w-4 text-emerald-500" />
            Lifestyle & Habits
          </label>
          <textarea
            value={formData.lifestyle_notes}
            onChange={(e) => handleTextChange("lifestyle_notes", e.target.value)}
            onBlur={() => handleTextFieldSave("lifestyle_notes", formData.lifestyle_notes)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            placeholder="Smoking, alcohol, occupation, screen time..."
          />
        </div>
      </div>

          {/* Auto-save indicator */}
          <div className="flex items-center justify-center border-t border-slate-200 pt-4">
            <div className="text-sm text-slate-500">
              {hasChanges ? (
                <span className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  {isSubmitting ? "Saving changes..." : "Unsaved changes"}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-emerald-600">
                  <Check className="h-4 w-4" />
                  All changes saved
                </span>
              )}
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
