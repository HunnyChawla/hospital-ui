"use client";

import { useMemo, useState, useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { fetchMedicalConditions } from "@/redux/optometryDataSlice";
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
import { useExaminationViewPreference } from "@/hooks/useExaminationViewPreference";
import { SingleViewSection } from "./SingleViewSection";
import {
  getComplaintsStatus,
  getVisionStatus,
  getMedicalHistoryStatus,
  getOphthalmicHistoryStatus,
  getDrugAllergyStatus,
  getARDataStatus,
  getRefractionStatus,
  getIOPStatus,
} from "./SingleViewSection";

// Import tab components
import { ComplaintsTab } from "./ComplaintsTab";
import { VisionTab } from "./VisionTab";
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

  // Loading states
  loading: {
    refraction: boolean;
    iop: boolean;
    arData: boolean;
    complaints: boolean;
    ophthalmicHistory: boolean;
    drugAllergies: boolean;
    vision: boolean;
  };

  // Refresh functions
  refreshComplaints: () => void;
  refreshOphthalmicHistory: () => void;
  refreshDrugAllergies: () => void;
  refreshARData: () => void;
  refreshRefraction: () => void;
  refreshIOP: () => void;
  refreshVision: () => void;
}

// Define the sections for the single view
const sections = [
  { id: "complaints", title: "Complaints", icon: MessageSquare, colorScheme: "sky" as const },
  { id: "vision", title: "Vision / Visual Acuity", icon: EyeOff, colorScheme: "blue" as const },
  { id: "medical_history", title: "Medical History", icon: FileHeart, colorScheme: "purple" as const },
  { id: "ophthalmic_history", title: "Eye Surgery History", icon: Eye, colorScheme: "green" as const },
  { id: "allergies", title: "Drug Allergies", icon: AlertTriangle, colorScheme: "rose" as const },
  { id: "ar_data", title: "AR Data (Auto-Refraction)", icon: Scan, colorScheme: "amber" as const },
  { id: "refraction", title: "Refraction", icon: Glasses, colorScheme: "sky" as const },
  { id: "iop", title: "Intraocular Pressure (IOP)", icon: Activity, colorScheme: "emerald" as const },
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
  loading,
  refreshComplaints,
  refreshOphthalmicHistory,
  refreshDrugAllergies,
  refreshARData,
  refreshRefraction,
  refreshIOP,
  refreshVision,
}: ExaminationSingleViewProps) {
  const dispatch = useAppDispatch();
  const { toggleSection, isSectionCollapsed } = useExaminationViewPreference();
  const [medicalConditions, setMedicalConditions] = useState<MedicalConditionRecord[]>([]);

  // Fetch medical conditions
  useEffect(() => {
    const fetchConditions = async () => {
      try {
        const result = await dispatch(fetchMedicalConditions({ patient_id: patientId })).unwrap();

        let conditions: MedicalConditionRecord[] = [];
        if (Array.isArray(result)) {
          conditions = result;
        } else if (result && typeof result === 'object') {
          const resultObj = result as any;
          if (Array.isArray(resultObj.data)) {
            conditions = resultObj.data;
          } else if (Array.isArray(resultObj.items)) {
            conditions = resultObj.items;
          }
        }
        setMedicalConditions(conditions);
      } catch (error) {
        console.error("Failed to fetch medical conditions:", error);
      }
    };

    fetchConditions();

    // Set up interval to periodically refresh medical conditions
    const interval = setInterval(fetchConditions, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [patientId, dispatch]);

  // Calculate section statuses
  const sectionStatuses = useMemo(() => ({
    complaints: getComplaintsStatus(complaints),
    vision: getVisionStatus(visionRecords, visitId),
    medical_history: getMedicalHistoryStatus(medicalConditions),
    ophthalmic_history: getOphthalmicHistoryStatus(ophthalmicHistory),
    allergies: getDrugAllergyStatus(drugAllergies),
    ar_data: getARDataStatus(arDataRecords, visitId),
    refraction: getRefractionStatus(refractionRecords, visitId),
    iop: getIOPStatus(iopRecords, visitId),
  }), [complaints, visionRecords, medicalConditions, ophthalmicHistory, drugAllergies, arDataRecords, refractionRecords, iopRecords, visitId]);

  // Calculate overall progress
  const completedCount = useMemo(() => {
    return Object.values(sectionStatuses).filter(status => status === "complete").length;
  }, [sectionStatuses]);

  const totalSections = sections.length;
  const progressPercent = Math.round((completedCount / totalSections) * 100);

  // Generate status text for each section
  const getStatusText = (sectionId: string): string | undefined => {
    switch (sectionId) {
      case "complaints":
        return complaints.length > 0 ? `${complaints.length} item${complaints.length > 1 ? "s" : ""}` : undefined;
      case "ophthalmic_history":
        return ophthalmicHistory.length > 0 ? `${ophthalmicHistory.length} item${ophthalmicHistory.length > 1 ? "s" : ""}` : undefined;
      case "allergies":
        return drugAllergies.length > 0 ? `${drugAllergies.length} item${drugAllergies.length > 1 ? "s" : ""}` : undefined;
      default:
        return undefined;
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Progress Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-50/95 via-sky-50/80 to-slate-50/95 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-semibold text-slate-700">
                {completedCount} of {totalSections} sections complete
              </span>
            </div>
          </div>
          <span className="text-sm font-bold text-sky-600">{progressPercent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Quick Navigation */}
        <div className="flex flex-wrap gap-2 mt-3">
          {sections.map((section) => {
            const status = sectionStatuses[section.id as keyof typeof sectionStatuses];
            const isComplete = status === "complete";
            const isPartial = status === "partial";

            return (
              <button
                key={section.id}
                onClick={() => {
                  // Scroll to section
                  const element = document.getElementById(section.id);
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${isComplete
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : isPartial
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                <span>{section.title.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* Complaints Section */}
        <SingleViewSection
          id="complaints"
          title="Complaints"
          icon={<MessageSquare className="h-5 w-5" />}
          status={sectionStatuses.complaints}
          statusText={getStatusText("complaints")}
          isExpanded={!isSectionCollapsed("complaints")}
          onToggle={() => toggleSection("complaints")}
          colorScheme="sky"
        >
          <ComplaintsTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            complaints={complaints}
            loading={loading.complaints}
            onRefresh={refreshComplaints}
          />
        </SingleViewSection>

        {/* Vision Section */}
        <SingleViewSection
          id="vision"
          title="Vision / Visual Acuity"
          icon={<EyeOff className="h-5 w-5" />}
          status={sectionStatuses.vision}
          isExpanded={!isSectionCollapsed("vision")}
          onToggle={() => toggleSection("vision")}
          colorScheme="blue"
        >
          <VisionTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            visionRecords={visionRecords}
            loading={loading.vision}
            onRefresh={refreshVision}
          />
        </SingleViewSection>

        {/* Medical History Section */}
        <SingleViewSection
          id="medical_history"
          title="Medical History"
          icon={<FileHeart className="h-5 w-5" />}
          status={sectionStatuses.medical_history}
          isExpanded={!isSectionCollapsed("medical_history")}
          onToggle={() => toggleSection("medical_history")}
          colorScheme="purple"
        >
          <MedicalHistoryTab
            patientId={patientId}
            visitId={visitId}
          />
        </SingleViewSection>

        {/* Ophthalmic History Section */}
        <SingleViewSection
          id="ophthalmic_history"
          title="Eye Surgery History"
          icon={<Eye className="h-5 w-5" />}
          status={sectionStatuses.ophthalmic_history}
          statusText={getStatusText("ophthalmic_history")}
          isExpanded={!isSectionCollapsed("ophthalmic_history")}
          onToggle={() => toggleSection("ophthalmic_history")}
          colorScheme="green"
        >
          <OphthalHistoryTab
            patientId={patientId}
            ophthalmicHistory={ophthalmicHistory}
            loading={loading.ophthalmicHistory}
            onRefresh={refreshOphthalmicHistory}
          />
        </SingleViewSection>

        {/* Drug Allergies Section */}
        <SingleViewSection
          id="allergies"
          title="Drug Allergies"
          icon={<AlertTriangle className="h-5 w-5" />}
          status={sectionStatuses.allergies}
          statusText={getStatusText("allergies")}
          isExpanded={!isSectionCollapsed("allergies")}
          onToggle={() => toggleSection("allergies")}
          colorScheme="rose"
        >
          <DrugAllergyTab
            patientId={patientId}
            drugAllergies={drugAllergies}
            loading={loading.drugAllergies}
            onRefresh={refreshDrugAllergies}
          />
        </SingleViewSection>

        {/* AR Data Section */}
        <SingleViewSection
          id="ar_data"
          title="AR Data (Auto-Refraction)"
          icon={<Scan className="h-5 w-5" />}
          status={sectionStatuses.ar_data}
          isExpanded={!isSectionCollapsed("ar_data")}
          onToggle={() => toggleSection("ar_data")}
          colorScheme="amber"
        >
          <ARDataTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            arDataRecords={arDataRecords}
            loading={loading.arData}
            onRefresh={refreshARData}
          />
        </SingleViewSection>

        {/* Refraction Section */}
        <SingleViewSection
          id="refraction"
          title="Refraction"
          icon={<Glasses className="h-5 w-5" />}
          status={sectionStatuses.refraction}
          isExpanded={!isSectionCollapsed("refraction")}
          onToggle={() => toggleSection("refraction")}
          colorScheme="sky"
        >
          <RefractionTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            refractionRecords={refractionRecords}
            loading={loading.refraction}
            onRefresh={refreshRefraction}
          />
        </SingleViewSection>

        {/* IOP Section */}
        <SingleViewSection
          id="iop"
          title="Intraocular Pressure (IOP)"
          icon={<Activity className="h-5 w-5" />}
          status={sectionStatuses.iop}
          isExpanded={!isSectionCollapsed("iop")}
          onToggle={() => toggleSection("iop")}
          colorScheme="emerald"
        >
          <IOPTab
            patientId={patientId}
            visitId={visitId}
            iopRecords={iopRecords}
            iopTrends={iopTrends}
            loading={loading.iop}
            onRefresh={refreshIOP}
          />
        </SingleViewSection>
      </div>
    </div>
  );
}
