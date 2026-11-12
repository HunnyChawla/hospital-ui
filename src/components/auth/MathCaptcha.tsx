"use client";

import React, { useState } from "react";
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
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      {/* Header Label */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="login-captcha-answer"
          className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-700"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-[#00a8cc]" />
          <span>Security Verification</span>
        </label>
        <span className="text-[11px] text-slate-400 font-medium">Solve the math challenge</span>
      </div>

      {/* Challenge Display & Refresh */}
      <div className="flex items-center gap-2.5">
        {/* Captcha Image Display Container */}
        <div className="relative flex-1 flex items-center justify-center bg-slate-50/90 rounded-xl border border-slate-200/90 overflow-hidden h-11 px-3 shadow-2xs">
          {loading || !captcha ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
              <RotateCw className="h-3.5 w-3.5 animate-spin text-[#00a8cc]" />
              <span>Loading challenge…</span>
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={captcha.image}
              alt="Security math challenge"
              className="h-8 w-auto select-none pointer-events-none object-contain"
            />
          )}
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || disabled}
          className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-[#00a8cc] hover:border-[#00a8cc]/50 hover:bg-[#f0f9fb] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-2xs"
          title="Refresh math challenge"
          aria-label="Refresh math challenge"
        >
          <RotateCw className={`h-4 w-4 ${loading ? "animate-spin text-[#00a8cc]" : ""}`} />
        </button>
      </div>

      {/* Answer Input matching InputField styling */}
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
          <Calculator
            className={[
              "absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 transition-colors duration-200 pointer-events-none z-10",
              focused ? "text-[#00a8cc]" : "text-slate-400 group-hover:text-slate-500",
            ].join(" ")}
          />

          <input
            id="login-captcha-answer"
            name="login_captcha_answer"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/[^0-9]/g, "");
              onChange(sanitized);
            }}
            placeholder="Enter the calculation result"
            autoComplete="off"
            disabled={disabled || loading}
            className="w-full h-11 bg-transparent pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors duration-200 z-10 font-medium"
            required
          />
        </div>
      </div>
    </div>
  );
}
