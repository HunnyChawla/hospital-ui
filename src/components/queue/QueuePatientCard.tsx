"use client";

import React from "react";
import { Clock, UserCheck, AlertCircle, Stethoscope, Eye, Sparkles } from "lucide-react";
import type { TVQueuePatient } from "@/hooks/useTVDisplayQueue";

interface QueuePatientCardProps {
    patient: TVQueuePatient;
    isNext?: boolean;
    isGreyed?: boolean;
    queueType: "optometrist" | "doctor";
}

export function QueuePatientCard({
    patient,
    isNext = false,
    isGreyed = false,
    queueType,
}: QueuePatientCardProps) {
    const isEmergency = patient.visit_type === "emergency";
    const tokenNumber =
        typeof patient.token_number === "string"
            ? parseInt(patient.token_number)
            : patient.token_number;

    // Get status-based styling
    const getStatusStyles = () => {
        // Emergency always gets red styling
        if (isEmergency) {
            return {
                cardBg: "bg-gradient-to-br from-rose-50 via-red-50 to-rose-100",
                cardBorder: "border-rose-400 ring-4 ring-rose-200/50",
                cardShadow: "shadow-xl shadow-rose-500/30",
                tokenBg: "bg-gradient-to-br from-rose-500 to-red-600",
                tokenText: "text-white",
                statusBadgeBg: "bg-rose-500",
                statusBadgeText: "text-white",
                animation: "animate-pulse",
            };
        }

        // Greyed out (optometrist patients in doctor queue)
        if (isGreyed) {
            return {
                cardBg: "bg-gradient-to-br from-slate-100 via-slate-50 to-white",
                cardBorder: "border-slate-200",
                cardShadow: "shadow-md",
                tokenBg: "bg-gradient-to-br from-slate-300 to-slate-400",
                tokenText: "text-white",
                statusBadgeBg: "bg-slate-400",
                statusBadgeText: "text-white",
                animation: "",
            };
        }

        // Next patient
        if (isNext) {
            return {
                cardBg: "bg-gradient-to-br from-sky-50 via-teal-50 to-sky-100",
                cardBorder: "border-sky-400 ring-4 ring-sky-200/50",
                cardShadow: "shadow-xl shadow-sky-500/25",
                tokenBg: "bg-gradient-to-br from-sky-500 to-teal-500",
                tokenText: "text-white",
                statusBadgeBg: "bg-sky-500",
                statusBadgeText: "text-white",
                animation: "animate-pulse",
            };
        }

        // Status-based styling
        switch (patient.status) {
            case "optometrist_assigned":
                return {
                    cardBg: "bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100",
                    cardBorder: "border-emerald-400 ring-2 ring-emerald-200/50",
                    cardShadow: "shadow-lg shadow-emerald-500/20",
                    tokenBg: "bg-gradient-to-br from-emerald-500 to-green-600",
                    tokenText: "text-white",
                    statusBadgeBg: "bg-emerald-500",
                    statusBadgeText: "text-white",
                    animation: "animate-pulse",
                };

            case "optometrist_investigation_in_progress":
            case "consultation_in_progress":
                return {
                    cardBg: "bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100",
                    cardBorder: "border-blue-400 ring-2 ring-blue-200/50",
                    cardShadow: "shadow-lg shadow-blue-500/20",
                    tokenBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
                    tokenText: "text-white",
                    statusBadgeBg: "bg-blue-500",
                    statusBadgeText: "text-white",
                    animation: "",
                };

            case "awaiting_optometrist":
            case "awaiting_doctor":
            default:
                return {
                    cardBg: "bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100",
                    cardBorder: "border-amber-300",
                    cardShadow: "shadow-md shadow-amber-500/10",
                    tokenBg: "bg-gradient-to-br from-amber-500 to-orange-500",
                    tokenText: "text-white",
                    statusBadgeBg: "bg-amber-500",
                    statusBadgeText: "text-white",
                    animation: "",
                };
        }
    };

    const getStatusLabel = () => {
        if (isNext) return "NEXT";

        switch (patient.status) {
            case "awaiting_optometrist":
                return "Waiting";
            case "optometrist_assigned":
                return "Your Turn";
            case "optometrist_investigation_in_progress":
                return "In Progress";
            case "awaiting_doctor":
                return "Waiting";
            case "consultation_in_progress":
                return "Consulting";
            default:
                return patient.status.replace(/_/g, " ");
        }
    };

    const getStatusIcon = () => {
        if (isNext) return Sparkles;

        switch (patient.status) {
            case "optometrist_assigned":
                return UserCheck;
            case "optometrist_investigation_in_progress":
            case "consultation_in_progress":
                return queueType === "optometrist" ? Eye : Stethoscope;
            default:
                return Clock;
        }
    };

    const styles = getStatusStyles();
    const StatusIcon = getStatusIcon();

    return (
        <div
            className={`relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 ${styles.cardBg} ${styles.cardBorder} ${styles.cardShadow} ${styles.animation}`}
        >
            {/* Emergency Badge */}
            {isEmergency && (
                <div className="absolute right-2 top-2 z-10">
                    <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-2.5 py-1 shadow-lg shadow-rose-500/40">
                        <AlertCircle className="h-3 w-3 text-white" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">Emergency</span>
                    </div>
                </div>
            )}

            {/* Next Badge */}
            {isNext && !isEmergency && (
                <div className="absolute right-2 top-2 z-10">
                    <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-2.5 py-1 shadow-lg shadow-sky-500/30">
                        <Sparkles className="h-3 w-3 text-white" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">Next</span>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4">
                {/* Token Number */}
                <div
                    className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl ${styles.tokenBg} shadow-lg`}
                >
                    <span className={`text-2xl font-extrabold ${styles.tokenText} drop-shadow-sm`}>
                        {tokenNumber}
                    </span>
                </div>

                {/* Patient Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-slate-900 truncate">{patient.patient_name}</p>
                    {patient.patient_uhid && (
                        <p className="text-sm text-slate-500 truncate">UHID: {patient.patient_uhid}</p>
                    )}
                </div>

                {/* Status Badge */}
                {(!isNext || isEmergency) && (
                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${styles.statusBadgeBg}`}>
                        <StatusIcon className={`h-4 w-4 ${styles.statusBadgeText}`} />
                        <span className={`text-sm font-semibold ${styles.statusBadgeText}`}>
                            {getStatusLabel()}
                        </span>
                    </div>
                )}
            </div>

            {/* Greyed out tooltip hint */}
            {isGreyed && (
                <div className="mt-2 text-xs text-slate-500 italic">
                    May move ahead after optometrist
                </div>
            )}
        </div>
    );
}
