"use client";

import { useMemo, useState, useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { fetchMedicalConditions } from "@/redux/optometryDataSlice";
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
    CompactDataSummary,
    VisionSummary,
    ComplaintsSummary,
    ARDataSummary,
    RefractionSummary,
    IOPSummary,
    OphthalmicHistorySummary,
    DrugAllergiesSummary,
    MedicalHistorySummary,
    CurrentSpecsSummary,
    MergedVisionSummary,
    HistorySummary,
    type SummaryStatus,
} from "./CompactDataSummary";
import { DataEditModal } from "./DataEditModal";
import { PreviousHistoryTimeline } from "./PreviousHistoryTimeline";

// Import tab components
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

import {
    getComplaintsStatus,
    getVisionStatus,
    getMedicalHistoryStatus,
    getOphthalmicHistoryStatus,
    getDrugAllergyStatus,
    getARDataStatus,
    getRefractionStatus,
    getIOPStatus,
    getCurrentSpecsStatus,
} from "./SingleViewSection";

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

type SectionId =
    | "complaints"
    | "vision"
    | "medical_history"
    | "ophthalmic_history"
    | "allergies"
    | "ar_data"
    | "refraction"
    | "iop"
    | "current_specs"
    | "previous_history";

interface ExaminationCompactViewProps {
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
    currentSpecsRecords?: CurrentSpecsRecord[]; // Added
    medicalConditions: MedicalConditionRecord[];
    patientOptometryHistory: any; // PatientOptometryTimeline | null
    historyLoading?: boolean;

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

interface SectionConfig {
    id: SectionId;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    colorScheme: "sky" | "emerald" | "amber" | "purple" | "rose" | "blue" | "green" | "violet";
    modalSize: "md" | "lg" | "xl" | "full";
}

// Reordered according to user request
const sections: SectionConfig[] = [
    { id: "complaints", title: "Complaints", icon: MessageSquare, colorScheme: "sky", modalSize: "lg" },
    { id: "ophthalmic_history", title: "Eye Surgery History", icon: Eye, colorScheme: "green", modalSize: "lg" },
    { id: "medical_history", title: "Medical History", icon: FileHeart, colorScheme: "purple", modalSize: "xl" },
    { id: "vision", title: "Vision / Visual Acuity", icon: EyeOff, colorScheme: "blue", modalSize: "xl" },
    { id: "iop", title: "Intraocular Pressure (IOP)", icon: Activity, colorScheme: "emerald", modalSize: "lg" },
    { id: "refraction", title: "Refraction", icon: Glasses, colorScheme: "sky", modalSize: "xl" },
    { id: "ar_data", title: "AR Data (Auto-Refraction)", icon: Scan, colorScheme: "amber", modalSize: "xl" },
    { id: "current_specs", title: "Current Specs", icon: Glasses, colorScheme: "violet", modalSize: "lg" },
    { id: "allergies", title: "Drug Allergies", icon: AlertTriangle, colorScheme: "rose", modalSize: "lg" },
    { id: "previous_history", title: "Previous History", icon: History, colorScheme: "emerald", modalSize: "xl" },
];

export function ExaminationCompactView({
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
}: ExaminationCompactViewProps) {
    const dispatch = useAppDispatch();
    const { hiddenTabs, useMergedVisionView, setUseMergedVisionView } = useExaminationViewContext();
    const [activeModal, setActiveModal] = useState<SectionId | null>(null);

    // Refresh medical conditions when modal closes
    const handleModalClose = () => {
        setActiveModal(null);
        if (activeModal === "medical_history") {
            refreshMedicalHistory();
        }
    };

    // Dynamically compute sections list based on layout preference
    const visibleSections = useMemo(() => {
        if (useMergedVisionView) {
            return sections
                .filter((s) => s.id !== "ar_data" && s.id !== "refraction" && s.id !== "current_specs")
                .map((s) => (s.id === "vision" ? { ...s, title: "Vision & Refraction" } : s));
        }
        return sections;
    }, [useMergedVisionView]);

    // Get current visit records
    const currentVisionRecord = useMemo(
        () => visionRecords.find((r) => r.visit_id === visitId),
        [visionRecords, visitId]
    );

    const currentARRecord = useMemo(
        () => arDataRecords.find((r) => r.visit_id === visitId),
        [arDataRecords, visitId]
    );

    const currentRefractionRecord = useMemo(
        () => refractionRecords.find((r) => r.visit_id === visitId),
        [refractionRecords, visitId]
    );


    const currentIOPRecord = useMemo(
        () => iopRecords.find((r) => r.visit_id === visitId),
        [iopRecords, visitId]
    );

    // Calculate base section statuses
    const sectionStatuses = useMemo(
        () => ({
            complaints: getComplaintsStatus(complaints) as SummaryStatus,
            vision: getVisionStatus(visionRecords, visitId) as SummaryStatus,
            medical_history: getMedicalHistoryStatus(medicalConditions) as SummaryStatus,
            ophthalmic_history: getOphthalmicHistoryStatus(ophthalmicHistory) as SummaryStatus,
            allergies: getDrugAllergyStatus(drugAllergies) as SummaryStatus,
            ar_data: getARDataStatus(arDataRecords, visitId) as SummaryStatus,
            refraction: getRefractionStatus(refractionRecords, visitId) as SummaryStatus,
            iop: getIOPStatus(iopRecords, visitId) as SummaryStatus,
            current_specs: getCurrentSpecsStatus(currentSpecsRecords || [], visitId) as SummaryStatus,
            previous_history: (Array.isArray(patientOptometryHistory?.items) && patientOptometryHistory.items.length > 0
                ? "complete"
                : "empty") as SummaryStatus,
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
            let combined: SummaryStatus = "empty";
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
            .filter((s) => finalSectionStatuses[s.id] === "complete")
            .length;
    }, [finalSectionStatuses, hiddenTabs, visibleSections]);

    const totalSections = useMemo(() => {
        return visibleSections.filter((s) => !hiddenTabs.includes(s.id)).length;
    }, [visibleSections, hiddenTabs]);

    // Avoid division by zero
    const progressPercent = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;

    // Generate status text for each section
    const getStatusText = (sectionId: SectionId): string | undefined => {
        switch (sectionId) {
            case "complaints":
                return complaints.length > 0
                    ? `${complaints.length} item${complaints.length > 1 ? "s" : ""}`
                    : undefined;
            case "ophthalmic_history":
                return ophthalmicHistory.length > 0
                    ? `${ophthalmicHistory.length} item${ophthalmicHistory.length > 1 ? "s" : ""}`
                    : undefined;
            case "allergies":
                return drugAllergies.length > 0
                    ? `${drugAllergies.length} item${drugAllergies.length > 1 ? "s" : ""}`
                    : undefined;
            case "vision":
                if (useMergedVisionView) {
                    const filledCount = [
                        sectionStatuses.vision !== "empty",
                        sectionStatuses.ar_data !== "empty",
                        sectionStatuses.refraction !== "empty",
                        sectionStatuses.current_specs !== "empty",
                    ].filter(Boolean).length;
                    return filledCount > 0 ? `${filledCount} of 4 components` : undefined;
                }
                return undefined;
            case "previous_history": {
                const visitCount = Array.isArray(patientOptometryHistory?.items)
                    ? patientOptometryHistory.items.length
                    : 0;
                return visitCount > 0 ? `${visitCount} past visit${visitCount > 1 ? "s" : ""}` : "No history";
            }
            default:
                return undefined;
        }
    };

    // Get summary content for each section
    const getSummaryContent = (sectionId: SectionId) => {
        switch (sectionId) {
            case "complaints":
                return <ComplaintsSummary complaints={complaints} />;
            case "vision":
                return useMergedVisionView ? (
                    <MergedVisionSummary
                        visionRecord={currentVisionRecord}
                        arRecord={currentARRecord}
                        refractionRecord={currentRefractionRecord}
                        specsRecord={currentSpecsRecords?.find(r => r.visit_id === visitId)}
                    />
                ) : (
                    <VisionSummary record={currentVisionRecord} />
                );
            case "medical_history":
                return <MedicalHistorySummary conditions={medicalConditions} />;
            case "ophthalmic_history":
                return <OphthalmicHistorySummary surgeries={ophthalmicHistory} />;
            case "allergies":
                return <DrugAllergiesSummary allergies={drugAllergies} />;
            case "ar_data":
                return <ARDataSummary record={currentARRecord} />;
            case "refraction":
                return <RefractionSummary record={currentRefractionRecord} />;
            case "iop":
                return <IOPSummary record={currentIOPRecord} />;
            case "current_specs":
                return <CurrentSpecsSummary record={currentSpecsRecords?.find(r => r.visit_id === visitId)} />;
            case "previous_history":
                return <HistorySummary history={patientOptometryHistory} />;
            default:
                return null;
        }
    };

    // Render modal content for each section
    const renderModalContent = (sectionId: SectionId) => {
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
                    />
                );
            default:
                return null;
        }
    };

    // Find active modal config
    const activeModalConfig = activeModal ? visibleSections.find((s) => s.id === activeModal) : null;

    return (
        <div className="space-y-3 pb-5">
            {/* Progress Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-50/95 via-sky-50/80 to-slate-50/95 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-sm p-3">
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

                {/* Quick Navigation */}
                <div className="flex flex-wrap gap-2">
                    {visibleSections.map((section) => {
                        // Skip if section is hidden
                        if (hiddenTabs.includes(section.id)) return null;

                        const status = finalSectionStatuses[section.id];
                        const isComplete = status === "complete";
                        const isPartial = status === "partial";

                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveModal(section.id)}
                                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                    isComplete
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

            {/* Compact Section Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleSections.map((section) => {
                    // Skip if section is hidden
                    if (hiddenTabs.includes(section.id)) return null;

                    const SectionIcon = section.icon;
                    const status = finalSectionStatuses[section.id];

                    return (
                        <CompactDataSummary
                            key={section.id}
                            id={section.id}
                            title={section.title}
                            icon={<SectionIcon className="h-5 w-5" />}
                            status={status}
                            statusText={getStatusText(section.id)}
                            summary={section.id === "previous_history" ? getSummaryContent(section.id) : (status !== "empty" ? getSummaryContent(section.id) : undefined)}
                            onEdit={() => setActiveModal(section.id)}
                            colorScheme={section.colorScheme}
                            buttonTextOverride={section.id === "previous_history" ? "View" : undefined}
                        />
                    );
                })}
            </div>

            {/* Section Edit Modals */}
            {activeModalConfig && (
                <DataEditModal
                    isOpen={activeModal !== null}
                    onClose={handleModalClose}
                    title={activeModalConfig.title}
                    icon={<activeModalConfig.icon className="h-5 w-5" />}
                    colorScheme={activeModalConfig.colorScheme}
                    size={activeModalConfig.modalSize}
                >
                    {renderModalContent(activeModal!)}
                </DataEditModal>
            )}
        </div>
    );
}
