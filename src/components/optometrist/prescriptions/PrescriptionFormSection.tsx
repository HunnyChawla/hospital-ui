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
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { optometryPrescriptionApi } from "@/services/optometryPrescriptionApi";
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
            medicine_id: medicine?.id || "",
            medicine_name: medicine?.name || "",
            generic_name: medicine?.generic_name || "",
            dosage: "",
            frequency: "",
            duration: "",
            instructions: "",
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

    const processSubmit = async (data: FormData, print: boolean) => {
        setIsSubmitting(true);
        if (print) setShouldPrint(true);

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
                    coatings: data.coatings.length > 0 ? data.coatings : null,
                    medicine_items: sanitizedMedicines,
                    advice_items: data.advice_items.length > 0 ? data.advice_items : undefined,
                });
                toast.success("Prescription updated successfully");
            } else {
                result = await optometryPrescriptionApi.create({
                    patient_id: patientId,
                    optometrist_id: optometristId,
                    visit_id: visitId,
                    doctor_id: doctorId,
                    diagnosis: data.diagnosis || null,
                    notes: null,
                    items: items.length > 0 ? items : undefined,
                    followup_date: data.followup_date || null,
                    plan_of_action: data.plan_of_action || null,
                    remarks: data.remarks || null,
                    lens_type: data.lens_type || null,
                    vision_type: data.vision_type || null,
                    lens_material: data.lens_material || null,
                    coatings: data.coatings.length > 0 ? data.coatings : null,
                    medicine_items: sanitizedMedicines,
                    advice_items: data.advice_items.length > 0 ? data.advice_items : undefined,
                });
                toast.success("Prescription created successfully");
            }

            setSavedPrescription(result);

            if (!print) {
                onPrescriptionCreated?.();
                onClose();
            } else {
                setIsSubmitting(false);
            }
        } catch (error) {
            setShouldPrint(false);
            handleError(error, {
                defaultMessage: "Failed to save prescription",
                logError: true,
            });
            setIsSubmitting(false);
        }
    };

    const onSave = (data: FormData) => processSubmit(data, false);
    const onSaveAndPrint = (data: FormData) => processSubmit(data, true);

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
                                items: (savedPrescription.items && savedPrescription.items.length > 0)
                                    ? savedPrescription.items
                                    : getRefractionItems()
                            }}
                            showHeader={printWithHeader}
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

                {/* Quick Diagnosis Section */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Stethoscope className="h-4 w-4 text-sky-500" />
                        Quick Diagnosis
                        <span className="text-xs font-normal text-slate-400">(click to add)</span>
                    </label>
                    <DiagnosisChips
                        options={QUICK_DIAGNOSES}
                        selected={selectedDiagnoses}
                        onToggle={handleDiagnosisToggle}
                    />
                    {selectedDiagnoses.length > 0 && (
                        <div className="pt-1">
                            <SelectedDiagnoses
                                diagnoses={selectedDiagnoses}
                                onRemove={handleDiagnosisToggle}
                            />
                        </div>
                    )}
                    <textarea
                        {...register("diagnosis")}
                        rows={1}
                        placeholder="Additional diagnosis notes..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20 resize-none"
                    />
                </div>

                {/* Quick Medicines Section */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Droplets className="h-4 w-4 text-purple-500" />
                        Quick Medicines
                        <span className="text-xs font-normal text-slate-400">(click to add)</span>
                    </label>
                    <MedicineQuickChips
                        options={QUICK_MEDICINES}
                        onAdd={handleQuickMedicineAdd}
                    />
                </div>

                {/* Added Medicines List */}
                {medicineFields.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Pill className="h-4 w-4 text-purple-500" />
                                Added Medicines ({medicineFields.length})
                            </label>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {medicineFields.map((field, index) => (
                                <div key={field.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1 space-y-2">
                                            {/* Hidden fields for IDs */}
                                            <input
                                                type="hidden"
                                                {...register(`medicine_items.${index}.medicine_id`)}
                                            />
                                            <input
                                                type="hidden"
                                                {...register(`medicine_items.${index}.generic_name`)}
                                            />
                                            <input
                                                type="hidden"
                                                {...register(`medicine_items.${index}.dosage`)}
                                            />
                                            <input
                                                {...register(`medicine_items.${index}.medicine_name`)}
                                                placeholder="Medicine name"
                                                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm font-medium focus:border-sky-500 focus:outline-none"
                                            />
                                            <div className="grid grid-cols-3 gap-2">
                                                <select
                                                    {...register(`medicine_items.${index}.frequency`)}
                                                    className="rounded border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                                                >
                                                    <option value="">Frequency...</option>
                                                    {FREQUENCIES.map((f) => (
                                                        <option key={f} value={f}>{f}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    {...register(`medicine_items.${index}.duration`)}
                                                    className="rounded border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                                                >
                                                    <option value="">Duration...</option>
                                                    {DURATIONS.map((d) => (
                                                        <option key={d} value={d}>{d}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    {...register(`medicine_items.${index}.instructions`)}
                                                    placeholder="Instructions"
                                                    className="rounded border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeMedicine(index)}
                                            className="p-1 text-rose-500 hover:bg-rose-50 rounded transition"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Medicine Search (Compact) */}
                <div className="relative">
                    <input
                        type="text"
                        value={medicineSearchQuery}
                        onChange={(e) => setMedicineSearchQuery(e.target.value)}
                        placeholder="🔍 Search medicines to add..."
                        className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none bg-slate-50"
                    />
                    {searchingMedicines && (
                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                    )}
                    {medicineSearchResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-32 overflow-y-auto">
                            {medicineSearchResults.map((med) => (
                                <button
                                    key={med.id}
                                    type="button"
                                    onClick={() => handleAddMedicine(med)}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-sky-50 border-b border-slate-100 last:border-0"
                                >
                                    <p className="font-medium text-slate-900">{med.name}</p>
                                    {med.generic_name && (
                                        <p className="text-xs text-slate-500">{med.generic_name}</p>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Follow-up Section */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Calendar className="h-4 w-4 text-emerald-500" />
                        Follow-up
                    </label>
                    <FollowupQuickChips
                        options={QUICK_FOLLOWUPS}
                        selectedDays={selectedFollowupDays}
                        onSelect={handleFollowupSelect}
                        onCustom={() => {
                            setShowCustomDate(true);
                            setSelectedFollowupDays(null);
                        }}
                    />
                    {showCustomDate && (
                        <input
                            type="date"
                            {...register("followup_date")}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                        />
                    )}
                </div>

                {/* Quick Advice/Tests Section */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Advice / Tests
                        <span className="text-xs font-normal text-slate-400">(click to add)</span>
                    </label>
                    <AdviceQuickChips
                        options={QUICK_ADVICE}
                        addedIds={addedAdviceIds}
                        onAdd={handleQuickAdviceAdd}
                    />
                    {adviceFields.length > 0 && (
                        <div className="space-y-1 mt-2">
                            {adviceFields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1">
                                    <input
                                        {...register(`advice_items.${index}.description`)}
                                        className="flex-1 bg-transparent text-sm focus:outline-none"
                                        placeholder="Description"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            removeAdvice(index);
                                            // Find and remove from addedIds
                                            const description = adviceFields[index]?.description;
                                            const match = QUICK_ADVICE.find(qa => qa.advice.description === description);
                                            if (match) {
                                                setAddedAdviceIds(prev => prev.filter(id => id !== match.id));
                                            }
                                        }}
                                        className="p-0.5 text-rose-500 hover:bg-rose-100 rounded"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Dilation Toggle */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50">
                    <Droplets className="h-5 w-5 text-orange-500" />
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                            type="checkbox"
                            {...register("dilation_required")}
                            className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Start Dilation</span>
                    </label>
                </div>

                {/* Plan of Action */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Plan of Action
                    </label>
                    <textarea
                        {...register("plan_of_action")}
                        rows={2}
                        placeholder="Treatment plan and next steps..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none resize-none"
                    />
                </div>

                {/* Collapsible Optical Details */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowOpticalDetails(!showOpticalDetails)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition"
                    >
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Eye className="h-4 w-4 text-sky-500" />
                            Optical Details (Lens, Coatings)
                        </span>
                        {showOpticalDetails ? (
                            <ChevronUp className="h-4 w-4 text-slate-500" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                        )}
                    </button>
                    {showOpticalDetails && (
                        <div className="p-4 space-y-3 bg-white border-t border-slate-200">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Lens Type</label>
                                    <select
                                        {...register("lens_type")}
                                        className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                                    >
                                        <option value="">Select...</option>
                                        {LENS_TYPES.map((lt) => (
                                            <option key={lt} value={lt}>{lt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Vision Type</label>
                                    <select
                                        {...register("vision_type")}
                                        className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                                    >
                                        <option value="">Select...</option>
                                        {VISION_TYPES.map((vt) => (
                                            <option key={vt} value={vt}>{vt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Lens Material</label>
                                <select
                                    {...register("lens_material")}
                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                                >
                                    <option value="">Select...</option>
                                    {LENS_MATERIALS.map((lm) => (
                                        <option key={lm} value={lm}>{lm}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Coatings</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {COATINGS.map((coating) => (
                                        <button
                                            key={coating}
                                            type="button"
                                            onClick={() => handleToggleCoating(coating)}
                                            className={clsx(
                                                "px-2 py-1 rounded-full text-xs font-medium transition",
                                                selectedCoatings?.includes(coating)
                                                    ? "bg-sky-500 text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            )}
                                        >
                                            {coating}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Remarks */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Remarks / Notes
                    </label>
                    <textarea
                        {...register("remarks")}
                        rows={2}
                        placeholder="Additional notes..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none resize-none"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-3 border-t border-slate-200">
                    {/* Print Header Toggle */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={printWithHeader}
                                onChange={(e) => setPrintWithHeader(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <span className="text-xs text-slate-600">
                                Print with hospital header
                            </span>
                        </label>
                    </div>

                    {/* Buttons Row */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowSaveTemplateModal(true)}
                            className="flex items-center gap-1.5 px-3 py-2 border border-purple-300 text-purple-700 font-medium rounded-lg hover:bg-purple-50 transition text-sm"
                        >
                            Save as Template
                        </button>

                        <div className="flex-1" />

                        {savedPrescription && (
                            <button
                                type="button"
                                onClick={() => setShouldPrint(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition text-sm"
                            >
                                <Printer className="h-4 w-4" />
                                Print
                            </button>
                        )}

                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSubmit(onSaveAndPrint)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm"
                        >
                            <Printer className="h-4 w-4" />
                            Save & Print
                        </button>

                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSubmit(onSave)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-lg hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 transition text-sm shadow-md"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4" />
                                    Save
                                </>
                            )}
                        </button>
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
        </div>
    );
}
