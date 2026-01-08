"use client";

import React, { useState, useEffect } from "react";
import { History, FileText, ChevronRight } from "lucide-react";
import { patientOptometryHistoryApi } from "@/services/patientOptometryHistoryApi";
import { handleError } from "@/utils/errorHandler";

interface HistoryTemplateSectionProps {
    patientId: string;
    visitId: string;
    onSelectTemplate?: (template: any) => void;
}

export function HistoryTemplateSection({
    patientId,
    visitId,
    onSelectTemplate,
}: HistoryTemplateSectionProps) {
    const [activeTab, setActiveTab] = useState<"history" | "templates">("history");
    const [historyEvents, setHistoryEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch patient history
    useEffect(() => {
        if (patientId) {
            setLoading(true);
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
                    setLoading(false);
                });
        }
    }, [patientId]);

    // Sample templates - in real implementation, these would come from an API
    const templates = [
        { id: "1", name: "Conjunctivitis", type: "diagnosis" },
        { id: "2", name: "Myopia", type: "diagnosis" },
        { id: "3", name: "Dry Eye", type: "diagnosis" },
        { id: "4", name: "Glaucoma Follow-up", type: "followup" },
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
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
                <button
                    onClick={() => setActiveTab("templates")}
                    className={`flex-1 px-2 py-3 text-xs font-medium transition ${activeTab === "templates"
                            ? "text-sky-600 border-b-2 border-sky-500 bg-sky-50"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                >
                    <FileText className="h-3.5 w-3.5 mx-auto mb-1" />
                    Templates
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === "history" ? (
                    <div className="p-2 space-y-2">
                        {loading ? (
                            <div className="text-center py-4">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500 mx-auto" />
                            </div>
                        ) : historyEvents.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">No previous visits</p>
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
                ) : (
                    <div className="p-2 space-y-2">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => onSelectTemplate?.(template)}
                                className="w-full text-left p-2 rounded-lg border border-slate-100 hover:border-sky-200 hover:bg-sky-50 transition"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-slate-700 truncate">
                                        {template.name}
                                    </p>
                                    <ChevronRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                </div>
                                <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                                    {template.type}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
