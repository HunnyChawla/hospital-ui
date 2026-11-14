"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { restoreSession } from "@/redux/authSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { tvAuthApi, TVSessionInfo, TVDisplayConfig } from "@/services/tvAuthApi";
import { doctorsApi, Doctor } from "@/services/doctorsApi";
import { toast } from "sonner";
import {
    Loader2,
    Tv,
    CheckCircle,
    XCircle,
    Eye,
    Stethoscope,
    Columns,
    Layers,
    Moon,
    Sun,
    Check,
    RotateCcw,
    SlidersHorizontal,
    Volume2,
} from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";

const LOCAL_STORAGE_KEY = "tv_display_config";

const MARQUEE_PRESETS = [
    {
        id: "health_tips",
        label: "💡 Health Tips",
        badge: "HEALTH TIP",
        text: "Regular health check-ups every 6 months • Practice 20-20-20 rule for digital screens • Stay hydrated throughout the day • Practice deep breathing for stress relief • Eat fresh fruits and vegetables daily",
    },
    {
        id: "clinic_notice",
        label: "📢 Clinic Notice",
        badge: "NOTICE",
        text: "Please keep mobile phones on silent mode in the waiting lounge • Carry your previous prescription and lab reports • Cooperate with nursing staff",
    },
    {
        id: "visiting_hours",
        label: "🕒 Visiting Hours",
        badge: "INFO",
        text: "OPD Timings: Morning 9:00 AM – 2:00 PM | Evening 5:00 PM – 8:00 PM • Emergency Care available 24x7",
    },
    {
        id: "free_camp",
        label: "🩺 Free Camp",
        badge: "ANNOUNCEMENT",
        text: "Free Eye Checkup & Cataract Screening Camp this Sunday from 10:00 AM to 2:00 PM • Prior registration required at counter",
    },
];

function TVLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    const { isAuthenticated, loading: authLoading, user, userDetails } = useAppSelector((s) => s.auth);

    const [isRestored, setIsRestored] = useState(false);
    const [code, setCode] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState("");
    const [validatingCode, setValidatingCode] = useState(false);
    const [hospital, setHospital] = useState<string | null>(null);
    const [sessionInfo, setSessionInfo] = useState<TVSessionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [authorizing, setAuthorizing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Doctors list
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);

    // TV Configuration State
    const [showExaminer, setShowExaminer] = useState(true);
    const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
    const [layout, setLayout] = useState<"split" | "columns" | "auto">("split");
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [showTicker, setShowTicker] = useState(true);
    const [tickerTitle, setTickerTitle] = useState("HEALTH TIP");
    const [tickerText, setTickerText] = useState(MARQUEE_PRESETS[0].text);
    const [voiceAlerts, setVoiceAlerts] = useState(true);
    const [hasPreviousConfig, setHasPreviousConfig] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Add restoration effect
    useEffect(() => {
        dispatch(restoreSession());
        setIsRestored(true);
    }, [dispatch]);

    const applyConfig = useCallback((cfg: TVDisplayConfig) => {
        if (typeof cfg.showExaminer === "boolean") setShowExaminer(cfg.showExaminer);
        if (Array.isArray(cfg.doctorIds)) setSelectedDoctorIds(cfg.doctorIds);
        if (cfg.layout) setLayout(cfg.layout);
        if (cfg.theme) setTheme(cfg.theme);

        // Handle ticker visibility (support both showTicker and showHealthTips)
        if (typeof cfg.showTicker === "boolean") {
            setShowTicker(cfg.showTicker);
        } else if (typeof cfg.showHealthTips === "boolean") {
            setShowTicker(cfg.showHealthTips);
        }

        if (cfg.tickerTitle) setTickerTitle(cfg.tickerTitle);
        if (cfg.tickerText) setTickerText(cfg.tickerText);
        if (typeof cfg.voiceAlerts === "boolean") setVoiceAlerts(cfg.voiceAlerts);
        setHasPreviousConfig(true);
    }, []);

    const fetchSessionInfo = useCallback(async (sessionCode: string): Promise<boolean> => {
        try {
            setLoading(true);
            setError(null);
            const info = await tvAuthApi.getSessionInfo(sessionCode);
            setSessionInfo(info);

            if (info.last_config) {
                applyConfig(info.last_config);
            } else if (typeof window !== "undefined") {
                const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved) as TVDisplayConfig;
                        applyConfig(parsed);
                    } catch {
                        // Ignore parse error
                    }
                }
            }

            if (!info.can_authorize) {
                if (info.status === "authenticated") {
                    setError("This TV session has already been authorized.");
                } else if (info.status === "expired") {
                    setError("This TV pairing code has expired. Please refresh the TV screen.");
                } else {
                    setError(`TV session is in ${info.status} state.`);
                }
                return false;
            }
            return true;
        } catch (err) {
            console.error(err);
            setError("Failed to find TV session. Please verify the code on your TV screen.");
            return false;
        } finally {
            setLoading(false);
        }
    }, [applyConfig]);

    const loadDoctorsList = useCallback(async () => {
        try {
            setLoadingDoctors(true);
            const docList = await doctorsApi.list({ is_active: true });
            setDoctors(docList || []);

            // If no doctors selected yet from previous config, default select up to 2
            setSelectedDoctorIds((prev) => {
                if (prev.length > 0) return prev;
                return (docList || []).slice(0, 2).map((d) => d.id);
            });
        } catch (err) {
            console.error("Failed to fetch doctors:", err);
        } finally {
            setLoadingDoctors(false);
        }
    }, []);

    useEffect(() => {
        const codeParam = searchParams.get("code");
        const hospitalParam = searchParams.get("hospital");

        setHospital(hospitalParam);

        // Wait for restoration and auth loading
        if (isRestored && !authLoading) {
            if (!isAuthenticated) {
                // Redirect to login with canonical return URL
                const hospitalQuery = hospitalParam ? `&hospital=${encodeURIComponent(hospitalParam)}` : "";
                const returnUrl = codeParam
                    ? `/tv-login/?code=${encodeURIComponent(codeParam)}${hospitalQuery}`
                    : `/tv-login`;
                if (typeof window !== "undefined") {
                    sessionStorage.setItem("tv_login_return_url", returnUrl);
                    if (hospitalParam) {
                        localStorage.setItem("hospital_id", hospitalParam);
                    }
                }
                router.push(`/login/?returnUrl=${encodeURIComponent(returnUrl)}`);
                return;
            }

            if (codeParam) {
                setCode(codeParam);
                fetchSessionInfo(codeParam);
                loadDoctorsList();
            } else {
                setLoading(false);
            }
        }
    }, [searchParams, isAuthenticated, authLoading, router, isRestored, fetchSessionInfo, loadDoctorsList]);

    const handleConnectCode = async (e?: React.FormEvent) => {
        if (e && e.preventDefault) e.preventDefault();
        const clean = manualCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (clean.length !== 8) {
            toast.error("Please enter a valid 8-character pairing code.");
            return;
        }

        try {
            setValidatingCode(true);
            setError(null);
            const ok = await fetchSessionInfo(clean);
            if (ok) {
                setCode(clean);
                await loadDoctorsList();
                toast.success(`Connected to TV Display (${clean})`);
            }
        } catch (err) {
            console.error(err);
            setError("Invalid or expired pairing code. Please check your TV screen.");
        } finally {
            setValidatingCode(false);
        }
    };

    const handleResetCode = () => {
        setCode(null);
        setSessionInfo(null);
        setError(null);
        setSuccess(false);
        setManualCode("");
        router.replace("/tv-login");
    };

    const toggleDoctor = (id: string) => {
        setSelectedDoctorIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((dId) => dId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleAuthorize = async () => {
        if (!code) return;

        if (!showExaminer && selectedDoctorIds.length === 0) {
            toast.error("Please select at least one doctor or enable examiner queue.");
            return;
        }

        const configToSave: TVDisplayConfig = {
            showExaminer,
            doctorIds: selectedDoctorIds,
            layout,
            theme,
            showHealthTips: showTicker,
            showTicker: showTicker,
            tickerTitle: tickerTitle.trim() || "HEALTH TIP",
            tickerText: tickerText.trim() || MARQUEE_PRESETS[0].text,
            voiceAlerts,
            privacyMode: "full",
        };

        try {
            setAuthorizing(true);
            await tvAuthApi.authorizeSession(code, configToSave);

            // Persist config in local storage so next time it is preloaded
            if (typeof window !== "undefined") {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configToSave));
            }

            setSuccess(true);
            toast.success("TV connected and configured successfully!");
        } catch (err: unknown) {
            console.error(err);
            toast.error("Failed to authorize TV session");
            fetchSessionInfo(code);
        } finally {
            setAuthorizing(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 p-6 text-white text-center">
                    <div className="mx-auto bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm shadow-inner">
                        <Tv className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Configure TV Display</h1>
                    <p className="text-sky-100 text-sm mt-1">
                        Select queues & layout to display on the TV waiting area
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin mb-3 text-sky-400" />
                            <p className="text-sm">Connecting to TV session...</p>
                        </div>
                    ) : error && code ? (
                        <div className="flex flex-col items-center justify-center text-center py-6">
                            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mb-4 text-rose-400">
                                <XCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Connection Notice</h3>
                            <p className="text-slate-300 text-sm mb-6">{error}</p>
                            <div className="w-full flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={handleResetCode}
                                    className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold transition text-center text-sm cursor-pointer"
                                >
                                    Enter Code Manually
                                </button>
                                <Link
                                    href="/"
                                    className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors text-center text-sm"
                                >
                                    Go to Dashboard
                                </Link>
                            </div>
                        </div>
                    ) : success ? (
                        <div className="flex flex-col items-center justify-center text-center py-8">
                            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mb-4 text-emerald-400">
                                <CheckCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">TV Display Connected!</h3>
                            <p className="text-slate-300 text-sm mb-6 max-w-sm">
                                Your selected layout, doctors, and marquee message are now live on the TV screen ({code}).
                            </p>
                            <div className="w-full flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={handleResetCode}
                                    className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition text-center text-sm cursor-pointer"
                                >
                                    Pair Another TV
                                </button>
                                <Link
                                    href="/"
                                    className="flex-1 py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-semibold transition-colors text-center text-sm"
                                >
                                    Back to Dashboard
                                </Link>
                            </div>
                        </div>
                    ) : !code ? (
                        /* Manual Pairing Code Entry Screen */
                        <form onSubmit={handleConnectCode} className="space-y-6">
                            <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                                        📺
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-semibold text-white">Find Pairing Code on TV</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Turn on the waiting area TV display. Under <strong>Option 2</strong> on the TV login screen, you will see an 8-character Pairing Code.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider text-center">
                                    Enter 8-Character TV Pairing Code
                                </label>
                                <div className="max-w-xs mx-auto">
                                    <input
                                        type="text"
                                        value={manualCode}
                                        onChange={(e) => {
                                            setManualCode(e.target.value.toUpperCase());
                                            setError(null);
                                        }}
                                        placeholder="e.g. K9X2B7Q4"
                                        maxLength={12}
                                        autoFocus
                                        className="w-full text-center font-mono text-2xl tracking-[0.3em] font-bold py-3.5 px-4 bg-slate-900 border-2 border-slate-700 focus:border-sky-500 rounded-xl text-sky-400 placeholder:text-slate-600 focus:outline-none transition-colors shadow-inner uppercase"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 text-center">
                                    Case-insensitive • Hyphens &amp; spaces ignored automatically
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                                    <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="pt-2 space-y-3">
                                <button
                                    type="submit"
                                    disabled={validatingCode || !manualCode.trim()}
                                    className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-teal-500/35 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {validatingCode ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Connecting to TV...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Tv className="h-5 w-5" />
                                            <span>Pair &amp; Configure TV</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => router.push("/")}
                                    className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors text-center cursor-pointer"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            {/* Hospital & Session Info */}
                            <div className="flex items-center justify-between bg-slate-900/70 border border-slate-700/60 rounded-xl px-4 py-3">
                                <div>
                                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Hospital</div>
                                    <div className="text-base font-bold text-white">
                                        {sessionInfo?.hospital_name || hospital?.toUpperCase() || "Hospital Display"}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pairing Code</div>
                                    <div className="flex items-center justify-end gap-2 mt-0.5">
                                        <span className="font-mono text-sm bg-slate-800 text-sky-400 px-2 py-0.5 rounded border border-slate-700 font-bold tracking-wider">
                                            {code}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleResetCode}
                                            className="text-[11px] text-slate-400 hover:text-sky-300 underline cursor-pointer"
                                            title="Connect to a different TV screen"
                                        >
                                            Change TV
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Saved Config Banner */}
                            {hasPreviousConfig && (
                                <div className="flex items-center justify-between bg-sky-950/60 border border-sky-800/60 rounded-xl px-4 py-2.5 text-xs text-sky-200">
                                    <div className="flex items-center gap-2">
                                        <RotateCcw className="h-4 w-4 text-sky-400 flex-shrink-0" />
                                        <span>Previous setup restored. Tap <strong>Authorize</strong> or modify below.</span>
                                    </div>
                                </div>
                            )}

                            {/* Section 1: Queues to Show */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                                    <span>1. Select Queues to Display</span>
                                    <span className="text-xs font-normal text-slate-400">
                                        {selectedDoctorIds.length + (showExaminer ? 1 : 0)} active queue(s)
                                    </span>
                                </label>

                                {/* Examiner / Optometrist Toggle */}
                                <div
                                    onClick={() => setShowExaminer(!showExaminer)}
                                    className={`cursor-pointer flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                        showExaminer
                                            ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                                            : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                                showExaminer ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-500"
                                            }`}
                                        >
                                            <Eye className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-white">Examiner / Optometrist Queue</div>
                                            <div className="text-xs text-slate-400">Preliminary eye checkup / triage queue</div>
                                        </div>
                                    </div>
                                    <div
                                        className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${
                                            showExaminer
                                                ? "bg-amber-500 border-amber-500 text-slate-900"
                                                : "border-slate-600 bg-slate-800"
                                        }`}
                                    >
                                        {showExaminer && <Check className="h-4 w-4 stroke-[3]" />}
                                    </div>
                                </div>

                                {/* Doctor Selection List */}
                                <div className="space-y-2">
                                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mt-2">
                                        <Stethoscope className="h-3.5 w-3.5 text-sky-400" />
                                        <span>Consulting Doctors</span>
                                    </div>

                                    {loadingDoctors ? (
                                        <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                                            <span>Loading doctors list...</span>
                                        </div>
                                    ) : doctors.length === 0 ? (
                                        <div className="text-xs text-slate-400 bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                                            No active doctors found.
                                        </div>
                                    ) : (
                                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                                            {doctors.map((doc) => {
                                                const isSelected = selectedDoctorIds.includes(doc.id);
                                                const docName = doc.user_name || doc.name || "Doctor";
                                                const specialty = doc.specialization || "OPD Consultant";

                                                return (
                                                    <div
                                                        key={doc.id}
                                                        onClick={() => toggleDoctor(doc.id)}
                                                        className={`cursor-pointer flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                            isSelected
                                                                ? "bg-sky-500/10 border-sky-500/40 text-white"
                                                                : "bg-slate-900/40 border-slate-700/60 text-slate-400 hover:border-slate-600"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                                                    isSelected
                                                                        ? "bg-sky-500/20 text-sky-400"
                                                                        : "bg-slate-800 text-slate-500"
                                                                }`}
                                                            >
                                                                Dr
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-sm text-slate-100">
                                                                    {docName}
                                                                </div>
                                                                <div className="text-xs text-slate-400">{specialty}</div>
                                                            </div>
                                                        </div>
                                                        <div
                                                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                                                                isSelected
                                                                    ? "bg-sky-500 border-sky-500 text-slate-950"
                                                                    : "border-slate-600 bg-slate-800"
                                                                }`}
                                                        >
                                                            {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 2: Layout Selection */}
                            <div className="space-y-3 pt-2">
                                <label className="text-sm font-semibold text-slate-200">2. TV Screen Layout</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Split Layout Card */}
                                    <div
                                        onClick={() => setLayout("split")}
                                        className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                                            layout === "split"
                                                ? "bg-teal-500/10 border-teal-500/50 text-white shadow-lg shadow-teal-950/40"
                                                : "bg-slate-900/40 border-slate-700/60 text-slate-400 hover:border-slate-600"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Layers className={`h-5 w-5 ${layout === "split" ? "text-teal-400" : "text-slate-500"}`} />
                                            {layout === "split" && <Check className="h-4 w-4 text-teal-400" />}
                                        </div>
                                        <div className="font-bold text-sm text-slate-100">Split View</div>
                                        <div className="text-xs text-slate-400 mt-1 leading-snug">
                                            Examiner on Col 1 + 2 Doctors stacked on Col 2
                                        </div>
                                    </div>

                                    {/* Side-by-Side Columns */}
                                    <div
                                        onClick={() => setLayout("columns")}
                                        className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                                            layout === "columns"
                                                ? "bg-teal-500/10 border-teal-500/50 text-white shadow-lg shadow-teal-950/40"
                                                : "bg-slate-900/40 border-slate-700/60 text-slate-400 hover:border-slate-600"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Columns className={`h-5 w-5 ${layout === "columns" ? "text-teal-400" : "text-slate-500"}`} />
                                            {layout === "columns" && <Check className="h-4 w-4 text-teal-400" />}
                                        </div>
                                        <div className="font-bold text-sm text-slate-100">Side-by-Side</div>
                                        <div className="text-xs text-slate-400 mt-1 leading-snug">
                                            Equal vertical columns (like reference image)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Theme Selection */}
                            <div className="space-y-3 pt-2">
                                <label className="text-sm font-semibold text-slate-200">3. Theme Style</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div
                                        onClick={() => setTheme("dark")}
                                        className={`cursor-pointer p-3 rounded-xl border flex items-center gap-3 transition-all ${
                                            theme === "dark"
                                                ? "bg-sky-500/10 border-sky-500/50 text-white"
                                                : "bg-slate-900/40 border-slate-700/60 text-slate-400"
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-sky-400 border border-slate-700">
                                            <Moon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">Dark Clinic</div>
                                            <div className="text-[11px] text-slate-400">Deep navy (high contrast)</div>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setTheme("light")}
                                        className={`cursor-pointer p-3 rounded-xl border flex items-center gap-3 transition-all ${
                                            theme === "light"
                                                ? "bg-sky-500/10 border-sky-500/50 text-white"
                                                : "bg-slate-900/40 border-slate-700/60 text-slate-400"
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sky-600 border border-slate-200">
                                            <Sun className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">Cura Light</div>
                                            <div className="text-[11px] text-slate-400">Clean hospital white</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Bottom Marquee / Ticker Info */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-200">
                                        4. Bottom Marquee Banner
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowTicker(!showTicker)}
                                        className={`text-xs px-3 py-1 rounded-full font-bold transition-all border ${
                                            showTicker
                                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                                : "bg-slate-800 text-slate-400 border-slate-700"
                                        }`}
                                    >
                                        {showTicker ? "ON" : "OFF"}
                                    </button>
                                </div>

                                {showTicker && (
                                    <div className="p-3.5 bg-slate-900/60 border border-slate-700/60 rounded-xl space-y-3">
                                        {/* Presets */}
                                        <div>
                                            <div className="text-xs font-medium text-slate-400 mb-1.5">
                                                Quick Presets
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {MARQUEE_PRESETS.map((p) => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setTickerTitle(p.badge);
                                                            setTickerText(p.text);
                                                        }}
                                                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Badge Title */}
                                        <div>
                                            <label className="text-xs font-medium text-slate-400 block mb-1">
                                                Badge Label
                                            </label>
                                            <input
                                                type="text"
                                                value={tickerTitle}
                                                onChange={(e) => setTickerTitle(e.target.value.toUpperCase())}
                                                placeholder="e.g. HEALTH TIP, NOTICE, ANNOUNCEMENT"
                                                className="w-full text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 focus:outline-none focus:border-amber-500"
                                            />
                                        </div>

                                        {/* Custom Textarea */}
                                        <div>
                                            <label className="text-xs font-medium text-slate-400 block mb-1">
                                                Marquee Message (Scrolls across TV)
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={tickerText}
                                                onChange={(e) => setTickerText(e.target.value)}
                                                placeholder="Type the message or announcement to show on the TV..."
                                                className="w-full text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Advanced Options Toggle */}
                            <div className="pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 font-medium transition-colors"
                                >
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    <span>{showAdvanced ? "Hide options" : "Audio Announcements"}</span>
                                </button>

                                {showAdvanced && (
                                    <div className="mt-3 p-3.5 bg-slate-900/50 border border-slate-700/60 rounded-xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Volume2 className="h-4 w-4 text-slate-400" />
                                                <span className="text-xs text-slate-300">Voice Announcements</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={voiceAlerts}
                                                onChange={(e) => setVoiceAlerts(e.target.checked)}
                                                className="w-4 h-4 accent-sky-500 rounded"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-3 space-y-2">
                                <button
                                    onClick={handleAuthorize}
                                    disabled={authorizing || (!showExaminer && selectedDoctorIds.length === 0)}
                                    className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-4 py-4 text-base font-bold text-white shadow-lg shadow-teal-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-teal-500/35 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {authorizing ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Applying Setup to TV...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Tv className="h-5 w-5" />
                                            <span>
                                                {hasPreviousConfig ? "Connect with Current Setup" : "Authorize & Connect TV"}
                                            </span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => router.push("/")}
                                    className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors text-center"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TVLoginPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-900">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                </div>
            }
        >
            <TVLoginContent />
        </Suspense>
    );
}
