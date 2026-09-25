"use client";

import React, { useState } from "react";
import { CheckCircle2, ShieldCheck, UserPlus, Copy, Check, RefreshCw, AtSign } from "lucide-react";
import { toast } from "sonner";

interface AbhaStatusBadgeProps {
  abhaNumber?: string | null;
  abhaAddress?: string | null;
  abhaVerified?: boolean;
  onEnrollClick?: () => void;
  onSyncClick?: () => void;
  showEnrollButton?: boolean;
  showSyncButton?: boolean;
  size?: "sm" | "md";
}

export function AbhaStatusBadge({
  abhaNumber,
  abhaAddress,
  abhaVerified = false,
  onEnrollClick,
  onSyncClick,
  showEnrollButton = true,
  showSyncButton = false,
  size = "md",
}: AbhaStatusBadgeProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const isLinked = Boolean(abhaNumber || abhaAddress);

  const handleCopy = (text: string, label: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLinked) {
    const hasAbhaNumber = Boolean(abhaNumber);
    const hasAbhaAddress = Boolean(abhaAddress && abhaAddress !== abhaNumber);

    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        {hasAbhaNumber && (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 font-medium text-emerald-800 ${
              size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
            }`}
            title={`Verified Ayushman Bharat Health Account (ABHA) Number: ${abhaNumber}`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>ABHA: {abhaNumber}</span>
            {abhaVerified && (
              <span className="flex items-center text-emerald-600 ml-0.5" title="Verified by ABDM">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            )}
            <button
              type="button"
              onClick={(e) => handleCopy(abhaNumber!, "ABHA number", "number", e)}
              className="ml-1 text-emerald-600 hover:text-emerald-800 transition-colors focus:outline-none cursor-pointer"
              title="Copy ABHA Number"
            >
              {copiedKey === "number" ? (
                <Check className="h-3.5 w-3.5 text-emerald-700" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}

        {hasAbhaAddress && (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 font-medium text-emerald-800 ${
              size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
            }`}
            title={`ABHA Address: ${abhaAddress}`}
          >
            {hasAbhaNumber ? (
              <AtSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <span>{hasAbhaNumber ? abhaAddress : `ABHA: ${abhaAddress}`}</span>
            {!hasAbhaNumber && abhaVerified && (
              <span className="flex items-center text-emerald-600 ml-0.5" title="Verified by ABDM">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            )}
            <button
              type="button"
              onClick={(e) => handleCopy(abhaAddress!, "ABHA address", "address", e)}
              className="ml-1 text-emerald-600 hover:text-emerald-800 transition-colors focus:outline-none cursor-pointer"
              title="Copy ABHA Address"
            >
              {copiedKey === "address" ? (
                <Check className="h-3.5 w-3.5 text-emerald-700" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}

        {showSyncButton && onSyncClick && (
          <button
            type="button"
            onClick={onSyncClick}
            className={`inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 font-medium text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer ${
              size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
            }`}
            title="Sync profile data from ABHA"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Sync</span>
          </button>
        )}
      </div>
    );
  }

  if (!showEnrollButton) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onEnrollClick}
      className={`inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 font-medium text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer ${
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      <UserPlus className="h-3.5 w-3.5" />
      <span>+ Enroll / Link ABHA</span>
    </button>
  );
}
