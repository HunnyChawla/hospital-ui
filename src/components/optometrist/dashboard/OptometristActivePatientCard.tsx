"use client";

import React from "react";
import { Eye, X, FileText } from "lucide-react";
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
  activeTab,
  onTabChange,
  onClose,
  showPatientCard,
  children,
}) => {
  if (!showPatientCard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Eye className="w-20 h-20 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            No Patient Selected
          </h3>
          <p className="text-slate-500">
            Select a patient from the queue to begin examination
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden">
      {/* Patient Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-6 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2 truncate">
              {patientName}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 truncate">UHID: {patientUhid || patientId}</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <PrescriptionButton
              patientId={patientId || ""}
              patientName={patientName || ""}
              patientUhid={patientUhid || ""}
              visitId={""} // Will be populated when visit is selected
              optometristId={""} // Will be populated when optometrist is available
              optometristName={"Optometrist"} // Will be populated when optometrist is available
            />
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 sm:p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Clear patient selection"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Examination Tabs - Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-w-0">
        {children}
      </div>
    </div>
  );
};
