"use client";

import { X } from "lucide-react";
import { OptometryPrescriptionForm } from "./OptometryPrescriptionForm";
import type { OptometryPrescription, RefractionRecord } from "@/types";

interface OptometryPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  visitId: string;
  optometristId: string;
  latestRefractionOD?: RefractionRecord | null;
  latestRefractionOS?: RefractionRecord | null;
  existingPrescription?: OptometryPrescription | null;
  onSave?: (prescription: any) => void;
  onFinalize?: (prescription: any) => void;
  onPrint?: (prescription: any) => void;
}

export function OptometryPrescriptionModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  visitId,
  optometristId,
  latestRefractionOD,
  latestRefractionOS,
  existingPrescription,
  onSave,
  onFinalize,
  onPrint,
}: OptometryPrescriptionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl scrollbar-hide">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {existingPrescription ? "View/Edit" : "Create"} Optical Prescription
            </h2>
            <p className="text-sm text-slate-600">
              Patient: <span className="font-medium">{patientName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <OptometryPrescriptionForm
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            latestRefractionOD={latestRefractionOD}
            latestRefractionOS={latestRefractionOS}
            existingPrescription={existingPrescription}
            onSave={onSave}
            onFinalize={onFinalize}
            onPrint={onPrint}
          />
        </div>
      </div>
    </div>
  );
}
