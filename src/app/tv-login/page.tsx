"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { restoreSession } from "@/redux/authSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { tvAuthApi, TVSessionInfo } from "@/services/tvAuthApi";
import { toast } from "sonner";
import { Loader2, Tv, CheckCircle, XCircle } from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";

function TVLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    const { isAuthenticated, loading: authLoading } = useAppSelector((s) => s.auth);

    const [isRestored, setIsRestored] = useState(false);
    const [code, setCode] = useState<string | null>(null);
    const [hospital, setHospital] = useState<string | null>(null);
    const [sessionInfo, setSessionInfo] = useState<TVSessionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [authorizing, setAuthorizing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Add restoration effect
    useEffect(() => {
        dispatch(restoreSession());
        setIsRestored(true);
    }, [dispatch]);

    useEffect(() => {
        const codeParam = searchParams.get("code");
        const hospitalParam = searchParams.get("hospital");

        if (!codeParam) {
            setError("Invalid QR Code: Missing session code.");
            setLoading(false);
            return;
        }

        setCode(codeParam);
        setHospital(hospitalParam);

        // Wait for restoration and auth loading
        if (isRestored && !authLoading) {
            if (!isAuthenticated) {
                // Redirect to login with return URL
                const returnUrl = `/tv-login?code=${codeParam}&hospital=${hospitalParam || ""}`;
                router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
                return;
            }

            // Fetch session info
            fetchSessionInfo(codeParam);
        }
    }, [searchParams, isAuthenticated, authLoading, router, isRestored]);

    const fetchSessionInfo = async (sessionCode: string) => {
        try {
            setLoading(true);
            const info = await tvAuthApi.getSessionInfo(sessionCode);
            setSessionInfo(info);
            if (!info.can_authorize) {
                if (info.status === "authenticated") {
                    setError("This session has already been authorized.");
                } else if (info.status === "expired") {
                    setError("This QR code has expired. Please refresh the TV screen.");
                } else {
                    setError(`Session is in ${info.status} state.`);
                }
            }
        } catch (err) {
            console.error(err);
            setError("Failed to fetch session information.");
        } finally {
            setLoading(false);
        }
    };

    const handleAuthorize = async () => {
        if (!code) return;

        try {
            setAuthorizing(true);
            await tvAuthApi.authorizeSession(code);
            setSuccess(true);
            toast.success("TV connected successfully!");
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to authorize TV session");
            // Refresh info to see if status changed
            fetchSessionInfo(code);
        } finally {
            setAuthorizing(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
        );
    }

    // If redirecting...
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-sky-500 to-teal-500 p-6 text-center text-white">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Tv className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold">Connect TV Display</h1>
                    <p className="opacity-90 text-sm mt-1">Authorize this screen to display the queue</p>
                </div>

                <div className="p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                            <Loader2 className="h-8 w-8 animate-spin mb-3 text-sky-500" />
                            <p>Verifying QR Code...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 text-rose-500">
                                <XCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Connection Failed</h3>
                            <p className="text-slate-600 mb-6">{error}</p>
                            <Link
                                href="/"
                                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors text-center"
                            >
                                Go to Dashboard
                            </Link>
                        </div>
                    ) : success ? (
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-500">
                                <CheckCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Connected!</h3>
                            <p className="text-slate-600 mb-6">
                                The TV display has been successfully authorized. You can now close this page.
                            </p>
                            <Link
                                href="/"
                                className="w-full py-3 px-4 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl font-semibold transition-colors text-center"
                            >
                                Go to Dashboard
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Connect to
                                </div>
                                <div className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <BuildingIcon className="h-5 w-5 text-sky-500" />
                                    {sessionInfo?.hospital_name || hospital?.toUpperCase() || "Hospital"}
                                </div>
                                <div className="text-xs text-slate-500 mt-2">
                                    Session Code: <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">{code}</span>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 text-center">
                                Click the button below to authorize this TV to display the patient queue.
                            </div>

                            <button
                                onClick={handleAuthorize}
                                disabled={authorizing}
                                className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-teal-500 px-4 py-4 text-base font-bold text-white shadow-lg shadow-sky-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                            >
                                {authorizing ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <Tv className="h-5 w-5" />
                                        Connect TV
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => router.push('/')}
                                className="w-full py-3 text-slate-400 font-medium hover:text-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TVLoginPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
        }>
            <TVLoginContent />
        </Suspense>
    );
}

function BuildingIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M12 6h.01" />
            <path d="M12 10h.01" />
            <path d="M12 14h.01" />
            <path d="M16 10h.01" />
            <path d="M16 14h.01" />
            <path d="M8 10h.01" />
            <path d="M8 14h.01" />
        </svg>
    );
}

