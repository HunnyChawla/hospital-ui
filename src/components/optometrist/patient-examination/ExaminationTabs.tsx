"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  EyeOff,
  LayoutGrid,
  LayoutList,
  LayoutDashboard,
} from "lucide-react";
import { useExaminationViewPreference } from "@/hooks/useExaminationViewPreference";
import { VisionTab } from "./VisionTab";
import { ComplaintsTab } from "./ComplaintsTab";
import { MedicalHistoryTab } from "./MedicalHistoryTab";
import { OphthalHistoryTab } from "./OphthalHistoryTab";
import { DrugAllergyTab } from "./DrugAllergyTab";
import { ARDataTab } from "./ARDataTab";
import { RefractionTab } from "./RefractionTab";
import { IOPTab } from "./IOPTab";
import { CurrentSpecsTab } from "./CurrentSpecsTab";
import { PreviousHistoryTimeline } from "./PreviousHistoryTimeline";
import { ExaminationSingleView } from "./ExaminationSingleView";
import { ExaminationCompactView } from "./ExaminationCompactView";
import type {
  ComplaintRecord,
  OphthalmicSurgeryRecord,
  DrugAllergyRecord,
  ARDataRecord,
  RefractionRecord,
  IOPRecord,
  IOPTrend,
  PatientOptometryTimeline,
  VisionRecord,
  CurrentSpecsRecord,
} from "@/types";

type ActiveTab =
  | "complaints"
  | "vision"
  | "current_specs"
  | "medical_history"
  | "ophthalmic_history"
  | "allergies"
  | "ar_data"
  | "refraction"
  | "iop"
  | "previous_history";

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
  visionRecords: VisionRecord[];
  currentSpecsRecords: CurrentSpecsRecord[];
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
    vision: boolean;
    currentSpecs: boolean;
  };

  // Refresh functions
  refreshComplaints: () => void;
  refreshOphthalmicHistory: () => void;
  refreshDrugAllergies: () => void;
  refreshARData: () => void;
  refreshRefraction: () => void;
  refreshIOP: () => void;
  refreshVision: () => void;
  refreshCurrentSpecs: () => void;
}

const tabs = [
  { id: "complaints", label: "Complaints", icon: MessageSquare },
  { id: "vision", label: "Vision", icon: EyeOff },
  { id: "current_specs", label: "Current Specs", icon: Glasses },
  { id: "medical_history", label: "Medical History", icon: FileHeart },
  { id: "ophthalmic_history", label: "Eye Surgery History", icon: Eye },
  { id: "allergies", label: "Drug Allergies", icon: AlertTriangle },
  { id: "ar_data", label: "AR Data", icon: Scan },
  { id: "refraction", label: "Refraction", icon: Glasses },
  { id: "iop", label: "IOP", icon: Activity },
  { id: "previous_history", label: "Previous History", icon: History },
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
  visionRecords,
  currentSpecsRecords,
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
  refreshVision,
  refreshCurrentSpecs,
}: ExaminationTabsProps) {
  const { viewMode, setViewMode } = useExaminationViewPreference();
  const containerRef = useRef<HTMLDivElement>(null);



  // If compact view mode, render the compact view component
  if (viewMode === "compact") {
    return (
      <div
        ref={containerRef}
        className={clsx(
          "flex h-full min-h-0 flex-col",
          "flex h-full min-h-0 flex-col"
        )}
      >
        {/* View Toggle Header */}
        <div className="flex-shrink-0 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-sky-50/30 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-sky-600" />
              <span className="text-sm font-semibold text-slate-700">Compact View</span>
              <span className="text-xs text-slate-500 hidden sm:inline">(Summary cards with modal editing)</span>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("tabs")}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all text-slate-600 hover:bg-slate-100"
                  title="Tabs View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tabs</span>
                </button>
                <button
                  onClick={() => setViewMode("single")}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all text-slate-600 hover:bg-slate-100"
                  title="Single View"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Single</span>
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all bg-sky-600 text-white shadow-sm"
                  title="Compact View"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Compact</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Compact View Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-gradient-to-br from-slate-50/50 to-transparent p-3 sm:p-6">
          <ExaminationCompactView
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            complaints={complaints}
            ophthalmicHistory={ophthalmicHistory}
            drugAllergies={drugAllergies}
            arDataRecords={arDataRecords}
            refractionRecords={refractionRecords}
            iopRecords={iopRecords}
            iopTrends={iopTrends}
            visionRecords={visionRecords}
            loading={loading}
            refreshComplaints={refreshComplaints}
            refreshOphthalmicHistory={refreshOphthalmicHistory}
            refreshDrugAllergies={refreshDrugAllergies}
            refreshARData={refreshARData}
            refreshRefraction={refreshRefraction}
            refreshIOP={refreshIOP}
            refreshVision={refreshVision}
          />
        </div>
      </div>
    );
  }

  // If single view mode, render the single view component
  if (viewMode === "single") {
    return (
      <div
        ref={containerRef}
        className={clsx(
          "flex h-full min-h-0 flex-col",
          "flex h-full min-h-0 flex-col"
        )}
      >
        {/* View Toggle Header */}
        <div className="flex-shrink-0 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-sky-50/30 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-sky-600" />
              <span className="text-sm font-semibold text-slate-700">Single View</span>
              <span className="text-xs text-slate-500 hidden sm:inline">(All sections on one page)</span>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("tabs")}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all text-slate-600 hover:bg-slate-100"
                  title="Tabs View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tabs</span>
                </button>
                <button
                  onClick={() => setViewMode("single")}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all bg-sky-600 text-white shadow-sm"
                  title="Single View"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Single</span>
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all text-slate-600 hover:bg-slate-100"
                  title="Compact View"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Compact</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Single View Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-gradient-to-br from-slate-50/50 to-transparent p-3 sm:p-6">
          <ExaminationSingleView
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            complaints={complaints}
            ophthalmicHistory={ophthalmicHistory}
            drugAllergies={drugAllergies}
            arDataRecords={arDataRecords}
            refractionRecords={refractionRecords}
            iopRecords={iopRecords}
            iopTrends={iopTrends}
            visionRecords={visionRecords}
            loading={loading}
            refreshComplaints={refreshComplaints}
            refreshOphthalmicHistory={refreshOphthalmicHistory}
            refreshDrugAllergies={refreshDrugAllergies}
            refreshARData={refreshARData}
            refreshRefraction={refreshRefraction}
            refreshIOP={refreshIOP}
            refreshVision={refreshVision}
          />
        </div>
      </div>
    );
  }

  // Tabs view mode (default)
  return (
    <div
      ref={containerRef}
      className={clsx(
        "flex h-full min-h-0 flex-col",
        "flex h-full min-h-0 flex-col"
      )}
    >
      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-sky-50/30 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 px-2 py-2 sm:px-4">
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

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex-shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setViewMode("tabs")}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all bg-sky-600 text-white shadow-sm"
                title="Tabs View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("single")}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all text-slate-600 hover:bg-slate-100"
                title="Single View"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("compact")}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all text-slate-600 hover:bg-slate-100"
                title="Compact View"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
              </button>
            </div>

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

        {activeTab === "vision" && (
          <VisionTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            visionRecords={visionRecords}
            loading={loading.vision}
            onRefresh={refreshVision}
          />
        )}

        {activeTab === "current_specs" && (
          <CurrentSpecsTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            currentSpecsRecords={currentSpecsRecords}
            loading={loading.currentSpecs}
            onRefresh={refreshCurrentSpecs}
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
      </div>
    </div >
  );
}
