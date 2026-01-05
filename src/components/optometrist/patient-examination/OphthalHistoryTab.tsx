"use client";

import { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import {
  addOphthalmicSurgery,
  deleteOphthalmicSurgery,
} from "@/redux/optometryDataSlice";
import { Plus, FileText, Scissors, Eye, Calendar, User, Building2, Search, X, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { OphthalmicSurgeryRecord } from "@/types";
import { EyeSelector } from "../shared";
import { commonEyeSurgeries } from "../mock/mockTemplates";
import { InlineSurgeryForm } from "./InlineSurgeryForm";
import { ConfirmedSurgeriesSummary } from "./ConfirmedSurgeriesSummary";

interface OphthalHistoryTabProps {
  patientId: string;
  ophthalmicHistory: OphthalmicSurgeryRecord[];
  loading: boolean;
  onRefresh: () => void;
}

type EyeType = "OD" | "OS" | "OU";

interface SurgeryFormData {
  surgery_name: string;
  eye: EyeType;
  surgery_year: string;
  surgery_month: string;
  surgeon_name: string;
  hospital_name: string;
  complications: string;
  notes: string;
}

const initialFormData: SurgeryFormData = {
  surgery_name: "",
  eye: "OD",
  surgery_year: "",
  surgery_month: "",
  surgeon_name: "",
  hospital_name: "",
  complications: "",
  notes: "",
};

// Generate year options (current year back to 1950)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1949 }, (_, i) =>
  String(currentYear - i)
);

const monthOptions = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function OphthalHistoryTab({
  patientId,
  ophthalmicHistory,
  loading,
  onRefresh,
}: OphthalHistoryTabProps) {
  const dispatch = useAppDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SurgeryFormData>(initialFormData);
  const [surgerySearch, setSurgerySearch] = useState("");
  const [showSurgeryDropdown, setShowSurgeryDropdown] = useState(false);
  const [activeSurgery, setActiveSurgery] = useState<string | null>(null);
  const [editingSurgery, setEditingSurgery] = useState<OphthalmicSurgeryRecord | null>(null);

  // Filter surgeries based on search
  const filteredSurgeries = commonEyeSurgeries.slice(0, 8);

  const handleSurgeryButtonClick = (surgery: string) => {
    if (activeSurgery === surgery) {
      // Clicking the same button closes the form
      setActiveSurgery(null);
      setEditingSurgery(null);
    } else {
      // Open form for this surgery
      setActiveSurgery(surgery);
      setEditingSurgery(null);
    }
  };

  const handleSurgerySelect = (surgery: string) => {
    setFormData((prev) => ({ ...prev, surgery_name: surgery }));
    setSurgerySearch(surgery);
    setShowSurgeryDropdown(false);
  };

  const handleSubmit = async (data: SurgeryFormData) => {
    setIsSubmitting(true);
    try {
      // If editing, delete the old surgery first
      if (editingSurgery) {
        await dispatch(deleteOphthalmicSurgery({ id: editingSurgery.id })).unwrap();
      }

      // Build surgery date from year and optional month
      let surgeryDate: string | undefined;
      if (data.surgery_year) {
        surgeryDate = data.surgery_month
          ? `${data.surgery_year}-${data.surgery_month}-01`
          : `${data.surgery_year}-01-01`;
      }

      // Add the surgery
      await dispatch(
        addOphthalmicSurgery({
          data: {
            patient_id: patientId,
            surgery_name: activeSurgery || data.surgery_name,
            eye: data.eye,
            surgery_date: surgeryDate || new Date().toISOString().split('T')[0],
            surgeon_name: data.surgeon_name || null,
            hospital_name: data.hospital_name || null,
            complications: data.complications || null,
            notes: data.notes || null,
          },
        })
      ).unwrap();

      toast.success(editingSurgery ? "Surgery updated" : "Surgery added");

      // Close form and refresh
      setActiveSurgery(null);
      setEditingSurgery(null);
      resetForm();
      onRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save surgery";
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    setActiveSurgery(null);
    setEditingSurgery(null);
  };

  const handleEditSurgery = (surgery: OphthalmicSurgeryRecord) => {
    setEditingSurgery(surgery);
    setActiveSurgery(surgery.surgery_name);
  };

  const handleDeleteSurgery = async (surgeryId: string) => {
    if (!confirm("Are you sure you want to delete this surgery record?")) return;

    try {
      await dispatch(deleteOphthalmicSurgery({ id: surgeryId })).unwrap();
      toast.success("Surgery deleted");
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete surgery");
      console.error("Delete surgery error:", error);
    }
  };

  const handleAddCustomSurgery = () => {
    const trimmed = surgerySearch.trim();
    if (!trimmed) {
      toast.error("Please enter a surgery name");
      return;
    }

    setActiveSurgery(trimmed);
  };

  // Get default values for editing
  const getDefaultFormValues = (): Partial<SurgeryFormData> | undefined => {
    if (!editingSurgery) return undefined;

    return {
      eye: editingSurgery.eye as EyeType,
      surgery_year: editingSurgery.surgery_date ? new Date(editingSurgery.surgery_date).getFullYear().toString() : "",
      surgery_month: editingSurgery.surgery_date ? String(new Date(editingSurgery.surgery_date).getMonth() + 1).padStart(2, '0') : "",
      surgeon_name: editingSurgery.surgeon_name || "",
      hospital_name: editingSurgery.hospital_name || "",
      complications: editingSurgery.complications || "",
      notes: editingSurgery.notes || "",
    };
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSurgerySearch("");
    setShowSurgeryDropdown(false);
    setIsAdding(false);
  };

  const getEyeLabel = (eye: string) => {
    switch (eye) {
      case "OD":
        return "Right Eye";
      case "OS":
        return "Left Eye";
      case "OU":
        return "Both Eyes";
      default:
        return eye;
    }
  };

  const getEyeColor = (eye: string) => {
    switch (eye) {
      case "OD":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "OS":
        return "bg-green-100 text-green-700 border-green-200";
      case "OU":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "Date unknown";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    // If day is 1 and month is January, likely only year was recorded
    if (date.getDate() === 1 && month === 0) {
      return String(year);
    }
    // Otherwise show month/year
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column: Add Surgeries Section (2/3 width on large screens) */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Add Eye Surgeries
                </h3>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Quick Select Surgeries */}
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">
                Common Eye Surgeries
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {filteredSurgeries.map((surgery) => {
                  const isActive = activeSurgery === surgery;
                  const isOtherActive = activeSurgery && activeSurgery !== surgery;

                  return (
                    <button
                      key={surgery}
                      type="button"
                      onClick={() => handleSurgeryButtonClick(surgery)}
                      className={clsx(
                        "w-full rounded-lg border px-3 py-2 text-sm font-medium transition text-left",
                        isActive
                          ? "bg-sky-600 text-white border-sky-600 shadow-md"
                          : isOtherActive
                          ? "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:shadow-sm"
                      )}
                    >
                      {surgery}
                    </button>
                  );
                })}
              </div>

              {/* Inline Form - appears below the grid */}
              {activeSurgery && filteredSurgeries.includes(activeSurgery) && (
                <div className="mt-4">
                  <InlineSurgeryForm
                    surgeryText={activeSurgery}
                    onSave={handleSubmit}
                    onCancel={handleCancelForm}
                    isSubmitting={isSubmitting}
                    defaultValues={getDefaultFormValues()}
                  />
                </div>
              )}
            </div>

            {/* Custom Surgery Input */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileText className="h-4 w-4 text-slate-400" />
                Custom Surgery
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={surgerySearch}
                  onChange={(e) => setSurgerySearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSurgery();
                    }
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Type a custom surgery name if not listed above..."
                />
                <button
                  type="button"
                  onClick={handleAddCustomSurgery}
                  disabled={!surgerySearch.trim()}
                  className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>

              {/* Custom Surgery Inline Form */}
              {activeSurgery && !filteredSurgeries.includes(activeSurgery) && (
                <div className="mt-3">
                  <InlineSurgeryForm
                    surgeryText={activeSurgery}
                    onSave={handleSubmit}
                    onCancel={handleCancelForm}
                    isSubmitting={isSubmitting}
                    defaultValues={getDefaultFormValues()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Confirmed Surgeries Summary (1/3 width on large screens) */}
      <div className="lg:col-span-1">
        <ConfirmedSurgeriesSummary
          surgeries={ophthalmicHistory}
          onEdit={handleEditSurgery}
          onDelete={handleDeleteSurgery}
          loading={loading}
        />
      </div>
    </div>
  );
}
