"use client";

import { useState, useMemo } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { addDrugAllergy, deleteDrugAllergy } from "@/redux/optometryDataSlice";
import {
  Plus,
  Trash2,
  AlertTriangle,
  Search,
  X,
  Check,
  ShieldCheck,
  Pill,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { DrugAllergyRecord } from "@/types";
import { SeveritySelector } from "../shared";
import { commonDrugs, commonReactions } from "../mock/mockTemplates";

interface DrugAllergyTabProps {
  patientId: string;
  drugAllergies: DrugAllergyRecord[];
  loading: boolean;
  onRefresh: () => void;
}

type Severity = "mild" | "moderate" | "severe";

interface AllergyFormData {
  drug_name: string;
  reaction: string;
  severity: Severity;
  notes: string;
}

const initialFormData: AllergyFormData = {
  drug_name: "",
  reaction: "",
  severity: "moderate",
  notes: "",
};

export function DrugAllergyTab({
  patientId,
  drugAllergies,
  loading,
  onRefresh,
}: DrugAllergyTabProps) {
  const dispatch = useAppDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<AllergyFormData>(initialFormData);
  const [drugSearch, setDrugSearch] = useState("");
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);
  const [selectedReactions, setSelectedReactions] = useState<string[]>([]);

  // Filter drugs based on search
  const filteredDrugs = useMemo(() => {
    if (!drugSearch.trim()) return commonDrugs.slice(0, 8);
    const search = drugSearch.toLowerCase();
    return commonDrugs.filter((drug) => drug.toLowerCase().includes(search));
  }, [drugSearch]);

  const hasSevereAllergies = drugAllergies.some((a) => a.severity === "severe");
  const allergyCount = drugAllergies.length;

  const handleDrugSelect = (drug: string) => {
    setFormData((prev) => ({ ...prev, drug_name: drug }));
    setDrugSearch(drug);
    setShowDrugDropdown(false);
  };

  const handleReactionToggle = (reaction: string) => {
    setSelectedReactions((prev) =>
      prev.includes(reaction)
        ? prev.filter((r) => r !== reaction)
        : [...prev, reaction]
    );
  };

  const handleSubmit = async () => {
    const drugName = formData.drug_name.trim() || drugSearch.trim();
    const reactions = [
      ...selectedReactions,
      ...(formData.reaction.trim() ? [formData.reaction.trim()] : []),
    ];

    if (!drugName) {
      toast.error("Please enter or select a drug name");
      return;
    }

    if (reactions.length === 0) {
      toast.error("Please select or enter at least one reaction");
      return;
    }

    setIsSubmitting(true);

    try {
      await dispatch(
        addDrugAllergy({
          data: {
            patient_id: patientId,
            drug_name: drugName,
            reaction: reactions.join(", "),
            severity: formData.severity,
            notes: formData.notes || null,
          },
        })
      ).unwrap();

      toast.success("Drug allergy added successfully");
      resetForm();
      onRefresh();
    } catch (error) {
      toast.error("Failed to add drug allergy");
      console.error("Add drug allergy error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (allergyId: string) => {
    if (!confirm("Are you sure you want to delete this allergy record?"))
      return;

    try {
      await dispatch(deleteDrugAllergy({ id: allergyId })).unwrap();
      toast.success("Drug allergy deleted");
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete drug allergy");
      console.error("Delete drug allergy error:", error);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setDrugSearch("");
    setSelectedReactions([]);
    setShowDrugDropdown(false);
    setIsAdding(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "mild":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "moderate":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "severe":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "severe":
        return "border-red-300 bg-red-50";
      case "moderate":
        return "border-amber-200 bg-amber-50";
      default:
        return "border-slate-200 bg-white";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Drug Allergies
          </h3>
          <p className="text-sm text-slate-600">
            Record known drug allergies and adverse reactions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-700 hover:to-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add Allergy
            </button>
          )}
        </div>
      </div>

      {/* Critical Allergy Alert Banner */}
      {hasSevereAllergies && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-rose-50 p-4 shadow-sm">
          <div className="rounded-full bg-red-100 p-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-900">
              Critical Allergy Alert
            </p>
            <p className="text-sm text-red-700">
              Patient has{" "}
              {drugAllergies.filter((a) => a.severity === "severe").length}{" "}
              severe allergy record(s). Review before prescribing any
              medications.
            </p>
          </div>
        </div>
      )}

      {/* Allergy Status Summary */}
      <div
        className={clsx(
          "flex items-center justify-between rounded-lg px-4 py-3",
          allergyCount === 0
            ? "bg-emerald-50 border border-emerald-200"
            : hasSevereAllergies
            ? "bg-red-50 border border-red-200"
            : "bg-amber-50 border border-amber-200"
        )}
      >
        <div className="flex items-center gap-3">
          {allergyCount === 0 ? (
            <>
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span className="font-medium text-emerald-700">
                No Known Drug Allergies (NKDA)
              </span>
            </>
          ) : (
            <>
              <AlertCircle
                className={clsx(
                  "h-5 w-5",
                  hasSevereAllergies ? "text-red-600" : "text-amber-600"
                )}
              />
              <span
                className={clsx(
                  "font-medium",
                  hasSevereAllergies ? "text-red-700" : "text-amber-700"
                )}
              >
                {allergyCount} Drug Allerg{allergyCount !== 1 ? "ies" : "y"}{" "}
                Recorded
              </span>
            </>
          )}
        </div>
        {allergyCount > 0 && (
          <div className="flex items-center gap-3 text-xs">
            {drugAllergies.filter((a) => a.severity === "severe").length >
              0 && (
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                {drugAllergies.filter((a) => a.severity === "severe").length}{" "}
                Severe
              </span>
            )}
            {drugAllergies.filter((a) => a.severity === "moderate").length >
              0 && (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                {drugAllergies.filter((a) => a.severity === "moderate").length}{" "}
                Moderate
              </span>
            )}
            {drugAllergies.filter((a) => a.severity === "mild").length > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                {drugAllergies.filter((a) => a.severity === "mild").length} Mild
              </span>
            )}
          </div>
        )}
      </div>

      {/* Add Allergy Form */}
      {isAdding && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Form Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <Pill className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-slate-900">
                    New Drug Allergy
                  </h4>
                  <p className="text-sm text-slate-600">
                    Select drug and reaction type
                  </p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Drug Name with Autocomplete */}
            <div className="relative">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Pill className="h-4 w-4 text-slate-400" />
                Drug Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={drugSearch}
                  onChange={(e) => {
                    setDrugSearch(e.target.value);
                    setShowDrugDropdown(true);
                  }}
                  onFocus={() => setShowDrugDropdown(true)}
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Search or type drug name..."
                />
                {drugSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrugSearch("");
                      setFormData((prev) => ({ ...prev, drug_name: "" }));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showDrugDropdown && filteredDrugs.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                  {filteredDrugs.map((drug) => (
                    <button
                      key={drug}
                      type="button"
                      onClick={() => handleDrugSelect(drug)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition"
                    >
                      <Pill className="h-4 w-4 text-slate-400" />
                      {drug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Common Reactions Quick Select */}
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Reaction Type <span className="text-red-500">*</span>
                {selectedReactions.length > 0 && (
                  <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                    {selectedReactions.length} selected
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {commonReactions.map((reaction) => {
                  const isSelected = selectedReactions.includes(reaction);
                  return (
                    <button
                      key={reaction}
                      type="button"
                      onClick={() => handleReactionToggle(reaction)}
                      className={clsx(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                        isSelected
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700"
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                      {reaction}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Reaction Input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Other Reaction (optional)
              </label>
              <input
                type="text"
                value={formData.reaction}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reaction: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="Type additional reaction if not listed above..."
              />
            </div>

            {/* Severity Selection */}
            <SeveritySelector
              value={formData.severity}
              onChange={(severity) =>
                setFormData((prev) => ({ ...prev, severity }))
              }
              label="Severity"
              showIcons
              size="lg"
            />

            {/* Additional Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="When was it discovered, what happened, etc..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-sm text-slate-500">
                {drugSearch.trim() && selectedReactions.length > 0 ? (
                  <span className="flex items-center gap-2 text-emerald-600">
                    <Check className="h-4 w-4" />
                    Ready to add
                  </span>
                ) : (
                  "Select drug and reaction"
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    !drugSearch.trim() ||
                    (selectedReactions.length === 0 && !formData.reaction.trim())
                  }
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 px-5 py-2 text-sm font-medium text-white shadow-sm hover:from-red-600 hover:to-rose-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      Add Allergy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allergies List */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-3 h-8 w-8 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-slate-600">Loading drug allergies...</p>
        </div>
      ) : drugAllergies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center">
          <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
          <p className="text-emerald-700 font-medium">
            No Known Drug Allergies (NKDA)
          </p>
          <p className="text-sm text-emerald-600 mt-1">
            Click &quot;Add Allergy&quot; if patient reports any drug allergies
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Sort severe first, then moderate, then mild */}
          {[...drugAllergies]
            .sort((a, b) => {
              const order = { severe: 0, moderate: 1, mild: 2 };
              return (
                (order[a.severity as keyof typeof order] || 3) -
                (order[b.severity as keyof typeof order] || 3)
              );
            })
            .map((allergy) => (
              <div
                key={allergy.id}
                className={clsx(
                  "group rounded-xl border-2 p-4 shadow-sm hover:shadow-md transition",
                  getSeverityBg(allergy.severity)
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      {allergy.severity === "severe" && (
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                      <h5 className="font-semibold text-slate-900 text-lg">
                        {allergy.drug_name}
                      </h5>
                      <span
                        className={clsx(
                          "rounded-full border px-3 py-0.5 text-xs font-semibold",
                          getSeverityColor(allergy.severity)
                        )}
                      >
                        {allergy.severity.charAt(0).toUpperCase() +
                          allergy.severity.slice(1)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {allergy.reaction.split(",").map((reaction, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                        >
                          {reaction.trim()}
                        </span>
                      ))}
                    </div>

                    {allergy.notes && (
                      <p className="text-sm text-slate-600 italic">
                        {allergy.notes}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-slate-400">
                      Recorded on{" "}
                      {new Date(allergy.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(allergy.id)}
                    className="ml-4 rounded-lg p-2 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition"
                    title="Delete allergy record"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
