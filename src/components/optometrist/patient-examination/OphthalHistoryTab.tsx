"use client";

import { useState, useMemo } from "react";
import { useAppDispatch } from "@/redux/hooks";
import {
  addOphthalmicSurgery,
  deleteOphthalmicSurgery,
} from "@/redux/optometryDataSlice";
import {
  Plus,
  Trash2,
  Eye,
  Calendar,
  User,
  Building2,
  Search,
  X,
  Check,
  AlertCircle,
  Clock,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { OphthalmicSurgeryRecord } from "@/types";
import { EyeSelector } from "../shared";
import { commonEyeSurgeries } from "../mock/mockTemplates";

interface OphthalHistoryTabProps {
  patientId: string;
  ophthalmicHistory: OphthalmicSurgeryRecord[];
  loading: boolean;
  onRefresh: () => void;
}

type EyeType = "OD" | "OS" | "Both";

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

  // Filter surgeries based on search
  const filteredSurgeries = useMemo(() => {
    if (!surgerySearch.trim()) return commonEyeSurgeries.slice(0, 8);
    const search = surgerySearch.toLowerCase();
    return commonEyeSurgeries.filter((surgery) =>
      surgery.toLowerCase().includes(search)
    );
  }, [surgerySearch]);

  const handleSurgerySelect = (surgery: string) => {
    setFormData((prev) => ({ ...prev, surgery_name: surgery }));
    setSurgerySearch(surgery);
    setShowSurgeryDropdown(false);
  };

  const handleSubmit = async () => {
    const surgeryName = formData.surgery_name.trim() || surgerySearch.trim();

    if (!surgeryName) {
      toast.error("Please enter or select a surgery/procedure");
      return;
    }

    // Build surgery date from year and optional month
    let surgeryDate: string | undefined;
    if (formData.surgery_year) {
      surgeryDate = formData.surgery_month
        ? `${formData.surgery_year}-${formData.surgery_month}-01`
        : `${formData.surgery_year}-01-01`;
    }

    setIsSubmitting(true);

    try {
      await dispatch(
        addOphthalmicSurgery({
          data: {
            patient_id: patientId,
            surgery_type: surgeryName,
            eye: formData.eye,
            surgery_date: surgeryDate || new Date().toISOString().split('T')[0],
            surgeon: formData.surgeon_name || null,
            hospital: formData.hospital_name || null,
            notes: formData.notes || null,
          },
        })
      ).unwrap();

      toast.success("Surgery record added successfully");
      resetForm();
      onRefresh();
    } catch (error) {
      toast.error("Failed to add surgery record");
      console.error("Add surgery error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (surgeryId: string) => {
    if (!confirm("Are you sure you want to delete this surgery record?"))
      return;

    try {
      await dispatch(deleteOphthalmicSurgery({ id: surgeryId })).unwrap();
      toast.success("Surgery record deleted");
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete surgery record");
      console.error("Delete surgery error:", error);
    }
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
      case "Both":
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
      case "Both":
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

  const getYearsAgo = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const years = Math.floor(
      (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    if (years === 0) return "This year";
    if (years === 1) return "1 year ago";
    return `${years} years ago`;
  };

  const surgeryCount = ophthalmicHistory.length;

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Eye Surgery History
          </h3>
          <p className="text-sm text-slate-600">
            Record previous eye surgeries and procedures
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-700 hover:to-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add Surgery
            </button>
          )}
        </div>
      </div>

      {/* Surgery Count Summary */}
      <div
        className={clsx(
          "flex items-center justify-between rounded-lg px-4 py-3",
          surgeryCount === 0
            ? "bg-slate-100 border border-slate-200"
            : "bg-sky-50 border border-sky-200"
        )}
      >
        <div className="flex items-center gap-3">
          <Scissors
            className={clsx(
              "h-5 w-5",
              surgeryCount === 0 ? "text-slate-500" : "text-sky-600"
            )}
          />
          <span
            className={clsx(
              "font-medium",
              surgeryCount === 0 ? "text-slate-600" : "text-sky-700"
            )}
          >
            {surgeryCount === 0
              ? "No previous eye surgeries"
              : `${surgeryCount} Surger${surgeryCount !== 1 ? "ies" : "y"} on Record`}
          </span>
        </div>
        {surgeryCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {ophthalmicHistory.filter((s) => s.eye === "OD").length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                {ophthalmicHistory.filter((s) => s.eye === "OD").length} OD
              </span>
            )}
            {ophthalmicHistory.filter((s) => s.eye === "OS").length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                {ophthalmicHistory.filter((s) => s.eye === "OS").length} OS
              </span>
            )}
            {ophthalmicHistory.filter((s) => s.eye === "Both").length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">
                {ophthalmicHistory.filter((s) => s.eye === "Both").length} OU
              </span>
            )}
          </div>
        )}
      </div>

      {/* Add Surgery Form */}
      {isAdding && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Form Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <Scissors className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-slate-900">
                    New Surgery Record
                  </h4>
                  <p className="text-sm text-slate-600">
                    Add previous eye surgery or procedure
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
            {/* Surgery Name with Autocomplete */}
            <div className="relative">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Scissors className="h-4 w-4 text-slate-400" />
                Surgery/Procedure <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={surgerySearch}
                  onChange={(e) => {
                    setSurgerySearch(e.target.value);
                    setShowSurgeryDropdown(true);
                  }}
                  onFocus={() => setShowSurgeryDropdown(true)}
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Search or type surgery name..."
                />
                {surgerySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSurgerySearch("");
                      setFormData((prev) => ({ ...prev, surgery_name: "" }));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showSurgeryDropdown && filteredSurgeries.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                  {filteredSurgeries.map((surgery) => (
                    <button
                      key={surgery}
                      type="button"
                      onClick={() => handleSurgerySelect(surgery)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition"
                    >
                      <Eye className="h-4 w-4 text-slate-400" />
                      {surgery}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Select Common Surgeries */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                Common Surgeries
              </label>
              <div className="flex flex-wrap gap-2">
                {["Cataract surgery", "LASIK", "ICL implantation", "Vitrectomy", "Glaucoma surgery"].map(
                  (surgery) => (
                    <button
                      key={surgery}
                      type="button"
                      onClick={() => handleSurgerySelect(surgery)}
                      className={clsx(
                        "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                        surgerySearch === surgery
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700"
                      )}
                    >
                      {surgery}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Eye Selection and Date */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Eye Selection */}
              <EyeSelector
                value={formData.eye as any}
                onChange={(eye) =>
                  setFormData((prev) => ({ ...prev, eye: eye as any }))
                }
                label="Eye"
              />

              {/* Approximate Year */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Year
                </label>
                <select
                  value={formData.surgery_year}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      surgery_year: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="">Select year...</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Month */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Month (optional)
                </label>
                <select
                  value={formData.surgery_month}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      surgery_month: e.target.value,
                    }))
                  }
                  disabled={!formData.surgery_year}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Not sure</option>
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Surgeon and Hospital */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <User className="h-4 w-4 text-slate-400" />
                  Surgeon Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.surgeon_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      surgeon_name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Dr. John Smith"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  Hospital/Clinic (optional)
                </label>
                <input
                  type="text"
                  value={formData.hospital_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      hospital_name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="City Eye Hospital"
                />
              </div>
            </div>

            {/* Complications and Notes */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  Complications (if any)
                </label>
                <textarea
                  value={formData.complications}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      complications: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Any complications during/after surgery..."
                />
              </div>
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
                  placeholder="Any additional details..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-sm text-slate-500">
                {surgerySearch.trim() ? (
                  <span className="flex items-center gap-2 text-emerald-600">
                    <Check className="h-4 w-4" />
                    Ready to add
                  </span>
                ) : (
                  "Select or enter surgery name"
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
                  disabled={isSubmitting || !surgerySearch.trim()}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Surgery
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Surgery Records List - Timeline Style */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-3 h-8 w-8 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-slate-600">Loading surgery history...</p>
        </div>
      ) : ophthalmicHistory.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Eye className="mx-auto mb-3 h-12 w-12 text-slate-400" />
          <p className="text-slate-600 font-medium">
            No eye surgery history recorded
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Click &quot;Add Surgery&quot; if patient has had previous eye
            procedures
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Sort by date (most recent first) */}
          {[...ophthalmicHistory]
            .sort((a, b) => {
              if (!a.surgery_date) return 1;
              if (!b.surgery_date) return -1;
              return (
                new Date(b.surgery_date).getTime() -
                new Date(a.surgery_date).getTime()
              );
            })
            .map((surgery, index) => (
              <div
                key={surgery.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition"
              >
                {/* Timeline connector */}
                {index < ophthalmicHistory.length - 1 && (
                  <div className="absolute left-7 top-full h-3 w-0.5 bg-slate-200" />
                )}

                <div className="flex items-start gap-4">
                  {/* Eye indicator */}
                  <div
                    className={clsx(
                      "flex-shrink-0 rounded-full p-2.5 border",
                      getEyeColor(surgery.eye)
                    )}
                  >
                    <Eye className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h5 className="font-semibold text-slate-900 text-lg">
                          {surgery.surgery_type}
                        </h5>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={clsx(
                              "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                              getEyeColor(surgery.eye)
                            )}
                          >
                            {surgery.eye} - {getEyeLabel(surgery.eye)}
                          </span>
                          {surgery.surgery_date && (
                            <>
                              <span className="flex items-center gap-1 text-sm text-slate-600">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(surgery.surgery_date)}
                              </span>
                              {getYearsAgo(surgery.surgery_date) && (
                                <span className="text-xs text-slate-400">
                                  ({getYearsAgo(surgery.surgery_date)})
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(surgery.id)}
                        className="rounded-lg p-2 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition"
                        title="Delete surgery record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Details */}
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                      {surgery.surgeon && (
                        <span className="flex items-center gap-1.5">
                          <User className="h-4 w-4 text-slate-400" />
                          {surgery.surgeon}
                        </span>
                      )}
                      {surgery.hospital && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {surgery.hospital}
                        </span>
                      )}
                    </div>

                    {/* Complications Alert */}
                    {surgery.complications && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-red-700 uppercase">
                            Complications
                          </p>
                          <p className="text-sm text-red-600">
                            {surgery.complications}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {surgery.notes && (
                      <p className="mt-2 text-sm text-slate-500 italic">
                        {surgery.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
