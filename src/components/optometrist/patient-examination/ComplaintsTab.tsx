"use client";

import { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { addComplaint, deleteComplaint } from "@/redux/optometryDataSlice";
import { Plus, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { ComplaintRecord } from "@/types";
import { ConfirmedComplaintsSummary } from "./ConfirmedComplaintsSummary";
import { ResizablePanel } from "../shared";
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
  severity: Severity | null;
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
            severity: data.severity || null,
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

  const handleClearAllComplaints = async () => {
    if (!confirm("Are you sure you want to delete all complaints? This action cannot be undone.")) return;

    try {
      const deletePromises = complaints.map(complaint =>
        dispatch(deleteComplaint({ id: complaint.id })).unwrap()
      );
      await Promise.all(deletePromises);
      toast.success("All complaints cleared");
      onRefresh();
    } catch (error) {
      handleError(error, {
        defaultMessage: "Failed to clear complaints",
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
      severity: (editingComplaint.severity as Severity) || null,
      duration: editingComplaint.duration || "",
      notes: editingComplaint.notes || "",
    };
  };

  const leftContent = (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden h-full">
      <div className="p-4 space-y-4">
        {/* Quick Select Complaints */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {commonComplaints.map((complaint) => {
              const isActive = activeComplaint === complaint;
              // Check if this complaint is already confirmed (in the complaints list)
              const isConfirmed = complaints.some(c =>
                c.complaint?.replace(/\s*\((RE|LE|BE|GE)\)\s*$/, "").trim().toLowerCase() === complaint.toLowerCase()
              );

              return (
                <button
                  key={complaint}
                  type="button"
                  onClick={() => handleComplaintButtonClick(complaint)}
                  className={clsx(
                    "w-full rounded-lg border px-2.5 sm:px-3 py-2 text-xs font-semibold transition text-left cursor-pointer",
                    isActive
                      ? "bg-sky-600 text-white border-sky-600 shadow-xs ring-2 ring-sky-500/20"
                      : isConfirmed
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/60"
                        : "bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-white hover:border-sky-300 hover:text-sky-700"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">{complaint}</span>
                    {isConfirmed && !isActive && (
                      <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Inline Form - appears below the grid */}
          {activeComplaint && commonComplaints.includes(activeComplaint) && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
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
        <div className="pt-2 border-t border-slate-100">
          <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <FileText className="h-3.5 w-3.5 text-sky-600" />
            Custom Complaint
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customComplaintText}
              onChange={(e) => setCustomComplaintText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey))) {
                  e.preventDefault();
                  handleAddCustomComplaint();
                }
              }}
              className="flex-1 rounded-lg border border-slate-300 bg-white text-slate-900 px-3.5 py-2 text-xs sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition"
              placeholder="Type a custom complaint if not listed above..."
            />
            <button
              type="button"
              onClick={handleAddCustomComplaint}
              disabled={!customComplaintText.trim()}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Custom Complaint Inline Form */}
          {activeComplaint && !commonComplaints.includes(activeComplaint) && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
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
  );

  const rightContent = (
    <ConfirmedComplaintsSummary
      complaints={complaints}
      onEdit={handleEditComplaint}
      onDelete={handleDeleteComplaint}
      onClearAll={handleClearAllComplaints}
      loading={loading}
    />
  );

  const bottomContent = (
    <ComplaintsHistorySection
      patientId={patientId}
      currentVisitId={visitId}
    />
  );

  return (
    <ResizablePanel
      leftContent={leftContent}
      rightContent={rightContent}
      bottomContent={bottomContent}
      defaultLeftWidthPercent={67}
      minLeftWidthPercent={40}
      maxLeftWidthPercent={80}
      storageKey="optometry-complaints-panel-width"
    />
  );
}
