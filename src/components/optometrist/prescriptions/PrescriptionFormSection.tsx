"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
    Pill,
    Plus,
    Trash2,
    Calendar,
    Save,
    Printer,
    CheckCircle,
    AlertCircle,
    Eye,
    Droplets,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { optometryPrescriptionApi } from "@/services/optometryPrescriptionApi";
import { medicinesApi } from "@/services/medicinesApi";
import { handleError } from "@/utils/errorHandler";
import { useReactToPrint } from "react-to-print";
import { DoctorPrescriptionPrint } from "./DoctorPrescriptionPrint";
import type { MedicineItem, AdviceItem, OptometryPrescription } from "@/types";

interface PrescriptionFormSectionProps {
    patientId: string;
    visitId: string;
    optometristId: string;
    doctorId: string;
    doctorName?: string;
    onClose: () => void;
    onPrescriptionCreated?: () => void;
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
}: PrescriptionFormSectionProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [medicineSearchQuery, setMedicineSearchQuery] = useState("");
    const [medicineSearchResults, setMedicineSearchResults] = useState<any[]>([]);
    const [searchingMedicines, setSearchingMedicines] = useState(false);
    const [savedPrescription, setSavedPrescription] = useState<OptometryPrescription | null>(null);
    const [shouldPrint, setShouldPrint] = useState(false);
    const [printWithHeader, setPrintWithHeader] = useState(true);
    const printRef = React.useRef<HTMLDivElement>(null);

    // Setup print handler
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Prescription-${patientId}-${visitId}`,
        onAfterPrint: () => {
            onPrescriptionCreated?.();
            onClose();
        },
    });

    // Effect to trigger print after save
    useEffect(() => {
        if (savedPrescription && shouldPrint) {
            // Small delay to ensure render
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

    const processSubmit = async (data: FormData, print: boolean) => {
        setIsSubmitting(true);
        if (print) setShouldPrint(true);

        try {
            let result;

            if (savedPrescription?.id) {
                // Update existing prescription
                result = await optometryPrescriptionApi.update(savedPrescription.id, {
                    diagnosis: data.diagnosis || null,
                    notes: null,
                    followup_date: data.followup_date || null,
                    plan_of_action: data.plan_of_action || null,
                    remarks: data.remarks || null,
                    lens_type: data.lens_type || null,
                    vision_type: data.vision_type || null,
                    lens_material: data.lens_material || null,
                    coatings: data.coatings.length > 0 ? data.coatings : null,
                    medicine_items: data.medicine_items.length > 0 ? data.medicine_items : undefined,
                    advice_items: data.advice_items.length > 0 ? data.advice_items : undefined,
                });
                toast.success("Prescription updated successfully");
            } else {
                // Create new prescription
                result = await optometryPrescriptionApi.create({
                    patient_id: patientId,
                    optometrist_id: optometristId,
                    visit_id: visitId,
                    doctor_id: doctorId,
                    diagnosis: data.diagnosis || null,
                    notes: null,
                    followup_date: data.followup_date || null,
                    plan_of_action: data.plan_of_action || null,
                    remarks: data.remarks || null,
                    lens_type: data.lens_type || null,
                    vision_type: data.vision_type || null,
                    lens_material: data.lens_material || null,
                    coatings: data.coatings.length > 0 ? data.coatings : null,
                    medicine_items: data.medicine_items.length > 0 ? data.medicine_items : undefined,
                    advice_items: data.advice_items.length > 0 ? data.advice_items : undefined,
                });
                toast.success("Prescription created successfully");
            }

            setSavedPrescription(result);

            if (!print) {
                onPrescriptionCreated?.();
                onClose();
            }
            // If print is true, the effect will trigger handlePrint, which closes onAfterPrint
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
        <div className="p-6">
            {/* Hidden printable prescription - follows pattern from LabTechnicianPanel */}
            {savedPrescription && (
                <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
                    <div ref={printRef} className="print-content">
                        <DoctorPrescriptionPrint
                            prescription={savedPrescription}
                            showHeader={printWithHeader}
                        />
                    </div>
                </div>
            )}

            <form className="space-y-6">
                {/* Rx Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg">
                        <span className="text-xl font-bold text-white">Rx</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Prescription</h3>
                        <p className="text-sm text-slate-500">
                            Prescribed by: {doctorName || "Doctor"}
                        </p>
                    </div>
                </div>

                {/* Diagnosis */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Diagnosis
                    </label>
                    <textarea
                        {...register("diagnosis")}
                        rows={2}
                        placeholder="Enter diagnosis for Right Eye / Left Eye..."
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                </div>

                {/* Medicine Items */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Pill className="h-4 w-4 text-purple-500" />
                            Medicines
                        </label>
                        <button
                            type="button"
                            onClick={() => handleAddMedicine()}
                            className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Medicine
                        </button>
                    </div>

                    {/* Medicine Search */}
                    <div className="relative">
                        <input
                            type="text"
                            value={medicineSearchQuery}
                            onChange={(e) => setMedicineSearchQuery(e.target.value)}
                            placeholder="Search medicines..."
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                        {searchingMedicines && (
                            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                        )}
                        {medicineSearchResults.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                                {medicineSearchResults.map((med) => (
                                    <button
                                        key={med.id}
                                        type="button"
                                        onClick={() => handleAddMedicine(med)}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-sky-50 border-b border-slate-100 last:border-0"
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

                    {/* Medicine List */}
                    {medicineFields.map((field, index) => (
                        <div key={field.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <input
                                        {...register(`medicine_items.${index}.medicine_name`)}
                                        placeholder="Medicine name"
                                        className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm font-medium focus:border-sky-500 focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeMedicine(index)}
                                    className="ml-2 p-1 text-rose-500 hover:bg-rose-50 rounded"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Dosage</label>
                                    <input
                                        {...register(`medicine_items.${index}.dosage`)}
                                        placeholder="e.g., 1 drop"
                                        className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Frequency</label>
                                    <select
                                        {...register(`medicine_items.${index}.frequency`)}
                                        className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                                    >
                                        <option value="">Select...</option>
                                        {FREQUENCIES.map((f) => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Duration</label>
                                    <select
                                        {...register(`medicine_items.${index}.duration`)}
                                        className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                                    >
                                        <option value="">Select...</option>
                                        {DURATIONS.map((d) => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <input
                                {...register(`medicine_items.${index}.instructions`)}
                                placeholder="Special instructions (e.g., Both Eyes, After meals)"
                                className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                            />
                        </div>
                    ))}
                </div>

                {/* Advice Items */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            Advice / Tests
                        </label>
                        <button
                            type="button"
                            onClick={() => appendAdvice({ advice_type: "", description: "", notes: "" })}
                            className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Advice
                        </button>
                    </div>

                    {adviceFields.map((field, index) => (
                        <div key={field.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    {...register(`advice_items.${index}.advice_type`)}
                                    placeholder="Type (e.g., Test, Advice)"
                                    className="flex-1 rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeAdvice(index)}
                                    className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            <input
                                {...register(`advice_items.${index}.description`)}
                                placeholder="Description"
                                className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                            />
                        </div>
                    ))}
                </div>

                {/* Dilation */}
                <div className="flex items-center gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50">
                    <Droplets className="h-5 w-5 text-orange-500" />
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            {...register("dilation_required")}
                            className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Start Dilation</span>
                    </label>
                </div>

                {/* Follow-up Date */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                        <Calendar className="h-4 w-4 text-sky-500" />
                        Follow-up Date
                    </label>
                    <input
                        type="date"
                        {...register("followup_date")}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                </div>

                {/* Plan of Action */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Plan of Action
                    </label>
                    <textarea
                        {...register("plan_of_action")}
                        rows={2}
                        placeholder="Treatment plan and next steps..."
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                </div>

                {/* Remarks */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Remarks
                    </label>
                    <textarea
                        {...register("remarks")}
                        rows={2}
                        placeholder="Additional notes or remarks..."
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                </div>

                {/* Optical Details */}
                <div className="space-y-4 p-4 rounded-xl border border-sky-200 bg-sky-50">
                    <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-sky-600" />
                        <h4 className="font-semibold text-slate-900">Optical Prescription (Optional)</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Lens Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Lens Type</label>
                            <select
                                {...register("lens_type")}
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            >
                                <option value="">Select lens type</option>
                                {LENS_TYPES.map((lt) => (
                                    <option key={lt} value={lt}>{lt}</option>
                                ))}
                            </select>
                        </div>

                        {/* Vision Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Vision Type</label>
                            <select
                                {...register("vision_type")}
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            >
                                <option value="">Select vision type</option>
                                {VISION_TYPES.map((vt) => (
                                    <option key={vt} value={vt}>{vt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Lens Material */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Lens Material</label>
                        <select
                            {...register("lens_material")}
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        >
                            <option value="">Select lens material</option>
                            {LENS_MATERIALS.map((lm) => (
                                <option key={lm} value={lm}>{lm}</option>
                            ))}
                        </select>
                    </div>

                    {/* Coatings */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Coatings</label>
                        <div className="flex flex-wrap gap-2">
                            {COATINGS.map((coating) => (
                                <button
                                    key={coating}
                                    type="button"
                                    onClick={() => handleToggleCoating(coating)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedCoatings?.includes(coating)
                                        ? "bg-sky-500 text-white"
                                        : "bg-white border border-slate-200 text-slate-700 hover:border-sky-300"
                                        }`}
                                >
                                    {coating}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
                    {/* Print Header Toggle */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={printWithHeader}
                                onChange={(e) => setPrintWithHeader(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <span className="text-sm text-slate-600">
                                Print with hospital header
                            </span>
                        </label>
                        <span className="text-xs text-slate-400">
                            {printWithHeader ? "Header will be printed" : "Blank space for pre-printed letterhead"}
                        </span>
                    </div>

                    {/* Buttons Row */}
                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>

                        {savedPrescription && (
                            <button
                                type="button"
                                onClick={() => {
                                    setShouldPrint(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-800 font-medium rounded-lg shadow-sm hover:bg-slate-200 transition border border-slate-200"
                            >
                                <Printer className="h-4 w-4" />
                                Print
                            </button>
                        )}

                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSubmit(onSaveAndPrint)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            <Printer className="h-4 w-4" />
                            Save & Print
                        </button>

                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSubmit(onSave)}
                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium rounded-lg shadow-md hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 transition"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4" />
                                    Create Prescription
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
