"use client";

import {
  Stethoscope,
  Activity,
  Heart,
  AlertCircle,
  Pill,
  Users,
  FileText,
  Trash2,
  Clock,
  Check,
  X,
  Pencil,
} from "lucide-react";
import clsx from "clsx";
import type { MedicalHistoryRecord } from "@/types";

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

interface ConfirmedMedicalHistorySummaryProps {
  medicalHistory: MedicalHistoryRecord | null;
  formData: MedicalHistoryFormData;
  onClear: () => void;
  onEdit?: (conditionKey: string) => void;
  onDelete?: (conditionKey: string) => void;
  loading?: boolean;
}

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

const durationLabels: Record<string, string> = {
  less_than_1: "< 1 year",
  "1_to_5": "1-5 years",
  "5_to_10": "5-10 years",
  more_than_10: "> 10 years",
};

export function ConfirmedMedicalHistorySummary({
  medicalHistory,
  formData,
  onClear,
  onEdit,
  onDelete,
  loading = false,
}: ConfirmedMedicalHistorySummaryProps) {
  const getActiveConditions = () => {
    const active: Array<{
      key: keyof typeof conditionConfig;
      config: (typeof conditionConfig)[keyof typeof conditionConfig];
      details: ConditionDetails;
    }> = [];

    (Object.keys(conditionConfig) as Array<keyof typeof conditionConfig>).forEach((key) => {
      if (formData[key as keyof MedicalHistoryFormData]) {
        const config = conditionConfig[key];
        const details = formData[config.detailsKey] as ConditionDetails;
        active.push({ key, config, details });
      }
    });

    return active;
  };

  const activeConditions = getActiveConditions();
  const hasTextContent =
    formData.other_conditions ||
    formData.current_medications ||
    formData.family_history ||
    formData.lifestyle_notes;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-semibold text-slate-700">Medical History</h3>
            {activeConditions.length > 0 && (
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-medium text-white",
                  activeConditions.length <= 2
                    ? "bg-amber-500"
                    : "bg-red-500"
                )}
              >
                {activeConditions.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 h-8 w-8 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-600">Loading...</p>
          </div>
        ) : activeConditions.length === 0 && !hasTextContent ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Stethoscope className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-600 font-medium">No conditions recorded</p>
            <p className="text-xs text-slate-500 mt-1">
              Toggle conditions from the form
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active Conditions */}
            {activeConditions.map(({ key, config, details }) => {
              const Icon = config.icon;
              return (
                <div
                  key={key}
                  className={clsx(
                    "rounded-lg border p-3",
                    config.borderColor,
                    config.bgColor
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={clsx("h-4 w-4 mt-0.5", config.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900">
                          {config.label}
                        </div>
                        <div className="flex items-center gap-1">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(key)}
                              className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-sky-600 transition"
                              title={`Edit ${config.label}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(key)}
                              className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-red-600 transition"
                              title={`Delete ${config.label}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="mt-2 space-y-1">
                        {details.duration && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Clock className="h-3 w-3" />
                            <span>{durationLabels[details.duration] || details.duration}</span>
                          </div>
                        )}

                        {details.medication && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Pill className="h-3 w-3 text-sky-500" />
                            <span
                              className={clsx(
                                "font-medium",
                                details.medication === "yes"
                                  ? "text-emerald-700"
                                  : "text-slate-600"
                              )}
                            >
                              {details.medication === "yes"
                                ? "On Medication"
                                : "No Medication"}
                            </span>
                          </div>
                        )}

                        {details.controlled !== undefined && (
                          <div className="flex items-center gap-1.5 text-xs">
                            {details.controlled ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-500" />
                                <span className="font-medium text-emerald-700">
                                  Well Controlled
                                </span>
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3 text-amber-500" />
                                <span className="font-medium text-amber-700">
                                  Not Well Controlled
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {details.notes && (
                          <div className="flex items-start gap-1.5 text-xs text-slate-600">
                            <FileText className="h-3 w-3 mt-0.5 text-slate-500" />
                            <span className="whitespace-pre-wrap">{details.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Text Content */}
            {formData.other_conditions && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-slate-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 mb-1">
                      Other Conditions
                    </div>
                    <div className="text-xs text-slate-600 whitespace-pre-wrap">
                      {formData.other_conditions}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.current_medications && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                <div className="flex items-start gap-2">
                  <Pill className="h-4 w-4 mt-0.5 text-sky-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 mb-1">
                      Current Medications
                    </div>
                    <div className="text-xs text-slate-600 whitespace-pre-wrap">
                      {formData.current_medications}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.family_history && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-0.5 text-purple-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 mb-1">
                      Family History
                    </div>
                    <div className="text-xs text-slate-600 whitespace-pre-wrap">
                      {formData.family_history}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.lifestyle_notes && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-start gap-2">
                  <Activity className="h-4 w-4 mt-0.5 text-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 mb-1">
                      Lifestyle & Habits
                    </div>
                    <div className="text-xs text-slate-600 whitespace-pre-wrap">
                      {formData.lifestyle_notes}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {(activeConditions.length > 0 || hasTextContent) && (
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onClear}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
