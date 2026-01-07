"use client";

import React, { useMemo } from "react";
import { Eye, Clock, UserCheck, Activity, AlertCircle } from "lucide-react";
import { QueuePatientCard } from "./QueuePatientCard";
import type { TVQueuePatient, TVDisplayQueueStats } from "@/hooks/useTVDisplayQueue";
import { SSEConnectionStatus } from "@/hooks/useSSE";

interface OptometristQueuePanelProps {
    patients: TVQueuePatient[];
    stats: TVDisplayQueueStats;
    connectionStatus: SSEConnectionStatus;
}

export function OptometristQueuePanel({
    patients,
    stats,
    connectionStatus,
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
        <div className="flex h-full flex-col rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/50 via-white to-sky-50/30 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-sky-200 bg-gradient-to-r from-sky-500 to-teal-500 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                            <Eye className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Optometrist Queue</h2>
                            <p className="text-sm text-white/80">Eye Examination</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="flex-shrink-0 grid grid-cols-4 gap-3 border-b border-sky-100 bg-white/50 p-3">
                {/* Total */}
                <div className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                        <Activity className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Total</p>
                        <p className="text-lg font-bold text-slate-900">{stats.total}</p>
                    </div>
                </div>

                {/* Waiting */}
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 shadow-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
                        <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-amber-600">Waiting</p>
                        <p className="text-lg font-bold text-amber-700">{stats.waiting}</p>
                    </div>
                </div>

                {/* In Progress */}
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2 shadow-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                        <UserCheck className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-blue-600">In Progress</p>
                        <p className="text-lg font-bold text-blue-700">{stats.inProgress}</p>
                    </div>
                </div>

                {/* Emergency */}
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-2 shadow-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500">
                        <AlertCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-rose-600">Emergency</p>
                        <p className="text-lg font-bold text-rose-700">{stats.emergency}</p>
                    </div>
                </div>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
                            <p className="text-sm text-slate-500">Loading queue...</p>
                        </div>
                    </div>
                ) : sortedPatients.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <Eye className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                            <p className="text-lg font-medium text-slate-500">No patients in queue</p>
                            <p className="text-sm text-slate-400">Patients will appear here when checked in</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedPatients.map((patient) => (
                            <QueuePatientCard
                                key={patient.visit_id}
                                patient={patient}
                                queueType="optometrist"
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
