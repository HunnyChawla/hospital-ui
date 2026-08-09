"use client";

import { useState, useMemo } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { addDrugAllergy, deleteDrugAllergy } from "@/redux/optometryDataSlice";
import { AlertTriangle, Search, X, Check, Pill } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { DrugAllergyRecord } from "@/types";
import { SeveritySelector } from "@/components/optometrist/shared";
import { commonDrugs, commonReactions } from "@/components/optometrist/mock/mockTemplates";
import { ConfirmedDrugAllergiesSummary } from "@/components/optometrist/patient-examination/ConfirmedDrugAllergiesSummary";
import { ResizablePanel } from "@/components/optometrist/shared";
import { handleError } from "@/utils/errorHandler";

interface ClinicDrugAllergyTabProps {
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

export function ClinicDrugAllergyTab({
  patientId,
  drugAllergies,
  loading,
  onRefresh,
}: ClinicDrugAllergyTabProps) {
  const dispatch = useAppDispatch();
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
      handleError(error, {
        defaultMessage: "Failed to add drug allergy",
        logError: true,
      });
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
      handleError(error, {
        defaultMessage: "Failed to delete drug allergy",
        logError: true,
      });
    }
  };

  const handleEdit = (allergyId: string) => {
    // Find the allergy record by ID
    const allergy = drugAllergies.find((a) => a.id === allergyId);
    if (!allergy) {
      toast.error("Allergy record not found");
      return;
    }

    // Populate the form with the allergy data
    setDrugSearch(allergy.drug_name);
    setFormData((prev) => ({
      ...prev,
      drug_name: allergy.drug_name,
      severity: allergy.severity as "mild" | "moderate" | "severe",
      notes: allergy.notes || "",
    }));

    // Parse reactions and set them
    const reactions = allergy.reaction.split(",").map((r) => r.trim());
    const commonReactionsList = reactions.filter((r) => commonReactions.includes(r));
    const customReaction = reactions.filter((r) => !commonReactions.includes(r)).join(", ");

    setSelectedReactions(commonReactionsList);
    setFormData((prev) => ({ ...prev, reaction: customReaction }));

    // Delete the old record so user can save as new (update flow)
    // Note: We don't delete here - let user manually save the updated record
    toast.info("Edit the allergy details and click 'Add Allergy' to update");
  };

  const handleClearAllAllergies = async () => {
    if (!confirm("Are you sure you want to delete all drug allergies? This action cannot be undone.")) return;

    try {
      const deletePromises = drugAllergies.map(allergy =>
        dispatch(deleteDrugAllergy({ id: allergy.id })).unwrap()
      );
      await Promise.all(deletePromises);
      toast.success("All drug allergies cleared");
      onRefresh();
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to clear drug allergies",
        logError: true,
      });
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setDrugSearch("");
    setSelectedReactions([]);
    setShowDrugDropdown(false);
  };

  // Removed list item severity helpers; list is now rendered in the right summary component

  const leftContent = (
    <div className="space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Drug Allergies</h3>
          <p className="text-sm text-slate-600">Record known drug allergies and adverse reactions</p>
        </div>
      </div>

      {/* Critical Allergy Alert removed as requested */}

      {/* Removed the status summary as requested */}

      {/* Add Allergy Form - always visible */}
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
            {/* Close button removed to keep form always visible */}
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
            {showDrugDropdown && (filteredDrugs.length > 0 || drugSearch.trim()) && (
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
                {drugSearch.trim() && !filteredDrugs.some((d) => d.toLowerCase() === drugSearch.toLowerCase()) && (
                  <button
                    key="custom"
                    type="button"
                    onClick={() => handleDrugSelect(drugSearch.trim())}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition border-t border-slate-100"
                  >
                    <Pill className="h-4 w-4 text-slate-400" />
                    Add &quot;{drugSearch.trim()}&quot; as custom drug
                  </button>
                )}
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
            size="sm"
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
    </div>
  );

  const rightContent = (
    <ConfirmedDrugAllergiesSummary
      drugAllergies={drugAllergies}
      loading={loading}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onClearAll={handleClearAllAllergies}
    />
  );

  return (
    <ResizablePanel
      leftContent={leftContent}
      rightContent={rightContent}
      defaultLeftWidthPercent={67}
      minLeftWidthPercent={40}
      maxLeftWidthPercent={80}
      storageKey="optometry-allergies-panel-width"
    />
  );
}
