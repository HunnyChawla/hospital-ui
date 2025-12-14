"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { login, restoreSession } from "@/redux/authSlice";
import { toast } from "sonner";
import { LogIn, Mail, Lock, Building2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, error } = useAppSelector((s) => s.auth);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    tenant_id: "",
  });

  useEffect(() => {
    // Restore session on mount
    dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.tenant_id) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await dispatch(login(formData)).unwrap();
      toast.success("Login successful");
      router.push("/");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-teal-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 shadow-lg">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Hospital Management</h1>
          <p className="mt-2 text-slate-600">Sign in to access the portal</p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="admin@demo.com"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>
            </div>

            {/* Tenant ID */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Tenant ID
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.tenant_id}
                  onChange={(e) =>
                    setFormData({ ...formData, tenant_id: e.target.value })
                  }
                  placeholder="Enter tenant ID"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>
            </div>

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
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Demo Credentials Hint */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold mb-2">Demo Credentials:</p>
            <p>Email: admin@demo.com</p>
            <p>Password: admin123</p>
            <p className="mt-2 text-slate-500">Enter your tenant_id to proceed</p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          © 2024 Hospital Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}

