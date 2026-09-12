"use client";

import React, { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Admission, CareStatus } from "@/services/admissionsApi";
import { useUpdateCareStatus } from "@/hooks/queries/useAdmissions";
import { 
  Stethoscope, 
  Activity, 
  HeartPulse, 
  FileCheck,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface UpdateCareStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  admission: Admission;
  onSuccess?: () => void;
}

const CARE_STATUS_OPTIONS: {
  value: CareStatus;
  label: string;
  stageNumber: number;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "ADMITTED",
    stageNumber: 1,
    label: "Admitted / Initial Assessment",
    description: "Initial clinical evaluation, baseline vitals, and admission orders entry",
    icon: Stethoscope,
  },
  {
    value: "UNDER_TREATMENT",
    stageNumber: 2,
    label: "Under Active Treatment",
    description: "Active medication administration, nursing procedures, diagnostic monitoring",
    icon: Activity,
  },
  {
    value: "RECOVERY",
    stageNumber: 3,
    label: "Recovery / Stable",
    description: "Patient condition stabilized, post-procedure recovery, preparing for discharge",
    icon: HeartPulse,
  },
  {
    value: "READY_FOR_DISCHARGE",
    stageNumber: 4,
    label: "Ready for Discharge",
    description: "Doctor approved medical clearance; ready for summary & billing finalization",
    icon: FileCheck,
  },
];

export function UpdateCareStatusModal({
  isOpen,
  onClose,
  admission,
  onSuccess,
}: UpdateCareStatusModalProps) {
  const currentCareStatus = (admission.care_status || "ADMITTED").toUpperCase() as CareStatus;
  const [selectedStatus, setSelectedStatus] = useState<CareStatus>(currentCareStatus);
  const [notes, setNotes] = useState("");

  const updateMutation = useUpdateCareStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync({
        admissionId: admission.id,
        data: {
          care_status: selectedStatus,
          notes: notes.trim() || undefined,
        },
      });
      toast.success("Care progress status updated successfully");
      onSuccess?.();
      onClose();
    } catch {
      // Handled by hook toast
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-col">
          <span className="text-base font-bold text-slate-900">Update Care Progress Stage</span>
          <span className="text-xs text-slate-500 font-normal mt-0.5">
            Patient: <strong className="text-slate-800">{admission.patient_name || "Unknown"}</strong> • Admission #{admission.admission_number}
          </span>
        </div>
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Care Stage Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Clinical Stage
          </label>
          <div className="space-y-2">
            {CARE_STATUS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedStatus === opt.value;
              const isCurrent = currentCareStatus === opt.value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedStatus(opt.value)}
                  className={`w-full flex items-start gap-3 p-3 text-left rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/70 shadow-xs ring-1 ring-sky-400"
                      : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? "bg-sky-500 text-white shadow-xs" : "bg-slate-100 text-slate-600"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500">Stage {opt.stageNumber}:</span>
                        <span className={`text-sm font-semibold ${isSelected ? "text-sky-950" : "text-slate-900"}`}>
                          {opt.label}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clinical Notes / Observations */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Clinical Notes & Observations (Optional)
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document patient clinical improvements, post-op progress, response to treatment, or discharge readiness notes..."
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center justify-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white shadow-sm shadow-sky-500/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Update Care Stage</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
