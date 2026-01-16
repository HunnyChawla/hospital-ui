"use client";

import { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { addComplaint, deleteComplaint } from "@/redux/optometryDataSlice";
import { Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { ComplaintRecord } from "@/types";
import { ConfirmedComplaintsSummary } from "./ConfirmedComplaintsSummary";
import { InlineComplaintForm } from "./InlineComplaintForm";
import { commonComplaints } from "../mock/mockTemplates";
import { handleError } from "@/utils/errorHandler";
import { ComplaintsHistorySection } from "./ComplaintsHistorySection";

interface ComplaintsTabProps {
  patientId: string;
  visitId: string;
  optometristId: string;
  complaints: ComplaintRecord[];
  loading: boolean;
  onRefresh: () => void;
}

type Severity = "mild" | "moderate" | "severe";
type EyeType = "LE" | "RE" | "BE" | "GE";

interface FormData {
  text: string;
  eye: EyeType;
  severity: Severity;
  duration: string;
  notes?: string;
}

export function ComplaintsTab({
  patientId,
  visitId,
  optometristId,
  complaints,
  loading,
  onRefresh,
}: ComplaintsTabProps) {
  const dispatch = useAppDispatch();
  const [activeComplaint, setActiveComplaint] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customComplaintText, setCustomComplaintText] = useState("");
  const [editingComplaint, setEditingComplaint] = useState<ComplaintRecord | null>(null);

  const handleComplaintButtonClick = (complaint: string) => {
    if (activeComplaint === complaint) {
      // Clicking the same button closes the form
      setActiveComplaint(null);
      setEditingComplaint(null);
    } else {
      // Open form for this complaint
      setActiveComplaint(complaint);
      setEditingComplaint(null);
    }
  };

  const handleSaveComplaint = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // If editing, delete the old complaint first
      if (editingComplaint) {
        await dispatch(deleteComplaint({ id: editingComplaint.id })).unwrap();
      }

      // Add the complaint
      await dispatch(
        addComplaint({
          data: {
            patient_id: patientId,
            visit_id: visitId,
            optometrist_id: optometristId,
            complaint: `${data.text} (${data.eye})`,
            severity: data.severity,
            duration: data.duration || null,
            notes: data.notes || null,
          },
        })
      ).unwrap();

      toast.success(editingComplaint ? "Complaint updated" : "Complaint added");

      // Close form and refresh
      setActiveComplaint(null);
      setEditingComplaint(null);
      onRefresh();
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to save complaint",
        logError: true,
      });
      throw error; // Re-throw so InlineComplaintForm can handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    setActiveComplaint(null);
    setEditingComplaint(null);
  };

  const handleEditComplaint = (complaint: ComplaintRecord) => {
    // Extract eye from complaint text
    const eyeMatch = complaint.complaint.match(/\((RE|LE|BE|GE)\)/);
    const eye = (eyeMatch ? eyeMatch[1] : "BE") as EyeType;
    const complaintText = complaint.complaint.replace(/\s*\((RE|LE|BE|GE)\)\s*$/, "").trim();

    setEditingComplaint(complaint);
    setActiveComplaint(complaintText);
  };

  const handleDeleteComplaint = async (complaintId: string) => {
    if (!confirm("Are you sure you want to delete this complaint?")) return;

    try {
      await dispatch(deleteComplaint({ id: complaintId })).unwrap();
      toast.success("Complaint deleted");
      onRefresh();
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to delete complaint",
        logError: true,
      });
    }
  };

  const handleAddCustomComplaint = () => {
    const trimmed = customComplaintText.trim();
    if (!trimmed) {
      toast.error("Please enter a complaint");
      return;
    }

    setActiveComplaint(trimmed);
    setCustomComplaintText("");
  };

  // Get default values for editing
  const getDefaultFormValues = (): Partial<FormData> | undefined => {
    if (!editingComplaint) return undefined;

    const eyeMatch = editingComplaint.complaint.match(/\((RE|LE|BE|GE)\)/);
    const eye = (eyeMatch ? eyeMatch[1] : "BE") as EyeType;

    return {
      eye,
      severity: (editingComplaint.severity as Severity) || "moderate",
      duration: editingComplaint.duration || "",
      notes: editingComplaint.notes || "",
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Left Column: Add Complaints Section (2/3 width on large screens) */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-slate-200/60 bg-white shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
          {/* Section Header */}
          <div className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-100 px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 shadow-md shadow-sky-500/30">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Add Complaints
                </h3>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Quick Select Complaints */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                Common Complaints
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {commonComplaints.map((complaint) => {
                  const isActive = activeComplaint === complaint;
                  const isOtherActive = activeComplaint && activeComplaint !== complaint;

                  return (
                    <button
                      key={complaint}
                      type="button"
                      onClick={() => handleComplaintButtonClick(complaint)}
                      className={clsx(
                        "w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 text-left",
                        isActive
                          ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white border-sky-600 shadow-lg shadow-sky-500/30 scale-105"
                          : isOtherActive
                            ? "bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-sky-300 hover:text-sky-700 hover:shadow-md hover:scale-105 active:scale-95"
                      )}
                    >
                      {complaint}
                    </button>
                  );
                })}
              </div>

              {/* Inline Form - appears below the grid */}
              {activeComplaint && commonComplaints.includes(activeComplaint) && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <InlineComplaintForm
                    complaintText={activeComplaint}
                    onSave={handleSaveComplaint}
                    onCancel={handleCancelForm}
                    isSubmitting={isSubmitting}
                    defaultValues={getDefaultFormValues()}
                  />
                </div>
              )}
            </div>

            {/* Custom Complaint Input */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText className="h-4 w-4 text-sky-600" />
                Custom Complaint
              </label>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={customComplaintText}
                  onChange={(e) => setCustomComplaintText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomComplaint();
                    }
                  }}
                  className="flex-1 rounded-lg border border-slate-300 bg-white text-slate-900 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                  placeholder="Type a custom complaint if not listed above..."
                />
                <button
                  type="button"
                  onClick={handleAddCustomComplaint}
                  disabled={!customComplaintText.trim()}
                  className="rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:from-sky-700 hover:to-blue-700 hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Add
                </button>
              </div>

              {/* Custom Complaint Inline Form */}
              {activeComplaint && !commonComplaints.includes(activeComplaint) && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <InlineComplaintForm
                    complaintText={activeComplaint}
                    onSave={handleSaveComplaint}
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

      {/* Right Column: Confirmed Complaints Summary (1/3 width on large screens) */}
      <div className="lg:col-span-1">
        <ConfirmedComplaintsSummary
          complaints={complaints}
          onEdit={handleEditComplaint}
          onDelete={handleDeleteComplaint}
          loading={loading}
        />
      </div>

      {/* History Section - Full Width */}
      <div className="lg:col-span-3">
        <ComplaintsHistorySection
          patientId={patientId}
          currentVisitId={visitId}
        />
      </div>
    </div>
  );
}
