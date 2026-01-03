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
  MedicalHistoryRecord,
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
  medicalHistory?: MedicalHistoryRecord | null; // Optional - MedicalHistoryTab manages its own data
  ophthalmicHistory: OphthalmicSurgeryRecord[];
  drugAllergies: DrugAllergyRecord[];
  arDataRecords: ARDataRecord[];
  refractionRecords: RefractionRecord[];
  iopRecords: IOPRecord[];
  iopTrends: IOPTrend[] | any; // TODO: Fix type - should be IOPTrendSummary
  patientOptometryHistory: PatientOptometryTimeline | null;

  // Loading states
  loading: {
    refraction: boolean;
    iop: boolean;
    arData: boolean;
    complaints: boolean;
    medicalHistory?: boolean; // Optional - MedicalHistoryTab manages its own loading
    ophthalmicHistory: boolean;
    drugAllergies: boolean;
  };

  // Refresh functions
  refreshComplaints: () => void;
  refreshMedicalHistory?: () => void; // Optional - MedicalHistoryTab manages its own refresh
  refreshOphthalmicHistory: () => void;
  refreshDrugAllergies: () => void;
  refreshARData: () => void;
  refreshRefraction: () => void;
  refreshIOP: () => void;
  refreshHistory: () => void;
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
  medicalHistory,
  ophthalmicHistory,
  drugAllergies,
  arDataRecords,
  refractionRecords,
  iopRecords,
  iopTrends,
  patientOptometryHistory,
  loading,
  refreshComplaints,
  refreshMedicalHistory,
  refreshOphthalmicHistory,
  refreshDrugAllergies,
  refreshARData,
  refreshRefraction,
  refreshIOP,
  refreshHistory,
}: ExaminationTabsProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex-shrink-0">
        <div className="flex gap-1 sm:gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as ActiveTab)}
                className={clsx(
                  "flex items-center gap-1 sm:gap-2 whitespace-nowrap rounded-t-lg px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition min-w-0 flex-shrink-0",
                  isActive
                    ? "bg-sky-100 text-sky-700 border-sky-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">{tab.label}</span>
                <span className="sm:hidden truncate">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
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
            medicalHistory={medicalHistory}
            loading={loading.medicalHistory}
            onRefresh={refreshMedicalHistory}
          />
        )}

        {activeTab === "ophthalmic_history" && (
          <OphthalHistoryTab
            patientId={patientId}
            visitId={visitId}
            ophthalmicHistory={ophthalmicHistory}
            loading={loading.ophthalmicHistory}
            onRefresh={refreshOphthalmicHistory}
          />
        )}

        {activeTab === "allergies" && (
          <DrugAllergyTab
            patientId={patientId}
            visitId={visitId}
            drugAllergies={drugAllergies}
            loading={loading.drugAllergies}
            onRefresh={refreshDrugAllergies}
          />
        )}

        {activeTab === "ar_data" && (
          <ARDataTab
            patientId={patientId}
            visitId={visitId}
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
            loading={false}
          />
        )}

        {activeTab === "diagnosis" && (
          <DiagnosisNotesTab patientId={patientId} visitId={visitId} />
        )}
      </div>
    </div>
  );
}
