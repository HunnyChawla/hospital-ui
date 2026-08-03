"use client";

import React, { useState } from "react";
import { CheckCircle2, ShieldCheck, UserPlus, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface AbhaStatusBadgeProps {
  abhaNumber?: string | null;
  abhaAddress?: string | null;
  abhaVerified?: boolean;
  onEnrollClick?: () => void;
  showEnrollButton?: boolean;
  size?: "sm" | "md";
}

export function AbhaStatusBadge({
  abhaNumber,
  abhaAddress,
  abhaVerified = false,
  onEnrollClick,
  showEnrollButton = true,
  size = "md",
}: AbhaStatusBadgeProps) {
  const [copied, setCopied] = useState(false);
  const isLinked = Boolean(abhaNumber || abhaAddress);

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("ABHA copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLinked) {
    const displayValue = abhaNumber || abhaAddress || "";
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 font-medium text-emerald-800 ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
        }`}
        title={`Verified Ayushman Bharat Health Account (ABHA): ${displayValue}`}
      >
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>ABHA: {displayValue}</span>
        {abhaVerified && (
          <span className="flex items-center text-emerald-600 ml-0.5" title="Verified by ABDM">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
        )}
        <button
          type="button"
          onClick={(e) => handleCopy(displayValue, e)}
          className="ml-1 text-emerald-600 hover:text-emerald-800 transition-colors focus:outline-none"
          title="Copy ABHA Number"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  }

  if (!showEnrollButton) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onEnrollClick}
        className={`inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 font-medium text-sky-700 hover:bg-sky-100 transition-colors ${
          size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
        }`}
      >
        <UserPlus className="h-3.5 w-3.5" />
        <span>+ Enroll / Link ABHA</span>
      </button>
      <span className="text-xs text-slate-400 italic">(Optional)</span>
    </div>
  );
}
