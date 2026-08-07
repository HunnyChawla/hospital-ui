"use client";

import React, { useState, useEffect, useRef } from "react";
import { Scissors, Calendar, Plus, Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { surgeriesApi, SurgeryPrescriptionOption } from "@/services/surgeriesApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { handleError } from "@/utils/errorHandler";
import { getTodayDateLocal } from "@/utils/format";
import type { PlannedSurgery } from "@/types";
import { BodyPartPicker } from "@/components/planned-surgeries/BodyPartPicker";
import { BodyPartBadge } from "@/components/shared/BodyPartBadge";

interface PlannedSurgerySectionProps {
    patientId: string;
    surgeonId: string;
    visitId: string;
}

export function PlannedSurgerySection({
    patientId,
    surgeonId,
    visitId,
}: PlannedSurgerySectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [plannedSurgeries, setPlannedSurgeries] = useState<PlannedSurgery[]>([]);
    const [loadingPlanned, setLoadingPlanned] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const minDate = getTodayDateLocal();

    // Surgery-first search (doctor sees the full catalog first, then the
    // body part(s) applicable to whichever surgery they select - backend
    // search/pagination replaces the old page_size:100 "fetch and hope" that
    // silently truncated once the catalog grew past 100 rows).
    const [surgerySearch, setSurgerySearch] = useState("");
    const [surgeryResults, setSurgeryResults] = useState<SurgeryPrescriptionOption[]>([]);
    const [searchingSurgeries, setSearchingSurgeries] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedSurgery, setSelectedSurgery] = useState<SurgeryPrescriptionOption | null>(null);
    const searchBoxRef = useRef<HTMLDivElement>(null);

    const [selectedBodyPartId, setSelectedBodyPartId] = useState<string | null>(null);
    const [plannedDate, setPlannedDate] = useState("");
    const [advisedDate, setAdvisedDate] = useState(getTodayDateLocal());
    const [notes, setNotes] = useState("");

    // Debounced backend search against the metadata-light prescription-options endpoint
    useEffect(() => {
        if (!isExpanded) return;
        const handler = setTimeout(async () => {
            setSearchingSurgeries(true);
            try {
                const response = await surgeriesApi.listForPrescription({
                    search: surgerySearch.trim() || undefined,
                    page_size: 20,
                });
                setSurgeryResults(response.items);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to search surgeries", logError: true });
            } finally {
                setSearchingSurgeries(false);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [surgerySearch, isExpanded]);

    // Close the results dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load patient's planned surgeries
    useEffect(() => {
        const loadPlannedSurgeries = async () => {
            setLoadingPlanned(true);
            try {
                const response = await plannedSurgeriesApi.list({ visit_id: visitId });
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

    const handleSelectSurgery = (surgery: SurgeryPrescriptionOption) => {
        setSelectedSurgery(surgery);
        setSurgerySearch(surgery.name);
        setShowResults(false);
        // 0/1/2+ semantics: 1 body part auto-applies silently, 2+ needs a pick,
        // 0 means a general surgery with no body-part concept.
        setSelectedBodyPartId(surgery.body_parts.length === 1 ? surgery.body_parts[0].id : null);
    };

    const handleAddSurgery = async () => {
        if (!selectedSurgery) {
            toast.error("Please select a surgery");
            return;
        }
        if (selectedSurgery.body_parts.length > 1 && !selectedBodyPartId) {
            toast.error("Please select the applicable body part");
            return;
        }

        setIsSubmitting(true);
        try {
            const newSurgery = await plannedSurgeriesApi.create({
                patient_id: patientId,
                visit_id: visitId || null,
                surgery_id: selectedSurgery.id,
                surgery_name: selectedSurgery.name,
                body_part_id: selectedBodyPartId,
                planned_date: plannedDate || null,
                advised_date: advisedDate || getTodayDateLocal(),
                surgeon_id: surgeonId,
                notes: notes || null,
            });
            setPlannedSurgeries(prev => [...prev, newSurgery]);
            toast.success("Surgery planned successfully");

            // Reset form
            setSelectedSurgery(null);
            setSurgerySearch("");
            setSelectedBodyPartId(null);
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

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
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
                                                    <BodyPartBadge name={surgery.body_part_name} />
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

                        {/* Surgery Search (surgery-first: search the full catalog, then pick a body part) */}
                        <div className="relative" ref={searchBoxRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={surgerySearch}
                                    onChange={(e) => {
                                        setSurgerySearch(e.target.value);
                                        setSelectedSurgery(null);
                                        setShowResults(true);
                                    }}
                                    onFocus={() => setShowResults(true)}
                                    placeholder="Search surgeries..."
                                    className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                                />
                            </div>
                            {showResults && (
                                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                    {searchingSurgeries ? (
                                        <div className="flex items-center justify-center py-3">
                                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                        </div>
                                    ) : surgeryResults.length === 0 ? (
                                        <p className="px-3 py-2 text-xs text-slate-500">No surgeries found.</p>
                                    ) : (
                                        surgeryResults.map((surgery) => (
                                            <button
                                                key={surgery.id}
                                                type="button"
                                                onClick={() => handleSelectSurgery(surgery)}
                                                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-amber-50"
                                            >
                                                <span className="font-medium text-slate-900">{surgery.name}</span>
                                                {surgery.category && (
                                                    <span className="text-xs text-slate-500">{surgery.category}</span>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Body Part Selection - only surfaced once a surgery is picked, and
                            only when it has 2+ configured body parts (per the shared 0/1/2+ convention) */}
                        {selectedSurgery && selectedSurgery.body_parts.length > 1 && (
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                    Body Part <span className="text-rose-500">*</span>
                                </label>
                                <BodyPartPicker
                                    bodyParts={selectedSurgery.body_parts}
                                    value={selectedBodyPartId}
                                    onChange={setSelectedBodyPartId}
                                />
                            </div>
                        )}
                        {selectedSurgery && selectedSurgery.body_parts.length === 1 && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>Body part:</span>
                                <BodyPartBadge
                                    name={selectedSurgery.body_parts[0].name}
                                    laterality={selectedSurgery.body_parts[0].laterality}
                                    department={selectedSurgery.body_parts[0].department}
                                />
                            </div>
                        )}

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
                            disabled={isSubmitting || !selectedSurgery}
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
