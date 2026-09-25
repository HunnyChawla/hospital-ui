"use client";

import React from "react";
import { Shield, Smartphone } from "lucide-react";
import type { AbdmOtpSystem } from "@/services/abhaApi";

export interface OtpSystemSelectorProps {
  value: AbdmOtpSystem;
  onChange: (value: AbdmOtpSystem) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function OtpSystemSelector({
  value,
  onChange,
  disabled = false,
  label = "OTP System (Gateway)",
  className = "",
  size = "md",
}: OtpSystemSelectorProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700">
            {label} <span className="text-red-500">*</span>
          </label>
          <span className="text-[11px] text-slate-400 font-medium">
            {value === "aadhaar" ? "UIDAI Aadhaar gateway" : "ABDM SMS gateway"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Aadhaar OTP Choice */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("aadhaar")}
          className={`group relative flex items-center gap-2.5 rounded-lg border text-left transition-all ${
            size === "sm" ? "p-2 text-xs" : "p-2.5 text-sm"
          } ${
            value === "aadhaar"
              ? "border-sky-500 bg-sky-50/80 text-sky-950 font-medium ring-1 ring-sky-500/30 shadow-xs"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70"
          } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div
            className={`flex shrink-0 items-center justify-center rounded-md transition-colors ${
              size === "sm" ? "h-6 w-6" : "h-7 w-7"
            } ${
              value === "aadhaar"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
            }`}
          >
            <Shield className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs tracking-tight">Aadhaar OTP</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                  value === "aadhaar"
                    ? "bg-sky-200/70 text-sky-800"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                aadhaar
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">UIDAI registered mobile</p>
          </div>
        </button>

        {/* ABDM OTP Choice */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("abdm")}
          className={`group relative flex items-center gap-2.5 rounded-lg border text-left transition-all ${
            size === "sm" ? "p-2 text-xs" : "p-2.5 text-sm"
          } ${
            value === "abdm"
              ? "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium ring-1 ring-emerald-500/30 shadow-xs"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70"
          } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div
            className={`flex shrink-0 items-center justify-center rounded-md transition-colors ${
              size === "sm" ? "h-6 w-6" : "h-7 w-7"
            } ${
              value === "abdm"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
            }`}
          >
            <Smartphone className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs tracking-tight">ABDM OTP</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                  value === "abdm"
                    ? "bg-emerald-200/70 text-emerald-800"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                abdm
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">ABDM direct SMS</p>
          </div>
        </button>
      </div>
    </div>
  );
}
