"use client";

import { useMemo, useEffect, useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
// import { fetchMedicalConditions } from "@/redux/optometryDataSlice";
import { useExaminationViewContext } from "@/context/ExaminationViewContext";
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
import { CurrentSpecsTab } from "./CurrentSpecsTab";
import { MedicalHistoryTab } from "./MedicalHistoryTab";
import { OphthalHistoryTab } from "./OphthalHistoryTab";
import { DrugAllergyTab } from "./DrugAllergyTab";
import { ARDataTab } from "./ARDataTab";
import { RefractionTab } from "./RefractionTab";
import { IOPTab } from "./IOPTab";

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
}: ExaminationSingleViewProps) {
  const dispatch = useAppDispatch();
  const { hiddenTabs, toggleSection, isSectionCollapsed } = useExaminationViewContext();
  // internal state for medicalConditions removed in favor of prop


  // Calculate section statuses
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
      visitId,
    ]
  );

  // Calculate overall progress based on visible sections
  const completedCount = useMemo(() => {
    return sections
      .filter((s) => !hiddenTabs.includes(s.id))
      .filter((s) => sectionStatuses[s.id as keyof typeof sectionStatuses] === "complete")
      .length;
  }, [sectionStatuses, hiddenTabs]);

  const totalSections = sections.filter((s) => !hiddenTabs.includes(s.id)).length;
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
            optometristId={optometristId}
            complaints={complaints}
            loading={loading.complaints}
            onRefresh={refreshComplaints}
          />
        );
      case "vision":
        return (
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
            onRefresh={refreshCurrentSpecs || (() => { })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Sticky Header with Progress & Quick Jump */}
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
          <span className="text-xs font-bold text-sky-600">{progressPercent}%</span>
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
          {sections.map((section) => {
            // Skip if section is hidden
            if (hiddenTabs.includes(section.id)) return null;

            const status = sectionStatuses[section.id as keyof typeof sectionStatuses] as SectionStatus;
            const isComplete = status === "complete";
            const isPartial = status === "partial";

            return (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all shadow-sm ${isComplete
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

      {sections.map((section) => {
        // Skip if section is hidden
        if (hiddenTabs.includes(section.id)) return null;

        const status = sectionStatuses[section.id as keyof typeof sectionStatuses] as SectionStatus;

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
        <span className="mx-4 text-xs font-medium text-slate-400 uppercase tracking-widest">End of Examination</span>
        <div className="h-px bg-slate-300 w-24"></div>
      </div>
    </div>
  );
}
