"use client";

import { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import {
  addOphthalmicSurgery,
  deleteOphthalmicSurgery,
} from "@/redux/optometryDataSlice";
import { Plus, FileText, Scissors, Eye, Calendar, User, Building2, Search, X, AlertCircle, Clock, Check } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { OphthalmicSurgeryRecord } from "@/types";
import { EyeSelector } from "../shared";
import { commonEyeSurgeries } from "../mock/mockTemplates";
import { InlineSurgeryForm } from "./InlineSurgeryForm";
import { ConfirmedSurgeriesSummary } from "./ConfirmedSurgeriesSummary";
import { ResizablePanel } from "../shared";
import { handleError } from "@/utils/errorHandler";

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
      handleError(error, {
        defaultMessage: "Failed to save surgery",
        logError: true,
      });
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

  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const handleDeleteSurgery = (surgeryId: string) => {
    setDeleteConfirmationId(surgeryId);
  };

  const confirmDelete = async () => {
    if (deleteConfirmationId) {
      await executeDelete(deleteConfirmationId);
      setDeleteConfirmationId(null);
    }
  };

  const executeDelete = async (surgeryId: string) => {
    try {
      await dispatch(deleteOphthalmicSurgery({ id: surgeryId })).unwrap();
      toast.success("Surgery deleted");
      onRefresh();
    } catch (error) {
      console.error("Delete failed:", error);
      handleError(error, {
        defaultMessage: "Failed to delete surgery",
        logError: true,
      });
    }
  };

  const handleClearAllSurgeries = async () => {
    if (!confirm("Are you sure you want to delete all surgeries? This action cannot be undone.")) return;

    try {
      const deletePromises = ophthalmicHistory.map(surgery =>
        dispatch(deleteOphthalmicSurgery({ id: surgery.id })).unwrap()
      );
      await Promise.all(deletePromises);
      toast.success("All surgeries cleared");
      onRefresh();
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to clear surgeries",
        logError: true,
      });
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

  const leftContent = (
    <div className="rounded-xl border border-slate-200/60 bg-white shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
      <div className="p-4 space-y-3">
        {/* Quick Select Surgeries */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {filteredSurgeries.map((surgery) => {
              const isActive = activeSurgery === surgery;
              const isOtherActive = activeSurgery && activeSurgery !== surgery;
              // Check if this surgery is already confirmed (in the ophthalmicHistory list)
              const isConfirmed = ophthalmicHistory.some(s =>
                s.surgery_name.toLowerCase() === surgery.toLowerCase()
              );
              const isDisabled = Boolean(isOtherActive);

              return (
                <button
                  key={surgery}
                  type="button"
                  onClick={() => handleSurgeryButtonClick(surgery)}
                  disabled={isDisabled}
                  className={clsx(
                    "w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 text-left",
                    isActive
                      ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white border-sky-600 shadow-lg shadow-sky-500/30 scale-105"
                      : isConfirmed && !isDisabled
                        ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-300 shadow-sm"
                        : isDisabled
                          ? "bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed pointer-events-none"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-sky-300 hover:text-sky-700 hover:shadow-md hover:scale-105 active:scale-95"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{surgery}</span>
                    {isConfirmed && !isActive && !isDisabled && (
                      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 ml-1" />
                    )}
                  </div>
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
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-sky-600" />
            Custom Surgery
          </label>
          <div className="flex gap-2.5">
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
              className="flex-1 rounded-lg border border-slate-300 bg-white text-slate-900 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              placeholder="Type a custom surgery name if not listed above..."
            />
            <button
              type="button"
              onClick={handleAddCustomSurgery}
              disabled={!surgerySearch.trim()}
              className="rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:from-sky-700 hover:to-blue-700 hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
  );

  const rightContent = (
    <ConfirmedSurgeriesSummary
      surgeries={ophthalmicHistory}
      onEdit={handleEditSurgery}
      onDelete={handleDeleteSurgery}
      onClearAll={handleClearAllSurgeries}
      loading={loading}
    />
  );

  return (
    <>
      <ResizablePanel
        leftContent={leftContent}
        rightContent={rightContent}
        defaultLeftWidthPercent={67}
        minLeftWidthPercent={40}
        maxLeftWidthPercent={80}
        storageKey="optometry-ophthal-panel-width"
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 mx-4">
            <div className="mb-4 flex items-center gap-3 text-amber-600">
              <div className="rounded-full bg-amber-100 p-2">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Confirm Deletion</h3>
            </div>

            <p className="mb-6 text-slate-600">
              Are you sure you want to delete this surgery record? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmationId(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 shadow-sm transition"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
