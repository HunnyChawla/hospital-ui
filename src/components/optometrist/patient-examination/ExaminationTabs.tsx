"use client";

import clsx from "clsx";
import {
  MessageSquare,
  FileHeart,
  Eye,
  AlertTriangle,
  Scan,
  Glasses,
  Activity,
  History,
  FileText
} from "lucide-react";
import { ComplaintsTab } from "./ComplaintsTab";
import { MedicalHistoryTab } from "./MedicalHistoryTab";
import { OphthalHistoryTab } from "./OphthalHistoryTab";
import { DrugAllergyTab } from "./DrugAllergyTab";
import { ARDataTab } from "./ARDataTab";
import { RefractionTab } from "./RefractionTab";
import { IOPTab } from "./IOPTab";
import { PreviousHistoryTimeline } from "./PreviousHistoryTimeline";
import { DiagnosisNotesTab } from "./DiagnosisNotesTab";
import type {
  ComplaintRecord,
  OphthalmicSurgeryRecord,
  DrugAllergyRecord,
  ARDataRecord,
  RefractionRecord,
  IOPRecord,
  IOPTrend,
  PatientOptometryTimeline,
} from "@/types";

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

interface ExaminationTabsProps {
  patientId: string;
  visitId: string;
  optometristId: string;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;

  // Data props
  complaints: ComplaintRecord[];
  ophthalmicHistory: OphthalmicSurgeryRecord[];
  drugAllergies: DrugAllergyRecord[];
  arDataRecords: ARDataRecord[];
  refractionRecords: RefractionRecord[];
  iopRecords: IOPRecord[];
  iopTrends: IOPTrend[] | any; // TODO: Fix type - should be IOPTrendSummary
  patientOptometryHistory: PatientOptometryTimeline | null;
  historyLoading?: boolean;
  refreshHistory?: () => void;

  // Loading states
  loading: {
    refraction: boolean;
    iop: boolean;
    arData: boolean;
    complaints: boolean;
    ophthalmicHistory: boolean;
    drugAllergies: boolean;
  };

  // Refresh functions
  refreshComplaints: () => void;
  refreshOphthalmicHistory: () => void;
  refreshDrugAllergies: () => void;
  refreshARData: () => void;
  refreshRefraction: () => void;
  refreshIOP: () => void;
}

const tabs = [
  { id: "complaints", label: "Complaints", icon: MessageSquare },
  { id: "medical_history", label: "Medical History", icon: FileHeart },
  { id: "ophthalmic_history", label: "Eye Surgery History", icon: Eye },
  { id: "allergies", label: "Drug Allergies", icon: AlertTriangle },
  { id: "ar_data", label: "AR Data", icon: Scan },
  { id: "refraction", label: "Refraction", icon: Glasses },
  { id: "iop", label: "IOP", icon: Activity },
  { id: "previous_history", label: "Previous History", icon: History },
  { id: "diagnosis", label: "Diagnosis & Notes", icon: FileText },
] as const;

export function ExaminationTabs({
  patientId,
  visitId,
  optometristId,
  activeTab,
  onTabChange,
  complaints,
  ophthalmicHistory,
  drugAllergies,
  arDataRecords,
  refractionRecords,
  iopRecords,
  iopTrends,
  patientOptometryHistory,
  historyLoading,
  refreshHistory,
  loading,
  refreshComplaints,
  refreshOphthalmicHistory,
  refreshDrugAllergies,
  refreshARData,
  refreshRefraction,
  refreshIOP,
}: ExaminationTabsProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-sky-50/30 backdrop-blur-sm">
        <div className="flex gap-1 px-2 py-2 sm:px-4">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    // Always trigger a refresh when clicking Previous History
                    if (tab.id === "previous_history") {
                      refreshHistory && refreshHistory();
                    }
                    onTabChange(tab.id as ActiveTab);
                  }}
                  className={clsx(
                    "group flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-semibold transition-all duration-200 rounded-t-lg sm:px-4 sm:py-3 sm:text-sm whitespace-nowrap",
                    isActive
                      ? "border-sky-600 bg-white text-sky-700 shadow-sm scale-105"
                      : "border-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900 hover:border-slate-300 hover:scale-105"
                  )}
                >
                  <Icon className={clsx(
                    "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-gradient-to-br from-slate-50/50 to-transparent p-3 sm:p-6">
        {activeTab === "complaints" && (
          <ComplaintsTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            complaints={complaints}
            loading={loading.complaints}
            onRefresh={refreshComplaints}
          />
        )}

        {activeTab === "medical_history" && (
          <MedicalHistoryTab
            patientId={patientId}
            visitId={visitId}
          />
        )}

        {activeTab === "ophthalmic_history" && (
          <OphthalHistoryTab
            patientId={patientId}
            ophthalmicHistory={ophthalmicHistory}
            loading={loading.ophthalmicHistory}
            onRefresh={refreshOphthalmicHistory}
          />
        )}

        {activeTab === "allergies" && (
          <DrugAllergyTab
            patientId={patientId}
            drugAllergies={drugAllergies}
            loading={loading.drugAllergies}
            onRefresh={refreshDrugAllergies}
          />
        )}

        {activeTab === "ar_data" && (
          <ARDataTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            arDataRecords={arDataRecords}
            loading={loading.arData}
            onRefresh={refreshARData}
          />
        )}

        {activeTab === "refraction" && (
          <RefractionTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            refractionRecords={refractionRecords}
            loading={loading.refraction}
            onRefresh={refreshRefraction}
          />
        )}

        {activeTab === "iop" && (
          <IOPTab
            patientId={patientId}
            visitId={visitId}
            iopRecords={iopRecords}
            iopTrends={iopTrends}
            loading={loading.iop}
            onRefresh={refreshIOP}
          />
        )}

        {activeTab === "previous_history" && (
          <PreviousHistoryTimeline
            patientOptometryHistory={patientOptometryHistory}
            loading={!!historyLoading}
            currentVisitComplaints={complaints}
          />
        )}

        {activeTab === "diagnosis" && (
          <DiagnosisNotesTab patientId={patientId} visitId={visitId} />
        )}
      </div>
    </div>
  );
}
