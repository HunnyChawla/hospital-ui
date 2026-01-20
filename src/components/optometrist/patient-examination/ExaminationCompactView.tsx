"use client";

import { useMemo, useState, useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { fetchMedicalConditions } from "@/redux/optometryDataSlice";
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
    type SummaryStatus,
} from "./CompactDataSummary";
import { DataEditModal } from "./DataEditModal";

// Import tab components
import { ComplaintsTab } from "./ComplaintsTab";
import { VisionTab } from "./VisionTab";
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
    | "current_specs";

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
}: ExaminationCompactViewProps) {
    const dispatch = useAppDispatch();
    const { hiddenTabs } = useExaminationViewContext();
    const [activeModal, setActiveModal] = useState<SectionId | null>(null);

    // Refresh medical conditions when modal closes
    const handleModalClose = () => {
        setActiveModal(null);
        if (activeModal === "medical_history") {
            refreshMedicalHistory();
        }
    };

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

    // Calculate section statuses
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
            .filter((s) => sectionStatuses[s.id] === "complete")
            .length;
    }, [sectionStatuses, hiddenTabs]);

    const totalSections = sections.filter((s) => !hiddenTabs.includes(s.id)).length;
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
                return <VisionSummary record={currentVisionRecord} />;
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

    // Find active modal config
    const activeModalConfig = activeModal ? sections.find((s) => s.id === activeModal) : null;

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
                        // Skip if section is hidden
                        if (hiddenTabs.includes(section.id)) return null;

                        const status = sectionStatuses[section.id];
                        const isComplete = status === "complete";
                        const isPartial = status === "partial";

                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveModal(section.id)}
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

            {/* Compact Section Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map((section) => {
                    // Skip if section is hidden
                    if (hiddenTabs.includes(section.id)) return null;

                    const SectionIcon = section.icon;
                    const status = sectionStatuses[section.id];

                    return (
                        <CompactDataSummary
                            key={section.id}
                            id={section.id}
                            title={section.title}
                            icon={<SectionIcon className="h-5 w-5" />}
                            status={status}
                            statusText={getStatusText(section.id)}
                            summary={status !== "empty" ? getSummaryContent(section.id) : undefined}
                            onEdit={() => setActiveModal(section.id)}
                            colorScheme={section.colorScheme}
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
