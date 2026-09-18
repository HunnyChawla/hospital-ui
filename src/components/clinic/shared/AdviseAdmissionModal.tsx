"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { clinicVisitsApi, ClinicVisitResponse } from "@/services/clinicVisitsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { BedDouble, AlertCircle, CheckCircle2, Clock, Trash2, Send } from "lucide-react";

interface AdviseAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  patientName?: string;
  patientUhid?: string | null;
  currentlyAdvised?: boolean;
  existingNotes?: string | null;
  advisedAt?: string | null;
  isAdmitted?: boolean;
  onSuccess?: (updatedVisit?: ClinicVisitResponse) => void;
}

const PRESET_REASONS = [
  "24-hr Observation",
  "Severe Infection / IV Therapy",
  "Surgical Evaluation",
  "Unstable Vitals",
  "Post-Procedure Care",
  "ICU / HDU Monitoring",
];

export function AdviseAdmissionModal({
  isOpen,
  onClose,
  visitId,
  patientName,
  patientUhid,
  currentlyAdvised = false,
  existingNotes = "",
  advisedAt,
  isAdmitted = false,
  onSuccess,
}: AdviseAdmissionModalProps) {
  const [notes, setNotes] = useState(existingNotes || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotes(existingNotes || "");
    }
  }, [isOpen, existingNotes]);

  const handleAdvise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitId) return;

    setIsLoading(true);
    try {
      const updated = await clinicVisitsApi.adviseAdmission(visitId, notes.trim() || undefined);
      toast.success(
        currentlyAdvised ? "Admission advice notes updated" : "Patient advised for admission"
      );
      onSuccess?.(updated);
      onClose();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to advise admission");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!visitId || isAdmitted) return;

    if (!window.confirm("Are you sure you want to revoke the admission advice for this patient?")) {
      return;
    }

    setIsRevoking(true);
    try {
      const updated = await clinicVisitsApi.revokeAdmissionAdvice(visitId);
      toast.success("Admission advice revoked");
      onSuccess?.(updated);
      onClose();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to revoke admission advice");
    } finally {
      setIsRevoking(false);
    }
  };

  const addPreset = (preset: string) => {
    setNotes((prev) => {
      if (!prev.trim()) return preset;
      if (prev.includes(preset)) return prev;
      return `${prev.trim()}; ${preset}`;
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentlyAdvised ? "Admission Advice Details" : "Advise Patient Admission"}
      size="md"
    >
      <form onSubmit={handleAdvise} className="space-y-4">
        {/* Patient Summary banner */}
        <div className="rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50/50 p-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
              <BedDouble className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{patientName || "Patient"}</p>
              <p className="text-xs text-slate-500 font-medium">UHID: {patientUhid || "—"}</p>
            </div>
          </div>
          {currentlyAdvised && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isAdmitted
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {isAdmitted ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Admitted to IPD
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  Pending Admission
                </>
              )}
            </span>
          )}
        </div>

        {currentlyAdvised && advisedAt && (
          <p className="text-[11px] text-slate-500">
            Advised on:{" "}
            <span className="font-semibold text-slate-700">
              {new Date(advisedAt).toLocaleString()}
            </span>
          </p>
        )}

        {/* Quick Presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Quick Reason Presets:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => addPreset(preset)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-all hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-95"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Notes Textarea */}
        <div>
          <label htmlFor="advice-notes" className="block text-xs font-semibold text-slate-700 mb-1">
            Clinical Indication / Admission Advice Notes:
          </label>
          <textarea
            id="advice-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter reason for admission, department/ward preference, or clinical instructions for IPD intake..."
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all"
          />
        </div>

        {/* Information box for receptionist handoff */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 flex items-start gap-2 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            {currentlyAdvised
              ? "This patient is listed in the Receptionist's OPD Admission Worklist under IPD Management."
              : "Submitting this advice will flag this patient in the Receptionist's IPD Admission worklist so they can allocate a bed and complete admission."}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            {currentlyAdvised && !isAdmitted && (
              <button
                type="button"
                disabled={isRevoking || isLoading}
                onClick={handleRevoke}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-all hover:bg-rose-100 hover:border-rose-300 disabled:opacity-50 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                <span>{isRevoking ? "Revoking..." : "Revoke Advice"}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || isRevoking}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isRevoking}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-500/20 transition-all hover:from-sky-600 hover:to-blue-700 hover:shadow-lg disabled:opacity-50 active:scale-95"
            >
              {isLoading ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>{currentlyAdvised ? "Update Advice" : "Confirm Advice"}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
