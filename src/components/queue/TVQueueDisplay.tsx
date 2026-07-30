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
import { Footer } from "@/components/layout/Footer";

interface TVQueueSettings {
    showTopBar: boolean;
    showStats: boolean;
    showOptometristQueue: boolean;
    showDoctorQueue: boolean;
    viewMode: 'list' | 'tiles';
    enableSound: boolean;
    enableVoice: boolean;
    enableHindiVoice: boolean;
    englishVoiceGender: 'male' | 'female';
    hindiVoiceGender: 'male' | 'female';
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
                text: "Live (SSE Stream)",
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
    const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

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
        enableHindiVoice: false,
        englishVoiceGender: 'female',
        hindiVoiceGender: 'female',
    });

    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem('tv-queue-settings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setSettings(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        setHasLoadedSettings(true);
    }, []);

    // Save settings to localStorage
    useEffect(() => {
        if (hasLoadedSettings) {
            localStorage.setItem('tv-queue-settings', JSON.stringify(settings));
        }
    }, [settings, hasLoadedSettings]);

    // Save selection to localStorage whenever it changes
    useEffect(() => {
        if (selectedDoctorId) {
            localStorage.setItem('tv-queue-selected-doctor', selectedDoctorId);
        }
    }, [selectedDoctorId]);

    // Initialize doctor selection (from localStorage or default to first)
    useEffect(() => {
        if (doctors.length > 0 && !selectedDoctorId) {
            const savedId = localStorage.getItem('tv-queue-selected-doctor');
            const isValidSavedId = savedId && doctors.some(d => d.id === savedId);

            if (isValidSavedId) {
                setSelectedDoctorId(savedId as string);
            } else {
                setSelectedDoctorId(doctors[0].id);
            }
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
        enableHindiVoice: settings.enableHindiVoice,
        englishVoiceGender: settings.englishVoiceGender,
        hindiVoiceGender: settings.hindiVoiceGender,
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
        ? "fixed inset-0 z-[9999] bg-slate-50 overflow-hidden"
        : "h-[calc(100vh-80px)] bg-slate-50/50 overflow-hidden";

    return (
        <div className={containerClass}>
            <div className={`flex h-full flex-col p-4 relative ${isFullScreen ? 'pb-16' : ''}`}>
                {/* Settings Modal */}
                {showSettings && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
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
                                {/* View Mode Toggle - Full Width */}
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

                                {/* Settings in Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Top Header Toggle */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <Layout className="h-4 w-4 text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-700 text-sm">Top Header</p>
                                                <p className="text-[10px] text-slate-500">Show title & controls</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer scale-90">
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
                                                <p className="font-semibold text-slate-700 text-sm">Statistics</p>
                                                <p className="text-[10px] text-slate-500">Show queue counts</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer scale-90">
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
                                                <p className="font-semibold text-slate-700 text-sm">Optometrist Queue</p>
                                                <p className="text-[10px] text-slate-500">Eye exam queue</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer scale-90">
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
                                                <p className="font-semibold text-slate-700 text-sm">Doctor Queue</p>
                                                <p className="text-[10px] text-slate-500">Consultation queue</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer scale-90">
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
                                                <p className="font-semibold text-slate-700 text-sm">Notification Sound</p>
                                                <p className="text-[10px] text-slate-500">Chime on assignment</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer scale-90">
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
                                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                                    <Mic2 className="h-4 w-4 text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-700 text-sm">Voice (English)</p>
                                                    <p className="text-[10px] text-slate-500">Announce patient names</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer scale-90">
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
                                        {settings.enableVoice && ttsSupported && (
                                            <div className="flex items-center gap-2 mt-1 px-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Voice Type:</span>
                                                <div className="flex bg-white rounded-md border border-slate-200 p-0.5 ml-auto">
                                                    <button
                                                        onClick={() => setSettings(s => ({ ...s, englishVoiceGender: 'female' }))}
                                                        className={`px-2 py-0.5 text-[9px] font-bold rounded ${settings.englishVoiceGender === 'female' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        FEMALE
                                                    </button>
                                                    <button
                                                        onClick={() => setSettings(s => ({ ...s, englishVoiceGender: 'male' }))}
                                                        className={`px-2 py-0.5 text-[9px] font-bold rounded ${settings.englishVoiceGender === 'male' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        MALE
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Hindi Voice Toggle */}
                                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                                    <Mic2 className="h-4 w-4 text-orange-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-700 text-sm">Voice (Hindi)</p>
                                                    <p className="text-[10px] text-slate-500">हिंदी में घोषणा करें</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer scale-90">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={settings.enableHindiVoice}
                                                    onChange={(e) => setSettings(s => ({ ...s, enableHindiVoice: e.target.checked }))}
                                                    disabled={!ttsSupported}
                                                />
                                                <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500 ${!ttsSupported ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                                            </label>
                                        </div>
                                        {settings.enableHindiVoice && ttsSupported && (
                                            <div className="flex items-center gap-2 mt-1 px-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Voice Type:</span>
                                                <div className="flex bg-white rounded-md border border-slate-200 p-0.5 ml-auto">
                                                    <button
                                                        onClick={() => setSettings(s => ({ ...s, hindiVoiceGender: 'female' }))}
                                                        className={`px-2 py-0.5 text-[9px] font-bold rounded ${settings.hindiVoiceGender === 'female' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        FEMALE
                                                    </button>
                                                    <button
                                                        onClick={() => setSettings(s => ({ ...s, hindiVoiceGender: 'male' }))}
                                                        className={`px-2 py-0.5 text-[9px] font-bold rounded ${settings.hindiVoiceGender === 'male' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        MALE
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
                                    <div className="grid grid-cols-2 gap-3 pb-2">
                                        <button
                                            onClick={() => announceText("Testing English voice announcement", "en-IN", settings.englishVoiceGender)}
                                            disabled={!ttsSupported}
                                            className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Mic2 className="h-3.5 w-3.5" />
                                            TEST ENGLISH
                                        </button>
                                        <button
                                            onClick={() => announceText("हिंदी वॉयस घोषणा का परीक्षण", "hi-IN", settings.hindiVoiceGender)}
                                            disabled={!ttsSupported}
                                            className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Mic2 className="h-3.5 w-3.5 text-orange-600" />
                                            TEST HINDI
                                        </button>
                                    </div>
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

                                {/* Time Display in Header (Only when not in fullscreen) */}
                                {!isFullScreen && (
                                    <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 font-bold text-lg shadow-inner shadow-slate-200/50">
                                        <CurrentTime />
                                    </div>
                                )}
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
                        {/* Time Badge when header is hidden (Only when not in fullscreen) */}
                        {!isFullScreen && (
                            <div className="bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-200 shadow-xl font-bold text-slate-700 text-lg mr-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <CurrentTime />
                            </div>
                        )}
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

                {/* Settings Button - Show if top bar is visible (if hidden, it's in the floating controls above) */}
                {settings.showTopBar && (
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

                {/* Footer - Branding & Time (Only show in fullscreen as layout has its own footer) */}
                {isFullScreen && (
                    <div className="absolute bottom-0 left-0 right-0 z-40">
                        <Footer noSidebar isFixed={false} className="bg-white/80 backdrop-blur-md" />
                        <div className="absolute right-8 bottom-4 z-50">
                            <span className="bg-slate-100 px-4 py-1.5 rounded-full text-slate-700 font-bold border border-slate-200 shadow-sm text-lg">
                                <CurrentTime />
                            </span>
                        </div>
                    </div>
                )}
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
