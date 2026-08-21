"use client";

import React, { useState, useEffect } from "react";
import { X, Settings, Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
    quickPresetsApi,
    type QuickDiagnosis,
    type QuickMedicine,
    type QuickAdvice,
    type QuickLabTest
} from "@/services/quickPresetsApi";
import { DiagnosisPresetList } from "./DiagnosisPresetList";
import { MedicinePresetList } from "./MedicinePresetList";
import { AdvicePresetList } from "./AdvicePresetList";
import { LabTestPresetList } from "./LabTestPresetList";
import { QUICK_DIAGNOSES, QUICK_MEDICINES, QUICK_ADVICE } from "../prescriptionQuickActions";
import { usePrescriptionSettings } from "@/hooks/usePrescriptionSettings";
import type { FrequencyDisplayFormat } from "@/utils/frequencyDisplay";

interface QuickPresetsSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctorId: string;
    onSaved?: () => void; // Callback to refresh parent data
}

export function QuickPresetsSettingsModal({
    isOpen,
    onClose,
    doctorId,
    onSaved,
}: QuickPresetsSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<"diagnoses" | "medicines" | "advices" | "lab-tests" | "display">("diagnoses");
    const { frequencyFormat, setFrequencyFormat } = usePrescriptionSettings(doctorId);
    const [localFrequencyFormat, setLocalFrequencyFormat] = useState<FrequencyDisplayFormat>(frequencyFormat);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Data state
    const [diagnoses, setDiagnoses] = useState<QuickDiagnosis[]>([]);
    const [medicines, setMedicines] = useState<QuickMedicine[]>([]);
    const [advices, setAdvices] = useState<QuickAdvice[]>([]);
    const [labTests, setLabTests] = useState<QuickLabTest[]>([]);

    // Tracking dirty state to enable save button
    const [originalDiagnoses, setOriginalDiagnoses] = useState<string>("");
    const [originalMedicines, setOriginalMedicines] = useState<string>("");
    const [originalAdvices, setOriginalAdvices] = useState<string>("");
    const [originalLabTests, setOriginalLabTests] = useState<string>("");

    // Fetch data when modal opens
    useEffect(() => {
        if (isOpen && doctorId) {
            fetchPresets();
        }
    }, [isOpen, doctorId]);

    const fetchPresets = async () => {
        setLoading(true);
        try {
            const [fetchedDiagnoses, fetchedMedicines, fetchedAdvices, fetchedLabTests] = await Promise.all([
                quickPresetsApi.getDiagnoses(doctorId),
                quickPresetsApi.getMedicines(doctorId),
                quickPresetsApi.getAdvices(doctorId),
                quickPresetsApi.getLabTests(doctorId)
            ]);

            setDiagnoses(fetchedDiagnoses);
            setMedicines(fetchedMedicines);
            setAdvices(fetchedAdvices);
            setLabTests(fetchedLabTests);

            // Store stringified versions for dirty checking
            setOriginalDiagnoses(JSON.stringify(fetchedDiagnoses));
            setOriginalMedicines(JSON.stringify(fetchedMedicines));
            setOriginalAdvices(JSON.stringify(fetchedAdvices));
            setOriginalLabTests(JSON.stringify(fetchedLabTests));

        } catch (error) {
            console.error("Failed to load presets", error);
            toast.error("Failed to load presets");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const cleanList = <T extends { id?: string }>(list: T[]): T[] => {
                return list.map((item, index) => {
                    const cleaned = { ...item, position: index };
                    if (cleaned.id?.startsWith("new-")) {
                        delete cleaned.id;
                    }
                    return cleaned;
                });
            };

            const promises = [
                quickPresetsApi.updateDiagnoses(doctorId, cleanList(diagnoses)),
                quickPresetsApi.updateMedicines(doctorId, cleanList(medicines)),
                quickPresetsApi.updateAdvices(doctorId, cleanList(advices)),
                quickPresetsApi.updateLabTests(doctorId, cleanList(labTests)),
            ];

            await Promise.all(promises);

            if (localFrequencyFormat !== frequencyFormat) {
                setFrequencyFormat(localFrequencyFormat);
            }

            toast.success("Presets & Preferences updated successfully");
            onSaved?.(); // Refresh parent
            onClose();

        } catch (error) {
            console.error("Failed to save presets", error);
            toast.error("Failed to save presets");
        } finally {
            setSaving(false);
        }
    };

    const handleResetDefaults = () => {
        if (!confirm("This will replace your current custom list with the system defaults. Continue?")) return;

        if (activeTab === "diagnoses") {
            const defaultDiag: QuickDiagnosis[] = QUICK_DIAGNOSES.map((d) => ({
                id: `new-${Math.random().toString(36).substring(7)}`,
                label: d.label,
                value: d.value,
                category: d.category as any,
            }));
            setDiagnoses(defaultDiag);
        } else if (activeTab === "medicines") {
            const defaultMeds: QuickMedicine[] = QUICK_MEDICINES.map((m) => ({
                id: `new-${Math.random().toString(36).substring(7)}`,
                label: m.label,
                color: m.color as any,
                icon: m.icon as any,
                medicine_name: m.medicine.medicine_name,
                dosage: m.medicine.dosage,
                frequency: m.medicine.frequency,
                duration: m.medicine.duration,
                instructions: m.medicine.instructions,
                form: m.medicine.form,
                strength: m.medicine.strength,
                route: m.medicine.route,
                dose: m.medicine.dose || m.medicine.dosage,
                frequency_structure: m.medicine.frequency_structure as any,
                timing: m.medicine.timing,
                quantity: m.medicine.quantity,
                is_prn: m.medicine.is_prn,
                prn_reason: m.medicine.prn_reason,
                generic_name: m.medicine.generic_name,
                brand: m.medicine.brand,
                special_instructions: m.medicine.special_instructions,
                tapering_steps: m.medicine.tapering_steps ? JSON.parse(JSON.stringify(m.medicine.tapering_steps)) : undefined,
            }));
            setMedicines(defaultMeds);
        } else if (activeTab === "advices") {
            const defaultAdv: QuickAdvice[] = QUICK_ADVICE.map((a) => ({
                id: `new-${Math.random().toString(36).substring(7)}`,
                label: a.label,
                value: a.value,
                category: a.category,
            }));
            setAdvices(defaultAdv);
        } else if (activeTab === "lab-tests") {
            setLabTests([]); // No default lab tests for now
        } else if (activeTab === "display") {
            setLocalFrequencyFormat("numeric");
        }
    };

    // Check if any tab or preference is dirty
    const isAnyDirty = (JSON.stringify(diagnoses) !== originalDiagnoses) ||
        (JSON.stringify(medicines) !== originalMedicines) ||
        (JSON.stringify(advices) !== originalAdvices) ||
        (JSON.stringify(labTests) !== originalLabTests) ||
        (localFrequencyFormat !== frequencyFormat);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                            <Settings className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Prescription Presets & Preferences</h2>
                            <p className="text-sm text-slate-500">Customize chips, templates, and frequency display formats</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-52 flex-shrink-0 border-r border-slate-200 bg-slate-50 p-4 space-y-1.5">
                        <button
                            onClick={() => setActiveTab("diagnoses")}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === "diagnoses"
                                ? "bg-indigo-100 text-indigo-700 shadow-sm font-bold"
                                : "text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            Diagnoses
                        </button>
                        <button
                            onClick={() => setActiveTab("medicines")}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === "medicines"
                                ? "bg-indigo-100 text-indigo-700 shadow-sm font-bold"
                                : "text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            Medicines
                        </button>
                        <button
                            onClick={() => setActiveTab("advices")}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === "advices"
                                ? "bg-indigo-100 text-indigo-700 shadow-sm font-bold"
                                : "text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            Advices
                        </button>
                        <button
                            onClick={() => setActiveTab("lab-tests")}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === "lab-tests"
                                ? "bg-indigo-100 text-indigo-700 shadow-sm font-bold"
                                : "text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            Lab Tests
                        </button>
                        <div className="pt-2 border-t border-slate-200">
                            <button
                                onClick={() => setActiveTab("display")}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === "display"
                                    ? "bg-indigo-100 text-indigo-700 shadow-sm font-bold"
                                    : "text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                Display & Formats
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 scrollbar-hide">
                        {loading ? (
                            <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {activeTab === "diagnoses" ? "Diagnosis Chips" :
                                            activeTab === "medicines" ? "Medicine Templates" :
                                                activeTab === "lab-tests" ? "Lab Test Chips" :
                                                    activeTab === "advices" ? "Advice Chips" : "Display & Formatting Preferences"}
                                    </h3>
                                    <button
                                        onClick={handleResetDefaults}
                                        className="text-xs flex items-center gap-1.5 text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Reset to Defaults
                                    </button>
                                </div>

                                {activeTab === "diagnoses" ? (
                                    <DiagnosisPresetList
                                        items={diagnoses}
                                        onChange={setDiagnoses}
                                    />
                                ) : activeTab === "medicines" ? (
                                    <MedicinePresetList
                                        items={medicines}
                                        onChange={setMedicines}
                                    />
                                ) : activeTab === "advices" ? (
                                    <AdvicePresetList
                                        items={advices}
                                        onChange={setAdvices}
                                    />
                                ) : activeTab === "lab-tests" ? (
                                    <LabTestPresetList
                                        items={labTests}
                                        onChange={setLabTests}
                                    />
                                ) : (
                                    /* Display Preferences Tab */
                                    <div className="space-y-6">
                                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900">
                                                    Medication Frequency Display Format
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Select how you prefer medication dosing frequencies to appear on the prescription screen and printouts.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3">
                                                {/* Numeric Choice */}
                                                <label
                                                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                                        localFrequencyFormat === "numeric"
                                                            ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-100"
                                                            : "border-slate-200 bg-white hover:border-slate-300"
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="frequencyFormat"
                                                        value="numeric"
                                                        checked={localFrequencyFormat === "numeric"}
                                                        onChange={() => setLocalFrequencyFormat("numeric")}
                                                        className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-slate-900">
                                                                Numeric Slot Codes (e.g. 1-0-1, 1-1-1, 1-0-0)
                                                            </span>
                                                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                                                Standard Clinical
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 mt-1">
                                                            Shows concise numbers for Morning-Afternoon-Evening-Night slots.
                                                        </p>
                                                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                            {["1-0-1", "1-0-0", "1-1-1", "0-0-1", "1-1-1-1", "SOS"].map((pill) => (
                                                                <span
                                                                    key={pill}
                                                                    className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs"
                                                                >
                                                                    {pill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </label>

                                                {/* Descriptive Words Choice */}
                                                <label
                                                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                                        localFrequencyFormat === "descriptive"
                                                            ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-100"
                                                            : "border-slate-200 bg-white hover:border-slate-300"
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="frequencyFormat"
                                                        value="descriptive"
                                                        checked={localFrequencyFormat === "descriptive"}
                                                        onChange={() => setLocalFrequencyFormat("descriptive")}
                                                        className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-slate-900">
                                                                Descriptive Words (e.g. Twice daily, Three times a day)
                                                            </span>
                                                            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                                                Patient Friendly
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 mt-1">
                                                            Presents clear plain English dosing instructions.
                                                        </p>
                                                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                            {["Twice daily", "Morning only", "Three times a day", "Bedtime", "4x daily", "SOS"].map((pill) => (
                                                                <span
                                                                    key={pill}
                                                                    className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs"
                                                                >
                                                                    {pill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </label>

                                                {/* Both Choice */}
                                                <label
                                                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                                        localFrequencyFormat === "both"
                                                            ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-100"
                                                            : "border-slate-200 bg-white hover:border-slate-300"
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="frequencyFormat"
                                                        value="both"
                                                        checked={localFrequencyFormat === "both"}
                                                        onChange={() => setLocalFrequencyFormat("both")}
                                                        className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-slate-900">
                                                                Combined Notation (e.g. 1-0-1 (Twice daily))
                                                            </span>
                                                            <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                                                                Full Detail
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 mt-1">
                                                            Shows both numeric slot codes and descriptive text side-by-side.
                                                        </p>
                                                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                            {["1-0-1 (Twice daily)", "1-1-1 (Three times a day)", "0-0-1 (Bedtime)"].map((pill) => (
                                                                <span
                                                                    key={pill}
                                                                    className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs"
                                                                >
                                                                    {pill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-white">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !isAnyDirty}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition transform active:scale-95"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
