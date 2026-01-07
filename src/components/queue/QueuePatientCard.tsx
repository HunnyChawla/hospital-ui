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
                cardBg: "bg-white",
                cardBorder: "border-l-4 border-l-rose-500 border-y border-r border-slate-200",
                cardShadow: "shadow-md hover:shadow-lg shadow-rose-100",
                tokenBg: "bg-rose-50 text-rose-700",
                tokenText: "text-rose-700",
                statusBadgeBg: "bg-rose-100 text-rose-700",
                statusBadgeText: "text-rose-700",
                animation: "animate-pulse",
            };
        }

        // Greyed out (optometrist patients in doctor queue)
        if (isGreyed) {
            return {
                cardBg: "bg-slate-50/50",
                cardBorder: "border border-slate-200",
                cardShadow: "shadow-sm",
                tokenBg: "bg-slate-100 text-slate-500",
                tokenText: "text-slate-500",
                statusBadgeBg: "bg-slate-100 text-slate-500",
                statusBadgeText: "text-slate-500",
                animation: "",
            };
        }

        // Next patient
        if (isNext) {
            return {
                cardBg: "bg-white",
                cardBorder: "border-l-4 border-l-sky-500 border-y border-r border-slate-200",
                cardShadow: "shadow-md hover:shadow-lg shadow-sky-100",
                tokenBg: "bg-sky-50 text-sky-700",
                tokenText: "text-sky-700",
                statusBadgeBg: "bg-sky-100 text-sky-700",
                statusBadgeText: "text-sky-700",
                animation: "animate-pulse",
            };
        }

        // Status-based styling
        switch (patient.status) {
            case "optometrist_assigned":
                return {
                    cardBg: "bg-white",
                    cardBorder: "border-l-4 border-l-emerald-500 border-y border-r border-slate-200",
                    cardShadow: "shadow-md hover:shadow-lg shadow-emerald-100",
                    tokenBg: "bg-emerald-50 text-emerald-700",
                    tokenText: "text-emerald-700",
                    statusBadgeBg: "bg-emerald-100 text-emerald-700",
                    statusBadgeText: "text-emerald-700",
                    animation: "animate-pulse",
                };

            case "optometrist_investigation_in_progress":
            case "consultation_in_progress":
                return {
                    cardBg: "bg-white",
                    cardBorder: "border-l-4 border-l-blue-500 border-y border-r border-slate-200",
                    cardShadow: "shadow-md hover:shadow-lg shadow-blue-100",
                    tokenBg: "bg-blue-50 text-blue-700",
                    tokenText: "text-blue-700",
                    statusBadgeBg: "bg-blue-100 text-blue-700",
                    statusBadgeText: "text-blue-700",
                    animation: "",
                };

            case "awaiting_optometrist":
            case "awaiting_doctor":
            default:
                return {
                    cardBg: "bg-white",
                    cardBorder: "border-l-4 border-l-amber-400 border-y border-r border-slate-200",
                    cardShadow: "shadow-sm hover:shadow-md",
                    tokenBg: "bg-amber-50 text-amber-700",
                    tokenText: "text-amber-700",
                    statusBadgeBg: "bg-amber-100 text-amber-700",
                    statusBadgeText: "text-amber-700",
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
