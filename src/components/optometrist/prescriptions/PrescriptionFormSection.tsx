"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
    Pill,

    Trash2,
    Calendar,
    Printer,
    CheckCircle,
    AlertCircle,
    Eye,

    Layout,
    Loader2,
    ChevronDown,
    ChevronUp,
    Stethoscope,
    Sparkles,
    Settings,
    X,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { optometryPrescriptionApi } from "@/services/optometryPrescriptionApi";
import { symptomsApi, DiagnosisSymptomMap } from "@/services/symptomsApi";
import { prescriptionDataApi } from "@/services/prescriptionDataApi";
import { doctorsApi } from "@/services/doctorsApi";
import { medicinesApi } from "@/services/medicinesApi";
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
import { labTestsApi } from "@/services/labTestsApi";

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
    "Once daily",
    "Twice daily",
    "Three times daily",
    "Four times daily",
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
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const printRef = React.useRef<HTMLDivElement>(null);

    // Fetch additional details
    useEffect(() => {
        const fetchExtras = async () => {
            if (patientId) {
                try {
                    const [surgs, pat] = await Promise.all([
                        plannedSurgeriesApi.list({ patient_id: patientId, status: "scheduled" }),
                        patientsApi.getById(patientId)
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

                    // Parse existing diagnosis to chips
                    let diagnosisNames: string[] = [];
                    if (existing.diagnosis) {
                        diagnosisNames = existing.diagnosis.split(",").map((d: string) => d.trim()).filter(Boolean);
                        setSelectedDiagnoses(diagnosisNames);
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
                        diagnosis: existing.diagnosis || "",
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
                .filter(field => field.advice_type === "Lab Test")
                .map((field: any) => {
                    const match = labTestsOptions.find(opt =>
                        opt.value === field.description
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
            // Update form value
            setValue("diagnosis", newList.join(", "));
            return newList;
        });

        if (isAdding) {
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
    const handleQuickLabTestAdd = (id: string) => {
        if (addedLabTestIds.includes(id)) return;
        const template = labTestsOptions.find(l => l.id === id);
        if (template) {
            appendAdvice({
                advice_type: "Lab Test",
                description: template.value,
                notes: ""
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
            advice_type: "Lab Test",
            description: test.value,
            notes: ""
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
        return items.map(item => ({
            ...item,
            medicine_id: item.medicine_id?.trim() || undefined,
            generic_name: item.generic_name?.trim() || undefined,
        }));
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

            if (savedPrescription?.id) {
                result = await optometryPrescriptionApi.update(savedPrescription.id, {
                    diagnosis: data.diagnosis || null,
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
                    diagnosis: data.diagnosis || null,
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

            {/* Read-Only View */}
            {(readOnly || savedPrescription?.status === 'finalized') ? (
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
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-xs font-black text-white shadow-md">
                                                        {index + 1}
                                                    </span>
                                                    <h4 className="font-bold text-slate-900 text-base">{field.medicine_name}</h4>
                                                </div>
                                                {field.generic_name && (
                                                    <p className="ml-9 text-xs text-slate-500 mt-1 font-medium">{field.generic_name}</p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                                                    <div className="relative">
                                                        <input
                                                            list={`freq-options-${index}`}
                                                            {...register(`medicine_items.${index}.frequency`)}
                                                            placeholder="e.g. 1-0-1"
                                                            className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm hover:border-slate-300"
                                                        />
                                                        <datalist id={`freq-options-${index}`}>
                                                            {FREQUENCIES.map(f => <option key={f} value={f} />)}
                                                        </datalist>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Duration</label>
                                                    <div className="relative">
                                                        <input
                                                            list={`dur-options-${index}`}
                                                            {...register(`medicine_items.${index}.duration`)}
                                                            placeholder="e.g. 5 days"
                                                            className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm hover:border-slate-300"
                                                        />
                                                        <datalist id={`dur-options-${index}`}>
                                                            {DURATIONS.map(d => <option key={d} value={d} />)}
                                                        </datalist>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">Instructions</label>
                                                    <input
                                                        {...register(`medicine_items.${index}.instructions`)}
                                                        placeholder="e.g. After food"
                                                        className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm hover:border-slate-300"
                                                    />
                                                </div>
                                            </div>
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

                                    {/* Added Tests List */}
                                    {adviceFields.some(field => field.advice_type === "Lab Test") && (
                                        <div className="space-y-2 mt-3">
                                            {adviceFields.map((field, index) => {
                                                if (field.advice_type !== "Lab Test") return null;
                                                return (
                                                    <div key={field.id} className="flex items-center gap-2 group/advice">
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
                                    {adviceFields.some(field => field.advice_type !== "Lab Test") && (
                                        <div className="space-y-2 mt-3">
                                            {adviceFields.map((field, index) => {
                                                if (field.advice_type === "Lab Test") return null;
                                                return (
                                                    <div key={field.id} className="flex items-center gap-2 group/advice">
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
        </div>
    );
}
