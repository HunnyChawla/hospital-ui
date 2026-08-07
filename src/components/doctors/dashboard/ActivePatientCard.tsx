"use client";

import React, { memo } from "react";
import {
  User,
  History,
  Activity,
  FlaskConical,
  FileText,
  BedDouble,
  MessageSquare,
  FileHeart,
  AlertTriangle,
  X,
  Printer,
} from "lucide-react";
import type { Pathway } from "@/services/pathwaysApi";
import { StageProgress } from "./StageProgress";
import { FinaliseVisitAction } from "@/components/health-record/FinaliseVisitAction";

/**
 * The tabs on a patient's record.
 *
 * Exported and imported by everything that needs it. There used to be three
 * identical copies of this union — here, in the layout, and in the redux slice
 * — so adding a tab compiled in one file and failed in the other two.
 */
export type ActiveTab =
  | "complaints"
  | "conditions"
  | "allergies"
  | "history"
  | "vitals"
  | "labs"
  | "notes"
  | "ipd";

interface ActivePatientCardProps {
  patientId: string | null;
  patientName?: string;
  patientUhid?: string;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onClose: () => void;
  onCreatePrescription?: () => void;
  onPrintOpd?: () => void;
  showPrescriptionButton?: boolean;
  /** The selected patient's stage, for the progress track. */
  status?: string | null;
  pathway?: Pathway | null;
  /** The visit being worked on, so it can be finalised from here. */
  visitId?: string | null;
  children: React.ReactNode;
}

// Ordered the way a consultation runs: what brought the patient in, what is
// already true of them, then the readings, then what you write down.
const tabs = [
  { id: "complaints" as ActiveTab, label: "Complaints", icon: MessageSquare },
  { id: "conditions" as ActiveTab, label: "Medical History", icon: FileHeart },
  { id: "allergies" as ActiveTab, label: "Allergies", icon: AlertTriangle },
  { id: "history" as ActiveTab, label: "Visits", icon: History },
  { id: "vitals" as ActiveTab, label: "Vitals", icon: Activity },
  { id: "labs" as ActiveTab, label: "Labs", icon: FlaskConical },
  { id: "notes" as ActiveTab, label: "Notes", icon: FileText },
  { id: "ipd" as ActiveTab, label: "IPD", icon: BedDouble },
];

const ActivePatientCardComponent: React.FC<ActivePatientCardProps> = ({
  patientId,
  patientName,
  patientUhid,
  activeTab,
  onTabChange,
  onClose,
  onCreatePrescription,
  onPrintOpd,
  showPrescriptionButton = false,
  status = null,
  pathway = null,
  visitId = null,
  children,
}) => {
  if (!patientId) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12">
        <div className="text-center">
          <User className="mx-auto h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">
            No Patient Selected
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Select a patient from the schedule or queue to view details
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
      {/* Patient header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 to-teal-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {patientName || "Patient Details"}
              </h2>
              <p className="text-xs text-slate-600">{patientUhid || patientId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showPrescriptionButton && onCreatePrescription && (
              <button
                onClick={onCreatePrescription}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
              >
                <FileText className="h-4 w-4" />
                Create Prescription
              </button>
            )}

            {onPrintOpd && (
              <button
                onClick={onPrintOpd}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
              >
                <Printer className="h-4 w-4" />
                Print OPD
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              title="Clear selection"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <StageProgress status={status} pathway={pathway} />

          {/* The doctor finishing the consultation is the person who should
              close the record. Without this they would have to leave the panel
              and find the patient again in the OPD list. */}
          {visitId && (
            <FinaliseVisitAction episodeType="opd_visit" sourceId={visitId} />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-slate-50">
        {/* Scrolls rather than wraps: eight tabs do not fit a narrow screen,
            and a wrapped second row pushes the patient's record down the page
            every time the window is small. */}
        <div className="flex gap-1 overflow-x-auto px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "border-sky-500 bg-white text-sky-700"
                    : "border-transparent text-slate-600 hover:bg-white/50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="patient-content-transition flex-1 overflow-y-auto bg-slate-50 p-6">
        {children}
      </div>
    </div>
  );
};

// Memoize to prevent re-render when parent re-renders
export const ActivePatientCard = memo(ActivePatientCardComponent);
