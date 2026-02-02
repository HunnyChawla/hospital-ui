"use client";

import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronUp, Calendar, Activity } from "lucide-react";
import { iopApi } from "@/services/iopApi";
import clsx from "clsx";

interface IOPHistoryItem {
    id: string;
    visit_id: string;
    recorded_at: string;
    od_pressure: number | null;
    os_pressure: number | null;
    measurement_method: string | null;
    notes?: string | null;
}

interface IOPHistorySectionProps {
    patientId: string;
    currentVisitId?: string;
}

export function IOPHistorySection({
    patientId,
    currentVisitId,
}: IOPHistorySectionProps) {
    const [loading, setLoading] = useState(true);
    const [historyRecords, setHistoryRecords] = useState<IOPHistoryItem[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const toNumberOrNull = (v: any): number | null => {
        if (v === null || v === undefined || v === "") return null;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isNaN(n) ? null : n;
    };

    const getIOPStatus = (pressure: number | null) => {
        if (pressure === null) return { color: "text-slate-500", bg: "bg-slate-100", label: "N/A" };
        if (pressure <= 21) return { color: "text-green-700", bg: "bg-green-100", label: "Normal" };
        if (pressure <= 24) return { color: "text-yellow-700", bg: "bg-yellow-100", label: "Borderline" };
        return { color: "text-red-700", bg: "bg-red-100", label: "High" };
    };

    const normalizeRecord = (record: any): IOPHistoryItem | null => {
        if (!record) return null;

        // Handle combined format
        if (record.od_pressure !== undefined || record.os_pressure !== undefined) {
            return {
                id: record.id,
                visit_id: record.visit_id,
                recorded_at: record.recorded_at || record.measurement_time || record.created_at || new Date().toISOString(),
                od_pressure: toNumberOrNull(record.od_pressure),
                os_pressure: toNumberOrNull(record.os_pressure),
                measurement_method: record.measurement_method || null,
                notes: record.notes,
            };
        }

        // Handle per-eye format - skip for now, we'll aggregate
        return null;
    };

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

                const response = await iopApi.getByPatient(patientId, {
                    days: 365,
                });

                if (!mounted) return;

                const normalized = response.items
                    .map(normalizeRecord)
                    .filter((r): r is IOPHistoryItem => r !== null);

                // Group by visit_id and pick latest per visit
                const visitMap = new Map<string, IOPHistoryItem>();
                normalized.forEach((record) => {
                    if (record.visit_id === currentVisitId) return;
                    const existing = visitMap.get(record.visit_id);
                    if (
                        !existing ||
                        new Date(record.recorded_at).getTime() > new Date(existing.recorded_at).getTime()
                    ) {
                        visitMap.set(record.visit_id, record);
                    }
                });

                const uniqueByVisit = Array.from(visitMap.values())
                    .sort(
                        (a, b) =>
                            new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
                    )
                    .slice(0, 5);

                setHistoryRecords(uniqueByVisit);
            } catch (err) {
                if (mounted) {
                    setError("Failed to fetch IOP history");
                    console.error("Error fetching IOP history:", err);
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

    if (!loading && historyRecords.length === 0 && !error) {
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

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150 transition group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                        <History className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-base font-semibold text-slate-900">
                            IOP History
                        </h4>
                        <p className="text-sm text-slate-600">
                            Last {historyRecords.length} previous visit{historyRecords.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                        {historyRecords.length} Record{historyRecords.length !== 1 ? "s" : ""}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition" />
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                            <span className="ml-3 text-slate-600">Loading history...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-6">
                            <p className="text-red-600">{error}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {historyRecords.map((record, index) => {
                                const odStatus = getIOPStatus(record.od_pressure);
                                const osStatus = getIOPStatus(record.os_pressure);

                                return (
                                    <div
                                        key={record.id}
                                        className={clsx(
                                            "rounded-lg border p-4 transition",
                                            index === 0
                                                ? "border-purple-200 bg-purple-50/50"
                                                : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-500" />
                                                <span className="text-sm font-medium text-slate-900">
                                                    {getVisitLabel(index)}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-500">
                                                {formatDate(record.recorded_at)}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* OD */}
                                            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                    <span className="text-xs font-semibold text-blue-900">OD (Right)</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="h-4 w-4 text-blue-600" />
                                                        <span className="text-2xl font-bold text-slate-900">
                                                            {record.od_pressure !== null ? record.od_pressure : "—"}
                                                        </span>
                                                        <span className="text-sm text-slate-500">mmHg</span>
                                                    </div>
                                                    <span className={clsx(
                                                        "px-2 py-0.5 text-xs font-medium rounded-full",
                                                        odStatus.bg,
                                                        odStatus.color
                                                    )}>
                                                        {odStatus.label}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* OS */}
                                            <div className="rounded-lg border border-green-200 bg-green-50/70 p-3">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                                    <span className="text-xs font-semibold text-green-900">OS (Left)</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="h-4 w-4 text-green-600" />
                                                        <span className="text-2xl font-bold text-slate-900">
                                                            {record.os_pressure !== null ? record.os_pressure : "—"}
                                                        </span>
                                                        <span className="text-sm text-slate-500">mmHg</span>
                                                    </div>
                                                    <span className={clsx(
                                                        "px-2 py-0.5 text-xs font-medium rounded-full",
                                                        osStatus.bg,
                                                        osStatus.color
                                                    )}>
                                                        {osStatus.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {(record.measurement_method || record.notes) && (
                                            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                                                {record.measurement_method && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                                                        Method: {record.measurement_method}
                                                    </span>
                                                )}
                                                {record.notes && (
                                                    <span className="text-slate-500 italic truncate max-w-xs">
                                                        Note: {record.notes}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
