"use client";

import { useState, useEffect, useMemo } from "react";
import { History, Eye, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { refractionApi } from "@/services/refractionApi";
import clsx from "clsx";
import type { RefractionRecord } from "@/types";

interface RefractionHistoryItem {
    id: string;
    visit_id: string;
    visit_date?: string;
    recorded_at: string;
    od: {
        sphere: number | null;
        cylinder: number | null;
        axis: number | null;
        add_power: number | null;
    };
    os: {
        sphere: number | null;
        cylinder: number | null;
        axis: number | null;
        add_power: number | null;
    };
    pupillary_distance: number | null;
    notes?: string | null;
}

interface RefractionHistorySectionProps {
    patientId: string;
    currentVisitId?: string;
}

export function RefractionHistorySection({
    patientId,
    currentVisitId,
}: RefractionHistorySectionProps) {
    const [loading, setLoading] = useState(true);
    const [historyRecords, setHistoryRecords] = useState<RefractionHistoryItem[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Format refraction values for display
    const formatValue = (
        value: number | string | null | undefined,
        type: "sphere" | "cylinder" | "axis" | "add"
    ) => {
        if (value === null || value === undefined || value === "") return "—";
        const num = typeof value === "number" ? value : Number(value);
        if (Number.isNaN(num)) return `${value}`;
        if (type === "axis") return `${Math.round(num)}°`;
        return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
    };

    // Convert API response to our format
    const normalizeRecord = (record: any): RefractionHistoryItem | null => {
        if (!record) return null;

        const hasNested = record.od && record.os;
        const hasFlat = "od_sphere" in record || "os_sphere" in record;

        if (!hasNested && !hasFlat) return null;

        const toNumberOrNull = (v: any): number | null => {
            if (v === null || v === undefined || v === "") return null;
            const n = typeof v === "number" ? v : Number(v);
            return Number.isNaN(n) ? null : n;
        };

        return {
            id: record.id,
            visit_id: record.visit_id,
            visit_date: record.visit_date,
            recorded_at: record.recorded_at,
            od: {
                sphere: hasNested ? toNumberOrNull(record.od.sphere) : toNumberOrNull(record.od_sphere),
                cylinder: hasNested ? toNumberOrNull(record.od.cylinder) : toNumberOrNull(record.od_cylinder),
                axis: hasNested ? toNumberOrNull(record.od.axis) : toNumberOrNull(record.od_axis),
                add_power: hasNested ? toNumberOrNull(record.od.add_power) : toNumberOrNull(record.od_add_power),
            },
            os: {
                sphere: hasNested ? toNumberOrNull(record.os.sphere) : toNumberOrNull(record.os_sphere),
                cylinder: hasNested ? toNumberOrNull(record.os.cylinder) : toNumberOrNull(record.os_cylinder),
                axis: hasNested ? toNumberOrNull(record.os.axis) : toNumberOrNull(record.os_axis),
                add_power: hasNested ? toNumberOrNull(record.os.add_power) : toNumberOrNull(record.os_add_power),
            },
            pupillary_distance: hasNested
                ? toNumberOrNull(record.pupillary_distance)
                : toNumberOrNull(record.pupillary_distance),
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

                // Fetch last 10 records to account for potential duplicates per visit
                const response = await refractionApi.getByPatient(patientId, {
                    page: 1,
                    page_size: 10,
                });

                if (!mounted) return;

                // Normalize records and group by visit_id
                const normalized = response.items
                    .map(normalizeRecord)
                    .filter((r): r is RefractionHistoryItem => r !== null);

                // Group by visit_id and pick latest per visit
                const visitMap = new Map<string, RefractionHistoryItem>();
                normalized.forEach((record) => {
                    const existing = visitMap.get(record.visit_id);
                    if (
                        !existing ||
                        new Date(record.recorded_at).getTime() > new Date(existing.recorded_at).getTime()
                    ) {
                        visitMap.set(record.visit_id, record);
                    }
                });

                // Convert to array, filter out current visit, sort by date descending, take latest 5
                const uniqueByVisit = Array.from(visitMap.values())
                    .filter((r) => r.visit_id !== currentVisitId)
                    .sort(
                        (a, b) =>
                            new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
                    )
                    .slice(0, 5);

                setHistoryRecords(uniqueByVisit);
            } catch (err) {
                if (mounted) {
                    setError("Failed to fetch refraction history");
                    console.error("Error fetching refraction history:", err);
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

    // Don't render if no history
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

    const getVisitNumber = (index: number) => {
        const labels = ["Previous Visit", "2 Visits Ago", "3 Visits Ago", "4 Visits Ago", "5 Visits Ago"];
        return labels[index] || `${index + 1} Visits Ago`;
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
                            Refraction History
                        </h4>
                        <p className="text-sm text-slate-600">
                            Last {historyRecords.length} previous visit{historyRecords.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        {historyRecords.length} Record{historyRecords.length !== 1 ? "s" : ""}
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
                            {historyRecords.map((record, index) => (
                                <div
                                    key={record.id}
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
                                                {getVisitNumber(index)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {formatDate(record.recorded_at)}
                                        </span>
                                    </div>

                                    {/* Values Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* OD Column */}
                                        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                <span className="text-xs font-semibold text-blue-900">
                                                    OD (Right)
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-1 text-center">
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
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500">ADD</p>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {formatValue(record.od.add_power, "add")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* OS Column */}
                                        <div className="rounded-lg border border-green-200 bg-green-50/70 p-3">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                <span className="text-xs font-semibold text-green-900">
                                                    OS (Left)
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-1 text-center">
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
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500">ADD</p>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {formatValue(record.os.add_power, "add")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PD and Notes */}
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

                            {/* Trend summary */}
                            {historyRecords.length >= 2 && (
                                <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                                    <p className="text-xs text-sky-900">
                                        <strong>💡 Tip:</strong> Compare previous prescriptions to track changes in refraction values over time.
                                        Look for progression patterns in sphere and cylinder values.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
