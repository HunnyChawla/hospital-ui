"use client";

import React, { useState, useEffect } from "react";
import { Scissors, Calendar, Plus, Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { surgeriesApi } from "@/services/surgeriesApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { handleError } from "@/utils/errorHandler";
import { getTodayDateLocal } from "@/utils/format";
import type { Surgery, PlannedSurgery } from "@/types";

interface PlannedSurgerySectionProps {
    patientId: string;
    surgeonId: string;
    visitId: string;
}

type EyeType = "OD" | "OS" | "OU";

const eyeOptions: { value: EyeType; label: string; fullLabel: string; color: string }[] = [
    { value: "OD", label: "OD", fullLabel: "Right Eye", color: "bg-blue-600 text-white border-blue-600" },
    { value: "OS", label: "OS", fullLabel: "Left Eye", color: "bg-green-600 text-white border-green-600" },
    { value: "OU", label: "OU", fullLabel: "Both Eyes", color: "bg-purple-600 text-white border-purple-600" },
];

export function PlannedSurgerySection({
    patientId,
    surgeonId,
    visitId,
}: PlannedSurgerySectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [surgeries, setSurgeries] = useState<Surgery[]>([]);
    const [loadingSurgeries, setLoadingSurgeries] = useState(false);
    const [plannedSurgeries, setPlannedSurgeries] = useState<PlannedSurgery[]>([]);
    const [loadingPlanned, setLoadingPlanned] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const minDate = getTodayDateLocal();

    // Form state
    const [selectedSurgeryId, setSelectedSurgeryId] = useState("");
    const [selectedSurgeryName, setSelectedSurgeryName] = useState("");
    const [selectedEye, setSelectedEye] = useState<EyeType>("OD");
    const [plannedDate, setPlannedDate] = useState("");
    const [advisedDate, setAdvisedDate] = useState(getTodayDateLocal());
    const [notes, setNotes] = useState("");

    // Load surgeries master list
    useEffect(() => {
        const loadSurgeries = async () => {
            setLoadingSurgeries(true);
            try {
                const response = await surgeriesApi.list({ is_active: true, page_size: 100 });
                setSurgeries(response.items);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to load surgeries", logError: true });
            } finally {
                setLoadingSurgeries(false);
            }
        };
        if (isExpanded && surgeries.length === 0) {
            loadSurgeries();
        }
    }, [isExpanded, surgeries.length]);

    // Load patient's planned surgeries
    useEffect(() => {
        const loadPlannedSurgeries = async () => {
            setLoadingPlanned(true);
            try {
                const response = await plannedSurgeriesApi.list({ patient_id: patientId, status: "scheduled" });
                setPlannedSurgeries(response.items);
            } catch (error) {
                // API might not exist yet - silently fail
                console.warn("Planned surgeries API not available:", error);
                setPlannedSurgeries([]);
            } finally {
                setLoadingPlanned(false);
            }
        };
        if (isExpanded) {
            loadPlannedSurgeries();
        }
    }, [isExpanded, patientId]);

    const handleSurgeryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const surgeryId = e.target.value;
        setSelectedSurgeryId(surgeryId);
        const surgery = surgeries.find(s => s.id === surgeryId);
        setSelectedSurgeryName(surgery?.name || "");
    };

    const handleAddSurgery = async () => {
        if (!selectedSurgeryId) {
            toast.error("Please select a surgery");
            return;
        }

        setIsSubmitting(true);
        try {
            const newSurgery = await plannedSurgeriesApi.create({
                patient_id: patientId,
                visit_id: visitId || null,
                surgery_id: selectedSurgeryId,
                surgery_name: selectedSurgeryName,
                eye: selectedEye,
                planned_date: plannedDate || null,
                advised_date: advisedDate || getTodayDateLocal(),
                surgeon_id: surgeonId,
                notes: notes || null,
            });
            setPlannedSurgeries(prev => [...prev, newSurgery]);
            toast.success("Surgery planned successfully");

            // Reset form
            setSelectedSurgeryId("");
            setSelectedSurgeryName("");
            setSelectedEye("OD");
            setPlannedDate("");
            setAdvisedDate(getTodayDateLocal());
            setNotes("");
        } catch (error) {
            handleError(error, { defaultMessage: "Failed to plan surgery", logError: true });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelSurgery = async (id: string) => {
        try {
            await plannedSurgeriesApi.cancel(id);
            setPlannedSurgeries(prev => prev.filter(s => s.id !== id));
            toast.success("Surgery cancelled");
        } catch (error) {
            handleError(error, { defaultMessage: "Failed to cancel surgery", logError: true });
        }
    };

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const getEyeLabel = (eye?: string | null) => {
        if (!eye) return "N/A";
        const option = eyeOptions.find(o => o.value === eye);
        return option?.fullLabel || eye;
    };

    const getEyeBadgeColor = (eye?: string | null) => {
        switch (eye) {
            case "OD": return "bg-blue-100 text-blue-700 border-blue-200";
            case "OS": return "bg-green-100 text-green-700 border-green-200";
            case "OU": return "bg-purple-100 text-purple-700 border-purple-200";
            default: return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 hover:bg-amber-100 transition"
            >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Scissors className="h-4 w-4 text-amber-600" />
                    Plan Surgery
                    {plannedSurgeries.length > 0 && (
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-600 text-white text-xs font-bold">
                            {plannedSurgeries.length}
                        </span>
                    )}
                </span>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
            </button>

            {isExpanded && (
                <div className="p-4 space-y-4 bg-white border-t border-slate-200">
                    {/* Planned Surgeries List */}
                    {loadingPlanned ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        </div>
                    ) : plannedSurgeries.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Scheduled Surgeries
                            </label>
                            <div className="space-y-2">
                                {plannedSurgeries.map((surgery) => (
                                    <div
                                        key={surgery.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Scissors className="h-4 w-4 text-amber-600" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{surgery.surgery_name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={clsx(
                                                        "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border",
                                                        getEyeBadgeColor(surgery.eye)
                                                    )}>
                                                        {surgery.eye}
                                                    </span>
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {surgery.planned_date
                                                            ? `Planned: ${formatDate(surgery.planned_date)}`
                                                            : `Advised: ${formatDate(surgery.advised_date || surgery.created_at)}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleCancelSurgery(surgery.id)}
                                            className="p-1.5 text-rose-500 hover:bg-rose-100 rounded transition"
                                            title="Cancel surgery"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add Surgery Form */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Plan New Surgery
                        </label>

                        {/* Surgery Selection */}
                        <div>
                            <select
                                value={selectedSurgeryId}
                                onChange={handleSurgeryChange}
                                disabled={loadingSurgeries}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                            >
                                <option value="">Select surgery...</option>
                                {surgeries.map((surgery) => (
                                    <option key={surgery.id} value={surgery.id}>
                                        {surgery.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Eye Selection */}
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Eye</label>
                            <div className="flex gap-2">
                                {eyeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setSelectedEye(option.value)}
                                        className={clsx(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition",
                                            selectedEye === option.value
                                                ? option.color
                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                        )}
                                        title={option.fullLabel}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Selection */}
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                Planned Date <span className="text-xs text-slate-400 font-normal">(optional)</span>
                            </label>
                            <input
                                type="date"
                                value={plannedDate}
                                onChange={(e) => setPlannedDate(e.target.value)}
                                min={minDate}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="Pre-operative instructions, special considerations..."
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 resize-none"
                            />
                        </div>

                        {/* Add Button */}
                        <button
                            type="button"
                            onClick={handleAddSurgery}
                            disabled={isSubmitting || !selectedSurgeryId}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    Add Planned Surgery
                                </>
                            )}
                        </button>
                    </div>

                    {/* Info Note */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-500">
                            Planned surgeries will be saved and can be viewed in the patient&apos;s surgery schedule.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
