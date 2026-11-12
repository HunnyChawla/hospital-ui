"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldAlert, Loader2, CheckCircle2, X } from "lucide-react";
import { authApi } from "@/services/authApi";
import { useAppDispatch } from "@/redux/hooks";
import { completeLogin } from "@/redux/authSlice";
import {
  activateImpersonationTabStorage,
  clearImpersonationTabStorage,
  setImpersonationMeta,
} from "@/utils/authStorage";
import { getErrorMessage } from "@/utils/errorHandler";

export default function ImpersonatePage() {
  const dispatch = useAppDispatch();
  const startedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [statusLabel, setStatusLabel] = useState<string>(
    "Verifying one-time impersonation link..."
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const runExchange = async () => {
      try {
        const rawHash = window.location.hash || "";
        const hashParams = new URLSearchParams(
          rawHash.startsWith("#") ? rawHash.slice(1) : rawHash
        );
        const code = hashParams.get("code")?.trim();

        // Scrub the fragment immediately so the secret is not left in the URL bar or history
        if (window.location.hash) {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
        }

        if (!code) {
          setStatus("error");
          setErrorMessage(
            "Missing impersonation code. Please launch impersonation again from the Platform Owner staff directory."
          );
          return;
        }

        // Isolate this tab into a clean window.sessionStorage BEFORE touching any auth storage keys
        clearImpersonationTabStorage();
        activateImpersonationTabStorage();

        setStatusLabel("Exchanging single-use security code...");
        const response = await authApi.exchangeImpersonationCode(code);

        setImpersonationMeta({
          targetUserId: response.user_id,
          targetName: response.full_name || response.email || "Staff Member",
          targetEmail: response.email,
          targetRole: response.role,
          tenantId: response.tenant_id,
          tenantName: response.tenant_name,
          tenantSubdomain: response.tenant_subdomain,
          impersonatedByUserId: response.impersonated_by_user_id,
          impersonatedByName: response.impersonated_by_name,
          startedAt: new Date().toISOString(),
        });

        setStatusLabel(`Loading workspace for ${response.full_name || response.role}...`);
        const result = await dispatch(completeLogin(response)).unwrap();

        setStatus("success");
        const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
        const defaultScreen = result.permissions?.default_screen || "/";
        const normalizedPath = defaultScreen.startsWith("/")
          ? defaultScreen
          : `/${defaultScreen}`;

        window.location.replace(`${basePath}${normalizedPath}`);
      } catch (err: any) {
        clearImpersonationTabStorage();
        setStatus("error");
        setErrorMessage(
          getErrorMessage(err) ||
            "Impersonation code is invalid, expired, or has already been used."
        );
      }
    };

    runExchange();
  }, [dispatch]);

  const handleCloseTab = () => {
    window.close();
    const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
    window.location.replace(`${basePath}/login`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Starting Impersonation Session</h1>
            <p className="text-sm text-slate-500">{statusLabel}</p>
            <p className="mt-1 text-xs text-slate-400">
              Your Platform Owner session in the original tab remains untouched.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Authenticated</h1>
            <p className="text-sm text-slate-500">Redirecting to tenant portal...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Impersonation Failed</h1>
            <p className="text-sm text-rose-600">{errorMessage}</p>
            <button
              type="button"
              onClick={handleCloseTab}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
              Close Tab
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
