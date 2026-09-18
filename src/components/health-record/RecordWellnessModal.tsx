"use client";

import React, { useState, useMemo } from "react";
import {
    Activity,
    HeartPulse,
    Thermometer,
    Wind,
    Scale,
    Ruler,
    X,
    Loader2,
    ShieldCheck,
    FileText,
} from "lucide-react";
import { useRecordWellness } from "@/hooks/queries/useHealthRecord";
import type { RecordWellnessPayload } from "@/services/healthRecordApi";

interface RecordWellnessModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
}

export function RecordWellnessModal({
    isOpen,
    onClose,
    patientId,
}: RecordWellnessModalProps) {
    const recordWellness = useRecordWellness(patientId);

    const [systolic, setSystolic] = useState<string>("");
    const [diastolic, setDiastolic] = useState<string>("");
    const [pulse, setPulse] = useState<string>("");
    const [temperature, setTemperature] = useState<string>("");
    const [spo2, setSpo2] = useState<string>("");
    const [respRate, setRespRate] = useState<string>("");
    const [height, setHeight] = useState<string>("");
    const [weight, setWeight] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    // Auto-calculate BMI
    const bmiCalculated = useMemo(() => {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        if (h > 0 && w > 0) {
            const hMeters = h / 100;
            const val = w / (hMeters * hMeters);
            let category = "Normal weight";
            let color = "bg-emerald-50 text-emerald-700 border-emerald-200";

            if (val < 18.5) {
                category = "Underweight";
                color = "bg-amber-50 text-amber-700 border-amber-200";
            } else if (val >= 25 && val < 30) {
                category = "Overweight";
                color = "bg-orange-50 text-orange-700 border-orange-200";
            } else if (val >= 30) {
                category = "Obese";
                color = "bg-rose-50 text-rose-700 border-rose-200";
            }

            return {
                value: val.toFixed(2),
                category,
                color,
            };
        }
        return null;
    }, [height, weight]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload: RecordWellnessPayload = {};
        if (systolic) payload.systolic_bp = parseInt(systolic, 10);
        if (diastolic) payload.diastolic_bp = parseInt(diastolic, 10);
        if (pulse) payload.pulse_rate = parseInt(pulse, 10);
        if (temperature) payload.temperature = parseFloat(temperature);
        if (spo2) payload.spo2 = parseFloat(spo2);
        if (respRate) payload.respiratory_rate = parseInt(respRate, 10);
        if (height) payload.height = parseFloat(height);
        if (weight) payload.weight = parseFloat(weight);
        if (bmiCalculated) payload.bmi = parseFloat(bmiCalculated.value);
        if (notes.trim()) payload.notes = notes.trim();

        // Ensure at least one vital was entered
        const hasData =
            payload.systolic_bp !== undefined ||
            payload.diastolic_bp !== undefined ||
            payload.pulse_rate !== undefined ||
            payload.temperature !== undefined ||
            payload.spo2 !== undefined ||
            payload.respiratory_rate !== undefined ||
            payload.height !== undefined ||
            payload.weight !== undefined ||
            payload.notes !== undefined;

        if (!hasData) {
            return;
        }

        try {
            await recordWellness.mutateAsync(payload);
            onClose();
            // Reset form
            setSystolic("");
            setDiastolic("");
            setPulse("");
            setTemperature("");
            setSpo2("");
            setRespRate("");
            setHeight("");
            setWeight("");
            setNotes("");
        } catch {
            // Error is handled in hook toast
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-teal-50/50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100/70 text-teal-700 shadow-sm">
                            <HeartPulse className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 id="modal-title" className="text-base font-semibold text-slate-900">
                                Record Vitals & Wellness
                            </h2>
                            <p className="text-xs text-slate-500">
                                Independent wellness encounter linked directly to ABDM
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={recordWellness.isPending}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* ABDM Informational Note */}
                    <div className="flex items-start gap-3 rounded-xl border border-teal-200/80 bg-teal-50/60 p-3.5 text-xs text-teal-900">
                        <ShieldCheck className="h-5 w-5 flex-shrink-0 text-teal-600 mt-0.5" />
                        <div>
                            <span className="font-semibold">ABDM Care Context Integration:</span>
                            <p className="mt-0.5 text-teal-800">
                                Saving creates a new standalone Care Context (<code className="font-mono text-[11px] bg-teal-100 px-1 py-0.5 rounded">WL-...</code>)
                                and generates an ABDM-compliant Wellness Record for instant sharing.
                            </p>
                        </div>
                    </div>

                    {/* Section 1: Cardiovascular & Vitals */}
                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5 text-teal-600" />
                            Cardiovascular & Vital Signs
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Blood Pressure Systolic */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Systolic BP (mmHg)
                                </label>
                                <input
                                    type="number"
                                    min={40}
                                    max={300}
                                    placeholder="e.g. 120"
                                    value={systolic}
                                    onChange={(e) => setSystolic(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            {/* Blood Pressure Diastolic */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Diastolic BP (mmHg)
                                </label>
                                <input
                                    type="number"
                                    min={20}
                                    max={200}
                                    placeholder="e.g. 80"
                                    value={diastolic}
                                    onChange={(e) => setDiastolic(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            {/* Pulse Rate */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Pulse / Heart Rate (bpm)
                                </label>
                                <input
                                    type="number"
                                    min={30}
                                    max={250}
                                    placeholder="e.g. 72"
                                    value={pulse}
                                    onChange={(e) => setPulse(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            {/* SpO2 */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Oxygen Saturation (SpO₂ %)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min={50}
                                    max={100}
                                    placeholder="e.g. 98"
                                    value={spo2}
                                    onChange={(e) => setSpo2(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            {/* Temperature */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                                    <Thermometer className="h-3 w-3 text-slate-400" />
                                    Temperature (°F)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min={90}
                                    max={110}
                                    placeholder="e.g. 98.6"
                                    value={temperature}
                                    onChange={(e) => setTemperature(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            {/* Respiratory Rate */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                                    <Wind className="h-3 w-3 text-slate-400" />
                                    Respiratory Rate (breaths/min)
                                </label>
                                <input
                                    type="number"
                                    min={8}
                                    max={60}
                                    placeholder="e.g. 16"
                                    value={respRate}
                                    onChange={(e) => setRespRate(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Physical Measurements & BMI */}
                    <div className="pt-2 border-t border-slate-100">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                            <Scale className="h-3.5 w-3.5 text-teal-600" />
                            Physical Measurements
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Height */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                                    <Ruler className="h-3 w-3 text-slate-400" />
                                    Height (cm)
                                </label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min={30}
                                    max={260}
                                    placeholder="e.g. 170"
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            {/* Weight */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                                    <Scale className="h-3 w-3 text-slate-400" />
                                    Weight (kg)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min={1}
                                    max={350}
                                    placeholder="e.g. 68.5"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* Calculated BMI Callout */}
                        {bmiCalculated && (
                            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5">
                                <span className="text-xs font-medium text-slate-600">
                                    Calculated Body Mass Index (BMI):
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-800">
                                        {bmiCalculated.value} kg/m²
                                    </span>
                                    <span
                                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${bmiCalculated.color}`}
                                    >
                                        {bmiCalculated.category}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Clinical Notes */}
                    <div className="pt-2 border-t border-slate-100">
                        <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                            <FileText className="h-3 w-3 text-slate-400" />
                            Clinical & Wellness Observations (Optional)
                        </label>
                        <textarea
                            rows={3}
                            placeholder="e.g. Patient asymptomatic, regular exercise reported, vitals stable."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={recordWellness.isPending}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={recordWellness.isPending}
                            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition disabled:opacity-50"
                        >
                            {recordWellness.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Saving & Linking...</span>
                                </>
                            ) : (
                                <>
                                    <HeartPulse className="h-4 w-4" />
                                    <span>Save & Link to ABDM</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
