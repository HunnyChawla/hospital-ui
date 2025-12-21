"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { login, restoreSession } from "@/redux/authSlice";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { extractSubdomain } from "@/utils/subdomain";
import { Mail, Lock, Building2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, error } = useAppSelector((s) => s.auth);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    hospital_id: "",
  });
  const [showHospitalIdInput, setShowHospitalIdInput] = useState(true);

  useEffect(() => {
    // Restore session on mount
    dispatch(restoreSession());
  }, [dispatch]);

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
    }
  }, []);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.hospital_id) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await dispatch(login(formData)).unwrap();
      toast.success("Login successful");
      router.push("/");
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      toast.error(errorMessage);
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
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(14, 165, 233) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Floating decorative circles */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-sky-200/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-teal-200/20 rounded-full blur-2xl"></div>
        
        <div className="max-w-lg w-full relative z-10">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="transform hover:scale-105 transition-transform duration-300">
              <Image
                src="../login-logo.png"
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
                  src="../login-logo.png"
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
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none z-0"></div>
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors pointer-events-none z-30" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="Enter your email"
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3.5 text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100/50 relative z-20"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none z-0"></div>
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors pointer-events-none z-30" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Enter your password"
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3.5 text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100/50 relative z-20"
                      required
                    />
                  </div>
                </div>

                {/* Hospital ID */}
                {showHospitalIdInput && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Hospital ID
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none z-0"></div>
                      <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors pointer-events-none z-30" />
                      <input
                        type="text"
                        value={formData.hospital_id}
                        onChange={(e) =>
                          setFormData({ ...formData, hospital_id: e.target.value })
                        }
                        placeholder="Enter hospital ID"
                        className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3.5 text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100/50 relative z-20"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-teal-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/40 hover:scale-[1.02] hover:from-sky-600 hover:via-sky-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
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
            <p className="mt-8 text-center text-xs text-slate-500">
              © {new Date().getFullYear()} Technesian PVT LTD. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

