"use client";

import { useState, useEffect } from "react";
import {
  Save,
  FileText,
  Stethoscope,
  ClipboardList,
  Calendar,
  MessageSquare,
  UserPlus,
  Check,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { TemplateSelector } from "../templates";
import {
  commonDiagnoses,
  diagnosisTemplates,
  type DiagnosisTemplate,
} from "../mock/mockTemplates";

interface DiagnosisNotesTabProps {
  patientId: string;
  visitId: string;
}

interface DiagnosisFormData {
  diagnosis: string;
  selectedDiagnoses: string[];
  plan: string;
  follow_up: string;
  follow_up_instructions: string;
  clinical_notes: string;
  referral_needed: boolean;
  referral_notes: string;
}

const initialFormData: DiagnosisFormData = {
  diagnosis: "",
  selectedDiagnoses: [],
  plan: "",
  follow_up: "",
  follow_up_instructions: "",
  clinical_notes: "",
  referral_needed: false,
  referral_notes: "",
};

const followUpOptions = [
  { value: "1_week", label: "1 Week" },
  { value: "2_weeks", label: "2 Weeks" },
  { value: "1_month", label: "1 Month" },
  { value: "3_months", label: "3 Months" },
  { value: "6_months", label: "6 Months" },
  { value: "1_year", label: "1 Year" },
  { value: "prn", label: "PRN (As Needed)" },
  { value: "referral", label: "After Referral" },
];

export function DiagnosisNotesTab({
  patientId,
  visitId,
}: DiagnosisNotesTabProps) {
  const [formData, setFormData] = useState<DiagnosisFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedData, setSavedData] = useState<DiagnosisFormData | null>(null);

  // Load saved data from localStorage on mount
  useEffect(() => {
    const storageKey = `diagnosis_${visitId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const data = JSON.parse(saved) as DiagnosisFormData;
      setSavedData(data);
      setFormData(data);
    }
  }, [visitId]);

  const handleDiagnosisToggle = (diagnosis: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedDiagnoses: prev.selectedDiagnoses.includes(diagnosis)
        ? prev.selectedDiagnoses.filter((d) => d !== diagnosis)
        : [...prev.selectedDiagnoses, diagnosis],
    }));
    setHasChanges(true);
  };

  const handleChange = (
    field: keyof DiagnosisFormData,
    value: string | boolean | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleApplyTemplate = (template: DiagnosisTemplate) => {
    setFormData((prev) => ({
      ...prev,
      selectedDiagnoses: [template.diagnosis],
      plan: template.treatment_plan,
      follow_up: template.follow_up,
      referral_needed: template.follow_up === "referral",
    }));
    setHasChanges(true);
    toast.success(`Applied "${template.name}" template`);
  };

  const handleSubmit = async () => {
    const allDiagnoses = [
      ...formData.selectedDiagnoses,
      ...(formData.diagnosis.trim() ? [formData.diagnosis.trim()] : []),
    ];

    if (allDiagnoses.length === 0) {
      toast.error("Please select or enter at least one diagnosis");
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to localStorage (in production, this would be an API call)
      const storageKey = `diagnosis_${visitId}`;
      const dataToSave = {
        ...formData,
        diagnosis: allDiagnoses.join(", "),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      setSavedData(dataToSave);
      setHasChanges(false);

      toast.success("Diagnosis and notes saved successfully");
    } catch (error) {
      toast.error("Failed to save diagnosis");
      console.error("Save diagnosis error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFollowUpLabel = (value: string) => {
    const option = followUpOptions.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  return (
    <div className="space-y-6">
      {/* Header with Template Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Diagnosis & Clinical Notes
          </h3>
          <p className="text-sm text-slate-600">
            Record diagnosis, treatment plan, and follow-up instructions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TemplateSelector<DiagnosisTemplate>
            templateType="diagnosis"
            templates={diagnosisTemplates}
            onApply={handleApplyTemplate}
            size="sm"
            buttonLabel="Templates"
          />
        </div>
      </div>

      {/* Diagnosis Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white p-2 shadow-sm">
              <Stethoscope className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Primary Diagnosis
              </h4>
              <p className="text-sm text-slate-600">
                Select common diagnoses or enter custom
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Quick Select Diagnoses */}
          <div>
            <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
              <FileText className="h-4 w-4 text-sky-500" />
              Common Diagnoses
              {formData.selectedDiagnoses.length > 0 && (
                <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                  {formData.selectedDiagnoses.length} selected
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {commonDiagnoses.map((diagnosis) => {
                const isSelected = formData.selectedDiagnoses.includes(diagnosis);
                return (
                  <button
                    key={diagnosis}
                    type="button"
                    onClick={() => handleDiagnosisToggle(diagnosis)}
                    className={clsx(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                      isSelected
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                    {diagnosis}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Diagnosis Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Additional Diagnosis (optional)
            </label>
            <input
              type="text"
              value={formData.diagnosis}
              onChange={(e) => handleChange("diagnosis", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="Enter additional diagnosis if not listed above..."
            />
          </div>
        </div>
      </div>

      {/* Treatment Plan Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white p-2 shadow-sm">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Treatment Plan
              </h4>
              <p className="text-sm text-slate-600">
                Recommendations and prescribed treatment
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <textarea
            value={formData.plan}
            onChange={(e) => handleChange("plan", e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            placeholder="Outline treatment plan and recommendations (e.g., Spectacle prescription, Eye drops, Lifestyle modifications, Further tests)..."
          />
        </div>
      </div>

      {/* Follow-up Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white p-2 shadow-sm">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Follow-up Schedule
              </h4>
              <p className="text-sm text-slate-600">
                When should the patient return?
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Follow-up Quick Select */}
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-700">
              Follow-up Period
            </label>
            <div className="flex flex-wrap gap-2">
              {followUpOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    handleChange("follow_up", option.value);
                    if (option.value === "referral") {
                      handleChange("referral_needed", true);
                    }
                  }}
                  className={clsx(
                    "rounded-lg border px-4 py-2 text-sm font-medium transition",
                    formData.follow_up === option.value
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Follow-up Instructions */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Additional Instructions (optional)
            </label>
            <textarea
              value={formData.follow_up_instructions}
              onChange={(e) =>
                handleChange("follow_up_instructions", e.target.value)
              }
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="Return if symptoms worsen, bring old glasses for comparison, etc..."
            />
          </div>
        </div>
      </div>

      {/* Clinical Notes Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white p-2 shadow-sm">
              <MessageSquare className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Clinical Notes
              </h4>
              <p className="text-sm text-slate-600">
                Detailed observations and patient discussion
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <textarea
            value={formData.clinical_notes}
            onChange={(e) => handleChange("clinical_notes", e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            placeholder="Detailed clinical observations, examination findings, patient concerns discussed, recommendations given, etc."
          />
        </div>
      </div>

      {/* Referral Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white p-2 shadow-sm">
                <UserPlus className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-900">
                  Referral
                </h4>
                <p className="text-sm text-slate-600">
                  Refer to ophthalmologist or specialist
                </p>
              </div>
            </div>

            {/* Referral Toggle */}
            <button
              type="button"
              onClick={() =>
                handleChange("referral_needed", !formData.referral_needed)
              }
              className={clsx(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
                formData.referral_needed
                  ? "bg-red-100 text-red-700 border border-red-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
              )}
            >
              {formData.referral_needed ? (
                <>
                  <Check className="h-4 w-4" />
                  Referral Needed
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  No Referral
                </>
              )}
            </button>
          </div>
        </div>

        {formData.referral_needed && (
          <div className="p-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Referral Details
            </label>
            <textarea
              value={formData.referral_notes}
              onChange={(e) => handleChange("referral_notes", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="Reason for referral, urgency level, preferred specialist/department, relevant findings to communicate..."
            />
          </div>
        )}
      </div>

      {/* Save Section */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <div className="text-sm">
          {savedData && !hasChanges ? (
            <span className="flex items-center gap-2 text-emerald-600">
              <Check className="h-4 w-4" />
              All changes saved
            </span>
          ) : hasChanges ? (
            <span className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              You have unsaved changes
            </span>
          ) : (
            <span className="text-slate-500">No changes to save</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            (!hasChanges &&
              formData.selectedDiagnoses.length === 0 &&
              !formData.diagnosis.trim())
          }
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
              Save Diagnosis & Notes
            </>
          )}
        </button>
      </div>

      {/* Summary Card */}
      {(formData.selectedDiagnoses.length > 0 || formData.follow_up) && (
        <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-sky-600" />
            <h5 className="font-semibold text-sky-900">Visit Summary</h5>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Diagnoses */}
            <div>
              <p className="text-xs font-medium text-sky-600 uppercase tracking-wide mb-1">
                Diagnoses
              </p>
              <div className="flex flex-wrap gap-1">
                {formData.selectedDiagnoses.map((d) => (
                  <span
                    key={d}
                    className="rounded bg-white px-2 py-0.5 text-sm text-slate-700 shadow-sm"
                  >
                    {d}
                  </span>
                ))}
                {formData.diagnosis.trim() && (
                  <span className="rounded bg-white px-2 py-0.5 text-sm text-slate-700 shadow-sm">
                    {formData.diagnosis.trim()}
                  </span>
                )}
              </div>
            </div>

            {/* Follow-up */}
            {formData.follow_up && (
              <div>
                <p className="text-xs font-medium text-sky-600 uppercase tracking-wide mb-1">
                  Follow-up
                </p>
                <span className="rounded bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
                  {getFollowUpLabel(formData.follow_up)}
                </span>
              </div>
            )}

            {/* Referral Status */}
            <div>
              <p className="text-xs font-medium text-sky-600 uppercase tracking-wide mb-1">
                Referral
              </p>
              <span
                className={clsx(
                  "rounded px-3 py-1 text-sm font-medium",
                  formData.referral_needed
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                )}
              >
                {formData.referral_needed ? "Yes - Referral Needed" : "No"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm text-sky-800">
          <strong>Note:</strong> These notes are saved locally for this visit.
          Complete the visit to persist all examination data to the
          patient&apos;s medical record. The doctor will review this information
          when generating the prescription.
        </p>
      </div>
    </div>
  );
}
