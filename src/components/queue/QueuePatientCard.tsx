"use client";

import React from "react";
import { Clock, UserCheck, AlertCircle, Stethoscope, Eye, Sparkles } from "lucide-react";
import type { TVQueuePatient } from "@/hooks/useTVDisplayQueue";

interface QueuePatientCardProps {
    patient: TVQueuePatient;
    isNext?: boolean;
    isGreyed?: boolean;
    isEmergency?: boolean;
    queueType: "optometrist" | "doctor";
    viewMode?: 'list' | 'tiles';
}

export function QueuePatientCard({
    patient,
    isNext = false,
    isGreyed = false,
    queueType,
    viewMode = 'list',
}: QueuePatientCardProps) {
    const isEmergency = patient.visit_type === "emergency";
    const tokenNumber =
        typeof patient.token_number === "string"
            ? parseInt(patient.token_number)
            : patient.token_number;

    // Get status-based styling
    const getStatusStyles = () => {
        // Next patient - Always Green and Highlighted (High Priority)
        if (isNext) {
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
        }

        // Emergency always gets red styling
        // Emergency always gets red styling, UNLESS it is greyed out (still with optometrist)
        if (isEmergency) {
            if (isGreyed) {
                return {
                    cardBg: "bg-rose-50/30",
                    cardBorder: "border border-rose-200 opacity-75",
                    cardShadow: "shadow-sm",
                    tokenBg: "bg-rose-100 text-rose-400",
                    tokenText: "text-rose-400",
                    statusBadgeBg: "bg-rose-50 text-rose-400",
                    statusBadgeText: "text-rose-400",
                    animation: "",
                };
            }
            return {
                cardBg: "bg-white",
                cardBorder: "border-l-4 border-l-rose-500 border-y border-r border-slate-200",
                cardShadow: "shadow-md hover:shadow-lg shadow-rose-100",
                tokenBg: "bg-rose-50 text-rose-700",
                tokenText: "text-rose-700",
                statusBadgeBg: "bg-rose-100 text-rose-700",
                statusBadgeText: "text-rose-700",
                animation: "", // Removed animation for Emergency
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
                return "Investigation in progress";
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


            {/* Next Badge */}
            {isNext && (
                <div className="absolute right-2 top-2 z-10">
                    <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 py-1 shadow-lg shadow-emerald-500/30">
                        <Sparkles className="h-3 w-3 text-white" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">Next</span>
                    </div>
                </div>
            )}

            <div className={`flex h-full ${viewMode === 'tiles' ? 'flex-col items-center text-center justify-between gap-4' : 'items-center gap-4'}`}>
                {/* Token Number */}
                <div
                    className={`flex flex-shrink-0 items-center justify-center rounded-2xl ${styles.tokenBg} shadow-inner bg-opacity-50 ${viewMode === 'tiles' ? 'h-20 w-20' : 'h-16 w-16'}`}
                >
                    <span className={`${viewMode === 'tiles' ? 'text-3xl' : 'text-2xl'} font-black ${styles.tokenText} tracking-tight`}>
                        {tokenNumber}
                    </span>
                </div>

                {/* Patient Info */}
                <div className={`flex-1 min-w-0 w-full ${viewMode === 'tiles' ? 'flex flex-col items-center' : ''}`}>
                    <p className={`font-bold text-slate-900 truncate w-full ${viewMode === 'tiles' ? 'text-xl mb-1' : 'text-lg'}`}>{patient.patient_name}</p>
                    {patient.patient_uhid && (
                        <p className={`text-sm font-medium text-slate-500 truncate w-full ${viewMode === 'tiles' ? 'bg-slate-100/50 px-2 py-0.5 rounded-md' : ''}`}>
                            {patient.patient_uhid}
                        </p>
                    )}
                    {isEmergency && (
                        <div className={`flex items-center gap-1 mt-1 ${viewMode === 'tiles' ? 'justify-center' : ''}`}>
                            <AlertCircle className="h-3 w-3 text-rose-600" />
                            <span className="text-[10px] font-bold uppercase text-rose-600">Emergency</span>
                        </div>
                    )}
                </div>

                {/* Status and Hint Container */}
                <div className={`flex flex-col ${viewMode === 'tiles' ? 'w-full items-center mt-auto' : 'items-end justify-center min-w-[120px] translate-y-1'}`}>
                    {!isNext && (
                        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${styles.statusBadgeBg} ${viewMode === 'tiles' ? 'w-full justify-center' : ''}`}>
                            <StatusIcon className={`h-4 w-4 ${styles.statusBadgeText}`} />
                            <span className={`text-xs font-bold uppercase tracking-wider ${styles.statusBadgeText}`}>
                                {getStatusLabel()}
                            </span>
                        </div>
                    )}

                    {isGreyed && (
                        <div className={`text-[10px] leading-tight font-semibold text-slate-500 italic mt-2 ${viewMode === 'tiles' ? 'text-center px-2' : 'text-right'}`}>
                            May move ahead after optometrist
                        </div>
                    )}

                    {/* Cabin Info */}
                    {/* Cabin Info */}
                    {((queueType === "optometrist" && patient.optometrist_cabin) || (queueType === "doctor" && patient.doctor_cabin)) && (
                        <div className={`mt-1.5 flex items-center ${viewMode === 'tiles' ? 'justify-center' : 'justify-end'}`}>
                            <span className="text-xs font-bold text-slate-700">
                                {queueType === "optometrist" ? patient.optometrist_cabin : patient.doctor_cabin}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
