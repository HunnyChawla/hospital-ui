"use client";

import React from "react";
import { RotateCw, Calculator, ShieldCheck } from "lucide-react";
import { CaptchaResponse } from "@/services/authApi";

interface MathCaptchaProps {
  captcha: CaptchaResponse | null;
  value: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
  disabled?: boolean;
}

export function MathCaptcha({
  captcha,
  value,
  onChange,
  onRefresh,
  loading,
  disabled = false,
}: MathCaptchaProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="login-captcha-answer"
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"
        >
          <ShieldCheck className="h-4 w-4 text-sky-600" />
          <span>Security Verification</span>
        </label>
        <span className="text-xs text-slate-500 font-medium">Solve the math problem</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Captcha Image Display Card */}
        <div className="relative flex-1 flex items-center justify-center bg-slate-50/80 rounded-xl border-2 border-slate-200 overflow-hidden min-h-[46px] px-2 shadow-inner">
          {loading || !captcha ? (
            <div className="flex items-center gap-2 py-2 text-xs text-slate-400 animate-pulse">
              <RotateCw className="h-3.5 w-3.5 animate-spin text-sky-500" />
              <span>Loading challenge...</span>
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={captcha.image}
              alt="Security math challenge"
              className="h-10 w-auto select-none pointer-events-none object-contain"
            />
          )}
        </div>

        {/* Reload / Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || disabled}
          className="p-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-600 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-slate-50 disabled:active:scale-100 flex items-center justify-center shadow-sm"
          title="Refresh math challenge"
          aria-label="Refresh math challenge"
        >
          <RotateCw className={`h-5 w-5 ${loading ? "animate-spin text-sky-600" : ""}`} />
        </button>
      </div>

      {/* Answer Input Field */}
      <div className="relative group">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none z-0"></div>
        <Calculator className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors pointer-events-none z-30" />
        <input
          id="login-captcha-answer"
          name="login_captcha_answer"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => {
            // Allow only digits and negative sign if needed
            const sanitized = e.target.value.replace(/[^0-9]/g, "");
            onChange(sanitized);
          }}
          placeholder="Enter the calculation result"
          autoComplete="off"
          disabled={disabled || loading}
          className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3.5 text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100/50 relative z-20 font-medium"
          required
        />
      </div>
    </div>
  );
}
