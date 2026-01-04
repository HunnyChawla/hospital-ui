"use client";

import React from "react";
import { Eye, X } from "lucide-react";
import { PrescriptionButton } from "../prescriptions/PrescriptionButton";

type ActiveTab = 
  | "complaints"
  | "medical_history"
  | "ophthalmic_history"
  | "allergies"
  | "ar_data"
  | "refraction"
  | "iop"
  | "previous_history"
  | "diagnosis";

interface OptometristActivePatientCardProps {
  patientId: string | null;
  patientName?: string;
  patientUhid?: string;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onClose: () => void;
  showPatientCard: boolean;
  children: React.ReactNode;
}

export const OptometristActivePatientCard: React.FC<OptometristActivePatientCardProps> = ({
  patientId,
  patientName,
  patientUhid,
  onClose,
  showPatientCard,
  children,
}) => {
  if (!showPatientCard) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12">
        <div className="text-center">
          <Eye className="mx-auto h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">No Patient Selected</h3>
          <p className="mt-2 text-sm text-slate-500">
            Select a patient from the queue to begin examination
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
      <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 to-teal-50 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 sm:h-12 sm:w-12">
              <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {patientName || "Patient Details"}
              </h2>
              <p className="truncate text-xs text-slate-600 sm:text-sm">
                UHID: {patientUhid || patientId}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <PrescriptionButton
              patientId={patientId || ""}
              patientName={patientName || ""}
              patientUhid={patientUhid || ""}
              visitId={""}
              optometristId={""}
              optometristName={"Optometrist"}
            />
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              title="Clear selection"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
