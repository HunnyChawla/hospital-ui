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
    MonitorPlay,
    Settings,
    Layout,
    Activity,
    Eye,
    Grid,
    List,
    Volume2,
    Mic2
} from "lucide-react";
import { useTVDisplayQueue } from "@/hooks/useTVDisplayQueue";
import { OptometristQueuePanel } from "./OptometristQueuePanel";
import { DoctorQueuePanel } from "./DoctorQueuePanel";
import { SSEConnectionStatus } from "@/hooks/useSSE";
import { playNotificationSound, announceText, isTTSSupported } from "@/utils/sound";

interface TVQueueSettings {
    showTopBar: boolean;
    showStats: boolean;
    showOptometristQueue: boolean;
    showDoctorQueue: boolean;
    viewMode: 'list' | 'tiles';
    enableSound: boolean;
    enableVoice: boolean;
}

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

    // Settings state
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<TVQueueSettings>({
        showTopBar: true,
        showStats: true,
        showOptometristQueue: true,
        showDoctorQueue: true,
        viewMode: 'list',
        enableSound: true,
        enableVoice: false,
    });

    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem('tv-queue-settings');
        if (savedSettings) {
            try {
                setSettings(JSON.parse(savedSettings));
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
    }, []);

    // Save settings to localStorage
    useEffect(() => {
        localStorage.setItem('tv-queue-settings', JSON.stringify(settings));
    }, [settings]);

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
        enableSound: settings.enableSound,
        enableVoice: settings.enableVoice,
    });

    const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
    const connectionBadge = getConnectionBadge(connectionStatus);
    const ConnectionIcon = connectionBadge.icon;
    const ttsSupported = isTTSSupported();

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
        ? "fixed inset-0 z-[9999] bg-slate-50"
        : "min-h-[calc(100vh-100px)] bg-slate-50/50";

    return (
        <div className={containerClass}>
            <div className="flex h-full flex-col p-4 relative">
                {/* Settings Modal */}
                {showSettings && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white">
                                <div className="flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-sky-700" />
                                    <h3 className="font-bold text-slate-800">Display Settings</h3>
                                </div>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* View Mode Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            {settings.viewMode === 'list' ? <List className="h-4 w-4 text-sky-600" /> : <Grid className="h-4 w-4 text-sky-600" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Display View</p>
                                            <p className="text-xs text-slate-500">List or Tiles orientation</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 rounded-lg bg-white p-1 border border-slate-200 shadow-sm">
                                        <button
                                            onClick={() => setSettings(s => ({ ...s, viewMode: 'list' }))}
                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.viewMode === 'list' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            LIST
                                        </button>
                                        <button
                                            onClick={() => setSettings(s => ({ ...s, viewMode: 'tiles' }))}
                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.viewMode === 'tiles' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            TILES
                                        </button>
                                    </div>
                                </div>

                                {/* Top Header Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Layout className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Top Header</p>
                                            <p className="text-xs text-slate-500">Show title and controls</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.showTopBar}
                                            onChange={(e) => setSettings(s => ({ ...s, showTopBar: e.target.checked }))}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                    </label>
                                </div>

                                {/* Stats Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Activity className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Statistics</p>
                                            <p className="text-xs text-slate-500">Show queue counts</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.showStats}
                                            onChange={(e) => setSettings(s => ({ ...s, showStats: e.target.checked }))}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                    </label>
                                </div>

                                {/* Optometrist Queue Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Eye className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Optometrist Queue</p>
                                            <p className="text-xs text-slate-500">Show eye exam queue</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.showOptometristQueue}
                                            onChange={(e) => setSettings(s => ({ ...s, showOptometristQueue: e.target.checked }))}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                    </label>
                                </div>

                                {/* Doctor Queue Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Stethoscope className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Doctor Queue</p>
                                            <p className="text-xs text-slate-500">Show consultation queue</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.showDoctorQueue}
                                            onChange={(e) => setSettings(s => ({ ...s, showDoctorQueue: e.target.checked }))}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                    </label>
                                </div>

                                {/* Sound Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Volume2 className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Notification Sound</p>
                                            <p className="text-xs text-slate-500">Play chime on assignment</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.enableSound}
                                            onChange={(e) => setSettings(s => ({ ...s, enableSound: e.target.checked }))}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                    </label>
                                </div>

                                {/* Voice Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Mic2 className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Voice Announcement</p>
                                            <p className="text-xs text-slate-500">Announce patient names</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.enableVoice}
                                            onChange={(e) => setSettings(s => ({ ...s, enableVoice: e.target.checked }))}
                                            disabled={!ttsSupported}
                                        />
                                        <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500 ${!ttsSupported ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                                    </label>
                                </div>

                                {!ttsSupported && (
                                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                        <p className="text-xs text-rose-600 font-medium">
                                            Voice announcements are not supported in this browser.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 pb-2">
                                    <button
                                        onClick={playNotificationSound}
                                        className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        <Volume2 className="h-3.5 w-3.5" />
                                        TEST SOUND
                                    </button>
                                    <button
                                        onClick={() => announceText("Testing voice announcement")}
                                        disabled={!ttsSupported}
                                        className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Mic2 className="h-3.5 w-3.5" />
                                        TEST VOICE
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-sky-500/20"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                {settings.showTopBar && (
                    <div className="flex-shrink-0 mb-4">
                        <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-4 shadow-sm">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 shadow-lg shadow-sky-500/20">
                                        <MonitorPlay className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-800">Patient Queue Display</h1>
                                        <p className="text-sm text-slate-500">Real-time waiting area status</p>
                                    </div>
                                </div>

                                {/* View Mode Toggle */}
                                <div className="hidden md:flex items-center gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200">
                                    <button
                                        onClick={() => setSettings(s => ({ ...s, viewMode: 'list' }))}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-medium ${settings.viewMode === 'list' ? 'bg-white shadow-sm text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}
                                        title="List View"
                                    >
                                        <List className="h-4 w-4" />
                                        <span>List</span>
                                    </button>
                                    <button
                                        onClick={() => setSettings(s => ({ ...s, viewMode: 'tiles' }))}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-medium ${settings.viewMode === 'tiles' ? 'bg-white shadow-sm text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}
                                        title="Tiles View"
                                    >
                                        <Grid className="h-4 w-4" />
                                        <span>Tiles</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Doctor Selector */}
                                {doctors.length > 0 && (
                                    <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 border border-slate-100">
                                            <Stethoscope className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={selectedDoctorId}
                                                onChange={(e) => setSelectedDoctorId(e.target.value)}
                                                className="appearance-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 pr-10 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 min-w-[200px]"
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

                                {/* Connection Status */}
                                <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${connectionBadge.className} shadow-sm border border-white/20`}>
                                    <div className="relative">
                                        <ConnectionIcon className={`h-3.5 w-3.5 ${connectionBadge.iconClassName}`} />
                                        {connectionBadge.pulse && (
                                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-white animate-pulse" />
                                        )}
                                    </div>
                                    <span className="text-xs font-bold tracking-wide uppercase">{connectionBadge.text}</span>
                                    {connectionStatus === "error" && (
                                        <button
                                            onClick={reconnect}
                                            className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold hover:bg-white/30"
                                        >
                                            RETRY
                                        </button>
                                    )}
                                </div>

                                {/* Fullscreen Toggle */}
                                {onFullScreenToggle && (
                                    <button
                                        onClick={onFullScreenToggle}
                                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
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
                )}

                {/* Floating controls when header is hidden */}
                {!settings.showTopBar && (
                    <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
                        {onFullScreenToggle && (
                            <button
                                onClick={onFullScreenToggle}
                                className="p-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full shadow-lg border border-slate-100 transition-all hover:scale-105"
                                title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                            >
                                {isFullScreen ? <X className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </button>
                        )}
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full shadow-lg border border-slate-100 transition-all hover:scale-105"
                            title="Display Settings"
                        >
                            <Settings className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* Settings Button - Hidden in full screen mode or if top bar is hidden (handled by floating controls) */}
                {!isFullScreen && settings.showTopBar && (
                    <button
                        onClick={() => setShowSettings(true)}
                        className="absolute top-8 right-8 z-40 p-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full shadow-lg border border-slate-100 transition-all hover:scale-105"
                        title="Display Settings"
                    >
                        <Settings className="h-5 w-5" />
                    </button>
                )}

                {/* Queue Panels */}
                <div className={`flex-1 grid gap-4 min-h-0 ${settings.showOptometristQueue && settings.showDoctorQueue
                    ? "grid-cols-2"
                    : "grid-cols-1"
                    }`}>
                    {settings.showOptometristQueue && (
                        <OptometristQueuePanel
                            patients={optometristPatients}
                            stats={optometristStats}
                            connectionStatus={optometristStatus}
                            showStats={settings.showStats}
                            viewMode={settings.viewMode}
                            isFullWidth={!settings.showDoctorQueue}
                        />
                    )}

                    {settings.showDoctorQueue && (
                        <DoctorQueuePanel
                            patients={doctorPatients}
                            stats={doctorStats}
                            connectionStatus={doctorStatus}
                            showStats={settings.showStats}
                            viewMode={settings.viewMode}
                            isFullWidth={!settings.showOptometristQueue}
                        />
                    )}
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
