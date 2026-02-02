"use client";

import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronUp, Calendar, Eye } from "lucide-react";
import { arDataApi } from "@/services/arDataApi";
import clsx from "clsx";

interface ARDataHistoryItem {
    id: string;
    visit_id: string;
    recorded_at: string;
    od: {
        sphere: number | null;
        cylinder: number | null;
        axis: number | null;
    };
    os: {
        sphere: number | null;
        cylinder: number | null;
        axis: number | null;
    };
    pupillary_distance: number | null;
    notes?: string | null;
}

interface ARDataHistorySectionProps {
    patientId: string;
    currentVisitId?: string;
}

export function ARDataHistorySection({
    patientId,
    currentVisitId,
}: ARDataHistorySectionProps) {
    const [loading, setLoading] = useState(true);
    const [historyRecords, setHistoryRecords] = useState<ARDataHistoryItem[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const formatValue = (
        value: number | string | null | undefined,
        type: "sphere" | "cylinder" | "axis"
    ) => {
        if (value === null || value === undefined || value === "") return "—";
        const num = typeof value === "number" ? value : Number(value);
        if (Number.isNaN(num)) return `${value}`;
        if (type === "axis") return `${Math.round(num)}°`;
        return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
    };

    const normalizeRecord = (record: any): ARDataHistoryItem | null => {
        if (!record) return null;

        const toNumberOrNull = (v: any): number | null => {
            if (v === null || v === undefined || v === "") return null;
            const n = typeof v === "number" ? v : Number(v);
            return Number.isNaN(n) ? null : n;
        };

        return {
            id: record.id,
            visit_id: record.visit_id,
            recorded_at: record.recorded_at || record.created_at || new Date().toISOString(),
            od: {
                sphere: toNumberOrNull(record.od_sphere),
                cylinder: toNumberOrNull(record.od_cylinder),
                axis: toNumberOrNull(record.od_axis),
            },
            os: {
                sphere: toNumberOrNull(record.os_sphere),
                cylinder: toNumberOrNull(record.os_cylinder),
                axis: toNumberOrNull(record.os_axis),
            },
            pupillary_distance: toNumberOrNull(record.pupillary_distance),
            notes: record.notes,
        };
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

                const response = await arDataApi.getByPatient(patientId, {
                    page: 1,
                    page_size: 10,
                });

                if (!mounted) return;

                const normalized = response.items
                    .map(normalizeRecord)
                    .filter((r): r is ARDataHistoryItem => r !== null);

                // Group by visit_id and pick latest per visit
                const visitMap = new Map<string, ARDataHistoryItem>();
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
                    setError("Failed to fetch AR data history");
                    console.error("Error fetching AR data history:", err);
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
                    <div className="p-2 rounded-lg bg-cyan-100 text-cyan-600">
                        <History className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-base font-semibold text-slate-900">
                            AR Data History
                        </h4>
                        <p className="text-sm text-slate-600">
                            Last {historyRecords.length} previous visit{historyRecords.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700">
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
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                            <span className="ml-3 text-slate-600">Loading history...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-6">
                            <p className="text-red-600">{error}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {historyRecords.map((record, index) => (
                                <div
                                    key={record.id}
                                    className={clsx(
                                        "rounded-lg border p-4 transition",
                                        index === 0
                                            ? "border-cyan-200 bg-cyan-50/50"
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
                                            <div className="grid grid-cols-3 gap-1 text-center">
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500">SPH</p>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {formatValue(record.od.sphere, "sphere")}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500">CYL</p>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {formatValue(record.od.cylinder, "cylinder")}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500">AXIS</p>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {formatValue(record.od.axis, "axis")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* OS */}
                                        <div className="rounded-lg border border-green-200 bg-green-50/70 p-3">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                <span className="text-xs font-semibold text-green-900">OS (Left)</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-center">
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500">SPH</p>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {formatValue(record.os.sphere, "sphere")}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500">CYL</p>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {formatValue(record.os.cylinder, "cylinder")}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500">AXIS</p>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {formatValue(record.os.axis, "axis")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {(record.pupillary_distance || record.notes) && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                                            {record.pupillary_distance && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                                                    <Eye className="h-3 w-3" />
                                                    PD: {record.pupillary_distance} mm
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
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
