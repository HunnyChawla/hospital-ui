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
import { ComplaintsTab } from "@/components/clinical/ComplaintsTab";
import { VisionTab } from "./VisionTab";
import { MergedVisionTab } from "./MergedVisionTab";
import { CurrentSpecsTab } from "./CurrentSpecsTab";
import { MedicalHistoryTab } from "@/components/clinical/MedicalHistoryTab";
import { OphthalHistoryTab } from "./OphthalHistoryTab";
import { DrugAllergyTab } from "@/components/clinical/DrugAllergyTab";
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

  // Render content function maps section ID to component
  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case "complaints":
        return (
          <ComplaintsTab
            patientId={patientId}
            visitId={visitId}
            recordedByUserId={optometristId}
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
    <div className="space-y-6 pb-8">
      {/* Sticky Header with Progress, Quick Jump & Layout Toggle */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-slate-50/95 via-sky-50/80 to-slate-50/95 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-sm p-3 mb-3">
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-700">
                {completedCount} of {totalSections} complete
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Layout Mode Toggle */}
            <button
              onClick={() => setUseMergedVisionView(!useMergedVisionView)}
              className={clsx(
                "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold shadow-sm transition-all duration-200 border bg-white",
                useMergedVisionView
                  ? "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100"
                  : "text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
              title={useMergedVisionView ? "Switch to separate sections" : "Switch to merged vision & refraction"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <span>{useMergedVisionView ? "Merged" : "Tabbed"}</span>
            </button>
            <span className="text-xs font-bold text-sky-600 ml-1">{progressPercent}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Quick Jump Links */}
        <div className="flex flex-wrap gap-2">
          {visibleSections.map((section) => {
            // Skip if section is hidden
            if (hiddenTabs.includes(section.id)) return null;

            const status = finalSectionStatuses[section.id as keyof typeof finalSectionStatuses] as SectionStatus;
            const isComplete = status === "complete";
            const isPartial = status === "partial";

            return (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all shadow-sm ${
                  isComplete
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200"
                    : isPartial
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`section-${section.id}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : isPartial ? (
                  <Circle className="h-3 w-3 fill-current" />
                ) : (
                  <section.icon className="h-3 w-3" />
                )}
                <span>{section.title}</span>
              </a>
            );
          })}
        </div>
      </div>

      {visibleSections.map((section) => {
        // Skip if section is hidden
        if (hiddenTabs.includes(section.id)) return null;

        const status = finalSectionStatuses[section.id as keyof typeof finalSectionStatuses] as SectionStatus;

        return (
          <div key={section.id} id={`section-${section.id}`} className="scroll-mt-24">
            <SingleViewSection
              id={section.id}
              title={section.title}
              icon={<section.icon className="h-5 w-5" />}
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
      <div className="flex items-center justify-center py-8 opacity-60">
        <div className="h-px bg-slate-300 w-24"></div>
        <span className="mx-4 text-xs font-medium text-slate-400 uppercase tracking-widest">
          End of Examination
        </span>
        <div className="h-px bg-slate-300 w-24"></div>
      </div>
    </div>
  );
}
