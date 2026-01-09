"use client";

import React, { useState, useEffect } from "react";
import { History, FileText, ChevronRight, Loader2, Pill, Clock, User, Globe, Pencil, Trash2, Play, AlertCircle } from "lucide-react";
import { patientOptometryHistoryApi } from "@/services/patientOptometryHistoryApi";
import {
    prescriptionTemplatesApi,
    type PrescriptionTemplateListItem,
    type PrescriptionTemplate,
} from "@/services/prescriptionTemplatesApi";
import { handleError } from "@/utils/errorHandler";
import { toast } from "sonner";

interface HistoryTemplateSectionProps {
    patientId: string;
    visitId: string;
    doctorId: string;
    onSelectTemplate?: (template: PrescriptionTemplate) => void;
    onEditTemplate?: (template: PrescriptionTemplate) => void;
}

export function HistoryTemplateSection({
    patientId,
    visitId,
    doctorId,
    onSelectTemplate,
    onEditTemplate,
}: HistoryTemplateSectionProps) {
    const [activeTab, setActiveTab] = useState<"history" | "templates">("templates");
    const [historyEvents, setHistoryEvents] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Templates state
    const [templates, setTemplates] = useState<PrescriptionTemplateListItem[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);

    // Delete validation
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Fetch patient history
    useEffect(() => {
        if (patientId && activeTab === "history") {
            setLoadingHistory(true);
            patientOptometryHistoryApi
                .getTimeline(patientId, { limit: 10 })
                .then((data) => {
                    setHistoryEvents(data.events || []);
                })
                .catch((error) => {
                    handleError(error, {
                        defaultMessage: "Failed to load history",
                        showToast: false,
                        logError: true,
                    });
                })
                .finally(() => {
                    setLoadingHistory(false);
                });
        }
    }, [patientId, activeTab]);

    // Fetch templates when tab is active or doctorId changes
    useEffect(() => {
        if (doctorId && activeTab === "templates") {
            fetchTemplates();
        }
    }, [doctorId, activeTab]);

    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const response = await prescriptionTemplatesApi.list({
                doctor_id: doctorId,
                include_public: true,
                page_size: 50,
            });
            setTemplates(response.items);
        } catch (error) {
            handleError(error, {
                defaultMessage: "Failed to load templates",
                showToast: false,
                logError: true,
            });
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleApply = async (templateItem: PrescriptionTemplateListItem) => {
        if (!onSelectTemplate) return;

        setApplyingTemplateId(templateItem.id);
        try {
            // Fetch full template details
            const fullTemplate = await prescriptionTemplatesApi.getById(templateItem.id);
            onSelectTemplate(fullTemplate);

            // Track usage
            prescriptionTemplatesApi.apply(templateItem.id).catch(() => { });

            toast.success(`Applied: ${templateItem.name}`);
        } catch (error) {
            handleError(error, {
                defaultMessage: "Failed to load template",
                logError: true,
            });
        } finally {
            setApplyingTemplateId(null);
        }
    };

    const handleEdit = async (templateItem: PrescriptionTemplateListItem) => {
        if (!onEditTemplate) return;

        // Ensure we handle loading if needed, though mostly parent deals with it
        try {
            const fullTemplate = await prescriptionTemplatesApi.getById(templateItem.id);
            onEditTemplate(fullTemplate);
        } catch (error) {
            handleError(error, {
                defaultMessage: "Failed to load template for editing",
                logError: true,
            });
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        setDeleting(true);
        try {
            await prescriptionTemplatesApi.delete(deleteId);
            setTemplates(prev => prev.filter(t => t.id !== deleteId));
            toast.success("Template deleted");
        } catch (error) {
            handleError(error, {
                defaultMessage: "Failed to delete template",
                logError: true,
            });
        } finally {
            setDeleting(false);
            setDeleteId(null);
        }
    };

    // Group templates
    const myTemplates = templates.filter((t) => t.is_owner);
    const sharedTemplates = templates.filter((t) => !t.is_owner);

    return (
        <div className="h-full flex flex-col relative">
            {/* Delete Confirmation Overlay */}
            {deleteId && (
                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-4 rounded-lg">
                    <div className="w-full text-center space-y-3 animate-in zoom-in-95 duration-200">
                        <div className="h-10 w-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Delete Template?</p>
                            <p className="text-xs text-slate-500 mt-1">This action cannot be undone.</p>
                        </div>
                        <div className="flex gap-2 justify-center pt-1">
                            <button
                                onClick={() => setDeleteId(null)}
                                disabled={deleting}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-md flex items-center gap-1.5 transition"
                            >
                                {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("templates")}
                    className={`flex-1 px-2 py-3 text-xs font-medium transition ${activeTab === "templates"
                        ? "text-purple-600 border-b-2 border-purple-500 bg-purple-50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                >
                    <FileText className="h-3.5 w-3.5 mx-auto mb-1" />
                    Templates
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`flex-1 px-2 py-3 text-xs font-medium transition ${activeTab === "history"
                        ? "text-sky-600 border-b-2 border-sky-500 bg-sky-50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                >
                    <History className="h-3.5 w-3.5 mx-auto mb-1" />
                    History
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === "templates" ? (
                    <div className="p-2 space-y-3">
                        {loadingTemplates ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="text-center py-6 px-2">
                                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">No templates yet</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Save a prescription as template to see it here
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* My Templates */}
                                {myTemplates.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                                            My Templates
                                        </p>
                                        <div className="space-y-1.5">
                                            {myTemplates.map((template) => (
                                                <TemplateCard
                                                    key={template.id}
                                                    template={template}
                                                    isLoading={applyingTemplateId === template.id}
                                                    onApply={() => handleApply(template)}
                                                    onEdit={() => handleEdit(template)}
                                                    onDelete={() => setDeleteId(template.id)}
                                                    isOwner={true}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Shared Templates */}
                                {sharedTemplates.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                                            Shared
                                        </p>
                                        <div className="space-y-1.5">
                                            {sharedTemplates.map((template) => (
                                                <TemplateCard
                                                    key={template.id}
                                                    template={template}
                                                    isLoading={applyingTemplateId === template.id}
                                                    onApply={() => handleApply(template)}
                                                    isOwner={false}
                                                    showDoctor
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="p-2 space-y-2">
                        {loadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                            </div>
                        ) : historyEvents.length === 0 ? (
                            <div className="text-center py-6 px-2">
                                <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">No previous visits</p>
                            </div>
                        ) : (
                            historyEvents.map((event) => (
                                <button
                                    key={event.event_id}
                                    className="w-full text-left p-2 rounded-lg border border-slate-100 hover:border-sky-200 hover:bg-sky-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-slate-700 truncate">
                                            {event.title || "Visit"}
                                        </p>
                                        <ChevronRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        {new Date(event.timestamp).toLocaleDateString()}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Template card component
function TemplateCard({
    template,
    isLoading,
    onApply,
    onEdit,
    onDelete,
    showDoctor = false,
    isOwner = false,
}: {
    template: PrescriptionTemplateListItem;
    isLoading: boolean;
    onApply: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    showDoctor?: boolean;
    isOwner?: boolean;
}) {
    return (
        <div className="group relative w-full text-left p-2 rounded-lg border border-slate-100 bg-white hover:border-purple-200 hover:bg-purple-50 transition">
            <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                    {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
                    ) : (
                        <FileText className="h-3.5 w-3.5 text-purple-500" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate pr-6">
                        {template.name}
                    </p>
                    {template.description && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {template.description}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        {template.medicine_count > 0 && (
                            <span className="flex items-center gap-0.5">
                                <Pill className="h-2.5 w-2.5" />
                                {template.medicine_count}
                            </span>
                        )}
                        <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {template.usage_count}
                        </span>
                        {showDoctor && (
                            <span className="flex items-center gap-0.5">
                                <User className="h-2.5 w-2.5" />
                                {template.doctor_name.split(" ")[0]}
                            </span>
                        )}
                        {template.is_public && template.is_owner && (
                            <Globe className="h-2.5 w-2.5 text-blue-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Actions overlay - always show on mobile, hover on desktop */}
            <div className="absolute right-1 top-1 flex items-center gap-0.5 bg-white/80 backdrop-blur-sm rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {isOwner && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                        >
                            <Pencil className="h-3 w-3" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onApply(); }}
                    disabled={isLoading}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                    title="Apply"
                >
                    <Play className="h-3 w-3" />
                </button>
            </div>

            {/* Fallback for touch devices where hover isn't great - always show apply if no other Actions, or make main click apply */}
        </div>
    );
}
