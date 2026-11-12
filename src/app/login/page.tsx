"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { completeLogin, restoreSession } from "@/redux/authSlice";
import { fetchTenant } from "@/redux/tenantSlice";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { extractSubdomain } from "@/utils/subdomain";
import { Mail, Lock, Building2, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";
import { Suspense } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Footer } from "@/components/layout/Footer";
import { ActiveSessionsConflictModal } from "@/components/auth/ActiveSessionsConflictModal";
import { MathCaptcha } from "@/components/auth/MathCaptcha";
import { PublicLegalModal, PublicLegalTab } from "@/components/legal/PublicLegalModal";
import {
  ActiveSession,
  CaptchaResponse,
  LoginResponse,
  SessionPolicyInfo,
  authApi,
} from "@/services/authApi";

const LoginScene3D = dynamic(
  () => import("@/components/auth/LoginScene3D").then((m) => ({ default: m.LoginScene3D })),
  { ssr: false }
);

// ─── Input Field Component with Vibrant Branded Focus Ring ────────────────────
function InputField({
  id,
  name,
  type = "text",
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  suffix,
  readOnly,
  onFocus: externalOnFocus,
  required,
  autoComplete,
  disabled,
  autoFocus,
  "data-lpignore": lpIgnore,
  "data-1p-ignore": p1Ignore,
  "data-bwignore": bwIgnore,
  "data-form-type": formType,
}: {
  id: string;
  name: string;
  type?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ElementType;
  suffix?: React.ReactNode;
  readOnly?: boolean;
  onFocus?: () => void;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  "data-lpignore"?: string;
  "data-1p-ignore"?: string;
  "data-bwignore"?: string;
  "data-form-type"?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-semibold tracking-wide text-slate-700"
      >
        {label}
      </label>

      <div className="relative group">
        <div
          className={[
            "absolute -inset-[1px] rounded-xl transition-all duration-300 pointer-events-none",
            focused
              ? "bg-gradient-to-r from-[#00a8cc] via-[#06b6d4] to-[#14b8a6] opacity-100 shadow-[0_0_16px_rgba(0,168,204,0.25)]"
              : "bg-slate-200/90 group-hover:bg-slate-300 opacity-80",
          ].join(" ")}
          aria-hidden="true"
        />

        <div className="relative rounded-xl bg-white flex items-center overflow-hidden">
          <Icon
            className={[
              "absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 transition-colors duration-200 pointer-events-none z-10",
              focused ? "text-[#00a8cc]" : "text-slate-400 group-hover:text-slate-500",
            ].join(" ")}
          />

          <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              setFocused(true);
              externalOnFocus?.();
            }}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            autoComplete={autoComplete ?? "off"}
            data-lpignore={lpIgnore}
            data-1p-ignore={p1Ignore}
            data-bwignore={bwIgnore}
            data-form-type={formType}
            readOnly={readOnly}
            required={required}
            disabled={disabled}
            autoFocus={autoFocus}
            className="w-full h-11 bg-transparent pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors duration-200 z-10"
          />

          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center">
              {suffix}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Vibrant CURA Brand Submit Button ──────────────────────────────────────────
function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={[
        "group relative w-full h-12 rounded-xl overflow-hidden",
        "bg-gradient-to-r from-[#0098b7] via-[#00a8cc] to-[#0d9488]",
        "text-sm font-semibold text-white tracking-wide",
        "shadow-lg shadow-[#00a8cc]/25 hover:shadow-xl hover:shadow-[#00a8cc]/35",
        "transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a8cc] focus-visible:ring-offset-2",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100",
        "cursor-pointer",
      ].join(" ")}
    >
      <span
        className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.22)_50%,transparent_70%)] -translate-x-full group-hover:translate-x-full transition-transform duration-700"
        aria-hidden="true"
      />

      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Verifying credentials…</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </>
        )}
      </span>
    </button>
  );
}

// ─── Main Login Form Component ────────────────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, error } = useAppSelector((s) => s.auth);
  const tenant = useAppSelector((s) => s.tenant);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    hospital_id: "",
  });
  const [showHospital, setShowHospital] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [pendingResponse, setPendingResponse] = useState<LoginResponse | null>(null);
  const [conflictSessions, setConflictSessions] = useState<ActiveSession[] | null>(null);
  const [conflictPolicy, setConflictPolicy] = useState<SessionPolicyInfo | undefined>(undefined);
  const [defaultScreen, setDefaultScreen] = useState("/");

  const [emailReadOnly, setEmailReadOnly] = useState(true);
  const [passReadOnly, setPassReadOnly] = useState(true);

  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null);
  const [captchaAns, setCaptchaAns] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // Legal Modal popup states for in-page direct viewing
  const [legalModalTab, setLegalModalTab] = useState<PublicLegalTab | null>(null);

  useEffect(() => setMounted(true), []);

  const refreshCaptcha = useCallback(async () => {
    try {
      setCaptchaLoading(true);
      const data = await authApi.getCaptcha();
      setCaptcha(data);
      setCaptchaAns("");
    } catch {
      toast.error("Failed to load security challenge. Please refresh.");
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  const getReturnUrl = useCallback(() => {
    const p = searchParams.get("returnUrl");
    if (p) return p;
    if (typeof window !== "undefined") return sessionStorage.getItem("tv_login_return_url");
    return null;
  }, [searchParams]);

  const navigate = (dest: string) => {
    if (typeof window !== "undefined") sessionStorage.removeItem("tv_login_return_url");
    if (dest.startsWith("http://") || dest.startsWith("https://")) window.location.href = dest;
    else router.push(dest);
  };

  useEffect(() => {
    const q = searchParams.get("returnUrl");
    if (q && typeof window !== "undefined") sessionStorage.setItem("tv_login_return_url", q);
  }, [searchParams]);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_terminated") toast.error("Session terminated from another device. Please sign in.");
    else if (reason === "session_expired") toast.error("Session expired. Please sign in again.");
  }, [searchParams]);

  useEffect(() => {
    dispatch(restoreSession());
    const tid = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
    const consent = typeof window !== "undefined" ? localStorage.getItem("consent_required") === "true" : false;
    if (tid && !consent && !tenant.tenant && !tenant.loading && !tenant.error && tenant.lastAttemptedTenantId !== tid) {
      dispatch(fetchTenant(tid));
    }
  }, [dispatch, tenant.tenant, tenant.loading, tenant.error, tenant.lastAttemptedTenantId]);

  useEffect(() => {
    const sub = extractSubdomain();
    if (sub) {
      setFormData((p) => ({ ...p, hospital_id: sub }));
      setShowHospital(false);
    } else {
      setShowHospital(true);
      const saved = typeof window !== "undefined" ? localStorage.getItem("hospital_id") : null;
      if (saved) setFormData((p) => ({ ...p, hospital_id: saved }));
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !conflictSessions) {
      const url = getReturnUrl();
      if (url) navigate(url);
      else {
        const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
        router.push(role === "platform_owner" ? "/tenants" : "/");
      }
    }
  }, [isAuthenticated, router, conflictSessions]);

  const handleConflictProceed = async () => {
    if (!pendingResponse) return;
    try {
      setSubmitting(true);
      const result = await dispatch(completeLogin(pendingResponse)).unwrap();
      toast.success("Login successful");
      const dest = getReturnUrl() || result.permissions?.default_screen || defaultScreen;
      setConflictSessions(null);
      setPendingResponse(null);
      navigate(dest);
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConflictCancel = async () => {
    if (pendingResponse?.token?.access_token && pendingResponse?.current_session_id) {
      try {
        await authApi.invalidateSessions([pendingResponse.current_session_id], pendingResponse.token.access_token);
      } catch {
        /* ignore */
      }
    }
    setConflictSessions(null);
    setPendingResponse(null);
    toast.info("Login cancelled");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.hospital_id) {
      toast.error("Please fill all fields");
      return;
    }
    if (!captchaAns.trim()) {
      toast.error("Please solve the security challenge");
      return;
    }
    if (!captcha) {
      toast.error("Security challenge loading…");
      return;
    }

    setSubmitting(true);
    try {
      const response = await authApi.login({
        ...formData,
        captcha_id: captcha.captcha_id,
        captcha_answer: captchaAns.trim(),
        captcha_token: captcha.captcha_token,
      });
      if (typeof window !== "undefined" && formData.hospital_id) {
        localStorage.setItem("hospital_id", formData.hospital_id);
      }
      const returnUrl = getReturnUrl();
      const fallback = response.role === "platform_owner" ? "/tenants" : "/";
      const destScreen = returnUrl || fallback;

      if (response.other_active_sessions?.length) {
        setPendingResponse(response);
        setConflictSessions(response.other_active_sessions);
        setConflictPolicy(response.session_policy);
        setDefaultScreen(destScreen);
        setSubmitting(false);
        return;
      }
      const result = await dispatch(completeLogin(response)).unwrap();
      toast.success("Login successful");
      navigate(returnUrl || result.permissions?.default_screen || destScreen);
    } catch (err: any) {
      toast.error(getErrorMessage(err));
      refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <div className="flex h-screen max-h-screen w-full overflow-hidden relative bg-gradient-to-br from-[#eaf6f9] via-white to-[#edf7fa]">

      {/* ── UNIFIED FULL-SCREEN 3D AMBIENT BACKDROP ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {/* Harmonious ambient gradient blooms across the entire screen */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_25%,rgba(0,168,204,0.12)_0%,transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_75%,rgba(20,184,166,0.09)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(56,189,248,0.05)_0%,transparent_70%)]" />

        {/* Global Three.js Scene — flows naturally under BOTH left and right panels */}
        {mounted && <LoginScene3D />}

        {/* Unified dot grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle, #00a8cc 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          LEFT STAGE — Brand & Tagline Showcase (60% width)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[60%] relative z-10 select-none">
        <div className="flex-1 flex flex-col items-center justify-between p-12 xl:p-14">
          {/* Top Pill */}
          <div className="w-full flex items-center justify-start">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-[#00a8cc]/20 text-[11px] font-semibold text-[#007b99] uppercase tracking-wider shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00a8cc] animate-pulse"></span>
              Clinical Enterprise
            </span>
          </div>

          {/* Center Brand Showcase */}
          <div className="flex flex-col items-center space-y-6 text-center">
            {/* Logo with smooth interactive zoom & drop shadow hover */}
            <div className="transform transition-all duration-300 ease-out hover:scale-105 cursor-pointer drop-shadow-sm hover:drop-shadow-md">
              <Image
                src={`${basePath}/login-logo.png`}
                alt="CURA Logo"
                width={460}
                height={240}
                className="h-auto w-full max-w-[360px] xl:max-w-[420px] object-contain"
                priority
                unoptimized
              />
            </div>

            {/* Title & subtitle matching brand */}
            <div className="space-y-1.5">
              <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-[#0098b7]">
                Healthcare Management
              </h2>
              <p className="text-slate-500 text-xs xl:text-sm font-medium">
                Streamlined. Efficient. Modern.
              </p>
            </div>

            <div className="w-12 h-px bg-gradient-to-r from-[#00a8cc] to-[#14b8a6] rounded-full opacity-60" />

            <div className="flex items-center gap-5 text-[11px] text-slate-500 font-medium">
              <span>ABDM Compliant</span>
              <span className="w-px h-3 bg-slate-300 inline-block" />
              <span>TLS Encrypted</span>
              <span className="w-px h-3 bg-slate-300 inline-block" />
              <span>Multi-tenant</span>
            </div>
          </div>

          {/* Bottom Powered by Technesian Badge */}
          <div className="w-full flex items-center justify-start pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:border-[#00a8cc]/40 transition-colors">
              <span className="h-2 w-2 rounded-full bg-[#00a8cc]" />
              <span className="text-xs font-semibold text-slate-700">
                Powered by <span className="font-bold text-slate-900">Technesian</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          RIGHT STAGE — Elevated Form Floating on the Same Canvas (40% width)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 lg:w-[42%] xl:w-[40%] flex flex-col items-center justify-center h-full px-4 sm:px-6 md:px-8 lg:px-6 xl:px-10 py-6 overflow-y-auto lg:overflow-hidden relative z-10">

        <div className="w-full max-w-[380px] sm:max-w-[400px] mx-auto relative my-auto pb-14 lg:pb-0">

          {/* Elevated Glassmorphic Card Floating on Unified Canvas */}
          <div className="bg-white/90 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/90 shadow-[0_20px_50px_rgba(0,168,204,0.1)] p-5 sm:p-6.5">

            {/* In-Card Branding Header: Hero-Grade CURA Logo + Online Status */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3.5 border-b border-slate-100">
              <div className="flex items-center">
                <Image
                  src={`${basePath}/login-logo.png`}
                  alt="CURA Logo"
                  width={360}
                  height={140}
                  className="h-14 sm:h-16 w-auto max-w-[210px] sm:max-w-[250px] object-contain drop-shadow-sm select-none"
                  priority
                  unoptimized
                />
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 shadow-2xs shrink-0 select-none">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            </div>

            {/* Form Title */}
            <div className="mb-3.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Welcome back
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Enter your credentials to access your hospital workspace
              </p>
            </div>

            {/* Hidden Anti-Autofill Helpers */}
            <input
              type="text"
              name="prevent_autofill_username"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
            />
            <input
              type="password"
              name="prevent_autofill_password"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="new-password"
            />

            {/* Form Fields */}
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
              {/* Email with AutoFocus */}
              <InputField
                id="login-email"
                name="login_email"
                type="email"
                label="Email Address"
                value={formData.email}
                onChange={(v) => setFormData({ ...formData, email: v })}
                placeholder="staff@hospital.com"
                icon={Mail}
                readOnly={emailReadOnly}
                onFocus={() => setEmailReadOnly(false)}
                autoFocus={true}
                required
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
              />

              {/* Password with Accessible Toggle */}
              <InputField
                id="login-password"
                name="login_password"
                type={showPass ? "text" : "password"}
                label="Password"
                value={formData.password}
                onChange={(v) => setFormData({ ...formData, password: v })}
                placeholder="••••••••••••"
                icon={Lock}
                readOnly={passReadOnly}
                onFocus={() => setPassReadOnly(false)}
                required
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="text-slate-400 hover:text-[#00a8cc] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a8cc] p-1 rounded-lg cursor-pointer"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              {showHospital && (
                <InputField
                  id="login-hospital-id"
                  name="login_hospital_id"
                  label="Hospital Tenant ID"
                  value={formData.hospital_id}
                  onChange={(v) =>
                    setFormData({
                      ...formData,
                      hospital_id: v.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  placeholder="e.g. apex-care"
                  icon={Building2}
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                />
              )}

              {/* Math CAPTCHA */}
              <div className="pt-0.5">
                <MathCaptcha
                  captcha={captcha}
                  value={captchaAns}
                  onChange={setCaptchaAns}
                  onRefresh={refreshCaptcha}
                  loading={captchaLoading}
                  disabled={submitting || loading}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200/80 px-4 py-2.5 text-xs text-rose-700 animate-shake"
                >
                  <span className="shrink-0 mt-0.5 text-rose-500 font-bold">!</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-1.5">
                <SubmitButton loading={submitting || loading} />
              </div>
            </form>

            {/* Legal Alignment Consent Text with clickable modals */}
            <p className="text-[11px] text-center text-slate-500 leading-relaxed mt-3.5">
              By signing in, you are in alignment with our{" "}
              <button
                type="button"
                onClick={() => setLegalModalTab("terms")}
                className="text-[#008ba3] font-semibold hover:underline cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#008ba3] rounded"
              >
                Terms and Conditions
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => setLegalModalTab("privacy")}
                className="text-[#008ba3] font-semibold hover:underline cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#008ba3] rounded"
              >
                Privacy Policy
              </button>
              .
            </p>

            {/* Protected by Cura Notice */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 select-none">
              <ShieldCheck className="h-4 w-4 text-[#00a8cc]" />
              <span>
                Protected by <span className="font-bold text-[#008ba3] text-sm">CURA</span>
              </span>
            </div>
          </div>

          {/* Bottom Security Footer: ABDM Ready · End-to-End Encrypted */}
          <div className="mt-3 flex items-center justify-center gap-2 text-slate-500 select-none">
            <span className="text-[11px] font-medium tracking-wide">
              ABDM Ready · End-to-End Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Global Fixed Footer */}
      <Footer noSidebar isFixed={true} />

      {/* Public Legal Modal directly accessible from terms/privacy links */}
      <PublicLegalModal
        isOpen={legalModalTab !== null}
        onClose={() => setLegalModalTab(null)}
        initialTab={legalModalTab || "terms"}
      />

      {/* Active Session Conflict Modal */}
      <ActiveSessionsConflictModal
        isOpen={conflictSessions !== null}
        sessions={conflictSessions || []}
        policy={conflictPolicy}
        token={pendingResponse?.token?.access_token}
        onProceed={handleConflictProceed}
        onCancel={handleConflictCancel}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fb]">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-[#00a8cc]/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-[#00a8cc] animate-spin" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
