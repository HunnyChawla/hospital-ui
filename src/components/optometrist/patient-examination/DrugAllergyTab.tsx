"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { addDrugAllergy, deleteDrugAllergy } from "@/redux/optometryDataSlice";
import { AlertTriangle, Search, X, Check, Pill, ShieldCheck, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { DrugAllergyRecord } from "@/types";
import { SeveritySelector } from "../shared";
import { commonDrugs, commonReactions } from "../mock/mockTemplates";
import { ConfirmedDrugAllergiesSummary } from "./ConfirmedDrugAllergiesSummary";
import { ResizablePanel } from "../shared";
import { handleError } from "@/utils/errorHandler";

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

// Essential ophthalmic and systemic drug allergens for fast 1-click clinical entry
const TOP_ALLERGENS = [
  "Penicillin / Amoxicillin",
  "Sulfa Drugs (Sulfonamides)",
  "Ciprofloxacin Eye Drops",
  "Tropicamide / Mydriatics",
  "Paracetamol / NSAIDs",
  "Latex",
  "Povidone Iodine / Betadine",
  "Local Anesthetics (Proparacaine)",
  "Aspirin",
  "Ofloxacin",
];

const TOP_REACTIONS = [
  "Skin Rash / Urticaria",
  "Itching / Pruritus",
  "Eyelid / Facial Swelling",
  "Conjunctival Congestion",
  "Difficulty Breathing",
  "Anaphylaxis",
  "Nausea / Dizziness",
];

export function DrugAllergyTab({
  patientId,
  drugAllergies,
  loading,
  onRefresh,
}: DrugAllergyTabProps) {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<AllergyFormData>(initialFormData);
  const [drugSearch, setDrugSearch] = useState("");
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);
  const [selectedReactions, setSelectedReactions] = useState<string[]>([]);

  // Check if patient already has NKDA recorded
  const hasNKDA = useMemo(() => {
    return drugAllergies.some((a) => {
      const lower = a.drug_name.toLowerCase();
      return lower.includes("no known") || lower.includes("nkda") || lower === "none";
    });
  }, [drugAllergies]);

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

  const handleMarkNKDA = async () => {
    if (drugAllergies.length > 0 && !hasNKDA) {
      if (
        !confirm(
          "Patient currently has active allergy records. Are you sure you want to record No Known Drug Allergies (NKDA)?"
        )
      ) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await dispatch(
        addDrugAllergy({
          data: {
            patient_id: patientId,
            drug_name: "No Known Drug Allergies (NKDA)",
            reaction: "None reported",
            severity: "mild",
            notes: "Confirmed with patient during optometry workup.",
          },
        })
      ).unwrap();

      toast.success("Patient recorded as NKDA (No Known Drug Allergies)");
      resetForm();
      onRefresh();
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to record NKDA",
        logError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
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
      toast.error("Please select or enter at least one allergic reaction");
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

      toast.success("Drug allergy recorded successfully");
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
    if (!confirm("Are you sure you want to delete this allergy record?")) return;

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
    const allergy = drugAllergies.find((a) => a.id === allergyId);
    if (!allergy) {
      toast.error("Allergy record not found");
      return;
    }

    setDrugSearch(allergy.drug_name);
    setFormData((prev) => ({
      ...prev,
      drug_name: allergy.drug_name,
      severity: allergy.severity as Severity,
      notes: allergy.notes || "",
    }));

    const reactions = allergy.reaction.split(",").map((r) => r.trim());
    const matchedReactions = reactions.filter((r) =>
      commonReactions.concat(TOP_REACTIONS).includes(r)
    );
    const customReaction = reactions
      .filter((r) => !commonReactions.concat(TOP_REACTIONS).includes(r))
      .join(", ");

    setSelectedReactions(matchedReactions);
    setFormData((prev) => ({ ...prev, reaction: customReaction }));

    toast.info("Update the fields and press Save Allergy (Ctrl+S)");
  };

  const handleClearAllAllergies = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all drug allergies? This action cannot be undone."
      )
    )
      return;

    try {
      const deletePromises = drugAllergies.map((allergy) =>
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

  // Keyboard shortcut: Ctrl+S saves allergy if valid, Enter saves
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const submitBtn = document.getElementById("inline-allergy-submit-btn");
        if (submitBtn) submitBtn.click();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const submitBtn = document.getElementById("inline-allergy-submit-btn");
        if (submitBtn) submitBtn.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        resetForm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drugSearch, selectedReactions, formData, isSubmitting]);

  const leftContent = (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden h-full">
      <div className="p-3.5 sm:p-4 space-y-4">
        {/* Quick NKDA Banner / Verified Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center gap-2.5">
            <div
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-lg shadow-2xs border",
                hasNKDA
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-white text-slate-600 border-slate-200"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                {hasNKDA
                  ? "NKDA Status Verified"
                  : "No Known Drug Allergies?"}
              </h4>
              <p className="text-[11px] text-slate-500">
                {hasNKDA
                  ? "Patient has confirmed no known drug allergies"
                  : "If patient has no allergies, confirm with 1 click"}
              </p>
            </div>
          </div>

          {!hasNKDA && (
            <button
              type="button"
              onClick={handleMarkNKDA}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Confirm NKDA (No Allergies)
            </button>
          )}
        </div>

        {/* 1-Click Common Allergen Chips */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Pill className="h-3.5 w-3.5 text-sky-600" />
              Common Allergens (Click to Select)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">1-Click Autofill</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-1.5">
            {TOP_ALLERGENS.map((allergen) => {
              const isSelected =
                drugSearch.toLowerCase() === allergen.toLowerCase() ||
                formData.drug_name.toLowerCase() === allergen.toLowerCase();

              return (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => handleDrugSelect(allergen)}
                  className={clsx(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition text-left truncate",
                    isSelected
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/20"
                      : "bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-white hover:border-rose-300 hover:text-rose-700 shadow-2xs"
                  )}
                  title={allergen}
                >
                  <span className="truncate">{allergen}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Drug Name Search / Custom Input */}
        <div className="relative">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Drug Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={drugSearch}
              onChange={(e) => {
                setDrugSearch(e.target.value);
                setFormData((prev) => ({ ...prev, drug_name: e.target.value }));
                setShowDrugDropdown(true);
              }}
              onFocus={() => setShowDrugDropdown(true)}
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Search or type custom medication name..."
            />
            {drugSearch && (
              <button
                type="button"
                onClick={() => {
                  setDrugSearch("");
                  setFormData((prev) => ({ ...prev, drug_name: "" }));
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete dropdown */}
          {showDrugDropdown && (filteredDrugs.length > 0 || drugSearch.trim()) && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-44 overflow-y-auto p-1">
              {filteredDrugs.map((drug) => (
                <button
                  key={drug}
                  type="button"
                  onClick={() => handleDrugSelect(drug)}
                  className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-xs font-medium text-slate-800 hover:bg-slate-100 transition"
                >
                  <Pill className="h-3.5 w-3.5 text-slate-400" />
                  {drug}
                </button>
              ))}
              {drugSearch.trim() &&
                !filteredDrugs.some((d) => d.toLowerCase() === drugSearch.toLowerCase()) && (
                  <button
                    key="custom"
                    type="button"
                    onClick={() => handleDrugSelect(drugSearch.trim())}
                    className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50 transition border-t border-slate-100"
                  >
                    <Plus className="h-3.5 w-3.5 text-rose-500" />
                    Use &quot;{drugSearch.trim()}&quot; as custom drug
                  </button>
                )}
            </div>
          )}
        </div>

        {/* Reaction Type Multi-Select Chips */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Reaction Type <span className="text-red-500">*</span>
            </span>
            {selectedReactions.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                {selectedReactions.length} selected
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TOP_REACTIONS.map((reaction) => {
              const isSelected = selectedReactions.includes(reaction);
              return (
                <button
                  key={reaction}
                  type="button"
                  onClick={() => handleReactionToggle(reaction)}
                  className={clsx(
                    "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition shadow-2xs border",
                    isSelected
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-white hover:border-amber-300 hover:text-amber-800"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  {reaction}
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity & Custom Reaction Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Severity Selector */}
          <div>
            <SeveritySelector
              value={formData.severity}
              onChange={(severity) =>
                setFormData((prev) => ({ ...prev, severity }))
              }
              label="Severity Level"
              showIcons
              size="sm"
            />
          </div>

          {/* Other / Custom Reaction */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Other Reaction (Optional)
            </label>
            <input
              type="text"
              value={formData.reaction}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reaction: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="e.g. Bronchospasm, Vomiting..."
            />
          </div>
        </div>

        {/* Clinical Notes */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Additional Clinical Remarks
          </label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="e.g. Discovered during childhood cataract surgery..."
          />
        </div>

        {/* Form Actions & Shortcuts */}
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
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              id="inline-allergy-submit-btn"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !drugSearch.trim() ||
                (selectedReactions.length === 0 && !formData.reaction.trim())
              }
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed",
                isSubmitting ? "bg-rose-500" : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {isSubmitting ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Save Drug Allergy
                </>
              )}
            </button>
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
