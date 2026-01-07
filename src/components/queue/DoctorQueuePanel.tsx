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
        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/50 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 border border-violet-100">
                            <Stethoscope className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Doctor's Queue</h2>
                            <p className="text-sm text-slate-500">Consultation</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
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

                {/* Consulting */}
                <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/30 p-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-blue-100">
                        <UserCheck className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600/70">Consulting</p>
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
