"use client";

import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { visionApi } from "@/services/visionApi";
import clsx from "clsx";

interface VisionHistoryItem {
    id: string;
    visit_id: string;
    recorded_at: string;
    od: {
        ucva_distance: string | null;
        ph_va: string | null;
        va_with_current_specs: string | null;
        bcva_distance: string | null;
        near_ucva: string | null;
        near_with_current_specs: string | null;
        near_bcva: string | null;
    };
    os: {
        ucva_distance: string | null;
        ph_va: string | null;
        va_with_current_specs: string | null;
        bcva_distance: string | null;
        near_ucva: string | null;
        near_with_current_specs: string | null;
        near_bcva: string | null;
    };
    notes?: string | null;
}

interface VisionHistorySectionProps {
    patientId: string;
    currentVisitId?: string;
}

export function VisionHistorySection({
    patientId,
    currentVisitId,
}: VisionHistorySectionProps) {
    const [loading, setLoading] = useState(true);
    const [historyRecords, setHistoryRecords] = useState<VisionHistoryItem[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const formatVA = (value: string | null | undefined) => {
        if (!value || value === "") return "—";
        return value;
    };

    const normalizeRecord = (record: any): VisionHistoryItem | null => {
        if (!record) return null;

        return {
            id: record.id,
            visit_id: record.visit_id,
            recorded_at: record.recorded_at || record.created_at || new Date().toISOString(),
            od: {
                ucva_distance: record.od_ucva_distance || null,
                ph_va: record.od_ph_va || null,
                va_with_current_specs: record.od_va_with_current_specs || null,
                bcva_distance: record.od_bcva_distance || null,
                near_ucva: record.od_near_ucva || null,
                near_with_current_specs: record.od_near_with_current_specs || null,
                near_bcva: record.od_near_bcva || null,
            },
            os: {
                ucva_distance: record.os_ucva_distance || null,
                ph_va: record.os_ph_va || null,
                va_with_current_specs: record.os_va_with_current_specs || null,
                bcva_distance: record.os_bcva_distance || null,
                near_ucva: record.os_near_ucva || null,
                near_with_current_specs: record.os_near_with_current_specs || null,
                near_bcva: record.os_near_bcva || null,
            },
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

                const response = await visionApi.getByPatient(patientId, {
                    page: 1,
                    page_size: 10,
                });

                if (!mounted) return;

                const normalized = response.items
                    .map(normalizeRecord)
                    .filter((r): r is VisionHistoryItem => r !== null);

                // Group by visit_id and pick latest per visit
                const visitMap = new Map<string, VisionHistoryItem>();
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
                    setError("Failed to fetch vision history");
                    console.error("Error fetching vision history:", err);
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
                    <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
                        <History className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-base font-semibold text-slate-900">
                            Vision History
                        </h4>
                        <p className="text-sm text-slate-600">
                            Last {historyRecords.length} previous visit{historyRecords.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">
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
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
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
                                            ? "border-teal-200 bg-teal-50/50"
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
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">UCVA (Distance):</span>
                                                    <span className="font-medium text-slate-800">{formatVA(record.od.ucva_distance)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">PH:</span>
                                                    <span className="font-medium text-slate-800">{formatVA(record.od.ph_va)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">With Specs:</span>
                                                    <span className="font-medium text-slate-800">{formatVA(record.od.va_with_current_specs)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">BCVA:</span>
                                                    <span className="font-medium text-slate-800">{formatVA(record.od.bcva_distance)}</span>
                                                </div>
                                                {(record.od.near_ucva || record.od.near_bcva) && (
                                                    <>
                                                        <div className="border-t border-blue-200 my-1 pt-1" />
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500">Near UCVA:</span>
                                                            <span className="font-medium text-slate-800">{formatVA(record.od.near_ucva)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500">Near BCVA:</span>
                                                            <span className="font-medium text-slate-800">{formatVA(record.od.near_bcva)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* OS */}
                                        <div className="rounded-lg border border-green-200 bg-green-50/70 p-3">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                <span className="text-xs font-semibold text-green-900">OS (Left)</span>
                                            </div>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">UCVA (Distance):</span>
                                                    <span className="font-medium text-slate-800">{formatVA(record.os.ucva_distance)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">PH:</span>
                                                    <span className="font-medium text-slate-800">{formatVA(record.os.ph_va)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">With Specs:</span>
                                                    <span className="font-medium text-slate-800">{formatVA(record.os.va_with_current_specs)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">BCVA:</span>
                                                    <span className="font-medium text-slate-800">{formatVA(record.os.bcva_distance)}</span>
                                                </div>
                                                {(record.os.near_ucva || record.os.near_bcva) && (
                                                    <>
                                                        <div className="border-t border-green-200 my-1 pt-1" />
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500">Near UCVA:</span>
                                                            <span className="font-medium text-slate-800">{formatVA(record.os.near_ucva)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500">Near BCVA:</span>
                                                            <span className="font-medium text-slate-800">{formatVA(record.os.near_bcva)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {record.notes && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 italic">
                                            Note: {record.notes}
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
