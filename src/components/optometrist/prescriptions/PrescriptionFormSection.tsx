"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
    Pill,
    Plus,
    Trash2,
    Calendar,
    Printer,
    CheckCircle,
    AlertCircle,
    Eye,
    Droplets,
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
import { prescriptionDataApi } from "@/services/prescriptionDataApi";
import { doctorsApi } from "@/services/doctorsApi";
import { medicinesApi } from "@/services/medicinesApi";
import { handleError } from "@/utils/errorHandler";
import { useReactToPrint } from "react-to-print";
import { DoctorPrescriptionPrint } from "./DoctorPrescriptionPrint";
import {
    DiagnosisChips,
    MedicineQuickChips,
    FollowupQuickChips,
    AdviceQuickChips,
    SelectedDiagnoses,
} from "./QuickSelectChips";
import {
    QUICK_DIAGNOSES,
    QUICK_MEDICINES,
    QUICK_FOLLOWUPS,
    QUICK_ADVICE,
    getFollowupDate,
} from "./prescriptionQuickActions";
import { SaveAsTemplateModal } from "./SaveAsTemplateModal";
import type { PrescriptionTemplate } from "@/services/prescriptionTemplatesApi";
import type { MedicineItem, AdviceItem, OptometryPrescription, OptometryPrescriptionItem } from "@/types";
import { QuickPresetsSettingsModal } from "./settings/QuickPresetsSettingsModal";
import { PlannedSurgerySection } from "./PlannedSurgerySection";
import { quickPresetsApi } from "@/services/quickPresetsApi";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";

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
    dilation_required: boolean;
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
}: PrescriptionFormSectionProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [medicineSearchQuery, setMedicineSearchQuery] = useState("");
    const [medicineSearchResults, setMedicineSearchResults] = useState<any[]>([]);

    // Dynamic presets state
    const [diagnosesOptions, setDiagnosesOptions] = useState<typeof QUICK_DIAGNOSES | any[]>(QUICK_DIAGNOSES);
    const [medicinesOptions, setMedicinesOptions] = useState<typeof QUICK_MEDICINES | any[]>(QUICK_MEDICINES);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const [searchingMedicines, setSearchingMedicines] = useState(false);
    const [savedPrescription, setSavedPrescription] = useState<OptometryPrescription | null>(null);
    const [shouldPrint, setShouldPrint] = useState(false);
    const [printWithHeader, setPrintWithHeader] = useState(true);
    const [showOpticalDetails, setShowOpticalDetails] = useState(false);
    const [showCustomDate, setShowCustomDate] = useState(false);
    const [selectedFollowupDays, setSelectedFollowupDays] = useState<number | null>(null);
    const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
    const [addedAdviceIds, setAddedAdviceIds] = useState<string[]>([]);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [doctorSignature, setDoctorSignature] = useState<string | null>(null);
    const [fullPrescriptionData, setFullPrescriptionData] = useState<PrescriptionDataResponse | null>(null);
    const printRef = React.useRef<HTMLDivElement>(null);

    // Setup print handler
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Prescription-${patientId}-${visitId}`,
    });

    // Effect to trigger print after save
    useEffect(() => {
        if (savedPrescription && shouldPrint) {
            setTimeout(() => {
                handlePrint();
                setShouldPrint(false);
            }, 500);
        }
    }, [savedPrescription, shouldPrint]); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePrintClick = async () => {
        if (!fullPrescriptionData) {
            setIsSubmitting(true);
            try {
                const data = await prescriptionDataApi.getPrescriptionData(patientId, visitId);
                setFullPrescriptionData(data);
            } catch (error) {
                console.error("Failed to fetch prescription data for print", error);
                toast.error("Failed to load print data");
            } finally {
                setIsSubmitting(false);
            }
        }
        setShouldPrint(true);
    };

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
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
            dilation_required: false,
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
                    if (existing.diagnosis) {
                        const diagList = existing.diagnosis.split(",").map((d: string) => d.trim()).filter(Boolean);
                        setSelectedDiagnoses(diagList);
                    }

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
                        dilation_required: false,
                        medicine_items: existing.medicine_items || [],
                        advice_items: existing.advice_items || [],
                    });

                    // Track added advice
                    if (existing.advice_items) {
                        const ids = existing.advice_items.map((a: AdviceItem) => {
                            const match = QUICK_ADVICE.find(qa => qa.advice.description === a.description);
                            return match?.id;
                        }).filter(Boolean) as string[];
                        setAddedAdviceIds(ids);
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

    const selectedCoatings = watch("coatings");
    const currentDiagnosis = watch("diagnosis");

    // Load dynamic presets and doctor signature
    useEffect(() => {
        if (doctorId) {
            const loadData = async () => {
                try {
                    const [dx, meds, docProfile] = await Promise.all([
                        quickPresetsApi.getDiagnoses(doctorId),
                        quickPresetsApi.getMedicines(doctorId),
                        doctorsApi.getById(doctorId)
                    ]);

                    if (docProfile?.signature) {
                        setDoctorSignature(docProfile.signature);
                    }

                    if (dx.length > 0) setDiagnosesOptions(dx);
                    if (meds.length > 0) {
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
                    }
                } catch (error) {
                    console.error("Failed to load doctor data", error);
                    // Silently fail to defaults
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

    // Handle diagnosis toggle
    const handleDiagnosisToggle = (value: string) => {
        setSelectedDiagnoses(prev => {
            const newList = prev.includes(value)
                ? prev.filter(d => d !== value)
                : [...prev, value];
            // Update form value
            setValue("diagnosis", newList.join(", "));
            return newList;
        });
    };

    // Handle quick medicine add
    const handleQuickMedicineAdd = (id: string) => {
        const template = QUICK_MEDICINES.find(m => m.id === id);
        if (template) {
            appendMedicine({
                medicine_id: "",
                ...template.medicine,
            });
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
        const template = QUICK_ADVICE.find(a => a.id === id);
        if (template) {
            appendAdvice(template.advice);
            setAddedAdviceIds(prev => [...prev, id]);
            toast.success(`Added ${template.label}`);
        }
    };

    const handleAddMedicine = (medicine?: any) => {
        appendMedicine({
            medicine_id: medicine?.id || medicine?.medicine_id || "",
            medicine_name: medicine?.name || medicine?.medicine_name || "",
            generic_name: medicine?.generic_name || "",
            dosage: medicine?.dosage || medicine?.default_dosage || "",
            frequency: medicine?.frequency || medicine?.default_frequency || "",
            duration: medicine?.duration || medicine?.default_duration || "",
            instructions: medicine?.instructions || medicine?.default_instructions || "",
        });
        setMedicineSearchQuery("");
        setMedicineSearchResults([]);
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
        setIsSubmitting(true);
        if (options.finalize) {
            if (!window.confirm("Are you sure you want to finalize this prescription? Once finalized cannot be updated.")) {
                setIsSubmitting(false);
                setShouldPrint(false);
                return;
            }
        }
        if (options.print) setShouldPrint(true);

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

            if (options.finalize) {
                toast.success("Prescription finalized successfully");
            } else {
                if (!options.print) {
                    toast.success("Prescription saved successfully");
                }
            }

            if (!options.print) {
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

    const onSaveDraft = (data: FormData) => processSubmit(data, { print: false, finalize: false });
    const onFinalize = (data: FormData) => processSubmit(data, { print: false, finalize: true });
    const onFinalizeAndPrint = (data: FormData) => processSubmit(data, { print: true, finalize: true });

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
            {/* Hidden printable prescription */}
            <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
                <div ref={printRef} className="print-content">
                    {savedPrescription && (
                        <DoctorPrescriptionPrint
                            prescription={{
                                ...savedPrescription,
                                doctor_name: savedPrescription.doctor_name || doctorName,
                                items: (savedPrescription.items && savedPrescription.items.length > 0)
                                    ? savedPrescription.items
                                    : getRefractionItems()
                            }}
                            showHeader={printWithHeader}
                            doctorSignature={doctorSignature}
                            visitData={fullPrescriptionData}
                        />
                    )}
                </div>
            </div>

            <form className="space-y-4">
                {/* Compact Rx Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 shadow-md">
                        <span className="text-lg font-bold text-white">Rx</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-900">Prescription</h3>
                        <p className="text-xs text-slate-500">By: {doctorName || "Doctor"}</p>
                    </div>
                    {/* Quick Summary Badge */}
                    {(summaryData.medicineCount > 0 || summaryData.hasDiagnosis) && (
                        <div className="flex items-center gap-2">
                            {summaryData.medicineCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                                    <Pill className="h-3 w-3" />
                                    {summaryData.medicineCount}
                                </span>
                            )}
                            {summaryData.hasFollowup && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                    <Calendar className="h-3 w-3" />
                                    {summaryData.followupLabel}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* CARD 1: Diagnosis */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden group/card hover:shadow-md transition-shadow duration-300">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 border border-sky-200 text-sky-600 shadow-sm">
                                    <Stethoscope className="h-5 w-5" />
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-800">Clinical Diagnosis</h3>
                                        <span className="text-xs font-semibold text-slate-400">1/5</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">Record patient conditions and symptoms</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSettingsModal(true)}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-white hover:text-sky-600 border border-transparent hover:border-sky-200 transition-all"
                                title="Configure Presets"
                            >
                                <Settings className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Quick Select */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Quick Select</p>
                            </div>
                            <DiagnosisChips
                                options={diagnosesOptions}
                                selected={selectedDiagnoses}
                                onToggle={handleDiagnosisToggle}
                            />
                        </div>

                        {/* Selected List */}
                        {selectedDiagnoses.length > 0 && (
                            <div className="rounded-lg bg-slate-50/80 p-4 border border-slate-100/60">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Selected Conditions</p>
                                <SelectedDiagnoses
                                    diagnoses={selectedDiagnoses}
                                    onRemove={handleDiagnosisToggle}
                                />
                            </div>
                        )}

                        {/* Full Diagnosis / Notes */}
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-2 block">
                                Detailed Diagnosis / Notes
                            </label>
                            <textarea
                                {...register("diagnosis")}
                                rows={2}
                                placeholder="Type specific diagnosis details here..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 resize-none transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </div>

                {/* CARD 2: Medicines */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden group/card hover:shadow-md transition-shadow duration-300">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 border border-purple-200 text-purple-600 shadow-sm">
                                    <Pill className="h-5 w-5" />
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-800">Medicines</h3>
                                        <span className="text-xs font-semibold text-slate-400">2/5</span>
                                        {medicineFields.length > 0 && (
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                                                {medicineFields.length}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">Prescribe medications and dosage instructions</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSettingsModal(true)}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-white hover:text-purple-600 border border-transparent hover:border-purple-200 transition-all"
                                title="Configure Presets"
                            >
                                <Settings className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="p-6 space-y-5">
                        {/* Search & Quick Add */}
                        <div className="space-y-3">
                            <div className="relative group/search">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-purple-500 transition-colors">
                                    {searchingMedicines ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Pill className="h-4 w-4" />
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={medicineSearchQuery}
                                    onChange={(e) => setMedicineSearchQuery(e.target.value)}
                                    placeholder="Search medicines (brand or generic)..."
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
                                />
                                {medicineSearchResults.length > 0 && (
                                    <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                                        <ul className="max-h-60 overflow-y-auto py-1">
                                            {medicineSearchResults.map((medicine) => (
                                                <li
                                                    key={medicine.id}
                                                    onClick={() => handleAddMedicine(medicine)}
                                                    className="cursor-pointer px-4 py-3 hover:bg-purple-50 transition-colors border-b border-slate-50 last:border-0"
                                                >
                                                    <div className="font-semibold text-slate-900 text-sm">{medicine.medicine_name}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{medicine.generic_name} • {medicine.default_dosage}</div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Quick Add</p>
                                <MedicineQuickChips
                                    options={medicinesOptions}
                                    onAdd={handleQuickMedicineAdd}
                                />
                            </div>
                        </div>

                        {/* Added Medicines List */}
                        <div className="space-y-3">
                            {medicineFields.map((field, index) => (
                                <div key={field.id} className="relative rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow group/item">
                                    <div className="absolute right-3 top-3 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={() => removeMedicine(index)}
                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="mb-3 pr-8">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                                                {index + 1}
                                            </span>
                                            <h4 className="font-bold text-slate-900 text-sm">{field.medicine_name}</h4>
                                        </div>
                                        {field.generic_name && (
                                            <p className="ml-7 text-xs text-slate-500">{field.generic_name}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 mb-1 block">Dosage</label>
                                            <input
                                                {...register(`medicine_items.${index}.dosage`)}
                                                placeholder="e.g. 500mg"
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 mb-1 block">Frequency</label>
                                            <div className="relative">
                                                <input
                                                    list={`freq-options-${index}`}
                                                    {...register(`medicine_items.${index}.frequency`)}
                                                    placeholder="e.g. 1-0-1"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
                                                />
                                                <datalist id={`freq-options-${index}`}>
                                                    {FREQUENCIES.map(f => <option key={f} value={f} />)}
                                                </datalist>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 mb-1 block">Duration</label>
                                            <div className="relative">
                                                <input
                                                    list={`dur-options-${index}`}
                                                    {...register(`medicine_items.${index}.duration`)}
                                                    placeholder="e.g. 5 days"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
                                                />
                                                <datalist id={`dur-options-${index}`}>
                                                    {DURATIONS.map(d => <option key={d} value={d} />)}
                                                </datalist>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 mb-1 block">Instructions</label>
                                            <input
                                                {...register(`medicine_items.${index}.instructions`)}
                                                placeholder="e.g. After food"
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
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
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden group/card hover:shadow-md transition-shadow duration-300">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-600 shadow-sm">
                                    <CheckCircle className="h-5 w-5" />
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-800">Treatment Plan</h3>
                                        <span className="text-xs font-semibold text-slate-400">3/5</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">Define care plan, advice, and procedures</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-5">
                        {/* Advice Section */}
                        <div>
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 block">Advice & Tests</label>
                            <AdviceQuickChips
                                options={QUICK_ADVICE}
                                addedIds={addedAdviceIds}
                                onAdd={handleQuickAdviceAdd}
                                className="mb-3"
                            />

                            {/* Added Advice List */}
                            {adviceFields.length > 0 && (
                                <div className="space-y-2 mt-3">
                                    {adviceFields.map((field, index) => (
                                        <div key={field.id} className="flex items-center gap-2 group/advice">
                                            <div className="flex-1">
                                                <input
                                                    {...register(`advice_items.${index}.description`)}
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    removeAdvice(index);
                                                    // Also remove from tracked IDs
                                                    const description = adviceFields[index]?.description;
                                                    const match = QUICK_ADVICE.find(qa => qa.advice.description === description);
                                                    if (match) {
                                                        setAddedAdviceIds(prev => prev.filter(id => id !== match.id));
                                                    }
                                                }}
                                                className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover/advice:opacity-100"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Dilation Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-lg border border-orange-100 bg-orange-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                                    <Droplets className="h-5 w-5" />
                                </div>
                                <div>
                                    <span className="font-bold text-slate-800 block text-sm">Dilated Examination</span>
                                    <span className="text-xs text-orange-600/80">Requires patient consent (approx. 30 mins)</span>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    {...register("dilation_required")}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
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
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden group/card hover:shadow-md transition-shadow duration-300">
                    <button
                        type="button"
                        onClick={() => setShowOpticalDetails(!showOpticalDetails)}
                        className="w-full border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-600 shadow-sm">
                                <Eye className="h-5 w-5" />
                            </span>
                            <div className="text-left">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-slate-800">Optical Details</h3>
                                    <span className="text-xs font-semibold text-slate-400">4/5</span>
                                    <span className="text-xs text-slate-400">(Optional)</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">Lens specifications and coatings</p>
                            </div>
                        </div>
                        {showOpticalDetails ? (
                            <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-slate-400" />
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
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden group/card hover:shadow-md transition-shadow duration-300">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-600 shadow-sm">
                                    <Calendar className="h-5 w-5" />
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-800">Follow-up & Remarks</h3>
                                        <span className="text-xs font-semibold text-slate-400">5/5</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">Schedule next visit and add notes</p>
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
                {/* Action Buttons */}
                <div className="flex flex-col gap-4 pt-4 border-t border-slate-200 mt-2">
                    {/* Print Header Toggle */}
                    <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={printWithHeader}
                                onChange={(e) => setPrintWithHeader(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 focus:ring-offset-0 transition-colors"
                            />
                            <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                                Print with hospital header
                            </span>
                        </label>
                    </div>

                    {/* Buttons Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowSaveTemplateModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 border border-purple-200 text-purple-700 font-medium rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all text-sm"
                        >
                            <Sparkles className="h-4 w-4" />
                            Save as Template
                        </button>

                        <div className="flex-1" />

                        {savedPrescription && (savedPrescription.status === 'finalized' ? (
                            <button
                                type="button"
                                onClick={handlePrintClick}
                                className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors shadow-md text-sm"
                            >
                                <Printer className="h-4 w-4" />
                                Print Prescription
                            </button>
                        ) : (
                            <>
                                {savedPrescription && (
                                    <button
                                        type="button"
                                        onClick={handlePrintClick}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors text-sm"
                                    >
                                        <Printer className="h-4 w-4" />
                                        Print
                                    </button>
                                )}

                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleSubmit(onSaveDraft)}
                                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    Save Draft
                                </button>

                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleSubmit(onFinalizeAndPrint)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
                                >
                                    <Printer className="h-4 w-4" />
                                    Finalize & Print
                                </button>

                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleSubmit(onFinalize)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-lg hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-md"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4" />
                                            Finalize Prescription
                                        </>
                                    )}
                                </button>
                            </>
                        ))}

                        {!savedPrescription && (
                            <>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleSubmit(onSaveDraft)}
                                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    Save Draft
                                </button>

                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleSubmit(onFinalizeAndPrint)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
                                >
                                    <Printer className="h-4 w-4" />
                                    Finalize & Print
                                </button>

                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleSubmit(onFinalize)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-lg hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-md"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4" />
                                            Finalize Prescription
                                        </>
                                    )}
                                </button>
                            </>
                        )}
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
                        // Reload presets
                        // We can just rely on the existing useEffect if we trigger a re-fetch, 
                        // but useEffect depends on doctorId which doesn't change.
                        // Better to extract the fetch logic or force reload.
                        // Let's just re-trigger by calling the API again here for simplicity
                        const reloadPresets = async () => {
                            try {
                                const [dx, meds] = await Promise.all([
                                    quickPresetsApi.getDiagnoses(doctorId),
                                    quickPresetsApi.getMedicines(doctorId)
                                ]);

                                if (dx.length > 0) setDiagnosesOptions(dx);
                                if (meds.length > 0) {
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
                                }
                            } catch (e) { console.error(e) }
                        };
                        reloadPresets();
                    }}
                />
            )}
        </div>
    );
}
