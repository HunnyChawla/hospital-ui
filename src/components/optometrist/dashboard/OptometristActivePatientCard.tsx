"use client";

import React from "react";
import { Eye, X } from "lucide-react";
import { ShowSummaryButton } from "../summary/ShowSummaryButton";

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
  visitId?: string;
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
  visitId,
  onClose,
  showPatientCard,
  children,
}) => {
  if (!showPatientCard) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100/50 p-12 backdrop-blur-sm">
        <div className="text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 p-5 shadow-lg">
            <Eye className="h-full w-full text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-700">No Patient Selected</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
            Select a patient from the queue to begin examination
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-lg animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="border-b border-slate-200/60 bg-gradient-to-r from-sky-50 via-blue-50/50 to-teal-50 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 sm:h-12 sm:w-12">
              <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {patientName || "Patient Details"}
              </h2>
              <p className="truncate text-xs font-medium text-slate-600 sm:text-sm">
                {patientUhid || patientId}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <ShowSummaryButton
              patientId={patientId || ""}
              patientName={patientName || ""}
              patientUhid={patientUhid || ""}
              visitId={visitId}
            />
            <button
              onClick={onClose}
              className="group rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 hover:scale-105 active:scale-95"
              title="Clear selection"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
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
