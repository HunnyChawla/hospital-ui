"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateToken, logout } from "@/redux/authSlice";
import { authApi } from "@/services/authApi";
import { toast } from "sonner";
import { Clock, AlertTriangle, ShieldAlert, LogOut, CheckCircle2 } from "lucide-react";

/**
 * Decode exp claim from JWT token
 */
function getTokenExp(token: string | null): number | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}

/**
 * Play a gentle alert tone using Web Audio API
 */
function playAlertChime(urgent: boolean = false) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(urgent ? 587.33 : 440, ctx.currentTime); // D5 or A4
    if (urgent) {
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    }

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (urgent ? 0.35 : 0.25));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (urgent ? 0.35 : 0.25));
  } catch {
    // Audio might be blocked by browser autoplay policy until user gesture
  }
}

/**
 * Format remaining seconds into MM:SS
 */
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function SessionTimeoutWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  // Skip on unauthenticated login routes
  const isLoginPage =
    pathname === "/login" || pathname === "/login/" || pathname === "/tv-login";

  // Activity tracking: timestamp of last detected user interaction
  const lastActivityRef = useRef<number>(Date.now());
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Alarm modal state: null (no modal), "stage1_15m" (15m warning), "stage2_5m" (5m urgent warning)
  const [alarmStage, setAlarmStage] = useState<"stage1_15m" | "stage2_5m" | null>(null);
  const [declinedStage1, setDeclinedStage1] = useState<boolean>(false);
  const [isExtending, setIsExtending] = useState<boolean>(false);

  // Track the current token to reset state on token renewals
  const currentTokenRef = useRef<string | null>(null);

  // Update activity timestamp on user interaction
  useEffect(() => {
    if (!isAuthenticated || isLoginPage) return;

    const recordActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "focus"];
    events.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, recordActivity));
    };
  }, [isAuthenticated, isLoginPage]);

  // Handle session extension
  const handleExtendSession = useCallback(async () => {
    setIsExtending(true);
    try {
      const result = await authApi.extendSession();
      const newToken = result.token.access_token;

      // Update Redux state and localStorage
      dispatch(updateToken(newToken));
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", newToken);
      }

      // Reset modal and alarm flags
      setAlarmStage(null);
      setDeclinedStage1(false);
      lastActivityRef.current = Date.now();

      toast.success("Session Extended", {
        description: `Your session is now active for another ${Math.floor(
          result.session_expiry_minutes / 60
        )} hours.`,
      });
    } catch (err: any) {
      console.error("Failed to extend session:", err);
      toast.error("Failed to extend session. Please save your work and sign in again.");
    } finally {
      setIsExtending(false);
    }
  }, [dispatch]);

  // Handle user declining the 15-minute alarm
  const handleDeclineStage1 = () => {
    setAlarmStage(null);
    setDeclinedStage1(true);
  };

  // Handle explicit logout
  const handleLogout = async () => {
    setAlarmStage(null);
    await dispatch(logout());
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    window.location.href = `${basePath}/login?reason=user_logout`;
  };

  // Cross-tab synchronization via storage events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_token") {
        if (!e.newValue) {
          // Token removed in another tab
          dispatch(logout());
          const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
          window.location.href = `${basePath}/login?reason=session_expired`;
        } else {
          // Token refreshed in another tab
          dispatch(updateToken(e.newValue));
          setAlarmStage(null);
          setDeclinedStage1(false);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [dispatch]);

  // Main timer checking expiration and activity
  useEffect(() => {
    if (!isAuthenticated || isLoginPage) {
      setAlarmStage(null);
      setSecondsRemaining(null);
      return;
    }

    const checkSession = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      if (!token) return;

      // If token changed, reset declined state
      if (token !== currentTokenRef.current) {
        currentTokenRef.current = token;
        setDeclinedStage1(false);
        setAlarmStage(null);
      }

      const exp = getTokenExp(token);
      if (!exp) return;

      const nowSec = Math.floor(Date.now() / 1000);
      const remaining = exp - nowSec;
      setSecondsRemaining(remaining);

      // Check user activity (within last 15 minutes = 900,000 ms)
      const isUserActive = Date.now() - lastActivityRef.current < 15 * 60 * 1000;

      // 1. Session completely expired (<= 0 seconds)
      if (remaining <= 0) {
        setAlarmStage(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_id");
          localStorage.removeItem("tenant_id");
          localStorage.removeItem("role");
          const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
          window.location.href = `${basePath}/login?reason=session_expired`;
        }
        return;
      }

      // 2. Stage 2: 5 minutes before expiry (<= 300 seconds)
      if (remaining <= 300) {
        // Show Stage 2 if user is active (even if declined Stage 1 or if Stage 1 was missed)
        if (isUserActive && alarmStage !== "stage2_5m") {
          setAlarmStage("stage2_5m");
          playAlertChime(true);
        }
        return;
      }

      // 3. Stage 1: 15 minutes before expiry (<= 900 seconds)
      if (remaining <= 900 && remaining > 300) {
        // Show Stage 1 only if user is active, hasn't declined it yet, and not already showing
        if (isUserActive && !declinedStage1 && alarmStage !== "stage1_15m") {
          setAlarmStage("stage1_15m");
          playAlertChime(false);
        }
        return;
      }

      // 4. More than 15 minutes remaining
      if (remaining > 900 && alarmStage !== null) {
        setAlarmStage(null);
        setDeclinedStage1(false);
      }
    };

    // Run check immediately, then every 5 seconds
    checkSession();
    const interval = setInterval(checkSession, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isLoginPage, alarmStage, declinedStage1]);

  if (!isAuthenticated || isLoginPage || !alarmStage) {
    return null;
  }

  const isUrgent = alarmStage === "stage2_5m";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 transition-all ${
          isUrgent ? "ring-rose-500/40 border-2 border-rose-300" : "ring-slate-900/10"
        }`}
      >
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              isUrgent ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-amber-100 text-amber-600"
            }`}
          >
            {isUrgent ? <ShieldAlert className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase ${
                  isUrgent ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {isUrgent ? "Final Warning" : "Security Notice"}
              </span>

              {secondsRemaining !== null && (
                <span className="font-mono text-sm font-semibold text-slate-600">
                  {formatCountdown(secondsRemaining)}
                </span>
              )}
            </div>

            <h3 className="mt-1.5 text-lg font-bold text-slate-900">
              {isUrgent ? "Session Expiring in 5 Minutes" : "Session Expiring in 15 Minutes"}
            </h3>
          </div>
        </div>

        {/* Message */}
        <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-sm text-slate-600">
          <p className="leading-relaxed">
            {isUrgent ? (
              <>
                <strong className="text-rose-700">Action Required:</strong> You are currently active,
                but your authenticated session will automatically expire in <strong>5 minutes</strong>.
                Any unsaved patient records, clinical notes, or forms will be lost.
              </>
            ) : (
              <>
                You are currently active. For hospital patient data safety and security policies, your
                session is scheduled to expire in <strong>15 minutes</strong>.
              </>
            )}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Would you like to extend your session and keep working?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {isUrgent ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isExtending}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              Log Out Now
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDeclineStage1}
              disabled={isExtending}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Remind Me Later
            </button>
          )}

          <button
            type="button"
            onClick={handleExtendSession}
            disabled={isExtending}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-50 ${
              isUrgent
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                : "bg-sky-600 hover:bg-sky-700 shadow-sky-200"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isExtending ? "Extending Session..." : "Stay Logged In"}
          </button>
        </div>
      </div>
    </div>
  );
}
