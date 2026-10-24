"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  maskMobileNumber,
  maskAbhaNumber,
  maskAbhaAddress,
  formatAbhaNumber,
} from "@/utils/masking";

export interface MaskedValueProps {
  /** The sensitive value to display (mobile, ABHA number, ABHA address) */
  value?: string | null;
  /** Type of sensitive value for appropriate masking */
  type: "mobile" | "abha_number" | "abha_address" | "custom";
  /** Custom masking function if type === "custom" */
  customMask?: (val: string) => string;
  /** Custom unmasked formatting function if needed */
  formatUnmasked?: (val: string) => string;
  /** Fallback string if value is null or empty (defaults to "-") */
  fallback?: string;
  /** Additional classes on the wrapper container */
  className?: string;
  /** Additional classes on the text element */
  textClassName?: string;
  /** Additional classes on the eye icon button */
  iconClassName?: string;
  /** Size variant */
  size?: "xs" | "sm" | "md";
  /** Optional prefix element (e.g. "ABHA: ") */
  prefix?: React.ReactNode;
}

/**
 * MaskedValue displays a sensitive value masked (showing only the last 4 digits/characters).
 * Clicking and holding the eye button temporarily reveals the full value.
 * Releasing the hold (anywhere on screen) immediately re-masks it.
 */
export function MaskedValue({
  value,
  type,
  customMask,
  formatUnmasked,
  fallback = "-",
  className = "",
  textClassName = "",
  iconClassName = "",
  size = "sm",
  prefix,
}: MaskedValueProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Global pointer release listener when revealed
  const handleGlobalRelease = useCallback(() => {
    setIsRevealed(false);
  }, []);

  useEffect(() => {
    if (!isRevealed) return;

    window.addEventListener("pointerup", handleGlobalRelease);
    window.addEventListener("pointercancel", handleGlobalRelease);
    window.addEventListener("mouseup", handleGlobalRelease);
    window.addEventListener("touchend", handleGlobalRelease);
    window.addEventListener("touchcancel", handleGlobalRelease);

    return () => {
      window.removeEventListener("pointerup", handleGlobalRelease);
      window.removeEventListener("pointercancel", handleGlobalRelease);
      window.removeEventListener("mouseup", handleGlobalRelease);
      window.removeEventListener("touchend", handleGlobalRelease);
      window.removeEventListener("touchcancel", handleGlobalRelease);
    };
  }, [isRevealed, handleGlobalRelease]);

  if (!value || value === "N/A" || value === "None" || value === "-") {
    return (
      <span className={`text-slate-400 ${className}`}>
        {prefix}
        {value || fallback}
      </span>
    );
  }

  // Calculate masked & unmasked strings
  let maskedText = "";
  let unmaskedText = value;

  switch (type) {
    case "mobile":
      maskedText = maskMobileNumber(value);
      break;
    case "abha_number":
      maskedText = maskAbhaNumber(value);
      unmaskedText = formatAbhaNumber(value);
      break;
    case "abha_address":
      maskedText = maskAbhaAddress(value);
      break;
    case "custom":
      maskedText = customMask ? customMask(value) : value;
      break;
  }

  if (formatUnmasked) {
    unmaskedText = formatUnmasked(value);
  }

  const displayText = isRevealed ? unmaskedText : maskedText;

  const handleStartReveal = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    // Do not prevent default for keyboard Tab navigation
    if (e.type !== "keydown" || (e as React.KeyboardEvent).key === " " || (e as React.KeyboardEvent).key === "Enter") {
      e.preventDefault();
      setIsRevealed(true);
    }
  };

  const handleEndReveal = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setIsRevealed(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      setIsRevealed(true);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      setIsRevealed(false);
    }
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  const iconSizeClass = iconSizes[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 select-none align-baseline group/masked ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {prefix}
      <span className={`font-mono transition-colors ${isRevealed ? "text-slate-900 font-semibold" : ""} ${textClassName}`}>
        {displayText}
      </span>
      <button
        ref={buttonRef}
        type="button"
        tabIndex={0}
        aria-label={isRevealed ? "Release to mask" : "Click and hold to reveal"}
        title={isRevealed ? "Release to mask" : "Hold to reveal"}
        onPointerDown={handleStartReveal}
        onPointerUp={handleEndReveal}
        onPointerLeave={handleEndReveal}
        onPointerCancel={handleEndReveal}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleEndReveal}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={`inline-flex items-center justify-center p-0.5 rounded transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 active:scale-95 ${
          isRevealed
            ? "text-sky-600 bg-sky-50 ring-1 ring-sky-200"
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        } ${iconClassName}`}
      >
        {isRevealed ? (
          <EyeOff className={iconSizeClass} />
        ) : (
          <Eye className={iconSizeClass} />
        )}
      </button>
    </span>
  );
}
