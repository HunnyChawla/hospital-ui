"use client";

import React, { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { addComplaint, deleteComplaint } from "@/redux/optometryDataSlice";
import { Plus, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { ComplaintRecord } from "@/types";
import { ConfirmedComplaintsSummary } from "@/components/optometrist/patient-examination/ConfirmedComplaintsSummary";
import { ResizablePanel } from "@/components/optometrist/shared";
import { InlineComplaintForm } from "./InlineComplaintForm";
import { GENERAL_COMPLAINTS } from "./commonComplaints";
import { handleError } from "@/utils/errorHandler";
import { ComplaintsHistorySection } from "@/components/optometrist/patient-examination/ComplaintsHistorySection";

interface ClinicComplaintsTabProps {
  patientId: string;
  visitId: string;
  /**
   * The user recording the complaint — a doctor in a general hospital, an
   * optometrist in an eye one. The API field is still `optometrist_id` and is
   * nullable; it only ever meant "who wrote this down".
   */
  recordedByUserId: string;
  complaints: ComplaintRecord[];
  loading: boolean;
  onRefresh: () => void;
  /**
   * Whether complaints are recorded against an eye.
   *
   * True on the optometrist panel, where the eye is appended to the complaint
   * text as "(RE)"/"(LE)"/"(BE)". False everywhere else — a general hospital
   * recording "headache (BE)" would be recording something untrue.
   */
  showEyeSelector?: boolean;
  /**
   * The quick-select buttons. Defaults to the eye list, because that is what
   * every existing caller shows. A general hospital passes GENERAL_COMPLAINTS —
   * offering "floaters" and "foreign body sensation" to a physician would push
   * every real complaint into the free-text box.
   */
  quickComplaints?: string[];
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

export function ClinicComplaintsTab({
  patientId,
  visitId,
  recordedByUserId,
  complaints,
  loading,
  onRefresh,
  showEyeSelector = true,
  quickComplaints = GENERAL_COMPLAINTS,
}: ClinicComplaintsTabProps) {
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
            optometrist_id: recordedByUserId,
            complaint: showEyeSelector ? `${data.text} (${data.eye})` : data.text,
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
    <div className="rounded-xl border border-slate-200/60 bg-white shadow-lg overflow-visible transition-all duration-300 hover:shadow-xl h-full">
      <div className="p-4 space-y-3">
        {/* Quick Select Complaints */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {quickComplaints.map((complaint, index) => {
              const isActive = activeComplaint === complaint;
              const isOtherActive = activeComplaint && activeComplaint !== complaint;
              // Check if this complaint is already confirmed (in the complaints list)
              const isConfirmed = complaints.some(c =>
                c.complaint?.replace(/\s*\((RE|LE|BE|GE)\)\s*$/, "").trim().toLowerCase() === complaint.toLowerCase()
              );
              const isDisabled = Boolean(isOtherActive);

              return (
                <div key={complaint} className="relative">
                  <button
                    type="button"
                    onClick={() => handleComplaintButtonClick(complaint)}
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
                      <span className="truncate">{complaint}</span>
                      {isConfirmed && !isActive && !isDisabled && (
                        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 ml-1" />
                      )}
                    </div>
                  </button>

                  {/* Inline Form - appears just below the active chip as a popup overlay */}
                  {isActive && (
                    <div className={clsx(
                      "absolute top-full z-[100] mt-2 w-[calc(100vw-3rem)] max-w-[320px] sm:max-w-[400px] md:max-w-[450px] animate-in fade-in slide-in-from-top-2 duration-300",
                      index % 2 === 0 ? "left-0" : "right-0",
                      index % 3 === 0 ? "md:left-0 md:right-auto md:translate-x-0" : index % 3 === 1 ? "md:left-1/2 md:-translate-x-1/2 md:right-auto" : "md:right-0 md:left-auto md:translate-x-0"
                    )}>
                      <InlineComplaintForm
                        complaintText={activeComplaint}
                        onSave={handleSaveComplaint}
                        onCancel={handleCancelForm}
                        isSubmitting={isSubmitting}
                        defaultValues={getDefaultFormValues()}
                        showEyeSelector={showEyeSelector}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
          {activeComplaint && !quickComplaints.includes(activeComplaint) && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <InlineComplaintForm
                complaintText={activeComplaint}
                onSave={handleSaveComplaint}
                onCancel={handleCancelForm}
                isSubmitting={isSubmitting}
                defaultValues={getDefaultFormValues()}
                showEyeSelector={showEyeSelector}
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
