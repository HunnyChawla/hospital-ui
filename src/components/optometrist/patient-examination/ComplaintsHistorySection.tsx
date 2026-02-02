"use client";

import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronUp, Calendar, AlertCircle } from "lucide-react";
import { complaintsApi } from "@/services/complaintsApi";
import clsx from "clsx";
import type { ComplaintRecord } from "@/types";

interface ComplaintsHistoryItem {
    id: string;
    visit_id: string;
    recorded_at: string;
    complaint: string;
    severity: "mild" | "moderate" | "severe" | null;
    duration: string | null;
    notes?: string | null;
}

interface ComplaintsHistorySectionProps {
    patientId: string;
    currentVisitId?: string;
}

export function ComplaintsHistorySection({
    patientId,
    currentVisitId,
}: ComplaintsHistorySectionProps) {
    const [loading, setLoading] = useState(true);
    const [historyRecords, setHistoryRecords] = useState<ComplaintsHistoryItem[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Normalize record from API
    const normalizeRecord = (record: ComplaintRecord): ComplaintsHistoryItem => ({
        id: record.id,
        visit_id: record.visit_id,
        recorded_at: record.created_at || new Date().toISOString(),
        complaint: record.complaint,
        severity: record.severity,
        duration: record.duration,
        notes: record.notes,
    });

    useEffect(() => {
        let mounted = true;

        const fetchHistory = async () => {
            if (!patientId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const response = await complaintsApi.getByPatient(patientId, {
                    page: 1,
                    page_size: 50, // Fetch more to group by visit
                });

                if (!mounted) return;

                const normalized = response.items.map(normalizeRecord);

                // Group by visit_id and combine complaints per visit
                const visitMap = new Map<string, ComplaintsHistoryItem[]>();
                normalized.forEach((record) => {
                    if (record.visit_id === currentVisitId) return; // Exclude current visit
                    const existing = visitMap.get(record.visit_id) || [];
                    existing.push(record);
                    visitMap.set(record.visit_id, existing);
                });

                // Convert to array sorted by date, take latest 5 visits
                const visitEntries = Array.from(visitMap.entries())
                    .map(([visitId, complaints]) => ({
                        visitId,
                        complaints,
                        latestDate: Math.max(...complaints.map(c => new Date(c.recorded_at).getTime())),
                    }))
                    .sort((a, b) => b.latestDate - a.latestDate)
                    .slice(0, 5);

                // Flatten back to individual records but keep visit grouping
                const result: ComplaintsHistoryItem[] = [];
                visitEntries.forEach(entry => {
                    entry.complaints.forEach(c => result.push(c));
                });

                setHistoryRecords(result);
            } catch (err) {
                if (mounted) {
                    setError("Failed to fetch complaints history");
                    console.error("Error fetching complaints history:", err);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchHistory();

        return () => {
            mounted = false;
        };
    }, [patientId, currentVisitId]);

    // Group records by visit for display
    const groupedByVisit = historyRecords.reduce((acc, record) => {
        const existing = acc.find(g => g.visitId === record.visit_id);
        if (existing) {
            existing.complaints.push(record);
        } else {
            acc.push({ visitId: record.visit_id, complaints: [record], date: record.recorded_at });
        }
        return acc;
    }, [] as { visitId: string; complaints: ComplaintsHistoryItem[]; date: string }[]);

    // Don't render if no history
    if (!loading && groupedByVisit.length === 0 && !error) {
        return null;
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const getVisitLabel = (index: number) => {
        const labels = ["Previous Visit", "2 Visits Ago", "3 Visits Ago", "4 Visits Ago", "5 Visits Ago"];
        return labels[index] || `${index + 1} Visits Ago`;
    };

    const getSeverityColor = (severity: string | null) => {
        switch (severity) {
            case "mild":
                return "bg-green-100 text-green-700 border-green-200";
            case "moderate":
                return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "severe":
                return "bg-red-100 text-red-700 border-red-200";
            default:
                return "bg-slate-100 text-slate-600 border-slate-200";
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150 transition group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                        <History className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-base font-semibold text-slate-900">
                            Complaints History
                        </h4>
                        <p className="text-sm text-slate-600">
                            Last {groupedByVisit.length} previous visit{groupedByVisit.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        {historyRecords.length} Complaint{historyRecords.length !== 1 ? "s" : ""}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition" />
                    )}
                </div>
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                            <span className="ml-3 text-slate-600">Loading history...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-6">
                            <p className="text-red-600">{error}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groupedByVisit.map((visitGroup, index) => (
                                <div
                                    key={visitGroup.visitId}
                                    className={clsx(
                                        "rounded-lg border p-4 transition",
                                        index === 0
                                            ? "border-amber-200 bg-amber-50/50"
                                            : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                                    )}
                                >
                                    {/* Visit header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-500" />
                                            <span className="text-sm font-medium text-slate-900">
                                                {getVisitLabel(index)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {formatDate(visitGroup.date)}
                                        </span>
                                    </div>

                                    {/* Complaints list */}
                                    <div className="space-y-2">
                                        {visitGroup.complaints.map((complaint) => (
                                            <div
                                                key={complaint.id}
                                                className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-100"
                                            >
                                                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {complaint.complaint}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        {complaint.severity && (
                                                            <span className={clsx(
                                                                "px-2 py-0.5 text-xs font-medium rounded-full border",
                                                                getSeverityColor(complaint.severity)
                                                            )}>
                                                                {complaint.severity}
                                                            </span>
                                                        )}
                                                        {complaint.duration && (
                                                            <span className="text-xs text-slate-500">
                                                                Duration: {complaint.duration}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {complaint.notes && (
                                                        <p className="mt-1 text-xs text-slate-500 italic">
                                                            {complaint.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
