"use client";

import { useMemo, useEffect, useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
// import { fetchMedicalConditions } from "@/redux/optometryDataSlice";
import { useExaminationViewContext } from "@/context/ExaminationViewContext";
import clsx from "clsx";
import {
  MessageSquare,
  FileHeart,
  Eye,
  AlertTriangle,
  Scan,
  Glasses,
  Activity,
  EyeOff,
  CheckCircle2,
  Circle,
  History,
  ChevronsUpDown,
  LayoutGrid,
} from "lucide-react";

import {
  SingleViewSection,
  getComplaintsStatus,
  getVisionStatus,
  getMedicalHistoryStatus,
  getOphthalmicHistoryStatus,
  getDrugAllergyStatus,
  getARDataStatus,
  getRefractionStatus,
  getIOPStatus,
  getCurrentSpecsStatus,
  type SectionStatus,
} from "./SingleViewSection";

// Import tab content components
import { ComplaintsTab } from "./ComplaintsTab";
import { VisionTab } from "./VisionTab";
import { MergedVisionTab } from "./MergedVisionTab";
import { CurrentSpecsTab } from "./CurrentSpecsTab";
import { MedicalHistoryTab } from "./MedicalHistoryTab";
import { OphthalHistoryTab } from "./OphthalHistoryTab";
import { DrugAllergyTab } from "./DrugAllergyTab";
import { ARDataTab } from "./ARDataTab";
import { RefractionTab } from "./RefractionTab";
import { IOPTab } from "./IOPTab";
import { PreviousHistoryTimeline } from "./PreviousHistoryTimeline";

import type {
  ComplaintRecord,
  OphthalmicSurgeryRecord,
  DrugAllergyRecord,
  ARDataRecord,
  RefractionRecord,
  IOPRecord,
  VisionRecord,
  MedicalConditionRecord,
  CurrentSpecsRecord,
} from "@/types";

interface ExaminationSingleViewProps {
  patientId: string;
  visitId: string;
  optometristId: string;

  // Data props
  complaints: ComplaintRecord[];
  ophthalmicHistory: OphthalmicSurgeryRecord[];
  drugAllergies: DrugAllergyRecord[];
  arDataRecords: ARDataRecord[];
  refractionRecords: RefractionRecord[];
  iopRecords: IOPRecord[];
  iopTrends: any;
  visionRecords: VisionRecord[];
  currentSpecsRecords?: CurrentSpecsRecord[];
  medicalConditions: MedicalConditionRecord[];
  patientOptometryHistory: any; // PatientOptometryTimeline | null
  historyLoading?: boolean;
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
    currentSpecs?: boolean;
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
  refreshCurrentSpecs?: () => void;
  refreshUnifiedExam?: () => void;
}

// Reordered according to user request
const sections = [
  { id: "complaints", title: "Complaints", icon: MessageSquare, colorScheme: "sky" as const },
  { id: "ophthalmic_history", title: "Eye Surgery History", icon: Eye, colorScheme: "green" as const },
  { id: "medical_history", title: "Medical History", icon: FileHeart, colorScheme: "purple" as const },
  { id: "vision", title: "Vision / Visual Acuity", icon: EyeOff, colorScheme: "blue" as const },
  { id: "iop", title: "Intraocular Pressure (IOP)", icon: Activity, colorScheme: "emerald" as const },
  { id: "refraction", title: "Refraction", icon: Glasses, colorScheme: "sky" as const },
  { id: "ar_data", title: "AR Data (Auto-Refraction)", icon: Scan, colorScheme: "amber" as const },
  { id: "current_specs", title: "Current Specs", icon: Glasses, colorScheme: "violet" as const },
  { id: "allergies", title: "Drug Allergies", icon: AlertTriangle, colorScheme: "rose" as const },
  { id: "previous_history", title: "Previous History", icon: History, colorScheme: "emerald" as const },
] as const;

export function ExaminationSingleView({
  patientId,
  visitId,
  optometristId,
  complaints,
  ophthalmicHistory,
  drugAllergies,
  arDataRecords,
  refractionRecords,
  iopRecords,
  iopTrends,
  visionRecords,
  currentSpecsRecords,
  medicalConditions,
  patientOptometryHistory,
  historyLoading,
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
}: ExaminationSingleViewProps) {
  const dispatch = useAppDispatch();
  const {
    hiddenTabs,
    toggleSection,
    isSectionCollapsed,
    expandAllSections,
    collapseAllSections,
    useMergedVisionView,
    setUseMergedVisionView,
  } = useExaminationViewContext();

  // Dynamically compute sections list based on layout preference
  const visibleSections = useMemo(() => {
    if (useMergedVisionView) {
      return sections
        .filter((s) => s.id !== "ar_data" && s.id !== "refraction" && s.id !== "current_specs")
        .map((s) => (s.id === "vision" ? { ...s, title: "Vision & Refraction" } : s));
    }
    return sections;
  }, [useMergedVisionView]);

  // Calculate base section statuses
  const sectionStatuses = useMemo(
    () => ({
      complaints: getComplaintsStatus(complaints),
      vision: getVisionStatus(visionRecords, visitId),
      medical_history: getMedicalHistoryStatus(medicalConditions),
      ophthalmic_history: getOphthalmicHistoryStatus(ophthalmicHistory),
      allergies: getDrugAllergyStatus(drugAllergies),
      ar_data: getARDataStatus(arDataRecords, visitId),
      refraction: getRefractionStatus(refractionRecords, visitId),
      iop: getIOPStatus(iopRecords, visitId),
      current_specs: getCurrentSpecsStatus(currentSpecsRecords || [], visitId),
      previous_history: (Array.isArray(patientOptometryHistory?.items) && patientOptometryHistory.items.length > 0
        ? "complete"
        : "empty") as SectionStatus,
    }),
    [
      complaints,
      visionRecords,
      medicalConditions,
      ophthalmicHistory,
      drugAllergies,
      arDataRecords,
      refractionRecords,
      iopRecords,
      currentSpecsRecords,
      patientOptometryHistory,
      visitId,
    ]
  );

  // Compute final section statuses (including merged vision status if layout is merged)
  const finalSectionStatuses = useMemo(() => {
    const statuses = { ...sectionStatuses };
    if (useMergedVisionView) {
      const mergedFields = [
        sectionStatuses.vision,
        sectionStatuses.ar_data,
        sectionStatuses.refraction,
        sectionStatuses.current_specs,
      ];
      let combined: SectionStatus = "empty";
      if (mergedFields.includes("partial")) {
        combined = "partial";
      } else if (mergedFields.includes("complete")) {
        combined = "complete";
      }
      statuses.vision = combined;
    }
    return statuses;
  }, [sectionStatuses, useMergedVisionView]);

  // Calculate overall progress based on visible sections
  const completedCount = useMemo(() => {
    return visibleSections
      .filter((s) => !hiddenTabs.includes(s.id))
      .filter((s) => finalSectionStatuses[s.id as keyof typeof finalSectionStatuses] === "complete")
      .length;
  }, [finalSectionStatuses, hiddenTabs, visibleSections]);

  const totalSections = useMemo(() => {
    return visibleSections.filter((s) => !hiddenTabs.includes(s.id)).length;
  }, [visibleSections, hiddenTabs]);

  // Avoid division by zero
  const progressPercent = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;

  // Track expanded/collapsed all state
  const activeSectionIds = useMemo(() => {
    return visibleSections.filter((s) => !hiddenTabs.includes(s.id)).map((s) => s.id);
  }, [visibleSections, hiddenTabs]);

  const allAreCollapsed = useMemo(() => {
    return activeSectionIds.length > 0 && activeSectionIds.every((id) => isSectionCollapsed(id));
  }, [activeSectionIds, isSectionCollapsed]);

  const handleToggleExpandCollapseAll = () => {
    if (allAreCollapsed) {
      expandAllSections();
    } else {
      collapseAllSections(activeSectionIds);
    }
  };

  // Render content function maps section ID to component
  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case "complaints":
        return (
          <ComplaintsTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            complaints={complaints}
            loading={loading.complaints}
            onRefresh={refreshComplaints}
          />
        );
      case "vision":
        return useMergedVisionView ? (
          <MergedVisionTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            visionRecords={visionRecords}
            arDataRecords={arDataRecords}
            refractionRecords={refractionRecords}
            currentSpecsRecords={currentSpecsRecords || []}
            loading={{
              vision: loading.vision,
              arData: loading.arData,
              refraction: loading.refraction,
              currentSpecs: loading.currentSpecs || false,
            }}
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
        );
      case "medical_history":
        return (
          <MedicalHistoryTab
            patientId={patientId}
            visitId={visitId}
            medicalConditions={medicalConditions}
            onRefresh={refreshMedicalHistory}
          />
        );
      case "ophthalmic_history":
        return (
          <OphthalHistoryTab
            patientId={patientId}
            ophthalmicHistory={ophthalmicHistory}
            loading={loading.ophthalmicHistory}
            onRefresh={refreshOphthalmicHistory}
          />
        );
      case "allergies":
        return (
          <DrugAllergyTab
            patientId={patientId}
            drugAllergies={drugAllergies}
            loading={loading.drugAllergies}
            onRefresh={refreshDrugAllergies}
          />
        );
      case "ar_data":
        return (
          <ARDataTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            arDataRecords={arDataRecords}
            loading={loading.arData}
            onRefresh={refreshARData}
          />
        );
      case "refraction":
        return (
          <RefractionTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            refractionRecords={refractionRecords}
            loading={loading.refraction}
            onRefresh={refreshRefraction}
          />
        );
      case "iop":
        return (
          <IOPTab
            patientId={patientId}
            visitId={visitId}
            iopRecords={iopRecords}
            iopTrends={iopTrends}
            loading={loading.iop}
            onRefresh={refreshIOP}
          />
        );
      case "current_specs":
        return (
          <CurrentSpecsTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            currentSpecsRecords={currentSpecsRecords || []}
            loading={loading.currentSpecs || false}
            onRefresh={refreshCurrentSpecs || (() => {})}
          />
        );
      case "previous_history":
        return (
          <PreviousHistoryTimeline
            patientOptometryHistory={patientOptometryHistory}
            loading={!!historyLoading}
            currentVisitComplaints={complaints}
            onLoadMore={onLoadMoreHistory}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50/50">
      {/* Compact Non-Overlapping Control & Progress Bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200/90 shadow-2xs z-20 px-2.5 py-1.5 sm:px-4 sm:py-2">
        <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Left: Progress Badge */}
          <div className="flex items-center gap-1.5 flex-shrink-0 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
              {completedCount}/{totalSections} done
            </span>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden md:block">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-500">{progressPercent}%</span>
          </div>

          {/* Center: Quick Jump Carousel */}
          <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-0.5">
            {visibleSections.map((section) => {
              if (hiddenTabs.includes(section.id)) return null;

              const status = finalSectionStatuses[section.id as keyof typeof finalSectionStatuses] as SectionStatus;
              const isComplete = status === "complete";
              const isPartial = status === "partial";

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`section-${section.id}`);
                    if (el) {
                      if (isSectionCollapsed(section.id)) {
                        toggleSection(section.id);
                      }
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className={clsx(
                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap transition border",
                    isComplete
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                      : isPartial
                      ? "bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-sky-700 hover:border-sky-300"
                  )}
                  title={`Jump to ${section.title}`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                  ) : isPartial ? (
                    <Circle className="h-2 w-2 fill-amber-500 text-amber-500 flex-shrink-0" />
                  ) : (
                    <section.icon className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[110px] sm:max-w-[130px]">{section.title}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Expand / Collapse All */}
            <button
              type="button"
              onClick={handleToggleExpandCollapseAll}
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              title={allAreCollapsed ? "Expand all sections" : "Collapse all sections"}
            >
              <ChevronsUpDown className="h-3 w-3 text-slate-500 flex-shrink-0" />
              <span className="hidden sm:inline">{allAreCollapsed ? "Expand All" : "Collapse All"}</span>
            </button>

            {/* Layout Mode Toggle */}
            <button
              type="button"
              onClick={() => setUseMergedVisionView(!useMergedVisionView)}
              className={clsx(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition border shadow-2xs",
                useMergedVisionView
                  ? "bg-sky-50 text-sky-700 border-sky-300"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
              title={useMergedVisionView ? "Switch to separate sections" : "Switch to merged vision & refraction sheet"}
            >
              <LayoutGrid className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">{useMergedVisionView ? "Merged" : "Tabs"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Sections */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth p-2.5 sm:p-4 space-y-3.5">
        {visibleSections.map((section) => {
          if (hiddenTabs.includes(section.id)) return null;

          const status = finalSectionStatuses[section.id as keyof typeof finalSectionStatuses] as SectionStatus;

          return (
            <div key={section.id} id={`section-${section.id}`} className="scroll-mt-3">
              <SingleViewSection
                id={section.id}
                title={section.title}
                icon={<section.icon className="h-4.5 w-4.5" />}
                status={status}
                isExpanded={!isSectionCollapsed(section.id)}
                onToggle={() => toggleSection(section.id)}
                colorScheme={section.colorScheme}
              >
                {renderSectionContent(section.id)}
              </SingleViewSection>
            </div>
          );
        })}

        {/* End of Examination Indicator */}
        <div className="flex items-center justify-center py-6 opacity-60">
          <div className="h-px bg-slate-200 w-20"></div>
          <span className="mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
            End of Examination
          </span>
          <div className="h-px bg-slate-200 w-20"></div>
        </div>
      </div>
    </div>
  );
}
