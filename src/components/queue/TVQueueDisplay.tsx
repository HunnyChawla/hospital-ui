"use client";

import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/redux/hooks";
import {
    Wifi,
    WifiOff,
    Loader2,
    ChevronDown,
    Stethoscope,
    Maximize,
    X,
    MonitorPlay
} from "lucide-react";
import { useTVDisplayQueue } from "@/hooks/useTVDisplayQueue";
import { OptometristQueuePanel } from "./OptometristQueuePanel";
import { DoctorQueuePanel } from "./DoctorQueuePanel";
import { SSEConnectionStatus } from "@/hooks/useSSE";

interface TVQueueDisplayProps {
    isFullScreen?: boolean;
    onFullScreenToggle?: () => void;
}

function getConnectionBadge(status: SSEConnectionStatus) {
    switch (status) {
        case "connected":
            return {
                icon: Wifi,
                text: "Live",
                className: "bg-emerald-500 text-white",
                iconClassName: "text-white",
                pulse: true,
            };
        case "connecting":
        case "reconnecting":
            return {
                icon: Loader2,
                text: status === "reconnecting" ? "Reconnecting..." : "Connecting...",
                className: "bg-amber-500 text-white",
                iconClassName: "text-white animate-spin",
                pulse: false,
            };
        case "error":
            return {
                icon: WifiOff,
                text: "Connection Error",
                className: "bg-rose-500 text-white",
                iconClassName: "text-white",
                pulse: false,
            };
        default:
            return {
                icon: WifiOff,
                text: "Disconnected",
                className: "bg-slate-500 text-white",
                iconClassName: "text-white",
                pulse: false,
            };
    }
}

export function TVQueueDisplay({ isFullScreen = false, onFullScreenToggle }: TVQueueDisplayProps) {
    const doctors = useAppSelector((s) => s.doctors.list);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

    // Auto-select first doctor
    useEffect(() => {
        if (doctors.length > 0 && !selectedDoctorId) {
            setSelectedDoctorId(doctors[0].id);
        }
    }, [doctors, selectedDoctorId]);

    // Use the TV display queue hook
    const {
        optometristPatients,
        doctorPatients,
        optometristStats,
        doctorStats,
        optometristStatus,
        doctorStatus,
        connectionStatus,
        reconnect,
    } = useTVDisplayQueue({
        doctorId: selectedDoctorId || null,
        autoConnect: !!selectedDoctorId,
    });

    const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
    const connectionBadge = getConnectionBadge(connectionStatus);
    const ConnectionIcon = connectionBadge.icon;

    // Handle escape key for fullscreen
    useEffect(() => {
        if (isFullScreen) {
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === "Escape" && onFullScreenToggle) {
                    onFullScreenToggle();
                }
            };
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
            return () => {
                document.removeEventListener("keydown", handleEscape);
                document.body.style.overflow = "unset";
            };
        }
    }, [isFullScreen, onFullScreenToggle]);

    const containerClass = isFullScreen
        ? "fixed inset-0 z-[9999] bg-gradient-to-br from-slate-100 via-white to-slate-100"
        : "min-h-[calc(100vh-100px)]";

    return (
        <div className={containerClass}>
            <div className="flex h-full flex-col p-4">
                {/* Header */}
                <div className="flex-shrink-0 mb-4">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-4 shadow-lg">
                        {/* Title and Doctor Selector */}
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
                                    <MonitorPlay className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">Patient Queue Display</h1>
                                    <p className="text-sm text-slate-500">Real-time queue status for waiting area</p>
                                </div>
                            </div>

                            {/* Doctor Selector */}
                            {doctors.length > 0 && (
                                <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                                    <Stethoscope className="h-5 w-5 text-slate-400" />
                                    <div className="relative">
                                        <select
                                            value={selectedDoctorId}
                                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                                            className="appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2 pr-10 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 min-w-[200px]"
                                        >
                                            {doctors.map((doc) => (
                                                <option key={doc.id} value={doc.id}>
                                                    {doc.user_name || doc.name || `Dr. ${doc.specialization}`}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Connection Status & Actions */}
                        <div className="flex items-center gap-4">
                            {/* Connection Status */}
                            <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${connectionBadge.className}`}>
                                <div className="relative">
                                    <ConnectionIcon className={`h-4 w-4 ${connectionBadge.iconClassName}`} />
                                    {connectionBadge.pulse && (
                                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-white animate-pulse" />
                                    )}
                                </div>
                                <span className="text-sm font-semibold">{connectionBadge.text}</span>
                                {connectionStatus === "error" && (
                                    <button
                                        onClick={reconnect}
                                        className="ml-1 text-xs underline hover:no-underline"
                                    >
                                        Retry
                                    </button>
                                )}
                            </div>

                            {/* Fullscreen Toggle */}
                            {onFullScreenToggle && (
                                <button
                                    onClick={onFullScreenToggle}
                                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                                >
                                    {isFullScreen ? (
                                        <>
                                            <X className="h-4 w-4" />
                                            <span>Exit</span>
                                        </>
                                    ) : (
                                        <>
                                            <Maximize className="h-4 w-4" />
                                            <span>Full Screen</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Queue Panels - Side by Side */}
                <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                    <OptometristQueuePanel
                        patients={optometristPatients}
                        stats={optometristStats}
                        connectionStatus={optometristStatus}
                    />
                    <DoctorQueuePanel
                        patients={doctorPatients}
                        stats={doctorStats}
                        connectionStatus={doctorStatus}
                    />
                </div>

                {/* Footer - Current Time */}
                <div className="flex-shrink-0 mt-4 text-center">
                    <p className="text-sm text-slate-400">
                        {selectedDoctor && (
                            <span className="font-medium text-slate-600 mr-4">
                                Dr. {selectedDoctor.user_name || selectedDoctor.name}
                                {selectedDoctor.specialization && ` • ${selectedDoctor.specialization}`}
                            </span>
                        )}
                        <CurrentTime />
                    </p>
                </div>
            </div>
        </div>
    );
}

// Simple component to show current time
function CurrentTime() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <span>
            {time.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            })}
        </span>
    );
}
