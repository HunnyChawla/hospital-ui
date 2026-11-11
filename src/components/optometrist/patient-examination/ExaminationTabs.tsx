"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
import { MergedVisionTab } from "./MergedVisionTab";
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
  onLoadMoreHistory?: () => void;

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
  refreshUnifiedExam?: () => void;
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
  onLoadMoreHistory,
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
  refreshUnifiedExam,
  medicalConditions,
}: ExaminationTabsProps) {
  const { viewMode, setViewMode, useMergedVisionView, setUseMergedVisionView } = useExaminationViewPreference();
  const { hiddenTabs } = useExaminationViewContext();
  const containerRef = useRef<HTMLDivElement>(null);

  // If merged view is enabled, auto redirect from hidden tabs to vision
  useEffect(() => {
    if (useMergedVisionView && ["ar_data", "refraction", "current_specs"].includes(activeTab)) {
      onTabChange("vision");
    }
  }, [useMergedVisionView, activeTab, onTabChange]);

  const visibleTabs = useMemo(() => {
    if (useMergedVisionView) {
      return tabs
        .filter((t) => t.id !== "ar_data" && t.id !== "refraction" && t.id !== "current_specs")
        .map((t) => (t.id === "vision" ? { ...t, label: "Vision & Refraction" } : t));
    }
    return tabs;
  }, [useMergedVisionView]);

  // Global Keyboard Navigation between Examination Tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Must have Alt pressed, without Ctrl/Shift (so we don't conflict with browser devtools/actions)
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      const activeList = visibleTabs.filter((t) => !hiddenTabs.includes(t.id));
      const currentIndex = activeList.findIndex((t) => t.id === activeTab);

      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentIndex < activeList.length - 1) {
          onTabChange(activeList[currentIndex + 1].id as ActiveTab);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex > 0) {
          onTabChange(activeList[currentIndex - 1].id as ActiveTab);
        }
      } else if (e.key >= "1" && e.key <= "9") {
        const num = parseInt(e.key, 10) - 1;
        if (num < activeList.length) {
          e.preventDefault();
          onTabChange(activeList[num].id as ActiveTab);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visibleTabs, hiddenTabs, activeTab, onTabChange]);

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
            patientOptometryHistory={patientOptometryHistory}
            historyLoading={!!historyLoading}
            onLoadMoreHistory={onLoadMoreHistory}
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
            refreshUnifiedExam={refreshUnifiedExam}
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
        className="flex h-full min-h-0 flex-col"
      >
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
          patientOptometryHistory={patientOptometryHistory}
          historyLoading={!!historyLoading}
          onLoadMoreHistory={onLoadMoreHistory}
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
          refreshUnifiedExam={refreshUnifiedExam}
        />
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
      <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between gap-1.5 px-2 py-1">
          {/* Left Scroll Button */}
          {showLeftScroll && (
            <button
              onClick={() => scrollTabs("left")}
              className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-xs transition"
              title="Scroll tabs left"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
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
          )}

          <div
            ref={tabsContainerRef}
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-hide py-0.5"
          >
            {visibleTabs.map((tab, idx) => {
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
                  title={`${tab.label} (Alt+${idx + 1})`}
                  className={clsx(
                    "group flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap",
                    isActive
                      ? "bg-white text-sky-700 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-transparent"
                  )}
                >
                  <Icon className={clsx(
                    "h-3.5 w-3.5",
                    isActive ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Right Scroll Button */}
          {showRightScroll && (
            <button
              onClick={() => scrollTabs("right")}
              className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-xs transition"
              title="Scroll tabs right"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
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
          )}

          {/* Layout Mode Toggle */}
          <div className="flex items-center border-l border-slate-200 pl-2">
            <button
              onClick={() => setUseMergedVisionView(!useMergedVisionView)}
              className={clsx(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold shadow-xs transition border",
                useMergedVisionView
                  ? "bg-sky-50 text-sky-700 border-sky-200"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
              title={useMergedVisionView ? "Switch to separate tabs view" : "Switch to merged vision & refraction sheet"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <span className="hidden lg:inline">{useMergedVisionView ? "Merged Sheet" : "Separate Tabs"}</span>
              <span className="lg:hidden">{useMergedVisionView ? "Merged" : "Tabs"}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-slate-50/40 p-2 sm:p-3">
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
          useMergedVisionView ? (
            <MergedVisionTab
              patientId={patientId}
              visitId={visitId}
              optometristId={optometristId}
              visionRecords={visionRecords}
              arDataRecords={arDataRecords}
              refractionRecords={refractionRecords}
              currentSpecsRecords={currentSpecsRecords}
              loading={loading}
              onRefresh={refreshUnifiedExam || (() => {})}
            />
          ) : (
            <VisionTab
              patientId={patientId}
              visitId={visitId}
              optometristId={optometristId}
              visionRecords={visionRecords}
              loading={loading.vision}
              onRefresh={refreshVision}
            />
          )
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
            onLoadMore={onLoadMoreHistory}
          />
        )}
      </div>
    </div >
  );
}
