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
      const errorMessage = error instanceof Error ? error.message : "Failed to save complaint";
      toast.error(errorMessage);
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
      toast.error("Failed to delete complaint");
      console.error("Delete complaint error:", error);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column: Add Complaints Section (2/3 width on large screens) */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Add Complaints
                </h3>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Quick Select Complaints */}
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">
                Common Complaints
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonComplaints.map((complaint) => {
                  const isActive = activeComplaint === complaint;
                  const isOtherActive = activeComplaint && activeComplaint !== complaint;

                  return (
                    <button
                      key={complaint}
                      type="button"
                      onClick={() => handleComplaintButtonClick(complaint)}
                      className={clsx(
                        "w-full rounded-lg border px-3 py-2 text-sm font-medium transition text-left",
                        isActive
                          ? "bg-sky-600 text-white border-sky-600 shadow-md"
                          : isOtherActive
                          ? "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:shadow-sm"
                      )}
                    >
                      {complaint}
                    </button>
                  );
                })}
              </div>

              {/* Inline Form - appears below the grid */}
              {activeComplaint && commonComplaints.includes(activeComplaint) && (
                <div className="mt-4">
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
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileText className="h-4 w-4 text-slate-400" />
                Custom Complaint
              </label>
              <div className="flex gap-2">
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
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Type a custom complaint if not listed above..."
                />
                <button
                  type="button"
                  onClick={handleAddCustomComplaint}
                  disabled={!customComplaintText.trim()}
                  className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>

              {/* Custom Complaint Inline Form */}
              {activeComplaint && !commonComplaints.includes(activeComplaint) && (
                <div className="mt-3">
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
    </div>
  );
}
