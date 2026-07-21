"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { SearchableDropdown } from "./SearchableDropdown";
import {
    Pill,

    Trash2,
    Calendar,
    Printer,
    CheckCircle,
    AlertCircle,
    Eye,
    Clock,
    FileText,

    Layout,
    Loader2,
    ChevronDown,
    ChevronUp,
    Stethoscope,
    Sparkles,
    Settings,
    X,
    Link2,
    Activity,
    Plus,
    TrendingDown,
    FlaskConical,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { optometryPrescriptionApi } from "@/services/optometryPrescriptionApi";
import { symptomsApi, DiagnosisSymptomMap } from "@/services/symptomsApi";
import { prescriptionDataApi } from "@/services/prescriptionDataApi";
import { doctorsApi } from "@/services/doctorsApi";
import { medicinesApi } from "@/services/medicinesApi";
import { labTestsApi, PrescriptionField } from "@/services/labTestsApi";
import { handleError } from "@/utils/errorHandler";
import { useReactToPrint } from "react-to-print";
import { DoctorPrescriptionPrint } from "./DoctorPrescriptionPrint";
import { PrintPreviewModal } from "./PrintPreviewModal";
import {
    DiagnosisChips,
    MedicineQuickChips,
    FollowupQuickChips,
    AdviceQuickChips,
    LabTestQuickChips,
    SelectedDiagnoses,
} from "./QuickSelectChips";
import {
    QUICK_FOLLOWUPS,
    QUICK_ADVICE,
    getFollowupDate,
} from "./prescriptionQuickActions";
import { SaveAsTemplateModal } from "./SaveAsTemplateModal";
import type { PrescriptionTemplate } from "@/services/prescriptionTemplatesApi";
import type { MedicineItem, AdviceItem, OptometryPrescription, OptometryPrescriptionItem, PrescriptionSymptom } from "@/types";
import { QuickPresetsSettingsModal } from "./settings/QuickPresetsSettingsModal";
import { PlannedSurgerySection } from "./PlannedSurgerySection";
import { quickPresetsApi } from "@/services/quickPresetsApi";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import { patientsApi } from "@/services/patientsApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { PlannedSurgery } from "@/types";
import { usersApi } from "@/services/usersApi";
import { diagnosesApi, Diagnosis } from "@/services/diagnosesApi";
import { advicesApi } from "@/services/advicesApi";
import { usePrescriptionFlags } from "@/hooks/useFeatureFlags";
import { labBookingsApi } from "@/services/labBookingsApi";
import type { LabBooking } from "@/services/labBookingsApi";
import type { LabTestResultItem } from "@/types";
import { NormalRangeIndicator } from "@/components/doctors/shared/NormalRangeIndicator";
import { PreviousLabReportModal } from "./PreviousLabReportModal";

interface PrescriptionFormSectionProps {
    patientId: string;
    visitId: string;
    optometristId: string;
    doctorId: string;
    doctorName?: string;
    onClose: () => void;
    onPrescriptionCreated?: () => void;
    examinationData?: PrescriptionDataResponse | null;
    templateToApply?: PrescriptionTemplate | null;
    onTemplateApplied?: () => void;
    templateToEdit?: PrescriptionTemplate | null;
    onEditStarted?: () => void;
    readOnly?: boolean;
}

interface FormData {
    diagnosis: string;
    followup_date: string;
    plan_of_action: string;
    remarks: string;
    lens_type: string;
    vision_type: string;
    lens_material: string;
    coatings: string[];

    medicine_items: MedicineItem[];
    advice_items: AdviceItem[];
}

const LENS_TYPES = [
    "Single Vision - Distance",
    "Single Vision - Near",
    "Bifocal",
    "Progressive",
    "Computer / Anti-fatigue",
];

const VISION_TYPES = [
    "Distance",
    "Near",
    "Intermediate",
    "Bifocal",
    "Progressive",
];

const LENS_MATERIALS = [
    "CR",
    "Polycarbonate",
    "High Index",
];

const COATINGS = [
    "Anti-reflective",
    "Blue-cut",
    "UV protection",
    "Scratch-resistant",
];

const FREQUENCIES = [
    "1 time daily",
    "2 times daily",
    "3 times daily",
    "4 times daily",
    "8 times daily",
    "Every 4 hours",
    "Every 6 hours",
    "Every 8 hours",
    "At bedtime",
    "As needed",
];

const DURATIONS = [
    "3 days",
    "5 days",
    "7 days",
    "10 days",
    "14 days",
    "21 days",
    "1 month",
    "2 months",
    "3 months",
    "Continuous",
];

const MEDICINE_INSTRUCTIONS = [
    "Before food",
    "After food",
    "Empty stomach",
    "With water",
    "With milk",
    "At bedtime",
    "Instill 1 drop",
    "Instill 2 drops",
    "Apply locally",
    "Apply at night",
    "Apply morning and night",
    "Shake well before use",
    "Warm compress before use",
    "Cold compress before use",
    "For external use only",
];

export function PrescriptionFormSection({
    patientId,
    visitId,
    optometristId,
    doctorId,
    doctorName,
    onClose,
    onPrescriptionCreated,
    examinationData,
    templateToApply,
    onTemplateApplied,
    templateToEdit,
    onEditStarted,
    readOnly = false,
}: PrescriptionFormSectionProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [medicineSearchQuery, setMedicineSearchQuery] = useState("");
    const [medicineSearchResults, setMedicineSearchResults] = useState<any[]>([]);

    const [diagnosesOptions, setDiagnosesOptions] = useState<any[]>([]);
    const [medicinesOptions, setMedicinesOptions] = useState<any[]>([]);
    const [advicesOptions, setAdvicesOptions] = useState<any[]>([]);
    const [labTestsOptions, setLabTestsOptions] = useState<any[]>([]);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const [searchingMedicines, setSearchingMedicines] = useState(false);
    const [diagnosisSearchQuery, setDiagnosisSearchQuery] = useState("");
    const [searchingDiagnoses, setSearchingDiagnoses] = useState(false);
    const [diagnosisSearchResults, setDiagnosisSearchResults] = useState<any[]>([]);

    const [adviceSearchQuery, setAdviceSearchQuery] = useState("");
    const [searchingAdvices, setSearchingAdvices] = useState(false);
    const [adviceSearchResults, setAdviceSearchResults] = useState<any[]>([]);

    const [testSearchQuery, setTestSearchQuery] = useState("");
    const [searchingTests, setSearchingTests] = useState(false);
    const [testSearchResults, setTestSearchResults] = useState<any[]>([]);
    const [savedPrescription, setSavedPrescription] = useState<OptometryPrescription | null>(null);
    const [printWithHeader, setPrintWithHeader] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("prescription_print_with_header");
            return saved !== null ? JSON.parse(saved) : true;
        }
        return true;
    });
    const [showOpticalDetails, setShowOpticalDetails] = useState(false);
    const [showCustomDate, setShowCustomDate] = useState(false);
    const [selectedFollowupDays, setSelectedFollowupDays] = useState<number | null>(null);
    const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
    const [diagnosisEyeMap, setDiagnosisEyeMap] = useState<Record<string, "OD" | "OS" | "OU" | "NA">>({});
    const [resolvedDiagnoses, setResolvedDiagnoses] = useState<Record<string, Diagnosis>>({});
    const [availableSymptoms, setAvailableSymptoms] = useState<Record<string, DiagnosisSymptomMap[]>>({});
    const [selectedSymptoms, setSelectedSymptoms] = useState<PrescriptionSymptom[]>([]);
    const [addedAdviceIds, setAddedAdviceIds] = useState<string[]>([]);
    const [addedLabTestIds, setAddedLabTestIds] = useState<string[]>([]);
    const [addedMedicineIds, setAddedMedicineIds] = useState<string[]>([]);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [doctorSignature, setDoctorSignature] = useState<string | null>(null);
    const [fullPrescriptionData, setFullPrescriptionData] = useState<PrescriptionDataResponse | null>(null);
    const [plannedSurgeries, setPlannedSurgeries] = useState<PlannedSurgery[]>([]);
    const [patientDetails, setPatientDetails] = useState<any>(null);
    const [optometristDetails, setOptometristDetails] = useState<any>(null);
    const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
    const [pendingFinalizeAction, setPendingFinalizeAction] = useState<{ data: FormData; print: boolean } | null>(null);

    // Lab Test History & Results State
    const [previousLabBookings, setPreviousLabBookings] = useState<LabBooking[]>([]);
    const [showHistoryExpanded, setShowHistoryExpanded] = useState(false);
    const [loadingLabBookings, setLoadingLabBookings] = useState(false);
    const [selectedReportBooking, setSelectedReportBooking] = useState<LabBooking | null>(null);

    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const printRef = React.useRef<HTMLDivElement>(null);
    const [prescriptionFieldsByTestCode, setPrescriptionFieldsByTestCode] = useState<Record<string, PrescriptionField[]>>({});
    // Feature flags for prescription editing
    const { allowEditAfterFinalize, allowEditAfterVisitCompleted } = usePrescriptionFlags();

    // Fetch patient lab test bookings
    const fetchPatientLabBookings = async (pId: string) => {
        if (!pId) return;
        setLoadingLabBookings(true);
        try {
            const bookingsRes = await labBookingsApi.list({ patient_id: pId, page_size: 10 });
            setPreviousLabBookings(bookingsRes.items || []);
        } catch (e) {
            console.error("Failed to fetch patient lab bookings", e);
        } finally {
            setLoadingLabBookings(false);
        }
    };

    // Fetch additional details
    useEffect(() => {
        const fetchExtras = async () => {
            if (patientId) {
                try {
                    const [surgs, pat] = await Promise.all([
                        plannedSurgeriesApi.list({ patient_id: patientId, status: "scheduled" }),
                        patientsApi.getById(patientId),
                        fetchPatientLabBookings(patientId)
                    ]);
                    setPlannedSurgeries(surgs.items || []);
                    setPatientDetails(pat);
                } catch (e) {
                    console.error("Failed to fetch patient extras", e);
                }
            }
            if (optometristId) {
                try {
                    const opt = await usersApi.getById(optometristId);
                    setOptometristDetails(opt);
                } catch (e) {
                    console.error("Failed to fetch optometrist details", e);
                }
            }
            if (doctorId) {
                try {
                    const sigData = await doctorsApi.getSignature(doctorId);
                    if (sigData?.signature) {
                        setDoctorSignature(sigData.signature);
                    } else {
                        // Fallback to profile signature if endpoint doesn't have it or as backup
                        const docProfile = await doctorsApi.getById(doctorId);
                        if (docProfile?.signature) {
                            setDoctorSignature(docProfile.signature);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch doctor signature", e);
                    // Backup fallback
                    try {
                        const docProfile = await doctorsApi.getById(doctorId);
                        if (docProfile?.signature) {
                            setDoctorSignature(docProfile.signature);
                        }
                    } catch (innerErr) {
                        console.error("Failed to fetch doctor profile as fallback", innerErr);
                    }
                }
            }
        };
        fetchExtras();
    }, [patientId, optometristId, doctorId]);



    const handlePrintClick = async () => {
        setIsSubmitting(true);
        try {
            // Always fetch latest surgeries
            const surgs = await plannedSurgeriesApi.list({ patient_id: patientId, status: "scheduled" });
            setPlannedSurgeries(surgs.items || []);

            // Always fetch fresh data for print to ensure all clinical modification are reflected
            const data = await prescriptionDataApi.getPrescriptionData(patientId, visitId);
            setFullPrescriptionData(data);

            // Sync savedPrescription if data has it
            if (data.prescription) {
                setSavedPrescription(data.prescription);
            }

            // Show preview modal instead of direct printing
            setShowPrintPreview(true);
        } catch (error) {
            console.error("Failed to fetch prescription data for print", error);
            toast.error("Failed to load print data");
        } finally {
            setIsSubmitting(false);
        }
    };

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { },
    } = useForm<FormData>({
        defaultValues: {
            diagnosis: "",
            followup_date: "",
            plan_of_action: "",
            remarks: "",
            lens_type: "",
            vision_type: "",
            lens_material: "",
            coatings: [],

            medicine_items: [],
            advice_items: [],
        },
    });

    const watchedMedicines = watch("medicine_items") || [];

    const [isLoading, setIsLoading] = useState(false);

    // Fetch existing prescription on mount
    useEffect(() => {
        const fetchExisting = async () => {
            if (!patientId || !visitId) return;

            setIsLoading(true);
            try {
                const response = await optometryPrescriptionApi.list({
                    patient_id: patientId,
                    visit_id: visitId,
                    page_size: 1
                });

                if (response.items && response.items.length > 0) {
                    const existing = response.items[0];
                    setSavedPrescription(existing);

                    // Parse existing diagnosis to chips and extract eye information
                    let diagnosisNames: string[] = [];
                    const eyeMap: Record<string, "OD" | "OS" | "OU" | "NA"> = {};

                    if (existing.diagnosis) {
                        // Parse diagnosis text which may contain eye labels like "Myopia (Right Eye)"
                        const diagnosisParts = existing.diagnosis.split(",").map((d: string) => d.trim()).filter(Boolean);

                        diagnosisParts.forEach((part) => {
                            // Extract diagnosis name and eye label using regex
                            const match = part.match(/^(.+?)\s*\((.+?)\)$/);

                            if (match) {
                                const diagName = match[1].trim();
                                const eyeLabel = match[2].trim();

                                diagnosisNames.push(diagName);

                                // Map eye labels back to codes
                                if (eyeLabel === "Right Eye" || eyeLabel === "OD") {
                                    eyeMap[diagName] = "OD";
                                } else if (eyeLabel === "Left Eye" || eyeLabel === "OS") {
                                    eyeMap[diagName] = "OS";
                                } else if (eyeLabel === "Both Eyes" || eyeLabel === "OU") {
                                    eyeMap[diagName] = "OU";
                                } else if (eyeLabel === "Not Applicable" || eyeLabel === "NA") {
                                    eyeMap[diagName] = "NA";
                                } else {
                                    // If eye label doesn't match expected format, default to OU
                                    eyeMap[diagName] = "OU";
                                }
                            } else {
                                // No eye label found, use the whole part as diagnosis name
                                diagnosisNames.push(part);
                                eyeMap[part] = "OU"; // Default to both eyes
                            }
                        });

                        setSelectedDiagnoses(diagnosisNames);
                        setDiagnosisEyeMap(eyeMap);
                    }

                    // Set symptoms directly from draft
                    if (existing.symptoms && existing.symptoms.length > 0) {
                        // Ensure symptoms are unique by ID just in case
                        const uniqueSymptoms = Array.from(new Map(existing.symptoms.map(s => [s.symptom_id, s])).values());
                        setSelectedSymptoms(uniqueSymptoms);
                    }

                    // Fetch available symptoms for UI display
                    diagnosisNames.forEach(async (diagName) => {
                        try {
                            let diagId = diagnosesOptions.find(o => o.value === diagName)?.id;
                            if (!diagId) {
                                const searchRes = await diagnosesApi.list({ search: diagName, page_size: 1 });
                                if (searchRes.items.length > 0) {
                                    const d = searchRes.items[0];
                                    diagId = d.id;
                                    setResolvedDiagnoses(prev => ({ ...prev, [diagName]: d }));
                                }
                            }
                            if (diagId) {
                                const symptoms = await symptomsApi.getSymptomsByDiagnosis(diagId);
                                setAvailableSymptoms(prev => ({ ...prev, [diagId]: symptoms }));
                            }
                        } catch (err) {
                            console.error(`Failed to load symptoms for: ${diagName}`, err);
                        }
                    });

                    // Calculate selected followup days
                    if (existing.followup_date) {
                        const followupDate = new Date(existing.followup_date);
                        const today = new Date();
                        const diffDays = Math.round((followupDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const matchingOption = QUICK_FOLLOWUPS.find(f => Math.abs(f.days - diffDays) <= 2);
                        if (matchingOption) {
                            setSelectedFollowupDays(matchingOption.days);
                        } else {
                            setShowCustomDate(true);
                        }
                    }

                    reset({
                        diagnosis: "", // Keep empty - chips are managed separately
                        followup_date: existing.followup_date || "",
                        plan_of_action: existing.plan_of_action || "",
                        remarks: existing.remarks || "",
                        lens_type: existing.lens_type || "",
                        vision_type: existing.vision_type || "",
                        lens_material: existing.lens_material || "",
                        coatings: existing.coatings || [],

                        medicine_items: existing.medicine_items || [],
                        advice_items: existing.advice_items || [],
                    });

                    // Also fetch doctor signature if it belongs to a different doctor
                    if (existing.doctor_id && existing.doctor_id !== doctorId) {
                        try {
                            const sigData = await doctorsApi.getSignature(existing.doctor_id);
                            if (sigData?.signature) {
                                setDoctorSignature(sigData.signature);
                            } else {
                                const docProfile = await doctorsApi.getById(existing.doctor_id);
                                if (docProfile?.signature) {
                                    setDoctorSignature(docProfile.signature);
                                }
                            }
                        } catch (e) {
                            console.error("Failed to fetch signature for existing prescription doctor", e);
                            // Backup fallback
                            try {
                                const docProfile = await doctorsApi.getById(existing.doctor_id);
                                if (docProfile?.signature) {
                                    setDoctorSignature(docProfile.signature);
                                }
                            } catch (err) {
                                console.error("Failed backup fallback for existing doctor", err);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch existing prescription", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchExisting();
    }, [patientId, visitId, reset]);

    const { fields: medicineFields, append: appendMedicine, remove: removeMedicine } = useFieldArray({
        control,
        name: "medicine_items",
    });

    const { fields: adviceFields, append: appendAdvice, remove: removeAdvice } = useFieldArray({
        control,
        name: "advice_items",
    });

    // Load active prescription fields for prescribed lab tests
    useEffect(() => {
        const loadFields = async () => {
            const labTests = adviceFields.filter((f: any) => (f.advice_type === "lab-test" || f.advice_type === "Lab Test") && f.test_code);
            if (labTests.length === 0) return;

            const newMap = { ...prescriptionFieldsByTestCode };
            let hasChanges = false;

            const promises = labTests.map(async (field: any) => {
                if (newMap[field.test_code]) return; // already loaded
                try {
                    const fieldsList = await labTestsApi.listPrescriptionFields(field.test_code);
                    newMap[field.test_code] = fieldsList.filter((f) => f.is_active);
                    hasChanges = true;
                } catch (error) {
                    console.error(`Failed to fetch prescription fields for ${field.test_code}:`, error);
                }
            });

            await Promise.all(promises);
            if (hasChanges) {
                setPrescriptionFieldsByTestCode(newMap);
            }
        };

        loadFields();
    }, [adviceFields]);

    // Sync added medicine IDs when medicine options or fields change
    useEffect(() => {
        if (medicinesOptions.length > 0 && medicineFields.length > 0) {
            const medIds = medicineFields.map((field: any) => {
                const match = medicinesOptions.find((opt: any) =>
                    opt.medicine.medicine_name === field.medicine_name
                );
                return match?.id;
            }).filter(Boolean) as string[];
            setAddedMedicineIds(medIds);
        } else if (medicineFields.length === 0) {
            // Reset tracking when all medicines are removed
            setAddedMedicineIds([]);
        }
    }, [medicinesOptions, medicineFields]);
    // Sync added advice IDs when advice options or fields change
    useEffect(() => {
        if (advicesOptions.length > 0 && adviceFields.length > 0) {
            const advIds = adviceFields.map((field: any) => {
                const match = advicesOptions.find((opt: any) =>
                    opt.value === field.description
                );
                return match?.id;
            }).filter(Boolean) as string[];
            setAddedAdviceIds(advIds);
        } else if (adviceFields.length === 0) {
            setAddedAdviceIds([]);
        }
    }, [advicesOptions, adviceFields]);

    // Sync added lab test IDs
    useEffect(() => {
        if (labTestsOptions.length > 0 && adviceFields.length > 0) {
            const labIds = adviceFields
                .filter(field => field.advice_type === "Lab Test" || field.advice_type === "lab-test")
                .map((field: any) => {
                    const match = labTestsOptions.find(opt =>
                        (opt.lab_test_id && opt.lab_test_id === field.lab_test_id) ||
                        opt.value === field.description ||
                        opt.id === field.lab_test_id
                    );
                    return match?.id;
                }).filter(Boolean) as string[];
            setAddedLabTestIds(labIds);
        } else if (adviceFields.length === 0) {
            setAddedLabTestIds([]);
        }
    }, [labTestsOptions, adviceFields]);

    // Custom remove medicine handler that also updates tracking
    const handleRemoveMedicine = (index: number) => {
        const medicine = medicineFields[index];
        // Find if this medicine was from a preset
        const matchingPreset = medicinesOptions.find((opt: any) =>
            opt.medicine.medicine_name === medicine.medicine_name
        );
        if (matchingPreset) {
            // Remove from tracking so it can be added again
            setAddedMedicineIds((prev: string[]) => prev.filter((id: string) => id !== matchingPreset.id));
        }
        removeMedicine(index);
    };

    // Custom remove advice handler
    const handleRemoveAdvice = (index: number) => {
        const advice = adviceFields[index];
        const matchingPreset = advicesOptions.find((opt: any) =>
            opt.value === advice.description
        );
        if (matchingPreset) {
            setAddedAdviceIds((prev: string[]) => prev.filter((id: string) => id !== matchingPreset.id));
        }
        removeAdvice(index);
    };

    const selectedCoatings = watch("coatings");
    const currentDiagnosis = watch("diagnosis");

    // Sync eye selection to diagnosis input field in real-time
    useEffect(() => {
        if (selectedDiagnoses.length > 0) {
            const formattedDiagnosis = selectedDiagnoses.map(diagName => {
                const eye = diagnosisEyeMap[diagName] || "OU";
                const eyeLabel =
                    eye === "OD" ? "Right Eye" :
                        eye === "OS" ? "Left Eye" :
                            eye === "OU" ? "Both Eyes" :
                                "Not Applicable";
                return `${diagName} (${eyeLabel})`;
            }).join(", ");
            setValue("diagnosis", formattedDiagnosis);
        } else {
            setValue("diagnosis", "");
        }
    }, [selectedDiagnoses, diagnosisEyeMap, setValue]);


    // Load dynamic presets and doctor signature - API only, no defaults
    useEffect(() => {
        if (doctorId) {
            const loadData = async () => {
                try {
                    const [dx, meds, advs, labTests, docProfile] = await Promise.all([
                        quickPresetsApi.getDiagnoses(doctorId),
                        quickPresetsApi.getMedicines(doctorId),
                        quickPresetsApi.getAdvices(doctorId),
                        quickPresetsApi.getLabTests(doctorId),
                        doctorsApi.getById(doctorId)
                    ]);

                    if (docProfile?.signature) {
                        setDoctorSignature(docProfile.signature);
                    }

                    // Only set if API returns data, no fallback to mock data
                    setDiagnosesOptions(dx || []);

                    if (meds && meds.length > 0) {
                        // Map API medicine format to UI format
                        const mappedMeds = meds.map(m => ({
                            id: m.id || Math.random().toString(),
                            label: m.label,
                            icon: m.icon,
                            color: m.color,
                            medicine: {
                                medicine_name: m.medicine_name,
                                generic_name: m.generic_name,
                                dosage: m.dosage,
                                frequency: m.frequency,
                                duration: m.duration,
                                instructions: m.instructions
                            }
                        }));
                        setMedicinesOptions(mappedMeds);
                    } else {
                        setMedicinesOptions([]);
                    }

                    if (advs && advs.length > 0) {
                        setAdvicesOptions(advs);
                    } else {
                        setAdvicesOptions([]);
                    }

                    if (labTests && labTests.length > 0) {
                        setLabTestsOptions(labTests);
                    } else {
                        setLabTestsOptions([]);
                    }

                } catch (error) {
                    console.error("Failed to load doctor data", error);
                    // Set empty arrays on error
                    setDiagnosesOptions([]);
                    setMedicinesOptions([]);
                    setAdvicesOptions([]);
                    setLabTestsOptions([]);
                }
            };
            loadData();
        }
    }, [doctorId]);

    // Apply template when received from sidebar
    useEffect(() => {
        if (templateToApply) {
            handleApplyTemplate(templateToApply);
            onTemplateApplied?.();
        }
    }, [templateToApply]);

    // Handle edit request: Apply data then open modal
    useEffect(() => {
        if (templateToEdit) {
            // Apply data first so the form is populated
            handleApplyTemplate(templateToEdit);
            // Then open the modal
            setShowSaveTemplateModal(true);
        }
    }, [templateToEdit]);

    // Search medicines
    useEffect(() => {
        const searchMedicines = async () => {
            if (medicineSearchQuery.length < 2) {
                setMedicineSearchResults([]);
                return;
            }

            setSearchingMedicines(true);
            try {
                const results = await medicinesApi.search({ q: medicineSearchQuery, page_size: 10 });
                setMedicineSearchResults(results.items || []);
            } catch (error) {
                console.error("Medicine search error:", error);
            } finally {
                setSearchingMedicines(false);
            }
        };

        const debounce = setTimeout(searchMedicines, 300);
        return () => clearTimeout(debounce);
    }, [medicineSearchQuery]);

    // Search diagnoses
    useEffect(() => {
        const searchQuery = async () => {
            if (!diagnosisSearchQuery || diagnosisSearchQuery.trim().length < 2) {
                setDiagnosisSearchResults([]);
                return;
            }

            setSearchingDiagnoses(true);
            try {
                // Use diagnosesApi to search for diagnoses (GET /diagnoses)
                const response = await diagnosesApi.list({
                    search: diagnosisSearchQuery,
                    page_size: 10
                });

                // Map to the format expected by the UI
                const results = response.items.map(d => ({
                    id: d.id,
                    label: d.diagnosis_name,
                    value: d.diagnosis_name,
                    category: d.category || 'other'
                }));

                setDiagnosisSearchResults(results);
            } catch (error) {
                console.error("Diagnosis search error:", error);
            } finally {
                setSearchingDiagnoses(false);
            }
        };

        const debounce = setTimeout(searchQuery, 300);
        return () => clearTimeout(debounce);
    }, [diagnosisSearchQuery]);

    // Search advices
    useEffect(() => {
        const searchQuery = async () => {
            if (!adviceSearchQuery || adviceSearchQuery.trim().length < 2) {
                setAdviceSearchResults([]);
                return;
            }

            setSearchingAdvices(true);
            try {
                // Use advicesApi to search
                const response = await advicesApi.list({
                    search: adviceSearchQuery,
                    page_size: 10
                });

                // Map to format expected by UI
                const results = response.items.map(a => ({
                    id: a.id,
                    label: a.advice_name,
                    value: a.advice_name,
                    category: a.category || 'General'
                }));

                setAdviceSearchResults(results);
            } catch (error) {
                console.error("Advice search error:", error);
            } finally {
                setSearchingAdvices(false);
            }
        };

        const debounce = setTimeout(searchQuery, 300);
        return () => clearTimeout(debounce);
    }, [adviceSearchQuery]);

    // Search lab tests
    useEffect(() => {
        const searchQuery = async () => {
            if (!testSearchQuery || testSearchQuery.trim().length < 2) {
                setTestSearchResults([]);
                return;
            }

            setSearchingTests(true);
            try {
                const response = await labTestsApi.list({
                    search: testSearchQuery,
                    page_size: 10,
                    is_active: true
                });

                const results = response.items.map(t => ({
                    id: t.id,
                    label: t.test_name,
                    value: t.test_name,
                    category: t.category,
                    code: t.test_code
                }));

                setTestSearchResults(results);
            } catch (error) {
                console.error("Test search error:", error);
            } finally {
                setSearchingTests(false);
            }
        };

        const debounce = setTimeout(searchQuery, 300);
        return () => clearTimeout(debounce);
    }, [testSearchQuery]);

    // Handle diagnosis toggle
    const handleDiagnosisToggle = async (value: string) => {
        const isAdding = !selectedDiagnoses.includes(value);
        setSelectedDiagnoses(prev => {
            const newList = isAdding
                ? [...prev, value]
                : prev.filter(d => d !== value);
            // Note: diagnosis field is auto-synced via useEffect
            return newList;
        });

        if (isAdding) {
            // Determine default eye from selected symptoms
            let defaultEye: "OD" | "OS" | "OU" | "NA" = "OU";
            const symptomEyes = selectedSymptoms
                .filter(s => s.applicable_eye)
                .map(s => s.applicable_eye);

            if (symptomEyes.length > 0) {
                const eyeCounts = symptomEyes.reduce((acc, eye) => {
                    if (eye) acc[eye] = (acc[eye] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                const mostCommon = Object.entries(eyeCounts).sort((a, b) => b[1] - a[1])[0];
                if (mostCommon) {
                    const eye = mostCommon[0];
                    if (eye === "LEFT") defaultEye = "OS";
                    else if (eye === "RIGHT") defaultEye = "OD";
                    else if (eye === "BOTH") defaultEye = "OU";
                    else defaultEye = "NA";
                }
            }

            // Set default eye for this diagnosis
            setDiagnosisEyeMap(prev => ({ ...prev, [value]: defaultEye }));

            // If it's a chip/preset, we might not have the ID yet unless it's in the option
            const option = diagnosesOptions.find(o => o.value === value);
            if (option?.id) {
                try {
                    const symptoms = await symptomsApi.getSymptomsByDiagnosis(option.id);
                    setAvailableSymptoms(prev => ({ ...prev, [option.id]: symptoms }));
                    // Also store the mapping of name to id if needed for UI
                } catch (err) {
                    console.error("Failed to fetch symptoms for diagnosis:", value, err);
                }
            } else {
                // Search for diagnosis to get ID
                try {
                    const res = await diagnosesApi.list({ search: value, page_size: 1 });
                    if (res.items.length > 0) {
                        const d = res.items[0];
                        setResolvedDiagnoses(prev => ({ ...prev, [value]: d }));
                        const symptoms = await symptomsApi.getSymptomsByDiagnosis(d.id);
                        setAvailableSymptoms(prev => ({ ...prev, [d.id]: symptoms }));
                    }
                } catch (e) {
                    console.error("Search failed for", value, e);
                }
            }
        } else {
            // Remove from eye map
            setDiagnosisEyeMap(prev => {
                const newMap = { ...prev };
                delete newMap[value];
                return newMap;
            });
            // Remove symptoms for this diagnosis
            const diagId = diagnosesOptions.find(o => o.value === value)?.id || resolvedDiagnoses[value]?.id;
            if (diagId) {
                setSelectedSymptoms(prev => prev.filter(s => s.diagnosis_id !== diagId));
            }
        }
    };

    const toggleSymptom = (symptom: DiagnosisSymptomMap, diagnosisId: string, diagnosisName: string) => {
        setSelectedSymptoms(prev => {
            const isSelected = prev.some(s => s.symptom_id === symptom.symptom_id);
            if (isSelected) {
                // Remove the symptom globally
                return prev.filter(s => s.symptom_id !== symptom.symptom_id);
            } else {
                // Add the symptom
                return [...prev, {
                    symptom_id: symptom.symptom_id,
                    symptom_name: symptom.symptom_name,
                    applicable_eye: null // Default to null
                }];
            }
        });
    };

    // Handle quick medicine add - from API data only
    const handleQuickMedicineAdd = (id: string) => {
        // Check if already added
        if (addedMedicineIds.includes(id)) {
            toast.info("This medicine is already added");
            return;
        }

        const template = medicinesOptions.find(m => m.id === id);
        if (template) {
            appendMedicine({
                medicine_id: "",
                ...template.medicine,
                applicable_eye: "BOTH",
            });
            // Track that this medicine has been added
            setAddedMedicineIds(prev => [...prev, id]);
            toast.success(`Added ${template.label}`);
        }
    };

    // Handle quick follow-up selection
    const handleFollowupSelect = (days: number) => {
        setSelectedFollowupDays(days);
        setShowCustomDate(false);
        const date = getFollowupDate(days);
        setValue("followup_date", date);
    };

    // Handle quick advice add
    const handleQuickAdviceAdd = (id: string) => {
        if (addedAdviceIds.includes(id)) return;
        const template = advicesOptions.find(a => a.id === id);
        if (template) {
            appendAdvice({
                advice_type: template.category,
                description: template.value,
                notes: ""
            });
            setAddedAdviceIds(prev => [...prev, id]);
            toast.success(`Added ${template.label}`);
        }
    };

    // Handle quick lab test add
    const handleQuickLabTestAdd = async (id: string) => {
        if (addedLabTestIds.includes(id)) return;
        const template = labTestsOptions.find(l => l.id === id);
        if (template) {
            let testCode = "";
            if (template.lab_test_id) {
                try {
                    const testDetails = await labTestsApi.getById(template.lab_test_id);
                    testCode = testDetails.test_code;
                } catch (e) {
                    console.error("Failed to fetch lab test details for code:", e);
                }
            }
            appendAdvice({
                advice_type: "lab-test",
                description: template.value,
                lab_test_id: template.lab_test_id || null,
                test_code: testCode,
                notes: "",
                prescription_metadata: {}
            });
            setAddedLabTestIds(prev => [...prev, id]);
            toast.success(`Added ${template.label}`);
        }
    };


    const handleAddMedicine = (medicine?: any) => {
        console.log("Selected medicine from search:", medicine);

        // Prioritize default_ fields from the Medicine type (API response)
        // If those are missing or null, fall back to direct fields (e.g. if passed from a different source)
        // Also fallback to strength for dosage if available
        const dosage = medicine?.default_dosage || medicine?.dosage || medicine?.strength || "";
        const frequency = medicine?.default_frequency || medicine?.frequency || "";
        const duration = medicine?.default_duration || medicine?.duration || "";
        const instructions = medicine?.default_instructions || medicine?.instructions || "";

        appendMedicine({
            medicine_id: medicine?.id || medicine?.medicine_id || "",
            medicine_name: medicine?.name || medicine?.medicine_name || "",
            generic_name: medicine?.generic_name || "",
            dosage,
            frequency,
            duration,
            instructions,
            applicable_eye: "BOTH",
        });
        setMedicineSearchQuery("");
        setMedicineSearchResults([]);
    };

    const handleAddDiagnosisFromSearch = async (diagnosis: any) => {
        handleDiagnosisToggle(diagnosis.value);
        if (diagnosis.id) {
            setResolvedDiagnoses(prev => ({ ...prev, [diagnosis.value]: diagnosis }));
            try {
                const symptoms = await symptomsApi.getSymptomsByDiagnosis(diagnosis.id);
                setAvailableSymptoms(prev => ({ ...prev, [diagnosis.id]: symptoms }));
            } catch (err) {
                console.error("Failed to fetch symptoms for diagnosis ID:", diagnosis.id, err);
            }
        }
        setDiagnosisSearchQuery("");
        setDiagnosisSearchResults([]);
    };

    const handleAddAdviceFromSearch = (advice: any) => {
        appendAdvice({
            advice_type: advice.category || "General",
            description: advice.value,
            notes: ""
        });
        setAdviceSearchQuery("");
        setAdviceSearchResults([]);
        toast.success(`Added ${advice.label}`);
    };

    const handleAddTestFromSearch = (test: any) => {
        appendAdvice({
            advice_type: "lab-test",
            description: test.value,
            lab_test_id: test.id,
            test_code: test.code,
            notes: "",
            prescription_metadata: {}
        });
        setTestSearchQuery("");
        setTestSearchResults([]);
        toast.success(`Added ${test.label}`);
    };

    const handleToggleCoating = (coating: string) => {
        const current = selectedCoatings || [];
        if (current.includes(coating)) {
            setValue("coatings", current.filter((c) => c !== coating));
        } else {
            setValue("coatings", [...current, coating]);
        }
    };

    // Apply a template to the form
    const handleApplyTemplate = (template: PrescriptionTemplate) => {
        // Set diagnosis
        if (template.diagnosis) {
            setValue("diagnosis", template.diagnosis);
            // Try to match with quick diagnoses
            const diagnosisValues = template.diagnosis.split(",").map(d => d.trim());
            setSelectedDiagnoses(diagnosisValues);
        }

        // Set plan of action
        if (template.plan_of_action) {
            setValue("plan_of_action", template.plan_of_action);
        }

        // Set follow-up date from days
        if (template.followup_days) {
            const followupDate = getFollowupDate(template.followup_days);
            setValue("followup_date", followupDate);
            setSelectedFollowupDays(template.followup_days);
        }

        // Set remarks
        if (template.remarks) {
            setValue("remarks", template.remarks);
        }

        // Set optical details
        if (template.lens_type) setValue("lens_type", template.lens_type);
        if (template.vision_type) setValue("vision_type", template.vision_type);
        if (template.lens_material) setValue("lens_material", template.lens_material);
        if (template.coatings?.length) setValue("coatings", template.coatings);

        // Clear existing medicines and add from template
        if (template.medicine_items?.length) {
            // Remove all existing medicines
            while (medicineFields.length > 0) {
                removeMedicine(0);
            }
            // Add template medicines
            template.medicine_items.forEach(med => {
                appendMedicine({
                    medicine_id: med.medicine_id || "",
                    medicine_name: med.medicine_name,
                    generic_name: med.generic_name || "",
                    dosage: med.dosage,
                    frequency: med.frequency,
                    duration: med.duration,
                    instructions: med.instructions || "",
                    applicable_eye: med.applicable_eye || "BOTH",
                });
            });
        }

        // Clear existing advice and add from template
        if (template.advice_items?.length) {
            // Remove all existing advice
            while (adviceFields.length > 0) {
                removeAdvice(0);
            }
            // Add template advice
            template.advice_items.forEach(adv => {
                appendAdvice({
                    advice_type: adv.advice_type,
                    description: adv.description,
                    notes: adv.notes || "",
                });
            });
        }
    };

    // Helper to build items from examination data
    const getRefractionItems = (): OptometryPrescriptionItem[] => {
        const items: OptometryPrescriptionItem[] = [];
        if (examinationData?.refraction) {
            const refr = examinationData.refraction;
            items.push({
                eye: "OD",
                sphere: parseFloat(refr.od_sphere) || 0,
                cylinder: parseFloat(refr.od_cylinder) || null,
                axis: refr.od_axis || null,
                add_power: parseFloat(refr.od_add_power) || null,
                visual_acuity: refr.od_visual_acuity_corrected || null,
                prism: null,
                lens_type: null,
            });
            items.push({
                eye: "OS",
                sphere: parseFloat(refr.os_sphere) || 0,
                cylinder: parseFloat(refr.os_cylinder) || null,
                axis: refr.os_axis || null,
                add_power: parseFloat(refr.os_add_power) || null,
                visual_acuity: refr.os_visual_acuity_corrected || null,
                prism: null,
                lens_type: null,
            });
        }
        return items;
    };

    // Summary data for preview
    const summaryData = useMemo(() => ({
        hasDiagnosis: selectedDiagnoses.length > 0 || !!currentDiagnosis?.trim(),
        diagnosisCount: selectedDiagnoses.length,
        medicineCount: medicineFields.length,
        adviceCount: adviceFields.length,
        hasFollowup: !!selectedFollowupDays || showCustomDate,
        followupLabel: selectedFollowupDays
            ? QUICK_FOLLOWUPS.find(f => f.days === selectedFollowupDays)?.display
            : "Custom",
    }), [selectedDiagnoses, currentDiagnosis, medicineFields.length, adviceFields.length, selectedFollowupDays, showCustomDate]);

    // Helper to sanitize medicine items - convert empty strings to undefined
    const sanitizeMedicineItems = (items: MedicineItem[]): MedicineItem[] => {
        return items.map(item => {
            const hasTapering = item.tapering_steps && item.tapering_steps.length > 0;
            return {
                ...item,
                medicine_id: item.medicine_id?.trim() || undefined,
                generic_name: item.generic_name?.trim() || undefined,
                dosage: hasTapering ? "Refer steps" : item.dosage,
                frequency: hasTapering ? "Refer steps" : item.frequency,
                duration: hasTapering ? "Refer steps" : item.duration,
                instructions: hasTapering ? "Refer steps" : item.instructions || undefined,
            };
        });
    };

    const processSubmit = async (data: FormData, options: { print?: boolean; finalize?: boolean }) => {
        // For finalize actions, show confirmation modal first
        if (options.finalize) {
            setPendingFinalizeAction({ data, print: !!options.print });
            setShowFinalizeConfirm(true);
            return;
        }

        await executeSubmit(data, options);
    };

    const executeSubmit = async (data: FormData, options: { print?: boolean; finalize?: boolean }) => {
        setIsSubmitting(true);
        // Moved setShouldPrint(true) to later to ensure we have data first

        try {
            let result;
            const items = getRefractionItems();

            if (data.lens_type && items.length > 0) {
                items.forEach(item => item.lens_type = data.lens_type);
            }

            // Sanitize medicine items - remove empty strings
            const sanitizedMedicines = data.medicine_items.length > 0
                ? sanitizeMedicineItems(data.medicine_items)
                : undefined;

            // Format diagnosis text with eye labels
            const formatDiagnosisText = () => {
                if (selectedDiagnoses.length === 0) return data.diagnosis || null;
                return selectedDiagnoses.map(diagName => {
                    const eye = diagnosisEyeMap[diagName] || "OU";
                    const eyeLabel =
                        eye === "OD" ? "Right Eye" :
                            eye === "OS" ? "Left Eye" :
                                eye === "OU" ? "Both Eyes" :
                                    "Not Applicable";
                    return `${diagName} (${eyeLabel})`;
                }).join(", ");
            };
            const formattedDiagnosis = formatDiagnosisText();

            if (savedPrescription?.id) {
                result = await optometryPrescriptionApi.update(savedPrescription.id, {
                    diagnosis: formattedDiagnosis,
                    notes: null,
                    items: items.length > 0 ? items : undefined,
                    followup_date: data.followup_date || null,
                    plan_of_action: data.plan_of_action || null,
                    remarks: data.remarks || null,
                    lens_type: data.lens_type || null,
                    vision_type: data.vision_type || null,
                    lens_material: data.lens_material || null,
                    coatings: selectedCoatings.length > 0 ? selectedCoatings : null,
                    medicine_items: sanitizedMedicines,
                    advice_items: data.advice_items.length > 0 ? data.advice_items : undefined,
                    symptoms: selectedSymptoms.length > 0 ? selectedSymptoms.map(s => ({
                        symptom_id: s.symptom_id,
                        symptom_name: s.symptom_name,
                        applicable_eye: s.applicable_eye || null
                    })) : undefined,
                });
            } else {
                result = await optometryPrescriptionApi.create({
                    patient_id: patientId,
                    visit_id: visitId,
                    optometrist_id: optometristId,
                    doctor_id: doctorId,
                    diagnosis: formattedDiagnosis,
                    notes: null,
                    items: items,
                    followup_date: data.followup_date || undefined,
                    plan_of_action: data.plan_of_action || undefined,
                    remarks: data.remarks || undefined,
                    lens_type: data.lens_type || undefined,
                    vision_type: data.vision_type || undefined,
                    lens_material: data.lens_material || undefined,
                    coatings: selectedCoatings.length > 0 ? selectedCoatings : undefined,
                    medicine_items: sanitizedMedicines,
                    advice_items: data.advice_items.length > 0 ? data.advice_items : undefined,
                    symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : undefined,
                });
            }

            // Handle Finalization
            if (options.finalize && result.id) {
                result = await optometryPrescriptionApi.finalize(result.id);
            }

            // Fetch full prescription data for printing to ensure we have all fields
            // specifically requested to use /prescription-data endpoint
            try {
                const fullData = await prescriptionDataApi.getPrescriptionData(patientId, visitId);
                setFullPrescriptionData(fullData);
                if (fullData.prescription) {
                    setSavedPrescription(fullData.prescription);
                } else {
                    setSavedPrescription(result);
                }
            } catch (error) {
                console.error("Failed to fetch full prescription data for print", error);
                setSavedPrescription(result);
            }

            if (options.print) {
                setShowPrintPreview(true);
            }

            if (options.finalize) {
                toast.success("Prescription finalized successfully");
            } else {
                if (!options.print) {
                    toast.success("Prescription saved successfully");
                }
            }

            if (!options.print) {
                setIsSubmitting(false); // Reset loading state after save
                if (onPrescriptionCreated) onPrescriptionCreated();
                if (options.finalize) onClose();
            } else {
                setIsSubmitting(false); // Enable buttons for print dialog
            }
        } catch (error) {
            handleError(error, {
                defaultMessage: "Failed to save prescription",
                logError: true,
            });
            setIsSubmitting(false);
        }
    };

    const handlePreviewFinalize = async (printAfter: boolean = false) => {
        // We use handleSubmit wrap to ensure we get the latest form data for single-step Save & Finalize
        await handleSubmit(async (data) => {
            try {
                await executeSubmit(data, { finalize: true, print: printAfter });
                if (!printAfter) {
                    setShowPrintPreview(false);
                }
            } catch (error) {
                console.error("Failed to finalize from preview", error);
                handleError(error, { defaultMessage: "Failed to finalize prescription" });
            }
        })();
    };

    const onSaveDraft = (data: FormData) => processSubmit(data, { print: false, finalize: false });

    const handleConfirmFinalize = () => {
        if (pendingFinalizeAction) {
            setShowFinalizeConfirm(false);
            executeSubmit(pendingFinalizeAction.data, { print: pendingFinalizeAction.print, finalize: true });
            setPendingFinalizeAction(null);
        }
    };

    const handleCancelFinalize = () => {
        setShowFinalizeConfirm(false);
        setPendingFinalizeAction(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                <span className="ml-2 text-slate-600">Loading prescription...</span>
            </div>
        );
    }

    return (
        <div className="p-4">
            {/* Finalize Confirmation Modal */}
            {showFinalizeConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5 border-b border-amber-100">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 border border-amber-200">
                                    <AlertCircle className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Finalize Prescription</h3>
                                    <p className="text-sm text-slate-600">This action cannot be undone</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-5">
                            <p className="text-slate-700">
                                Are you sure you want to finalize this prescription? Once finalized, it <span className="font-semibold text-amber-700">cannot be edited or updated</span>.
                            </p>
                            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-amber-800">
                                        <p className="font-medium">What happens next:</p>
                                        <ul className="mt-1 list-disc list-inside text-amber-700 space-y-0.5">
                                            <li>Prescription will be locked for editing</li>
                                            <li>Patient can collect their prescription</li>
                                            {pendingFinalizeAction?.print && <li>Print dialog will open automatically</li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleCancelFinalize}
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmFinalize}
                                className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-emerald-600 hover:to-teal-700 transition-all"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    Yes, Finalize
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Read-Only View - Show only if editing is not allowed by feature flags */}
            {(() => {
                // Determine if we should show read-only view based on feature flags
                const isPrescriptionFinalized = savedPrescription?.status === 'finalized';
                const isVisitCompleted = readOnly;

                // Check if editing should be allowed despite finalization/completion
                const shouldAllowEdit =
                    (isPrescriptionFinalized && allowEditAfterFinalize) ||
                    (isVisitCompleted && allowEditAfterVisitCompleted);

                // Show read-only view only if prescription/visit is locked AND editing is not allowed
                const shouldShowReadOnly =
                    (isPrescriptionFinalized || isVisitCompleted) && !shouldAllowEdit;

                return shouldShowReadOnly;
            })() ? (
                <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden border border-slate-200">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-700">Prescription View</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrintClick}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition shadow-sm disabled:opacity-70"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Printer className="h-4 w-4" />
                                )}
                                Print
                            </button>
                            <button
                                onClick={onClose}
                                className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm"
                            >
                                <X className="h-4 w-4" />
                                Close
                            </button>
                        </div>
                    </div>
                    {savedPrescription ? (
                        <div className="bg-white">
                            <DoctorPrescriptionPrint
                                prescription={{
                                    ...savedPrescription,
                                    doctor_name: savedPrescription.doctor_name || doctorName,
                                    patient_name: savedPrescription.patient_name || (patientDetails ? `${patientDetails.first_name} ${patientDetails.last_name || ""}`.trim() : ""),
                                    optometrist_name: savedPrescription.optometrist_name || (optometristDetails ? optometristDetails.full_name : ""),
                                    items: (savedPrescription.items && savedPrescription.items.length > 0)
                                        ? savedPrescription.items
                                        : getRefractionItems()
                                }}
                                showHeader={true}
                                doctorSignature={doctorSignature}
                                visitData={fullPrescriptionData || examinationData} // Use fullData if available, else fallback to exam data
                                plannedSurgeries={plannedSurgeries}
                            />
                        </div>
                    ) : isLoading ? (
                        <div className="p-12 text-center text-slate-500">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-sky-500" />
                            Loading prescription details...
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-500">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                            <p className="font-medium">No prescription found</p>
                            <p className="text-sm mt-1">No prescription was created for this visit.</p>
                        </div>
                    )}
                </div>
            ) : (

                <div className="space-y-6">
                    <form className="space-y-5">
                        {/* Modern Rx Header */}
                        <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-100">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
                                <span className="text-xl font-black text-white tracking-tight">Rx</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Create Prescription</h3>
                                <p className="text-xs text-slate-600 font-medium mt-0.5">
                                    <span className="text-slate-400">Prescriber:</span> {doctorName || "Doctor"}
                                </p>
                            </div>
                            {/* Quick Summary Badge */}
                            {(summaryData.medicineCount > 0 || summaryData.hasDiagnosis) && (
                                <div className="flex items-center gap-2">
                                    {summaryData.medicineCount > 0 && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                                            <Pill className="h-3.5 w-3.5" />
                                            {summaryData.medicineCount}
                                        </span>
                                    )}
                                    {summaryData.hasFollowup && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {summaryData.followupLabel}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* CARD 1: Diagnosis */}
                        <div className="rounded-2xl border-2 border-slate-200/60 bg-white shadow-lg shadow-slate-200/50 overflow-hidden group/card hover:shadow-xl hover:border-sky-300/60 transition-all duration-300">
                            <div className="border-b-2 border-slate-100 bg-gradient-to-r from-sky-50 via-blue-50/30 to-white px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 border-2 border-white text-white shadow-lg shadow-sky-500/30">
                                            <Stethoscope className="h-5 w-5" />
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Clinical Diagnosis</h3>
                                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-200 text-[10px] font-black text-slate-600">1</span>
                                            </div>
                                            <p className="text-xs text-slate-600 font-medium mt-0.5">Record patient conditions and symptoms</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowSettingsModal(true)}
                                        className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-sky-600 border-2 border-transparent hover:border-sky-200 transition-all shadow-sm hover:shadow"
                                        title="Configure Presets"
                                    >
                                        <Settings className="h-4 w-4" />
                                        <span className="hidden sm:inline">Settings</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Quick Select */}
                                <div className="space-y-4">
                                    <div className="relative group/search">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-sky-500 transition-colors">
                                            {searchingDiagnoses ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Stethoscope className="h-5 w-5" />
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={diagnosisSearchQuery}
                                            onChange={(e) => setDiagnosisSearchQuery(e.target.value)}
                                            placeholder="Search diagnosis..."
                                            className="w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 py-3.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/20 transition-all shadow-sm hover:border-slate-300"
                                        />
                                        {diagnosisSearchResults.length > 0 && (
                                            <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border-2 border-sky-200 bg-white shadow-2xl">
                                                <ul className="max-h-60 overflow-y-auto py-1 scrollbar-hide">
                                                    {diagnosisSearchResults.map((diagnosis) => (
                                                        <li
                                                            key={diagnosis.id || diagnosis.value}
                                                            onClick={() => handleAddDiagnosisFromSearch(diagnosis)}
                                                            className="cursor-pointer px-4 py-3 hover:bg-sky-50 active:bg-sky-100 transition-colors border-b border-slate-100 last:border-0 group"
                                                        >
                                                            <div className="font-bold text-slate-900 text-sm group-hover:text-sky-700 transition-colors">{diagnosis.label}</div>
                                                            {diagnosis.category && (
                                                                <div className="text-xs text-slate-500 mt-1 capitalize">{diagnosis.category}</div>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>


                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                                            <Sparkles className="h-3.5 w-3.5 text-white" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Select</p>
                                    </div>
                                    {diagnosesOptions.length > 0 ? (
                                        <DiagnosisChips
                                            options={diagnosesOptions}
                                            selected={selectedDiagnoses}
                                            onToggle={handleDiagnosisToggle}
                                        />
                                    ) : (
                                        <div className="text-center py-4 px-4 bg-slate-50 rounded-lg border border-slate-200">
                                            <p className="text-xs text-slate-500">No quick diagnosis presets configured.</p>
                                            <button
                                                type="button"
                                                onClick={() => setShowSettingsModal(true)}
                                                className="text-xs text-sky-600 hover:text-sky-700 font-medium mt-1"
                                            >
                                                Configure in Settings
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Selected List */}
                                {selectedDiagnoses.length > 0 && (
                                    <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-5 border-2 border-slate-200/60 shadow-inner">
                                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white text-[10px] font-black">{selectedDiagnoses.length}</span>
                                            Selected Conditions
                                        </p>
                                        <div className="space-y-4">
                                            {selectedDiagnoses.map((diagName) => {
                                                const diagId = diagnosesOptions.find(o => o.value === diagName)?.id || resolvedDiagnoses[diagName]?.id;
                                                const symptoms = diagId ? availableSymptoms[diagId] : null;

                                                console.log("=== DIAGNOSIS RENDERING ===", {
                                                    diagName,
                                                    diagId,
                                                    diagnosesOptionsHasIt: diagnosesOptions.find(o => o.value === diagName),
                                                    resolvedDiagnosesHasIt: resolvedDiagnoses[diagName],
                                                    symptomsCount: symptoms?.length,
                                                    selectedSymptomsTotal: selectedSymptoms.length,
                                                    selectedSymptomsForThisDiagnosis: selectedSymptoms.filter(s =>
                                                        s.diagnosis_id === diagId || s.diagnosis_name === diagName
                                                    )
                                                });

                                                return (
                                                    <div key={diagName} className="space-y-2">
                                                        <SelectedDiagnoses
                                                            diagnoses={[diagName]}
                                                            onRemove={handleDiagnosisToggle}
                                                        />

                                                        {/* Eye Selection Toggle Buttons */}
                                                        <div className="flex items-center gap-2 ml-2 mb-2">
                                                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Eye:</span>
                                                            <div className="flex gap-1.5">
                                                                {(["OD", "OS", "OU", "NA"] as const).map((eye) => {
                                                                    const isActive = diagnosisEyeMap[diagName] === eye;
                                                                    return (
                                                                        <button
                                                                            key={eye}
                                                                            type="button"
                                                                            onClick={() => setDiagnosisEyeMap(prev => ({ ...prev, [diagName]: eye }))}
                                                                            className={clsx(
                                                                                "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wide",
                                                                                isActive
                                                                                    ? "bg-sky-600 text-white shadow-sm ring-2 ring-sky-500/30"
                                                                                    : "bg-white text-slate-600 border border-slate-300 hover:border-sky-400 hover:bg-sky-50"
                                                                            )}
                                                                            title={
                                                                                eye === "OD" ? "Right Eye (Oculus Dexter)" :
                                                                                    eye === "OS" ? "Left Eye (Oculus Sinister)" :
                                                                                        eye === "OU" ? "Both Eyes (Oculus Uterque)" :
                                                                                            "Not Applicable"
                                                                            }
                                                                        >
                                                                            {eye}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {symptoms && symptoms.length > 0 && (
                                                            <div className="ml-4 pl-4 border-l-2 border-slate-200 py-1 flex flex-wrap gap-1.5 transition-all animate-in fade-in slide-in-from-left-2 duration-300">
                                                                {symptoms.map((s) => {
                                                                    const isSelected = selectedSymptoms.some(sel => sel.symptom_id === s.symptom_id);

                                                                    return (
                                                                        <button
                                                                            key={s.symptom_id}
                                                                            type="button"
                                                                            onClick={() => diagId && toggleSymptom(s, diagId, diagName)}
                                                                            className={clsx(
                                                                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
                                                                                isSelected
                                                                                    ? "bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20"
                                                                                    : "bg-white text-slate-500 border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50"
                                                                            )}
                                                                        >
                                                                            {isSelected && <CheckCircle className="h-3 w-3" />}
                                                                            {s.symptom_name}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Full Diagnosis / Notes */}
                                <div>
                                    <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">
                                        Detailed Diagnosis / Notes
                                    </label>
                                    <textarea
                                        {...register("diagnosis")}
                                        rows={3}
                                        placeholder="Type specific diagnosis details here..."
                                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/20 resize-none transition-all placeholder:text-slate-400 shadow-sm hover:border-slate-300"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CARD 2: Medicines */}
                        <div className="rounded-2xl border-2 border-slate-200/60 bg-white shadow-lg shadow-slate-200/50 overflow-hidden group/card hover:shadow-xl hover:border-purple-300/60 transition-all duration-300">
                            <div className="border-b-2 border-slate-100 bg-gradient-to-r from-purple-50 via-pink-50/30 to-white px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 border-2 border-white text-white shadow-lg shadow-purple-500/30">
                                            <Pill className="h-5 w-5" />
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Medicines</h3>
                                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-200 text-[10px] font-black text-slate-600">2</span>
                                                {medicineFields.length > 0 && (
                                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-xs font-black text-white shadow-md">
                                                        {medicineFields.length}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 font-medium mt-0.5">Prescribe medications and dosage instructions</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowSettingsModal(true)}
                                        className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-purple-600 border-2 border-transparent hover:border-purple-200 transition-all shadow-sm hover:shadow"
                                        title="Configure Presets"
                                    >
                                        <Settings className="h-4 w-4" />
                                        <span className="hidden sm:inline">Settings</span>
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-5">
                                {/* Search & Quick Add */}
                                <div className="space-y-4">
                                    <div className="relative group/search">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-purple-500 transition-colors">
                                            {searchingMedicines ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Pill className="h-5 w-5" />
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={medicineSearchQuery}
                                            onChange={(e) => setMedicineSearchQuery(e.target.value)}
                                            placeholder="Search medicines (brand or generic)..."
                                            className="w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 py-3.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm hover:border-slate-300"
                                        />
                                        {medicineSearchResults.length > 0 && (
                                            <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border-2 border-purple-200 bg-white shadow-2xl">
                                                <ul className="max-h-60 overflow-y-auto py-1 scrollbar-hide">
                                                    {medicineSearchResults.map((medicine) => (
                                                        <li
                                                            key={medicine.id}
                                                            onClick={() => handleAddMedicine(medicine)}
                                                            className="cursor-pointer px-4 py-3 hover:bg-purple-50 active:bg-purple-100 transition-colors border-b border-slate-100 last:border-0 group"
                                                        >
                                                            <div className="font-bold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">{medicine.name || medicine.medicine_name}</div>
                                                            <div className="text-xs text-slate-500 mt-1">{medicine.generic_name} • {medicine.default_dosage || medicine.strength}</div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-5 border-2 border-slate-200/60 shadow-inner">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                                                <Sparkles className="h-3.5 w-3.5 text-white" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Add</p>
                                        </div>
                                        {medicinesOptions.length > 0 ? (
                                            <MedicineQuickChips
                                                options={medicinesOptions}
                                                addedIds={addedMedicineIds}
                                                onAdd={handleQuickMedicineAdd}
                                            />
                                        ) : (
                                            <div className="text-center py-4 px-4 bg-white rounded-lg border border-slate-200">
                                                <p className="text-xs text-slate-500">No quick medicine presets configured.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSettingsModal(true)}
                                                    className="text-xs text-purple-600 hover:text-purple-700 font-medium mt-1"
                                                >
                                                    Configure in Settings
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Added Medicines List */}
                                <div className="space-y-4">
                                    {medicineFields.map((field, index) => (
                                        <div key={field.id} className="relative rounded-xl border-2 border-slate-200 bg-white p-5 hover:shadow-lg hover:border-purple-300 transition-all group/item">
                                            <div className="absolute right-3 top-3 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMedicine(index)}
                                                    className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm hover:shadow"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="mb-4 pr-12">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-xs font-black text-white shadow-md">
                                                        {index + 1}
                                                    </span>
                                                    <h4 className="font-bold text-slate-900 text-base">{field.medicine_name}</h4>
                                                    {field.generic_name && (
                                                        <span className="text-xs text-slate-500 font-medium italic">({field.generic_name})</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 items-end">
                                                <div className={watchedMedicines[index]?.tapering_steps?.length ? "col-span-2 sm:col-span-1" : ""}>
                                                    <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Eye</label>
                                                    <select
                                                        {...register(`medicine_items.${index}.applicable_eye`)}
                                                        className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm hover:border-slate-300"
                                                    >
                                                        <option value="BOTH">Both Eyes (OU)</option>
                                                        <option value="RIGHT">Right Eye (OD)</option>
                                                        <option value="LEFT">Left Eye (OS)</option>
                                                        <option value="NA">N/A</option>
                                                    </select>
                                                </div>
                                                {(() => {
                                                    const taperingSteps = watchedMedicines[index]?.tapering_steps;
                                                    const hasTapering = taperingSteps && taperingSteps.length > 0;
                                                    return hasTapering ? (
                                                        <div className="col-span-2 sm:col-span-4 flex justify-end mb-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => setValue(`medicine_items.${index}.tapering_steps`, undefined)}
                                                                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all shadow-sm border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                                                            >
                                                                <Activity className="h-3.5 w-3.5" />
                                                                Disable Tapering Regimen
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Dosage</label>
                                                                <input
                                                                    {...register(`medicine_items.${index}.dosage`)}
                                                                    placeholder="e.g. 500mg"
                                                                    className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm hover:border-slate-300"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Frequency</label>
                                                                <Controller
                                                                    control={control}
                                                                    name={`medicine_items.${index}.frequency`}
                                                                    render={({ field: { value, onChange } }) => (
                                                                        <SearchableDropdown
                                                                            value={value}
                                                                            onChange={onChange}
                                                                            options={FREQUENCIES}
                                                                            placeholder="e.g. 1-0-1"
                                                                            inputClassName="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm hover:border-slate-300"
                                                                        />
                                                                    )}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Duration</label>
                                                                <Controller
                                                                    control={control}
                                                                    name={`medicine_items.${index}.duration`}
                                                                    render={({ field: { value, onChange } }) => (
                                                                        <SearchableDropdown
                                                                            value={value}
                                                                            onChange={onChange}
                                                                            options={DURATIONS}
                                                                            placeholder="e.g. 5 days"
                                                                            inputClassName="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm hover:border-slate-300"
                                                                        />
                                                                    )}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Instructions</label>
                                                                <Controller
                                                                    control={control}
                                                                    name={`medicine_items.${index}.instructions`}
                                                                    render={({ field: { value, onChange } }) => (
                                                                        <SearchableDropdown
                                                                            value={value}
                                                                            onChange={onChange}
                                                                            options={MEDICINE_INSTRUCTIONS}
                                                                            placeholder="e.g. After food"
                                                                            inputClassName="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm hover:border-slate-300"
                                                                        />
                                                                    )}
                                                                />
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            {/* Tapering Regimen Builder */}
                                            {(() => {
                                                const taperingSteps = watchedMedicines[index]?.tapering_steps;
                                                const hasTapering = taperingSteps && taperingSteps.length > 0;
                                                return (
                                                    <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                                                        {!hasTapering && (
                                                            <div className="flex items-center justify-between">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setValue(`medicine_items.${index}.tapering_steps`, [
                                                                            {
                                                                                sequence: 1,
                                                                                dosage: watch(`medicine_items.${index}.dosage`) || "",
                                                                                frequency: watch(`medicine_items.${index}.frequency`) || "",
                                                                                duration: watch(`medicine_items.${index}.duration`) || "",
                                                                                instructions: watch(`medicine_items.${index}.instructions`) || ""
                                                                            }
                                                                        ]);
                                                                    }}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                                                                >
                                                                    <Activity className="h-3.5 w-3.5" />
                                                                    Enable Tapering Regimen
                                                                </button>
                                                            </div>
                                                        )}

                                                        {hasTapering && (
                                                            <div className="rounded-xl border border-purple-100 bg-purple-50/20 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">

                                                                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                                                                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                                                                        <TrendingDown className="h-3.5 w-3.5 text-purple-600" />
                                                                        Tapering Steps
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const currentSteps = taperingSteps || [];
                                                                            const lastStep = currentSteps[currentSteps.length - 1];
                                                                            setValue(`medicine_items.${index}.tapering_steps`, [
                                                                                ...currentSteps,
                                                                                {
                                                                                    sequence: currentSteps.length + 1,
                                                                                    dosage: lastStep?.dosage || "",
                                                                                    frequency: lastStep?.frequency || "",
                                                                                    duration: lastStep?.duration || "",
                                                                                    instructions: lastStep?.instructions || ""
                                                                                }
                                                                            ]);
                                                                        }}
                                                                        className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-purple-700 shadow-sm"
                                                                    >
                                                                        <Plus className="h-3 w-3" />
                                                                        Add Step
                                                                    </button>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    {(taperingSteps || []).map((step: any, stepIndex: number) => (
                                                                        <div key={stepIndex} className="flex flex-col sm:flex-row gap-3 items-end bg-white/70 p-3 rounded-lg border border-purple-100/50 relative group/step">
                                                                            <div className="flex-1 grid grid-cols-2 gap-3 sm:grid-cols-4 w-full">
                                                                                <div>
                                                                                    <label className="text-[10px] font-bold text-purple-950/80 mb-1 block uppercase tracking-wide">
                                                                                        Step {stepIndex + 1} Dosage
                                                                                    </label>
                                                                                    <input
                                                                                        {...register(`medicine_items.${index}.tapering_steps.${stepIndex}.dosage`)}
                                                                                        placeholder="e.g. 1 drop"
                                                                                        className="w-full rounded-md border border-purple-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none transition-all shadow-sm"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[10px] font-bold text-purple-950/80 mb-1 block uppercase tracking-wide">
                                                                                        Frequency
                                                                                    </label>
                                                                                    <Controller
                                                                                        control={control}
                                                                                        name={`medicine_items.${index}.tapering_steps.${stepIndex}.frequency`}
                                                                                        render={({ field: { value, onChange } }) => (
                                                                                            <SearchableDropdown
                                                                                                value={value}
                                                                                                onChange={onChange}
                                                                                                options={FREQUENCIES}
                                                                                                placeholder="e.g. 6 times a day"
                                                                                                inputClassName="w-full rounded-md border border-purple-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none transition-all shadow-sm"
                                                                                            />
                                                                                        )}
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[10px] font-bold text-purple-950/80 mb-1 block uppercase tracking-wide">
                                                                                        Duration
                                                                                    </label>
                                                                                    <Controller
                                                                                        control={control}
                                                                                        name={`medicine_items.${index}.tapering_steps.${stepIndex}.duration`}
                                                                                        render={({ field: { value, onChange } }) => (
                                                                                            <SearchableDropdown
                                                                                                value={value}
                                                                                                onChange={onChange}
                                                                                                options={DURATIONS}
                                                                                                placeholder="e.g. 1 week"
                                                                                                inputClassName="w-full rounded-md border border-purple-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none transition-all shadow-sm"
                                                                                            />
                                                                                        )}
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[10px] font-bold text-purple-950/80 mb-1 block uppercase tracking-wide">
                                                                                        Instructions
                                                                                    </label>
                                                                                    <Controller
                                                                                        control={control}
                                                                                        name={`medicine_items.${index}.tapering_steps.${stepIndex}.instructions`}
                                                                                        render={({ field: { value, onChange } }) => (
                                                                                            <SearchableDropdown
                                                                                                value={value}
                                                                                                onChange={onChange}
                                                                                                options={MEDICINE_INSTRUCTIONS}
                                                                                                placeholder="e.g. Instill 1 drop"
                                                                                                inputClassName="w-full rounded-md border border-purple-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none transition-all shadow-sm"
                                                                                            />
                                                                                        )}
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            {taperingSteps.length > 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const newSteps = taperingSteps.filter((_: any, sIdx: number) => sIdx !== stepIndex)
                                                                                            .map((s: any, newIdx: number) => ({ ...s, sequence: newIdx + 1 }));
                                                                                        setValue(`medicine_items.${index}.tapering_steps`, newSteps);
                                                                                    }}
                                                                                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm self-center sm:self-end animate-in fade-in duration-200"
                                                                                >
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ))}

                                    {medicineFields.length === 0 && (
                                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                                            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                                                <Pill className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-500">No medicines added yet</p>
                                            <p className="text-xs text-slate-400 mt-1">Search or use quick add to prescribe</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CARD 3: Treatment Plan */}
                        <div className="rounded-2xl border-2 border-slate-200/60 bg-white shadow-lg shadow-slate-200/50 overflow-hidden group/card hover:shadow-xl hover:border-emerald-300/60 transition-all duration-300">
                            <div className="border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 via-green-50/30 to-white px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 border-2 border-white text-white shadow-lg shadow-emerald-500/30">
                                            <CheckCircle className="h-5 w-5" />
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Treatment Plan</h3>
                                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-200 text-[10px] font-black text-slate-600">3</span>
                                            </div>
                                            <p className="text-xs text-slate-600 font-medium mt-0.5">Define care plan, advice, and procedures</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowSettingsModal(true)}
                                        className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-emerald-600 border-2 border-transparent hover:border-emerald-200 transition-all shadow-sm hover:shadow"
                                        title="Configure Presets"
                                    >
                                        <Settings className="h-4 w-4" />
                                        <span className="hidden sm:inline">Settings</span>
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-5">
                                {/* Lab Tests Section */}
                                <div className="mb-6">
                                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <Stethoscope className="h-4 w-4 text-emerald-600" />
                                        Lab Tests & Investigations
                                    </h4>

                                    <div className="relative group/search mb-3">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-emerald-500 transition-colors">
                                            {searchingTests ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Stethoscope className="h-5 w-5" />
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={testSearchQuery}
                                            onChange={(e) => setTestSearchQuery(e.target.value)}
                                            placeholder="Search lab tests..."
                                            className="w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 py-3 text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-sm hover:border-slate-300"
                                        />
                                        {testSearchQuery.length >= 2 && !searchingTests && testSearchResults.length === 0 && (
                                            <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-xl p-3 text-center">
                                                <p className="text-sm text-slate-500">No lab tests found matching "{testSearchQuery}"</p>
                                            </div>
                                        )}
                                        {testSearchResults.length > 0 && (
                                            <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border-2 border-emerald-200 bg-white shadow-2xl">
                                                <ul className="max-h-60 overflow-y-auto py-1 scrollbar-hide">
                                                    {testSearchResults.map((test) => (
                                                        <li
                                                            key={test.id || test.value}
                                                            onClick={() => handleAddTestFromSearch(test)}
                                                            className="cursor-pointer px-4 py-3 hover:bg-emerald-50 active:bg-emerald-100 transition-colors border-b border-slate-100 last:border-0 group"
                                                        >
                                                            <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">{test.label}</div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{test.code}</span>
                                                                {test.category && (
                                                                    <span className="text-xs text-slate-500 capitalize">{test.category}</span>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-5 border-2 border-slate-200/60 shadow-inner mb-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                                                <Sparkles className="h-3.5 w-3.5 text-white" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Selection</p>
                                        </div>
                                        {labTestsOptions.length > 0 ? (
                                            <LabTestQuickChips
                                                options={labTestsOptions}
                                                addedIds={addedLabTestIds}
                                                onAdd={handleQuickLabTestAdd}
                                            />
                                        ) : (
                                            <div className="text-center py-4 px-4 bg-white rounded-lg border border-slate-200">
                                                <p className="text-xs text-slate-500">No lab test presets configured.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSettingsModal(true)}
                                                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-1"
                                                >
                                                    Configure in Settings
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Previous Lab Test History */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm mb-6">
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setShowHistoryExpanded(!showHistoryExpanded)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setShowHistoryExpanded(!showHistoryExpanded);
                                                }
                                            }}
                                            className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer select-none"
                                        >
                                            <div className="flex items-center gap-2">
                                                <FlaskConical className="h-5 w-5 text-emerald-600 animate-pulse" />
                                                <div>
                                                    <span className="font-bold text-sm text-slate-800">Previous Test History & Reports</span>
                                                    {previousLabBookings.length > 0 && (
                                                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                                                            {previousLabBookings.length} {previousLabBookings.length === 1 ? 'Booking' : 'Bookings'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fetchPatientLabBookings(patientId);
                                                    }}
                                                    disabled={loadingLabBookings}
                                                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors"
                                                    title="Refresh history"
                                                >
                                                    <RefreshCw className={`h-4 w-4 ${loadingLabBookings ? 'animate-spin' : ''}`} />
                                                </button>
                                                {showHistoryExpanded ? (
                                                    <ChevronUp className="h-5 w-5 text-slate-500" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-slate-500" />
                                                )}
                                            </div>
                                        </div>

                                        {showHistoryExpanded && (
                                            <div className="border-t border-slate-200">
                                                {loadingLabBookings ? (
                                                    <div className="p-4 space-y-3">
                                                        {[1, 2].map((i) => (
                                                            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 border border-slate-200/60" />
                                                        ))}
                                                    </div>
                                                ) : (() => {
                                                    const pastVisitsBookings = previousLabBookings.filter(b => !visitId || b.visit_id !== visitId);
                                                    if (pastVisitsBookings.length === 0) {
                                                        return (
                                                            <div className="p-6 text-center bg-white">
                                                                <FlaskConical className="mx-auto h-12 w-12 text-slate-350" />
                                                                <h5 className="mt-2 text-sm font-semibold text-slate-800">No Past Visit Bookings</h5>
                                                                <p className="mt-1 text-xs text-slate-500">This patient has no recorded laboratory bookings from previous visits.</p>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto scrollbar-hide bg-white">
                                                            {pastVisitsBookings.map((booking) => {
                                                                const getStatusStyles = (status: string) => {
                                                                    switch ((status || "").toLowerCase()) {
                                                                        case "completed":
                                                                            return "bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100";
                                                                        case "in_progress":
                                                                            return "bg-blue-50 text-blue-700 border-blue-250 hover:bg-blue-100";
                                                                        case "sample_collected":
                                                                            return "bg-amber-50 text-amber-700 border-amber-250 hover:bg-amber-100";
                                                                        case "scheduled":
                                                                            return "bg-slate-50 text-slate-700 border-slate-250 hover:bg-slate-100";
                                                                        default:
                                                                            return "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
                                                                    }
                                                                };

                                                                return (
                                                                    <div
                                                                        key={booking.id}
                                                                        onClick={() => setSelectedReportBooking(booking)}
                                                                        className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between cursor-pointer"
                                                                    >
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className="font-semibold text-slate-900 text-sm truncate">
                                                                                    {booking.booking_number}
                                                                                </span>
                                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase ${getStatusStyles(booking.status)}`}>
                                                                                    {booking.status.replace(/_/g, " ")}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                                                                <span className="flex items-center gap-1 font-medium text-slate-600 shrink-0">
                                                                                    <Calendar className="h-3.5 w-3.5" />
                                                                                    {new Date(booking.scheduled_date).toLocaleDateString("en-US", {
                                                                                        month: "short",
                                                                                        day: "numeric",
                                                                                        year: "numeric",
                                                                                    })}
                                                                                </span>
                                                                                <span className="truncate max-w-[200px]" title={booking.tests.map(t => t.test_name).join(", ")}>
                                                                                    {booking.tests.length} {booking.tests.length === 1 ? 'Test' : 'Tests'}: {booking.tests.map(t => t.test_name).join(", ")}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <span className="ml-4 shrink-0 text-xs font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-2 select-none">
                                                                            View Report
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Added Tests List */}
                                    {adviceFields.some(field => field.advice_type === "Lab Test" || field.advice_type === "lab-test") && (
                                        <div className="space-y-3 mt-3">
                                            {adviceFields.map((field: any, index) => {
                                                if (field.advice_type !== "Lab Test" && field.advice_type !== "lab-test") return null;
                                                const fieldsForTest = prescriptionFieldsByTestCode[field.test_code] || [];
                                                const isCatalogTest = Boolean(field.lab_test_id || watch(`advice_items.${index}.lab_test_id`));
                                                
                                                // Find if a lab booking has been created for this test in the current visit
                                                const currentVisitBooking = previousLabBookings.find(
                                                    b => b.visit_id === visitId && b.tests.some(t => t.test_code === field.test_code || (field.lab_test_id && t.lab_test_id === field.lab_test_id))
                                                );

                                                // Find if a lab booking exists for this test from a past visit
                                                const pastVisitBooking = previousLabBookings.find(
                                                    b => (!visitId || b.visit_id !== visitId) && b.tests.some(t => t.test_code === field.test_code || (field.lab_test_id && t.lab_test_id === field.lab_test_id))
                                                );

                                                return (
                                                    <div key={field.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                                                        <div className="flex items-center gap-2 group/advice">
                                                            <input type="hidden" {...register(`advice_items.${index}.lab_test_id`)} />
                                                            <input type="hidden" {...register(`advice_items.${index}.advice_type`)} />
                                                            <input type="hidden" {...register(`advice_items.${index}.test_code`)} />
                                                            <div className="flex-1 flex items-center gap-2">
                                                                <input
                                                                    {...register(`advice_items.${index}.description`)}
                                                                    readOnly={isCatalogTest}
                                                                    className={clsx(
                                                                        "w-full rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                                                                        isCatalogTest
                                                                            ? "border-emerald-200 bg-emerald-50/40 text-emerald-950 cursor-not-allowed font-semibold"
                                                                            : "border-slate-200 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                                                                    )}
                                                                />
                                                                {isCatalogTest ? (
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                                                                            <Link2 className="h-3.5 w-3.5 text-emerald-600" /> Catalog ({field.test_code || 'Linked'})
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                                                                        Custom Test
                                                                    </span>
                                                                )}
                                                                 {/* Current Visit Booking & Past Booking Status Pills */}
                                                                 {(currentVisitBooking || pastVisitBooking) && (
                                                                     <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                                                         {/* Current Visit Booking Status */}
                                                                         {currentVisitBooking && (
                                                                             <button
                                                                                 type="button"
                                                                                 onClick={() => setSelectedReportBooking(currentVisitBooking)}
                                                                                 className={clsx(
                                                                                     "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition cursor-pointer shadow-2xs shrink-0",
                                                                                     currentVisitBooking.status === "completed"
                                                                                         ? "bg-emerald-100/80 hover:bg-emerald-200/80 text-emerald-900 border-emerald-300"
                                                                                         : "bg-sky-100/80 hover:bg-sky-200/80 text-sky-900 border-sky-300"
                                                                                 )}
                                                                                 title="Click to view today's lab report"
                                                                             >
                                                                                 {currentVisitBooking.status === "completed" ? (
                                                                                     <FileText className="h-3.5 w-3.5 text-emerald-700" />
                                                                                 ) : (
                                                                                     <Clock className="h-3.5 w-3.5 text-sky-700" />
                                                                                 )}
                                                                                 Today: {currentVisitBooking.status.replace(/_/g, " ")}
                                                                             </button>
                                                                         )}

                                                                         {/* Past Visit Booking Report */}
                                                                         {pastVisitBooking && (
                                                                             <button
                                                                                 type="button"
                                                                                 onClick={() => setSelectedReportBooking(pastVisitBooking)}
                                                                                 className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 border border-amber-300 px-2.5 py-1 text-xs font-bold transition cursor-pointer shadow-2xs shrink-0"
                                                                                 title={`Booked on ${new Date(pastVisitBooking.scheduled_date).toLocaleDateString()} (#${pastVisitBooking.booking_number})`}
                                                                             >
                                                                                 <Calendar className="h-3.5 w-3.5 text-amber-700" />
                                                                                 Past Report ({new Date(pastVisitBooking.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                                                                             </button>
                                                                         )}
                                                                     </div>
                                                                 )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveAdvice(index)}
                                                                className="rounded-lg p-2 text-slate-350 hover:bg-red-50 hover:text-red-500 transition-colors"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>

                                                        {fieldsForTest.length > 0 && (
                                                            <div className="bg-white rounded-lg border border-slate-100 p-3 space-y-2.5 ml-1">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                    Prescription Parameters / Clinical Context
                                                                </p>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    {fieldsForTest.map((fField) => (
                                                                        <div key={fField.id} className="col-span-1 space-y-1">
                                                                            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                                                                {fField.field_name}
                                                                                {fField.is_required && <span className="text-rose-500">*</span>}
                                                                            </label>
                                                                            <Controller
                                                                                control={control}
                                                                                name={`advice_items.${index}.prescription_metadata.${fField.field_name}`}
                                                                                rules={{ required: fField.is_required }}
                                                                                render={({ field: controllerField, fieldState }) => {
                                                                                    const val = controllerField.value ?? "";
                                                                                    return (
                                                                                        <div>
                                                                                            {fField.field_type === "dropdown" ? (
                                                                                                <select
                                                                                                    value={val}
                                                                                                    onChange={controllerField.onChange}
                                                                                                    className={clsx(
                                                                                                        "w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none transition bg-white",
                                                                                                        fieldState.invalid ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-emerald-500"
                                                                                                    )}
                                                                                                >
                                                                                                    <option value="">Select option</option>
                                                                                                    {fField.dropdown_options?.map((opt) => (
                                                                                                        <option key={opt} value={opt}>
                                                                                                            {opt}
                                                                                                        </option>
                                                                                                    ))}
                                                                                                </select>
                                                                                            ) : fField.field_type === "number" ? (
                                                                                                <input
                                                                                                    type="number"
                                                                                                    value={val}
                                                                                                    onChange={(e) => controllerField.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                                                                                                    placeholder="Enter number"
                                                                                                    className={clsx(
                                                                                                        "w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none transition bg-white",
                                                                                                        fieldState.invalid ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-emerald-500"
                                                                                                    )}
                                                                                                />
                                                                                            ) : (
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={val}
                                                                                                    onChange={controllerField.onChange}
                                                                                                    placeholder="Enter details"
                                                                                                    className={clsx(
                                                                                                        "w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none transition bg-white",
                                                                                                        fieldState.invalid ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-emerald-500"
                                                                                                    )}
                                                                                                />
                                                                                            )}
                                                                                            {fieldState.invalid && (
                                                                                                <span className="text-[10px] text-rose-500 block mt-0.5">Required field</span>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-slate-100 my-6" />

                                {/* Advice Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                                            General Advice
                                        </h4>
                                    </div>

                                    <div className="relative group/search mb-3">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-emerald-500 transition-colors">
                                            {searchingAdvices ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <CheckCircle className="h-5 w-5" />
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={adviceSearchQuery}
                                            onChange={(e) => setAdviceSearchQuery(e.target.value)}
                                            placeholder="Search advice..."
                                            className="w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 py-3 text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-sm hover:border-slate-300"
                                        />
                                        {adviceSearchQuery.length >= 2 && !searchingAdvices && adviceSearchResults.length === 0 && (
                                            <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-xl p-3 text-center">
                                                <p className="text-sm text-slate-500">No advice found matching "{adviceSearchQuery}"</p>
                                            </div>
                                        )}
                                        {adviceSearchResults.length > 0 && (
                                            <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border-2 border-emerald-200 bg-white shadow-2xl">
                                                <ul className="max-h-60 overflow-y-auto py-1 scrollbar-hide">
                                                    {adviceSearchResults.map((advice) => (
                                                        <li
                                                            key={advice.id || advice.value}
                                                            onClick={() => handleAddAdviceFromSearch(advice)}
                                                            className="cursor-pointer px-4 py-3 hover:bg-emerald-50 active:bg-emerald-100 transition-colors border-b border-slate-100 last:border-0 group"
                                                        >
                                                            <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">{advice.label}</div>
                                                            {advice.category && (
                                                                <div className="text-xs text-slate-500 mt-1 capitalize">{advice.category}</div>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-5 border-2 border-slate-200/60 shadow-inner">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                                                <Sparkles className="h-3.5 w-3.5 text-white" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Selection</p>
                                        </div>
                                        {advicesOptions.length > 0 ? (
                                            <AdviceQuickChips
                                                options={advicesOptions}
                                                addedIds={addedAdviceIds}
                                                onAdd={handleQuickAdviceAdd}
                                            />
                                        ) : (
                                            <div className="text-center py-4 px-4 bg-white rounded-lg border border-slate-200">
                                                <p className="text-xs text-slate-500">No advice presets configured.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSettingsModal(true)}
                                                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-1"
                                                >
                                                    Configure in Settings
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Added Advice List */}
                                    {adviceFields.some(field => field.advice_type !== "Lab Test" && field.advice_type !== "lab-test") && (
                                        <div className="space-y-2 mt-3">
                                            {adviceFields.map((field, index) => {
                                                if (field.advice_type === "Lab Test" || field.advice_type === "lab-test") return null;
                                                return (
                                                    <div key={field.id} className="flex items-center gap-2 group/advice">
                                                        <input type="hidden" {...register(`advice_items.${index}.lab_test_id`)} />
                                                        <input type="hidden" {...register(`advice_items.${index}.advice_type`)} />
                                                        <div className="flex-1">
                                                            <input
                                                                {...register(`advice_items.${index}.description`)}
                                                                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAdvice(index)}
                                                            className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover/advice:opacity-100"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>



                                {/* Plan of Action */}
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-2 block">
                                        Detailed Plan of Action
                                    </label>
                                    <textarea
                                        {...register("plan_of_action")}
                                        rows={2}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 resize-none transition-all placeholder:text-slate-400"
                                        placeholder="Describe the treatment plan..."
                                    />
                                </div>

                                <PlannedSurgerySection
                                    patientId={patientId}
                                    surgeonId={doctorId}
                                    visitId={visitId}
                                />
                            </div>
                        </div>

                        {/* CARD 4: Optical Details */}
                        <div className="rounded-2xl border-2 border-slate-200/60 bg-white shadow-lg shadow-slate-200/50 overflow-hidden group/card hover:shadow-xl hover:border-slate-300/60 transition-all duration-300">
                            <button
                                type="button"
                                onClick={() => setShowOpticalDetails(!showOpticalDetails)}
                                className="w-full border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 via-gray-50/30 to-white px-6 py-4 flex items-center justify-between hover:from-slate-100 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 border-2 border-white text-white shadow-lg shadow-slate-500/30">
                                        <Eye className="h-5 w-5" />
                                    </span>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Optical Details</h3>
                                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-200 text-[10px] font-black text-slate-600">4</span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Optional</span>
                                        </div>
                                        <p className="text-xs text-slate-600 font-medium mt-0.5">Lens specifications and coatings</p>
                                    </div>
                                </div>
                                {showOpticalDetails ? (
                                    <ChevronUp className="h-5 w-5 text-slate-600" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-slate-600" />
                                )}
                            </button>

                            {showOpticalDetails && (
                                <div className="p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-2 block">Lens Type</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {LENS_TYPES.map((type) => (
                                                        <label key={type} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                                            <input
                                                                type="radio"
                                                                value={type}
                                                                {...register("lens_type")}
                                                                className="h-4 w-4 text-slate-600 border-slate-300 focus:ring-slate-500"
                                                            />
                                                            <span className="text-sm text-slate-700">{type}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-2 block">Vision Distance</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {VISION_TYPES.map((type) => (
                                                        <label key={type} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                                            <input
                                                                type="radio"
                                                                value={type}
                                                                {...register("vision_type")}
                                                                className="h-4 w-4 text-slate-600 border-slate-300 focus:ring-slate-500"
                                                            />
                                                            <span className="text-sm text-slate-700">{type}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-2 block">Lens Material</label>
                                                <select
                                                    {...register("lens_material")}
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all"
                                                >
                                                    <option value="">Select Material...</option>
                                                    {LENS_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-2 block">Coatings</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {COATINGS.map((coating) => (
                                                        <button
                                                            key={coating}
                                                            type="button"
                                                            onClick={() => handleToggleCoating(coating)}
                                                            className={clsx(
                                                                "rounded-lg px-3 py-2 text-xs font-semibold transition-all border",
                                                                selectedCoatings?.includes(coating)
                                                                    ? "bg-slate-800 text-white border-slate-900"
                                                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                                            )}
                                                        >
                                                            {coating}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CARD 5: Follow-up & Remarks */}
                        <div className="rounded-2xl border-2 border-slate-200/60 bg-white shadow-lg shadow-slate-200/50 overflow-hidden group/card hover:shadow-xl hover:border-indigo-300/60 transition-all duration-300">
                            <div className="border-b-2 border-slate-100 bg-gradient-to-r from-indigo-50 via-blue-50/30 to-white px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 border-2 border-white text-white shadow-lg shadow-indigo-500/30">
                                            <Calendar className="h-5 w-5" />
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Follow-up & Remarks</h3>
                                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-200 text-[10px] font-black text-slate-600">5</span>
                                            </div>
                                            <p className="text-xs text-slate-600 font-medium mt-0.5">Schedule next visit and add notes</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 block">Follow Up In</label>
                                    <FollowupQuickChips
                                        options={QUICK_FOLLOWUPS}
                                        selectedDays={selectedFollowupDays}
                                        onSelect={handleFollowupSelect}
                                        onCustom={() => setShowCustomDate(true)}
                                        className="mb-3"
                                    />
                                    {showCustomDate && (
                                        <div className="mt-3 animate-in slide-in-from-top-2">
                                            <input
                                                type="date"
                                                {...register("followup_date")}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-2 block">Internal Remarks</label>
                                    <textarea
                                        {...register("remarks")}
                                        rows={3}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none transition-all placeholder:text-slate-400"
                                        placeholder="Private notes..."
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Action Footer */}
                        <div className="pt-5 border-t border-slate-200 mt-6 bg-slate-50/30 rounded-b-2xl p-4 -mx-6 -mb-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                {/* Left Side: Print Header Checkbox */}
                                <div className="flex items-center px-1">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={printWithHeader}
                                            onChange={(e) => {
                                                const val = e.target.checked;
                                                setPrintWithHeader(val);
                                                localStorage.setItem("prescription_print_with_header", JSON.stringify(val));
                                            }}
                                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 transition-all cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                                            Hospital Header
                                        </span>
                                    </label>
                                </div>

                                {/* Right Side: Buttons */}
                                <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-1 md:pb-0 w-full md:w-auto scrollbar-hide">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 rounded-lg transition-all border border-slate-200 bg-white whitespace-nowrap"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowSaveTemplateModal(true)}
                                        className="flex items-center gap-1.5 px-3 py-2 border border-purple-200 bg-purple-50/30 text-purple-700 font-bold rounded-lg hover:bg-purple-50 transition-all text-xs whitespace-nowrap"
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        <span>Template</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={handleSubmit((data) => processSubmit(data, { print: true, finalize: false }))}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black rounded-lg hover:from-sky-600 hover:to-blue-700 transition-all text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Layout className="h-4 w-4" />
                                        )}
                                        <span>Draft & Preview</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {showSaveTemplateModal && (
                        <SaveAsTemplateModal
                            isOpen={showSaveTemplateModal}
                            onClose={() => {
                                setShowSaveTemplateModal(false);
                                onEditStarted?.(); // Clear the edit signal from parent if cancelled
                            }}
                            formData={{
                                diagnosis: currentDiagnosis,
                                plan_of_action: watch("plan_of_action"),
                                followup_date: watch("followup_date"),
                                remarks: watch("remarks"),
                                lens_type: watch("lens_type"),
                                vision_type: watch("vision_type"),
                                lens_material: watch("lens_material"),
                                coatings: selectedCoatings,
                                medicine_items: medicineFields,
                                advice_items: adviceFields,
                            }}
                            editTemplate={templateToEdit}
                            onSaved={() => {
                                onEditStarted?.(); // Clear edit signal
                            }}
                        />
                    )}

                    {showSettingsModal && (
                        <QuickPresetsSettingsModal
                            isOpen={showSettingsModal}
                            onClose={() => setShowSettingsModal(false)}
                            doctorId={doctorId}
                            onSaved={() => {
                                // Reload presets from API - no mock data fallback
                                const reloadPresets = async () => {
                                    try {
                                        const [dx, meds, advs, labTests] = await Promise.all([
                                            quickPresetsApi.getDiagnoses(doctorId),
                                            quickPresetsApi.getMedicines(doctorId),
                                            quickPresetsApi.getAdvices(doctorId),
                                            quickPresetsApi.getLabTests(doctorId)
                                        ]);

                                        // Only set if API returns data
                                        setDiagnosesOptions(dx || []);

                                        if (meds && meds.length > 0) {
                                            const mappedMeds = meds.map(m => ({
                                                id: m.id || Math.random().toString(),
                                                label: m.label,
                                                icon: m.icon,
                                                color: m.color,
                                                medicine: {
                                                    medicine_name: m.medicine_name,
                                                    generic_name: m.generic_name,
                                                    dosage: m.dosage,
                                                    frequency: m.frequency,
                                                    duration: m.duration,
                                                    instructions: m.instructions
                                                }
                                            }));
                                            setMedicinesOptions(mappedMeds);
                                        } else {
                                            setMedicinesOptions([]);
                                        }

                                        if (advs && advs.length > 0) {
                                            setAdvicesOptions(advs);
                                        } else {
                                            setAdvicesOptions([]);
                                        }

                                        if (labTests && labTests.length > 0) {
                                            setLabTestsOptions(labTests);
                                        } else {
                                            setLabTestsOptions([]);
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        // Set empty arrays on error
                                        setDiagnosesOptions([]);
                                        setMedicinesOptions([]);
                                        setAdvicesOptions([]);
                                        setLabTestsOptions([]);
                                    }
                                };
                                reloadPresets();
                            }}
                        />
                    )}
                </div>
            )}

            {(showPrintPreview && savedPrescription) && (
                <PrintPreviewModal
                    isOpen={showPrintPreview}
                    onClose={() => {
                        setShowPrintPreview(false);
                    }}
                    prescription={savedPrescription}
                    visitData={fullPrescriptionData || examinationData}
                    doctorSignature={doctorSignature}
                    plannedSurgeries={plannedSurgeries}
                    showHeader={printWithHeader}
                    onFinalize={handlePreviewFinalize}
                />
            )}

            <PreviousLabReportModal
                isOpen={selectedReportBooking !== null}
                onClose={() => setSelectedReportBooking(null)}
                booking={selectedReportBooking}
            />
        </div>
    );
}
