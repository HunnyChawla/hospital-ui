"use client";

import React, { useMemo } from "react";
import { Eye, Clock, UserCheck, Activity, AlertCircle, Users } from "lucide-react";
import { QueuePatientCard } from "./QueuePatientCard";
import type { TVQueuePatient, TVDisplayQueueStats } from "@/hooks/useTVDisplayQueue";
import { SSEConnectionStatus } from "@/hooks/useSSE";

interface OptometristQueuePanelProps {
    patients: TVQueuePatient[];
    stats: TVDisplayQueueStats;
    connectionStatus: SSEConnectionStatus;
    showStats?: boolean;
    viewMode?: 'list' | 'tiles';
    isFullWidth?: boolean;
}

export function OptometristQueuePanel({
    patients,
    stats,
    connectionStatus,
    showStats = true,
    viewMode = 'list',
    isFullWidth = false,
}: OptometristQueuePanelProps) {
    // Sort patients: emergency first, then by token number
    const sortedPatients = useMemo(() => {
        return [...patients].sort((a, b) => {
            // Emergency patients first
            if (a.visit_type === "emergency" && b.visit_type !== "emergency") return -1;
            if (b.visit_type === "emergency" && a.visit_type !== "emergency") return 1;

            // Then by token number
            const tokenA = typeof a.token_number === "string" ? parseInt(a.token_number) : a.token_number;
            const tokenB = typeof b.token_number === "string" ? parseInt(b.token_number) : b.token_number;
            return tokenA - tokenB;
        });
    }, [patients]);

    const isLoading = connectionStatus === "connecting" || connectionStatus === "reconnecting";

    return (
        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/50 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 border border-teal-100">
                            <Eye className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Optometrist Queue</h2>
                            <p className="text-sm text-slate-500">Eye Examination</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            {showStats && (
                <div className="flex-shrink-0 grid grid-cols-4 gap-3 border-b border-slate-200 bg-white px-4 py-3">
                    {/* Total */}
                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100">
                            <Activity className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</p>
                            <p className="text-lg font-bold text-slate-700 leading-none">{stats.total}</p>
                        </div>
                    </div>

                    {/* Waiting */}
                    <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/30 p-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-amber-100">
                            <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/70">Waiting</p>
                            <p className="text-lg font-bold text-amber-700 leading-none">{stats.waiting}</p>
                        </div>
                    </div>

                    {/* In Progress */}
                    <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/30 p-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-blue-100">
                            <UserCheck className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600/70">Active</p>
                            <p className="text-lg font-bold text-blue-700 leading-none">{stats.inProgress}</p>
                        </div>
                    </div>

                    {/* Emergency */}
                    <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/30 p-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-rose-100">
                            <AlertCircle className="h-4 w-4 text-rose-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600/70">Ugent</p>
                            <p className="text-lg font-bold text-rose-700 leading-none">{stats.emergency}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500" />
                            <p className="text-sm text-slate-500">Loading queue...</p>
                        </div>
                    </div>
                ) : sortedPatients.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400">
                        <div className="rounded-full bg-slate-50 p-4 mb-3">
                            <Users className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="font-medium">Queue is empty</p>
                        <p className="text-sm">No patients waiting</p>
                    </div>
                ) : (
                    <div className={viewMode === 'list'
                        ? "space-y-3"
                        : `grid gap-3 ${isFullWidth
                            ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                            : "grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3"
                        }`
                    }>
                        {sortedPatients.map((patient) => (
                            <QueuePatientCard
                                key={patient.visit_id}
                                patient={patient}
                                isNext={false} // Optometrist queue logic doesn't strictly have "Next" in the same way, or it's implicitly the top one
                                isEmergency={patient.visit_type === "emergency"}
                                queueType="optometrist"
                                viewMode={viewMode}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
