"use client";

import React, { useMemo } from "react";
import { Stethoscope, Clock, UserCheck, Activity, AlertCircle } from "lucide-react";
import { QueuePatientCard } from "./QueuePatientCard";
import type { TVQueuePatient, TVDisplayQueueStats } from "@/hooks/useTVDisplayQueue";
import { SSEConnectionStatus } from "@/hooks/useSSE";

interface DoctorQueuePanelProps {
    patients: TVQueuePatient[];
    stats: TVDisplayQueueStats;
    connectionStatus: SSEConnectionStatus;
}

export function DoctorQueuePanel({
    patients,
    stats,
    connectionStatus,
}: DoctorQueuePanelProps) {
    // Sort patients: emergency first, then by status priority, then by token number
    const sortedPatients = useMemo(() => {
        return [...patients].sort((a, b) => {
            // Emergency patients first
            if (a.visit_type === "emergency" && b.visit_type !== "emergency") return -1;
            if (b.visit_type === "emergency" && a.visit_type !== "emergency") return 1;

            // Then by status priority (consultation_in_progress > awaiting_doctor > others)
            const statusPriority = (status: string) => {
                switch (status) {
                    case "consultation_in_progress":
                        return 0;
                    case "awaiting_doctor":
                        return 1;
                    default:
                        return 2; // optometrist statuses go last
                }
            };

            const priorityDiff = statusPriority(a.status) - statusPriority(b.status);
            if (priorityDiff !== 0) return priorityDiff;

            // Then by token number within same priority
            const tokenA = typeof a.token_number === "string" ? parseInt(a.token_number) : a.token_number;
            const tokenB = typeof b.token_number === "string" ? parseInt(b.token_number) : b.token_number;
            return tokenA - tokenB;
        });
    }, [patients]);

    // Find the first awaiting_doctor patient (next in queue)
    const nextPatientId = useMemo(() => {
        const awaitingPatients = patients
            .filter((p) => p.status === "awaiting_doctor" && p.visit_type !== "emergency")
            .sort((a, b) => {
                const tokenA = typeof a.token_number === "string" ? parseInt(a.token_number) : a.token_number;
                const tokenB = typeof b.token_number === "string" ? parseInt(b.token_number) : b.token_number;
                return tokenA - tokenB;
            });
        return awaitingPatients[0]?.visit_id;
    }, [patients]);

    // Count greyed out patients
    const greyedCount = useMemo(() => {
        return patients.filter(
            (p) => p.status === "optometrist_assigned" || p.status === "optometrist_investigation_in_progress"
        ).length;
    }, [patients]);

    const isLoading = connectionStatus === "connecting" || connectionStatus === "reconnecting";

    return (
        <div className="flex h-full flex-col rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/50 via-white to-violet-50/30 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-violet-200 bg-gradient-to-r from-violet-500 to-purple-600 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                            <Stethoscope className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Doctor's Queue</h2>
                            <p className="text-sm text-white/80">Consultation</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="flex-shrink-0 grid grid-cols-4 gap-3 border-b border-violet-100 bg-white/50 p-3">
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

                {/* Consulting */}
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2 shadow-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                        <UserCheck className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-blue-600">Consulting</p>
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
                            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
                            <p className="text-sm text-slate-500">Loading queue...</p>
                        </div>
                    </div>
                ) : sortedPatients.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <Stethoscope className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                            <p className="text-lg font-medium text-slate-500">No patients in queue</p>
                            <p className="text-sm text-slate-400">Patients will appear here when ready for doctor</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedPatients.map((patient) => {
                            const isGreyed =
                                patient.status === "optometrist_assigned" ||
                                patient.status === "optometrist_investigation_in_progress";
                            const isNext = patient.visit_id === nextPatientId;

                            return (
                                <QueuePatientCard
                                    key={patient.visit_id}
                                    patient={patient}
                                    isNext={isNext}
                                    isGreyed={isGreyed}
                                    queueType="doctor"
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Greyed out hint */}
            {greyedCount > 0 && (
                <div className="flex-shrink-0 border-t border-violet-100 bg-slate-50 px-4 py-2">
                    <p className="text-xs text-slate-500 text-center">
                        <span className="font-medium">{greyedCount}</span> patient{greyedCount > 1 ? "s" : ""} still with optometrist - may move ahead when ready
                    </p>
                </div>
            )}
        </div>
    );
}
