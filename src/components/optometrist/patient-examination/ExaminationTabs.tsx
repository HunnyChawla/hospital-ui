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
import { useExaminationViewContext } from "@/context/ExaminationViewContext";
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
  MedicalConditionRecord,
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
  medicalConditions: MedicalConditionRecord[];
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
  refreshMedicalHistory: () => void;
  refreshOphthalmicHistory: () => void;
  refreshDrugAllergies: () => void;
  refreshARData: () => void;
  refreshRefraction: () => void;
  refreshIOP: () => void;
  refreshVision: () => void;
  refreshCurrentSpecs: () => void;
}

// Reordered according to user request
const tabs = [
  { id: "complaints", label: "Complaints", icon: MessageSquare },
  { id: "ophthalmic_history", label: "Eye Surgery", icon: Eye },
  { id: "medical_history", label: "Medical History", icon: FileHeart },
  { id: "vision", label: "Vision", icon: EyeOff },
  { id: "iop", label: "IOP", icon: Activity },
  { id: "refraction", label: "Refraction", icon: Glasses },
  { id: "ar_data", label: "AR Data", icon: Scan },
  { id: "current_specs", label: "Current Specs", icon: Glasses },
  { id: "allergies", label: "Drug Allergies", icon: AlertTriangle },
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
  refreshMedicalHistory,
  refreshOphthalmicHistory,
  refreshDrugAllergies,
  refreshARData,
  refreshRefraction,
  refreshIOP,
  refreshVision,
  refreshCurrentSpecs,
  medicalConditions,
}: ExaminationTabsProps) {
  const { viewMode, setViewMode } = useExaminationViewPreference();
  const { hiddenTabs } = useExaminationViewContext();
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll functionality for tabs - must be before any early returns
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const checkScrollButtons = useCallback(() => {
    const container = tabsContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkScrollButtons();
    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollButtons);
      window.addEventListener("resize", checkScrollButtons);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScrollButtons);
      }
      window.removeEventListener("resize", checkScrollButtons);
    };
  }, [checkScrollButtons]);

  const scrollTabs = (direction: "left" | "right") => {
    const container = tabsContainerRef.current;
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

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


        {/* Compact View Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-gradient-to-br from-slate-50/50 to-transparent p-2 sm:p-4">
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
            currentSpecsRecords={currentSpecsRecords}
            medicalConditions={medicalConditions}
            loading={loading}
            refreshComplaints={refreshComplaints}
            refreshMedicalHistory={refreshMedicalHistory}
            refreshOphthalmicHistory={refreshOphthalmicHistory}
            refreshDrugAllergies={refreshDrugAllergies}
            refreshARData={refreshARData}
            refreshRefraction={refreshRefraction}
            refreshIOP={refreshIOP}
            refreshVision={refreshVision}
            refreshCurrentSpecs={refreshCurrentSpecs}
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


        {/* Single View Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-gradient-to-br from-slate-50/50 to-transparent p-2 sm:p-4">
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
            currentSpecsRecords={currentSpecsRecords}
            medicalConditions={medicalConditions}
            loading={loading}
            refreshComplaints={refreshComplaints}
            refreshMedicalHistory={refreshMedicalHistory}
            refreshOphthalmicHistory={refreshOphthalmicHistory}
            refreshDrugAllergies={refreshDrugAllergies}
            refreshARData={refreshARData}
            refreshRefraction={refreshRefraction}
            refreshIOP={refreshIOP}
            refreshVision={refreshVision}
            refreshCurrentSpecs={refreshCurrentSpecs}
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
        "flex h-full min-h-0 flex-col scrollbar-hide",
        "flex h-full min-h-0 flex-col"
      )}
    >
      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-sky-50/30 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 sm:px-3">
          {/* Left Scroll Button */}
          <button
            onClick={() => scrollTabs("left")}
            className={clsx(
              "flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border transition-all duration-200",
              showLeftScroll
                ? "border-slate-200 bg-white text-slate-600 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-300 shadow-sm"
                : "border-transparent text-slate-300 cursor-default"
            )}
            disabled={!showLeftScroll}
            title="Scroll left"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div
            ref={tabsContainerRef}
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-hide"
          >
            {tabs.map((tab) => {
              // Hide tab if in hiddenTabs list
              if (hiddenTabs.includes(tab.id)) return null;

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
                    "group flex items-center gap-2 border-b-2 px-2.5 py-2 text-xs font-semibold transition-all duration-200 rounded-t-lg sm:px-3 sm:py-2.5 sm:text-sm whitespace-nowrap",
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

          {/* Right Scroll Button */}
          <button
            onClick={() => scrollTabs("right")}
            className={clsx(
              "flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border transition-all duration-200",
              showRightScroll
                ? "border-slate-200 bg-white text-slate-600 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-300 shadow-sm"
                : "border-transparent text-slate-300 cursor-default"
            )}
            disabled={!showRightScroll}
            title="Scroll right"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>


        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-gradient-to-br from-slate-50/50 to-transparent p-2 sm:p-4">
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
            medicalConditions={medicalConditions}
            onRefresh={refreshMedicalHistory}
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
