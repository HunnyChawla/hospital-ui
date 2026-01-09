"use client";

import React, { useState, useEffect } from "react";
import {
    FileText,
    ChevronDown,
    Star,
    Clock,
    Pill,
    User,
    Loader2,
    Check,
    Search,
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import {
    prescriptionTemplatesApi,
    type PrescriptionTemplateListItem,
    type PrescriptionTemplate,
} from "@/services/prescriptionTemplatesApi";

interface TemplateSelectorProps {
    doctorId: string;
    onSelectTemplate: (template: PrescriptionTemplate) => void;
    className?: string;
}

export function TemplateSelector({
    doctorId,
    onSelectTemplate,
    className,
}: TemplateSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [templates, setTemplates] = useState<PrescriptionTemplateListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Fetch templates when dropdown opens
    useEffect(() => {
        if (isOpen && templates.length === 0) {
            fetchTemplates();
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const response = await prescriptionTemplatesApi.list({
                doctor_id: doctorId,
                include_public: true,
                page_size: 50,
            });
            setTemplates(response.items);
        } catch (error) {
            console.error("Failed to fetch templates:", error);
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTemplate = async (templateItem: PrescriptionTemplateListItem) => {
        setSelectedId(templateItem.id);
        try {
            // Fetch full template details
            const fullTemplate = await prescriptionTemplatesApi.getById(templateItem.id);
            onSelectTemplate(fullTemplate);

            // Track usage (fire and forget)
            prescriptionTemplatesApi.apply(templateItem.id).catch(() => { });

            setIsOpen(false);
            toast.success(`Applied template: ${templateItem.name}`);
        } catch (error) {
            console.error("Failed to load template:", error);
            toast.error("Failed to load template");
        } finally {
            setSelectedId(null);
        }
    };

    const filteredTemplates = search
        ? templates.filter(
            (t) =>
                t.name.toLowerCase().includes(search.toLowerCase()) ||
                t.description?.toLowerCase().includes(search.toLowerCase())
        )
        : templates;

    // Group templates by ownership
    const myTemplates = filteredTemplates.filter((t) => t.is_owner);
    const publicTemplates = filteredTemplates.filter((t) => !t.is_owner);

    return (
        <div className={clsx("relative", className)}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                    isOpen
                        ? "border-purple-400 bg-purple-50 text-purple-700"
                        : "border-slate-300 bg-white text-slate-700 hover:border-purple-300 hover:bg-purple-50"
                )}
            >
                <FileText className="h-4 w-4" />
                <span>Templates</span>
                <ChevronDown
                    className={clsx(
                        "h-4 w-4 transition-transform",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Search */}
                        <div className="border-b border-slate-100 p-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search templates..."
                                    className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Template List */}
                        <div className="max-h-72 overflow-y-auto p-2">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                </div>
                            ) : filteredTemplates.length === 0 ? (
                                <div className="py-8 text-center text-sm text-slate-500">
                                    {templates.length === 0
                                        ? "No templates saved yet"
                                        : "No templates match your search"}
                                </div>
                            ) : (
                                <>
                                    {/* My Templates */}
                                    {myTemplates.length > 0 && (
                                        <div className="mb-2">
                                            <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                My Templates
                                            </div>
                                            {myTemplates.map((template) => (
                                                <TemplateItem
                                                    key={template.id}
                                                    template={template}
                                                    isLoading={selectedId === template.id}
                                                    onSelect={() => handleSelectTemplate(template)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Public Templates */}
                                    {publicTemplates.length > 0 && (
                                        <div>
                                            {myTemplates.length > 0 && (
                                                <div className="my-2 border-t border-slate-100" />
                                            )}
                                            <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                Shared Templates
                                            </div>
                                            {publicTemplates.map((template) => (
                                                <TemplateItem
                                                    key={template.id}
                                                    template={template}
                                                    isLoading={selectedId === template.id}
                                                    onSelect={() => handleSelectTemplate(template)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Individual template item
function TemplateItem({
    template,
    isLoading,
    onSelect,
}: {
    template: PrescriptionTemplateListItem;
    isLoading: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={isLoading}
            className="group flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-purple-50 disabled:opacity-50"
        >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600">
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileText className="h-4 w-4" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900 group-hover:text-purple-700">
                        {template.name}
                    </span>
                    {template.is_public && !template.is_owner && (
                        <span className="flex-shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            Shared
                        </span>
                    )}
                </div>
                {template.description && (
                    <p className="truncate text-xs text-slate-500">
                        {template.description}
                    </p>
                )}
                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-400">
                    {template.medicine_count > 0 && (
                        <span className="flex items-center gap-1">
                            <Pill className="h-3 w-3" />
                            {template.medicine_count}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {template.usage_count} uses
                    </span>
                    {!template.is_owner && (
                        <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {template.doctor_name}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}
