"use client";

import React, { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Admission, PatientStatus } from "@/services/admissionsApi";
import { useUpdatePatientStatus } from "@/hooks/queries/useAdmissions";
import { 
  Building2, 
  PlaneTakeoff, 
  ArrowRightLeft, 
  Skull, 
  AlertTriangle, 
  UserX,
  Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface UpdatePatientStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  admission: Admission;
  onSuccess?: () => void;
}

const PATIENT_STATUS_OPTIONS: {
  value: PatientStatus;
  label: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
}[] = [
  {
    value: "IN_HOSPITAL",
    label: "In Hospital / Present",
    description: "Patient is present in their assigned hospital bed/ward",
    icon: Building2,
    colorClass: "border-teal-500 bg-teal-50 text-teal-900",
  },
  {
    value: "ON_LEAVE",
    label: "On Leave (Temporary Permission)",
    description: "Patient temporarily away with authorized medical approval",
    icon: PlaneTakeoff,
    colorClass: "border-sky-500 bg-sky-50 text-sky-900",
  },
  {
    value: "TRANSFERRED",
    label: "Transferred (External Facility)",
    description: "Patient transferred to another hospital or healthcare facility",
    icon: ArrowRightLeft,
    colorClass: "border-purple-500 bg-purple-50 text-purple-900",
  },
  {
    value: "LAMA",
    label: "LAMA (Left Against Medical Advice)",
    description: "Patient left facility contrary to physician recommendation",
    icon: AlertTriangle,
    colorClass: "border-amber-500 bg-amber-50 text-amber-900",
  },
  {
    value: "DAMA",
    label: "DAMA (Discharged Against Medical Advice)",
    description: "Discharge processed under informed refusal of treatment",
    icon: AlertTriangle,
    colorClass: "border-amber-500 bg-amber-50 text-amber-900",
  },
  {
    value: "ABSCONDED",
    label: "Absconded (Left Without Notice)",
    description: "Patient left premises without authorization or notice",
    icon: UserX,
    colorClass: "border-rose-500 bg-rose-50 text-rose-900",
  },
  {
    value: "EXPIRED",
    label: "Expired (Deceased)",
    description: "Patient passed away during active inpatient admission",
    icon: Skull,
    colorClass: "border-slate-600 bg-slate-100 text-slate-900",
  },
];

export function UpdatePatientStatusModal({
  isOpen,
  onClose,
  admission,
  onSuccess,
}: UpdatePatientStatusModalProps) {
  const currentStatus = (admission.patient_status || "IN_HOSPITAL").toUpperCase() as PatientStatus;
  const [selectedStatus, setSelectedStatus] = useState<PatientStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const updateMutation = useUpdatePatientStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (["ON_LEAVE", "TRANSFERRED", "LAMA", "DAMA", "ABSCONDED", "EXPIRED"].includes(selectedStatus) && !reason.trim()) {
      toast.error("Please provide a reason for this status change");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        admissionId: admission.id,
        data: {
          patient_status: selectedStatus,
          reason: reason.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      toast.success("Patient presence status updated successfully");
      onSuccess?.();
      onClose();
    } catch {
      // Handled by hook error toast
    }
  };

  const isSevere = ["EXPIRED", "ABSCONDED", "LAMA", "DAMA"].includes(selectedStatus);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-col">
          <span className="text-base font-bold text-slate-900">Update Patient Presence</span>
          <span className="text-xs text-slate-500 font-normal mt-0.5">
            Patient: <strong className="text-slate-800">{admission.patient_name || "Unknown"}</strong> • Admission #{admission.admission_number}
          </span>
        </div>
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Status Selection Cards */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Presence Status
          </label>
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {PATIENT_STATUS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedStatus === opt.value;
              const isCurrent = currentStatus === opt.value;

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
                      <span className={`text-sm font-semibold ${isSelected ? "text-sky-950" : "text-slate-900"}`}>
                        {opt.label}
                      </span>
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

        {/* Severe Status Warning Banner */}
        {isSevere && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-0.5">
              <p className="font-semibold">Clinical & Administrative Alert</p>
              <p className="text-amber-800">
                This status update will be permanently recorded in the patient&apos;s medical record audit timeline.
              </p>
            </div>
          </div>
        )}

        {/* Reason / Justification Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Reason / Medical Order <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required={["ON_LEAVE", "TRANSFERRED", "LAMA", "DAMA", "ABSCONDED", "EXPIRED"].includes(selectedStatus)}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Authorized weekend leave, Transfer to higher center, Left without consent..."
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Detailed Clinical Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Additional Clinical Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detailed observations, escort details, receiving facility name, or attending physician instructions..."
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
            <span>Save Status</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
