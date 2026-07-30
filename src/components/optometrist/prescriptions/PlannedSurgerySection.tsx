"use client";

import React, { useState, useEffect } from "react";
import { Scissors, Calendar, Plus, Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle, Eye, MapPin, Sparkles, CheckCircle2, Flame } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { surgeriesApi } from "@/services/surgeriesApi";
import { anatomySitesApi } from "@/services/anatomySitesApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { handleError } from "@/utils/errorHandler";
import { getTodayDateLocal } from "@/utils/format";
import type { Surgery, PlannedSurgery, AnatomySite, PlannedSurgeryUrgency } from "@/types";

interface PlannedSurgerySectionProps {
    patientId: string;
    surgeonId: string;
    visitId: string;
    onSurgeryUpdated?: () => void;
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
    onSurgeryUpdated,
}: PlannedSurgerySectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [surgeries, setSurgeries] = useState<Surgery[]>([]);
    const [anatomySites, setAnatomySites] = useState<AnatomySite[]>([]);
    const [loadingSurgeries, setLoadingSurgeries] = useState(false);
    const [plannedSurgeries, setPlannedSurgeries] = useState<PlannedSurgery[]>([]);
    const [loadingPlanned, setLoadingPlanned] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const minDate = getTodayDateLocal();

    // Form state
    const [selectedSurgeryId, setSelectedSurgeryId] = useState("");
    const [selectedSurgeryName, setSelectedSurgeryName] = useState("");
    const [selectedAnatomySiteId, setSelectedAnatomySiteId] = useState("");
    const [selectedEye, setSelectedEye] = useState<EyeType>("OD");
    const [urgency, setUrgency] = useState<PlannedSurgeryUrgency>("elective");
    const [plannedDate, setPlannedDate] = useState("");
    const [advisedDate, setAdvisedDate] = useState(getTodayDateLocal());
    const [notes, setNotes] = useState("");

    // Load surgeries master list & anatomy sites
    useEffect(() => {
        const loadMasterData = async () => {
            setLoadingSurgeries(true);
            try {
                const [surgeriesRes, sitesRes] = await Promise.all([
                    surgeriesApi.list({ is_active: true, page_size: 100 }),
                    anatomySitesApi.list({ is_active_only: true }),
                ]);
                setSurgeries(surgeriesRes.items);
                setAnatomySites(sitesRes);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to load surgeries and anatomy sites", logError: true });
            } finally {
                setLoadingSurgeries(false);
            }
        };
        if (isExpanded && (surgeries.length === 0 || anatomySites.length === 0)) {
            loadMasterData();
        }
    }, [isExpanded, surgeries.length, anatomySites.length]);

    // Load patient's planned surgeries
    useEffect(() => {
        const loadPlannedSurgeries = async () => {
            setLoadingPlanned(true);
            try {
                const response = await plannedSurgeriesApi.list({ patient_id: patientId });
                setPlannedSurgeries(response.items);
            } catch (error) {
                console.warn("Planned surgeries API issue:", error);
                setPlannedSurgeries([]);
            } finally {
                setLoadingPlanned(false);
            }
        };
        if (isExpanded) {
            loadPlannedSurgeries();
        }
    }, [isExpanded, patientId]);

    const selectedSurgery = surgeries.find((s) => s.id === selectedSurgeryId);
    const isAnatomySpecific = selectedSurgery?.is_anatomy_specific ?? true;
    const applicableSiteIds = selectedSurgery?.applicable_anatomy_site_ids || [];

    // Filter anatomy sites based on surgery configuration
    const filteredAnatomySites = selectedSurgery && isAnatomySpecific && applicableSiteIds.length > 0
        ? anatomySites.filter((site) => applicableSiteIds.includes(site.id))
        : anatomySites;

    const handleSurgeryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const surgeryId = e.target.value;
        setSelectedSurgeryId(surgeryId);
        const surgery = surgeries.find(s => s.id === surgeryId);
        setSelectedSurgeryName(surgery?.name || "");

        if (surgery) {
            // Pre-select default anatomy site if configured
            if (surgery.default_anatomy_site_id) {
                setSelectedAnatomySiteId(surgery.default_anatomy_site_id);
                const defaultSite = anatomySites.find((a) => a.id === surgery.default_anatomy_site_id);
                if (defaultSite && (defaultSite.short_code === "OD" || defaultSite.short_code === "OS" || defaultSite.short_code === "OU")) {
                    setSelectedEye(defaultSite.short_code as EyeType);
                }
            } else {
                setSelectedAnatomySiteId("");
            }
        } else {
            setSelectedAnatomySiteId("");
        }
    };

    const handleAnatomySiteSelect = (siteId: string) => {
        setSelectedAnatomySiteId(siteId);
        const site = anatomySites.find((a) => a.id === siteId);
        if (site && (site.short_code === "OD" || site.short_code === "OS" || site.short_code === "OU")) {
            setSelectedEye(site.short_code as EyeType);
        }
    };

    const handleAddSurgery = async () => {
        if (!selectedSurgeryId) {
            toast.error("Please select a surgery");
            return;
        }

        const selectedSurgeryRecord = surgeries.find((s) => s.id === selectedSurgeryId);
        if (selectedSurgeryRecord?.is_anatomy_specific && !selectedAnatomySiteId) {
            toast.error("Please select an anatomy site for this surgery");
            return;
        }

        setIsSubmitting(true);
        try {
            const newSurgery = await plannedSurgeriesApi.create({
                patient_id: patientId,
                visit_id: visitId || null,
                surgery_id: selectedSurgeryId,
                surgery_name: selectedSurgeryName,
                anatomy_site_id: selectedAnatomySiteId || null,
                eye: selectedEye,
                urgency: urgency,
                planned_date: plannedDate || null,
                advised_date: advisedDate || getTodayDateLocal(),
                surgeon_id: surgeonId,
                notes: notes || null,
            });
            setPlannedSurgeries(prev => [...prev, newSurgery]);
            toast.success("Surgery planned successfully");
            onSurgeryUpdated?.();

            // Reset form
            setSelectedSurgeryId("");
            setSelectedSurgeryName("");
            setSelectedAnatomySiteId("");
            setSelectedEye("OD");
            setUrgency("elective");
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
            onSurgeryUpdated?.();
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
                                Scheduled & Advised Surgeries
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
                                                <div className="flex items-center gap-2">
                                                     <p className="text-sm font-semibold text-slate-900">{surgery.surgery_name}</p>
                                                     {(() => {
                                                         switch (surgery.status) {
                                                             case "completed":
                                                                 return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">Completed</span>;
                                                             case "confirmed":
                                                             case "scheduled":
                                                                 return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 uppercase tracking-wider">{surgery.status}</span>;
                                                             case "postponed":
                                                                 return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">Postponed</span>;
                                                             case "cancelled":
                                                             case "cancelled_by_patient":
                                                             case "cancelled_by_hospital":
                                                                 return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 uppercase tracking-wider">Cancelled</span>;
                                                             default:
                                                                 return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 uppercase tracking-wider">Advised</span>;
                                                         }
                                                     })()}
                                                 </div>
                                                 <div className="flex items-center gap-2 mt-1">
                                                    {surgery.anatomy_site_name ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                                                            <MapPin className="h-3 w-3" />
                                                            {surgery.anatomy_site_name} ({surgery.anatomy_site_short_code || surgery.eye})
                                                        </span>
                                                    ) : (
                                                        <span className={clsx(
                                                            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border",
                                                            getEyeBadgeColor(surgery.eye)
                                                        )}>
                                                            {surgery.eye}
                                                        </span>
                                                    )}
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
                    <div className="space-y-3.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Plan New Surgery
                        </label>

                        {/* Surgery Selection */}
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Select Surgery</label>
                            <select
                                value={selectedSurgeryId}
                                onChange={handleSurgeryChange}
                                disabled={loadingSurgeries}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                            >
                                <option value="">Select procedure...</option>
                                {surgeries.map((surgery) => (
                                    <option key={surgery.id} value={surgery.id}>
                                        {surgery.name} {surgery.category ? `(${surgery.category})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Anatomy Site / Location - Streamlined Quick Select */}
                        {selectedSurgery ? (
                            filteredAnatomySites.length > 0 ? (
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 font-semibold">
                                            <MapPin className="h-3.5 w-3.5 text-sky-600" />
                                            Anatomy Location {isAnatomySpecific && <span className="text-amber-600 font-bold">*</span>}
                                        </span>
                                        <span className="text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-medium border border-sky-100">
                                            Configured for {selectedSurgery.name}
                                        </span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredAnatomySites.map((site) => {
                                            const isSelected = selectedAnatomySiteId === site.id;
                                            return (
                                                <button
                                                    key={site.id}
                                                    type="button"
                                                    onClick={() => handleAnatomySiteSelect(site.id)}
                                                    className={clsx(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-2xs",
                                                        isSelected
                                                            ? "bg-sky-600 text-white border-sky-600 ring-2 ring-sky-200"
                                                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-300"
                                                    )}
                                                >
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {site.name} ({site.short_code})
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                                        <Eye className="h-3.5 w-3.5 text-blue-600" /> Eye Designation
                                    </label>
                                    <div className="flex gap-2">
                                        {eyeOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedEye(option.value);
                                                    setSelectedAnatomySiteId("");
                                                }}
                                                className={clsx(
                                                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition cursor-pointer",
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
                            )
                        ) : null}

                        {/* Urgency Level Selection */}
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                                <Flame className="h-3.5 w-3.5 text-amber-500" /> Urgency Level
                            </label>
                            <div className="flex gap-2">
                                {[
                                    { value: "elective", label: "Elective", desc: "Routine", color: "bg-emerald-600 text-white border-emerald-600" },
                                    { value: "urgent", label: "Urgent", desc: "Priority", color: "bg-amber-600 text-white border-amber-600" },
                                    { value: "emergency", label: "Emergency", desc: "Immediate", color: "bg-rose-600 text-white border-rose-600 animate-pulse" },
                                ].map((item) => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => setUrgency(item.value as any)}
                                        className={clsx(
                                            "flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg border text-xs font-semibold transition cursor-pointer",
                                            urgency === item.value
                                                ? item.color
                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                        )}
                                    >
                                        <span>{item.label}</span>
                                        <span className="text-[10px] font-normal opacity-80">{item.desc}</span>
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
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer shadow-sm"
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
