"use client";

import React, { useState, useEffect } from "react";
import { Save, X, Loader2, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import {
    prescriptionTemplatesApi,
    type CreatePrescriptionTemplateRequest,
    type PrescriptionTemplate,
} from "@/services/prescriptionTemplatesApi";

interface SaveAsTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: {
        diagnosis?: string;
        plan_of_action?: string;
        followup_date?: string;
        remarks?: string;
        lens_type?: string;
        vision_type?: string;
        lens_material?: string;
        coatings?: string[];
        medicine_items?: any[];
        advice_items?: any[];
    };
    onSaved?: () => void;
    editTemplate?: PrescriptionTemplate | null; // Pass existing template to edit
}

// Calculate followup_days from followup_date
function getFollowupDays(followupDate?: string): number | undefined {
    if (!followupDate) return undefined;
    const today = new Date();
    const target = new Date(followupDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : undefined;
}

export function SaveAsTemplateModal({
    isOpen,
    onClose,
    formData,
    onSaved,
    editTemplate,
}: SaveAsTemplateModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [saving, setSaving] = useState(false);

    // Initialize form with editTemplate data if available
    useEffect(() => {
        if (editTemplate && isOpen) {
            setName(editTemplate.name || "");
            setDescription(editTemplate.description || "");
            setCategory(editTemplate.category || "");
            setIsPublic(editTemplate.is_public || false);
        } else if (isOpen) {
            // Reset if not editing
            setName("");
            setDescription("");
            setCategory("");
            setIsPublic(false);
        }
    }, [editTemplate, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Please enter a template name");
            return;
        }

        setSaving(true);
        try {
            const requestData: CreatePrescriptionTemplateRequest = {
                name: name.trim(),
                description: description.trim() || undefined,
                category: category.trim() || undefined,
                diagnosis: formData.diagnosis || undefined,
                plan_of_action: formData.plan_of_action || undefined,
                followup_days: getFollowupDays(formData.followup_date),
                remarks: formData.remarks || undefined,
                lens_type: formData.lens_type || undefined,
                vision_type: formData.vision_type || undefined,
                lens_material: formData.lens_material || undefined,
                coatings: formData.coatings?.length ? formData.coatings : undefined,
                medicine_items: formData.medicine_items?.length
                    ? formData.medicine_items.map((m) => ({
                        medicine_id: m.medicine_id || undefined,
                        medicine_name: m.medicine_name,
                        generic_name: m.generic_name || undefined,
                        dosage: m.dosage,
                        frequency: m.frequency,
                        duration: m.duration,
                        instructions: m.instructions || undefined,
                        tapering_steps: m.tapering_steps || undefined,
                    }))
                    : undefined,
                advice_items: formData.advice_items?.length
                    ? formData.advice_items.map((a) => ({
                        advice_type: a.advice_type,
                        description: a.description,
                        notes: a.notes || undefined,
                    }))
                    : undefined,
                is_public: isPublic,
            };

            if (editTemplate) {
                await prescriptionTemplatesApi.update(editTemplate.id, requestData);
                toast.success(`Template "${name}" updated successfully!`);
            } else {
                await prescriptionTemplatesApi.create(requestData);
                toast.success(`Template "${name}" saved successfully!`);
            }

            onSaved?.();
            onClose();
        } catch (error: any) {
            console.error("Failed to save template:", error);
            if (error.response?.status === 409) {
                toast.error("A template with this name already exists");
            } else {
                toast.error(`Failed to ${editTemplate ? 'update' : 'save'} template`);
            }
        } finally {
            setSaving(false);
        }
    };

    const medicineCount = formData.medicine_items?.length || 0;
    const adviceCount = formData.advice_items?.length || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md">
                            <Save className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {editTemplate ? "Edit Template" : "Save as Template"}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {editTemplate ? "Update existing template" : "Reuse this prescription later"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4 p-5">
                    {/* Template Name */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Template Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Dry Eye Treatment, Cataract Post-Op"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Description
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of when to use this template"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        >
                            <option value="">Select category...</option>
                            <option value="routine">Routine Check-up</option>
                            <option value="post-op">Post-Operative</option>
                            <option value="emergency">Emergency</option>
                            <option value="chronic">Chronic Condition</option>
                            <option value="pediatric">Pediatric</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    {/* What's included */}
                    <div className="rounded-lg bg-slate-50 p-3">
                        <p className="mb-2 text-xs font-medium text-slate-600">
                            Template will include:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {formData.diagnosis && (
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                                    Diagnosis
                                </span>
                            )}
                            {medicineCount > 0 && (
                                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                                    {medicineCount} Medicine{medicineCount > 1 ? "s" : ""}
                                </span>
                            )}
                            {adviceCount > 0 && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                    {adviceCount} Advice
                                </span>
                            )}
                            {formData.followup_date && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                    Follow-up
                                </span>
                            )}
                            {(formData.lens_type || formData.coatings?.length) && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                    Optical Details
                                </span>
                            )}
                        </div>
                        {editTemplate && (
                            <p className="mt-2 text-[10px] text-slate-500 italic">
                                Note: Updating will overwrite the template with current form data.
                            </p>
                        )}
                    </div>

                    {/* Public toggle */}
                    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition">
                        <div className="flex items-center gap-3">
                            {isPublic ? (
                                <Globe className="h-5 w-5 text-blue-500" />
                            ) : (
                                <Lock className="h-5 w-5 text-slate-400" />
                            )}
                            <div>
                                <p className="text-sm font-medium text-slate-700">
                                    {isPublic ? "Shared with team" : "Private template"}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {isPublic
                                        ? "Other doctors can use this template"
                                        : "Only you can see this template"}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                    </label>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 bg-slate-50 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 transition"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                {editTemplate ? "Update Template" : "Save Template"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
