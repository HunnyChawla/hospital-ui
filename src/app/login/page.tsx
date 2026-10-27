"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { completeLogin, restoreSession } from "@/redux/authSlice";
import { fetchTenant } from "@/redux/tenantSlice";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { extractSubdomain } from "@/utils/subdomain";
import { Mail, Lock, Building2, Eye, EyeOff } from "lucide-react";
import { Suspense } from "react";
import Image from "next/image";
import { Footer } from "@/components/layout/Footer";
import { ActiveSessionsConflictModal } from "@/components/auth/ActiveSessionsConflictModal";
import { MathCaptcha } from "@/components/auth/MathCaptcha";
import { ActiveSession, CaptchaResponse, LoginResponse, SessionPolicyInfo, authApi } from "@/services/authApi";

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
  const [showHospitalIdInput, setShowHospitalIdInput] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingLoginResponse, setPendingLoginResponse] = useState<LoginResponse | null>(null);
  const [pendingConflictSessions, setPendingConflictSessions] = useState<ActiveSession[] | null>(null);
  const [pendingConflictPolicy, setPendingConflictPolicy] = useState<SessionPolicyInfo | undefined>(undefined);
  const [pendingDefaultScreen, setPendingDefaultScreen] = useState<string>("/");
  const [isEmailReadOnly, setIsEmailReadOnly] = useState(true);
  const [isPasswordReadOnly, setIsPasswordReadOnly] = useState(true);
  const [captchaData, setCaptchaData] = useState<CaptchaResponse | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const fetchCaptcha = async () => {
    try {
      setCaptchaLoading(true);
      const data = await authApi.getCaptcha();
      setCaptchaData(data);
      setCaptchaAnswer("");
    } catch (err) {
      console.error("Failed to load captcha challenge:", err);
      toast.error("Failed to load security challenge. Please refresh.");
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const getTargetReturnUrl = () => {
    const fromParams = searchParams.get("returnUrl");
    if (fromParams) return fromParams;
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("tv_login_return_url");
    }
    return null;
  };

  const navigateToDestination = (dest: string) => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("tv_login_return_url");
    }
    if (dest.startsWith("http://") || dest.startsWith("https://")) {
      window.location.href = dest;
    } else {
      router.push(dest);
    }
  };

  useEffect(() => {
    const qReturnUrl = searchParams.get("returnUrl");
    if (qReturnUrl && typeof window !== "undefined") {
      sessionStorage.setItem("tv_login_return_url", qReturnUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    // Check if user was logged out due to session termination from another device
    const reason = searchParams.get("reason");
    if (reason === "session_terminated") {
      toast.error("Your session was terminated from another device. Please sign in again.");
    } else if (reason === "session_expired") {
      toast.error("Your session has expired due to timeout. Please sign in again to continue.");
    }
  }, [searchParams]);

  useEffect(() => {
    // Restore session on mount
    dispatch(restoreSession());

    // Fetch tenant data if not already loaded and not already attempted
    const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
    const consentRequired = typeof window !== "undefined" ? localStorage.getItem("consent_required") === "true" : false;
    if (
      tenantId &&
      !consentRequired &&
      !tenant.tenant &&
      !tenant.loading &&
      !tenant.error &&
      tenant.lastAttemptedTenantId !== tenantId
    ) {
      dispatch(fetchTenant(tenantId));
    }
  }, [
    dispatch,
    tenant.tenant,
    tenant.loading,
    tenant.error,
    tenant.lastAttemptedTenantId,
  ]);

  useEffect(() => {
    // Detect subdomain on mount
    const subdomain = extractSubdomain();
    if (subdomain) {
      // Subdomain exists, use it as hospital_id and hide input
      setFormData((prev) => ({ ...prev, hospital_id: subdomain }));
      setShowHospitalIdInput(false);
    } else {
      // No subdomain, show input field
      setShowHospitalIdInput(true);
      // Auto-fill hospital ID if saved in localStorage
      const savedHospitalId = typeof window !== "undefined" ? localStorage.getItem("hospital_id") : null;
      if (savedHospitalId) {
        setFormData((prev) => ({ ...prev, hospital_id: savedHospitalId }));
      }
    }
  }, []);

  useEffect(() => {
    // Redirect if already authenticated and not reviewing conflicting sessions
    if (isAuthenticated && !pendingConflictSessions) {
      const returnUrl = getTargetReturnUrl();
      if (returnUrl) {
        navigateToDestination(returnUrl);
      } else {
        router.push("/");
      }
    }
  }, [isAuthenticated, router, searchParams, pendingConflictSessions]);

  const handleConflictProceed = async () => {
    if (!pendingLoginResponse) return;
    try {
      setSubmitting(true);
      const result = await dispatch(completeLogin(pendingLoginResponse)).unwrap();
      toast.success("Login successful");
      const returnUrl = getTargetReturnUrl();
      const dest = returnUrl || result.permissions?.default_screen || pendingDefaultScreen;
      setPendingConflictSessions(null);
      setPendingLoginResponse(null);
      navigateToDestination(dest);
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConflictCancel = async () => {
    if (pendingLoginResponse?.token?.access_token && pendingLoginResponse?.current_session_id) {
      try {
        await authApi.invalidateSessions([pendingLoginResponse.current_session_id], pendingLoginResponse.token.access_token);
      } catch {
        // Ignore invalidation error on cancel
      }
    }
    setPendingConflictSessions(null);
    setPendingLoginResponse(null);
    toast.info("Login cancelled");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.hospital_id) {
      toast.error("Please fill all fields");
      return;
    }

    if (!captchaAnswer.trim()) {
      toast.error("Please solve the security verification challenge");
      return;
    }

    if (!captchaData) {
      toast.error("Security challenge is loading, please wait...");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Authenticate credentials with backend including captcha verification
      const response = await authApi.login({
        ...formData,
        captcha_id: captchaData.captcha_id,
        captcha_answer: captchaAnswer.trim(),
        captcha_token: captchaData.captcha_token,
      });

      // Save hospital ID to localStorage
      if (typeof window !== "undefined" && formData.hospital_id) {
        localStorage.setItem("hospital_id", formData.hospital_id);
      }

      const returnUrl = getTargetReturnUrl();
      const defaultScreen = returnUrl || "/";

      // 2. If active sessions exist on other devices/profiles, IMMEDIATELY show review modal
      if (response.other_active_sessions && response.other_active_sessions.length > 0) {
        setPendingLoginResponse(response);
        setPendingConflictSessions(response.other_active_sessions);
        setPendingConflictPolicy(response.session_policy);
        setPendingDefaultScreen(defaultScreen);
        setSubmitting(false);
        return;
      }

      // 3. No active sessions conflict: complete login immediately
      const result = await dispatch(completeLogin(response)).unwrap();
      toast.success("Login successful");
      const dest = returnUrl || result.permissions?.default_screen || defaultScreen;
      navigateToDestination(dest);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      toast.error(errorMessage);
      // Auto-refresh captcha on failed attempt
      fetchCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Left Side - Logo Section */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative p-8">
        {/* Background with pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-teal-50 to-cyan-50"></div>
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_2px_2px,_rgb(14,165,233)_1px,_transparent_0)] [background-size:40px_40px]"></div>

        {/* Floating decorative circles */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-sky-200/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-teal-200/20 rounded-full blur-2xl"></div>

        <div className="max-w-lg w-full relative z-10">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="transform hover:scale-105 transition-transform duration-300">
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/login-logo.png`}
                alt="CURA Logo"
                width={691}
                height={361}
                className="h-auto w-full max-w-md object-contain drop-shadow-lg"
                priority
                unoptimized
              />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
                Healthcare Management
              </h2>
              <p className="text-slate-600 text-sm">Streamlined. Efficient. Modern.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm p-4 lg:p-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo - Only visible on small screens */}
          <div className="lg:hidden mb-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex items-center justify-center">
                <Image
                  src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/login-logo.png`}
                  alt="CURA Logo"
                  width={691}
                  height={361}
                  className="h-auto w-full max-w-xs object-contain"
                  priority
                  unoptimized
                />
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
                  Healthcare Management
                </h2>
                <p className="text-slate-600 text-xs">Streamlined. Efficient. Modern.</p>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h1>
              <p className="text-sm text-slate-600">Sign in to your account to continue</p>
            </div>

            <div className="rounded-3xl border border-slate-200/50 bg-white/90 backdrop-blur-sm p-8 shadow-xl shadow-sky-100/50">
              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
                {/* Hidden dummy fields to prevent browser autofill heuristics from populating credentials */}
                <input
                  type="text"
                  name="prevent_autofill_username"
                  id="prevent_autofill_username"
                  className="hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                  autoComplete="off"
                />
                <input
                  type="password"
                  name="prevent_autofill_password"
                  id="prevent_autofill_password"
                  className="hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                  autoComplete="new-password"
                />
                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none z-0"></div>
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors pointer-events-none z-30" />
                    <input
                      id="login-email"
                      name="login_email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="Enter your email"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      readOnly={isEmailReadOnly}
                      onFocus={() => setIsEmailReadOnly(false)}
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3.5 text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100/50 relative z-20"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none z-0"></div>
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors pointer-events-none z-30" />
                    <input
                      id="login-password"
                      name="login_password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Enter your password"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      readOnly={isPasswordReadOnly}
                      onFocus={() => setIsPasswordReadOnly(false)}
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 pl-11 pr-12 py-3.5 text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100/50 relative z-20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors z-30 p-1 rounded-lg"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Hospital ID */}
                {showHospitalIdInput && (
                  <div className="space-y-2">
                    <label htmlFor="login-hospital-id" className="block text-sm font-semibold text-slate-700">
                      Hospital ID
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none z-0"></div>
                      <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors pointer-events-none z-30" />
                      <input
                        id="login-hospital-id"
                        name="login_hospital_id"
                        type="text"
                        value={formData.hospital_id}
                        onChange={(e) =>
                          setFormData({ ...formData, hospital_id: e.target.value })
                        }
                        placeholder="Enter hospital ID"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3.5 text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100/50 relative z-20"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Math Security CAPTCHA */}
                <MathCaptcha
                  captcha={captchaData}
                  value={captchaAnswer}
                  onChange={setCaptchaAnswer}
                  onRefresh={fetchCaptcha}
                  loading={captchaLoading}
                  disabled={submitting || loading}
                />

                {/* Error Message */}
                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-teal-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/40 hover:scale-[1.02] hover:from-sky-600 hover:via-sky-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {submitting || loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </button>
              </form>
            </div>

            {/* Footer */}
            <Footer noSidebar />
          </div>
        </div>
      </div>

      {/* Active Sessions Conflict Modal */}
      <ActiveSessionsConflictModal
        isOpen={pendingConflictSessions !== null}
        sessions={pendingConflictSessions || []}
        policy={pendingConflictPolicy}
        token={pendingLoginResponse?.token?.access_token}
        onProceed={handleConflictProceed}
        onCancel={handleConflictCancel}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
          <p className="text-slate-600 font-medium">Loading login...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}


