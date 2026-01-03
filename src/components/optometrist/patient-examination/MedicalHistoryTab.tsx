"use client";

import { useState, useEffect } from "react";
import { medicalHistoryApi } from "@/services/medicalHistoryApi";
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
import type { MedicalHistoryRecord } from "@/types";
import { ToggleSwitch } from "../shared";
import { CopyFromPreviousButton } from "../templates";
import {
  medicalHistoryPatterns,
  type MedicalHistoryPattern,
} from "../mock/mockTemplates";
import { ConfirmedMedicalHistorySummary } from "./ConfirmedMedicalHistorySummary";

interface MedicalHistoryTabProps {
  patientId: string;
}

interface ConditionDetails {
  duration?: string;
  medication?: string;
  controlled?: boolean;
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

export function MedicalHistoryTab({ patientId }: MedicalHistoryTabProps) {
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryRecord | null>(null);
  const [formData, setFormData] = useState<MedicalHistoryFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch medical history on mount
  useEffect(() => {
    fetchMedicalHistory();
  }, [patientId]);

  const fetchMedicalHistory = async () => {
    setIsLoading(true);
    try {
      const data = await medicalHistoryApi.get(patientId);
      setMedicalHistory(data);

      if (data) {
        setFormData({
          diabetes: data.diabetes || false,
          diabetesDetails: {},
          thyroid_disorder: data.thyroid_disorder || false,
          thyroidDetails: {},
          hypertension: data.hypertension || false,
          hypertensionDetails: {},
          heart_disease: data.heart_disease || false,
          heartDetails: {},
          asthma: data.asthma || false,
          asthmaDetails: {},
          tuberculosis: data.tuberculosis || false,
          tbDetails: {},
          kidney_disease: data.kidney_disease || false,
          kidneyDetails: {},
          liver_disease: data.liver_disease || false,
          liverDetails: {},
          cancer: data.cancer || false,
          cancerDetails: {},
          hiv_aids: data.hiv_aids || false,
          hivDetails: {},
          other_conditions: data.other_conditions || "",
          current_medications: data.current_medications || "",
          family_history: data.family_history || "",
          lifestyle_notes: data.lifestyle_notes || "",
        });
      }
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to fetch medical history:", error);
      toast.error("Failed to load medical history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConditionToggle = (
    key: keyof MedicalHistoryFormData,
    value: boolean
  ) => {
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

  const handleCopyPrevious = (data: unknown) => {
    if (data && typeof data === "object") {
      const prevData = data as MedicalHistoryRecord;
      setFormData((prev) => ({
        ...prev,
        diabetes: prevData.diabetes || false,
        hypertension: prevData.hypertension || false,
        heart_disease: prevData.heart_disease || false,
        thyroid_disorder: prevData.thyroid_disorder || false,
        asthma: prevData.asthma || false,
        tuberculosis: prevData.tuberculosis || false,
        kidney_disease: prevData.kidney_disease || false,
        liver_disease: prevData.liver_disease || false,
        cancer: prevData.cancer || false,
        hiv_aids: prevData.hiv_aids || false,
        other_conditions: prevData.other_conditions || "",
        current_medications: prevData.current_medications || "",
        family_history: prevData.family_history || "",
        lifestyle_notes: prevData.lifestyle_notes || "",
      }));
      setHasChanges(true);
      toast.success("Previous medical history loaded");
    }
  };

  const handleClear = () => {
    if (!confirm("Are you sure you want to clear all medical history data?")) return;

    setFormData(initialFormData);
    setHasChanges(true);
    toast.success("Medical history cleared");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const data = await medicalHistoryApi.upsert({
        patient_id: patientId,
        diabetes: formData.diabetes,
        hypertension: formData.hypertension,
        thyroid_disorder: formData.thyroid_disorder,
        heart_disease: formData.heart_disease,
        asthma: formData.asthma,
        tuberculosis: formData.tuberculosis,
        kidney_disease: formData.kidney_disease,
        liver_disease: formData.liver_disease,
        cancer: formData.cancer,
        hiv_aids: formData.hiv_aids,
        other_conditions: formData.other_conditions || null,
        current_medications: formData.current_medications || null,
        family_history: formData.family_history || null,
        lifestyle_notes: formData.lifestyle_notes || null,
      });

      setMedicalHistory(data);
      toast.success("Medical history saved successfully");
      setHasChanges(false);
      await fetchMedicalHistory(); // Refresh data
    } catch (error) {
      toast.error("Failed to save medical history");
      console.error("Update medical history error:", error);
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
                onClick={fetchMedicalHistory}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                <RefreshCw className={clsx("h-4 w-4", isLoading && "animate-spin")} />
                Refresh
              </button>
              <CopyFromPreviousButton
                patientId={patientId}
                dataType="medical_history"
                onDataLoaded={handleCopyPrevious}
                size="sm"
              />
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
            Unsaved changes
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
                        <div className="mt-3 ml-14 grid grid-cols-1 gap-3 md:grid-cols-3">
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
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            placeholder="Smoking, alcohol, occupation, screen time..."
          />
        </div>
      </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <div className="text-sm text-slate-500">
              {hasChanges ? (
                <span className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  You have unsaved changes
                </span>
              ) : (
                <span className="flex items-center gap-2 text-emerald-600">
                  <Check className="h-4 w-4" />
                  All changes saved
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !hasChanges}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:from-sky-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Medical History
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column - Summary (1/3 width on large screens) */}
      <div className="lg:col-span-1">
        <ConfirmedMedicalHistorySummary
          medicalHistory={medicalHistory}
          formData={formData}
          onClear={handleClear}
          loading={isLoading}
          hasChanges={hasChanges}
        />
      </div>
    </div>
  );
}
