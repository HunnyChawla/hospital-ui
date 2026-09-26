"use client";

import { useEffect, useState } from "react";
import { useResendCooldown } from "@/hooks/useResendCooldown";

interface ResendableOtpFieldProps {
  value: string;
  onChange: (value: string) => void;
  onResend: () => void | Promise<void>;
  length?: number;
  label?: string;
  resendLabel?: string;
  cooldownSeconds?: number;
  maxResends?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Start the cooldown immediately on mount (the initial OTP was just sent by the parent). Defaults to true. */
  startCooldownOnMount?: boolean;
}

/**
 * Digit OTP input paired with a "Didn't receive OTP? Resend" affordance that
 * self-manages its own countdown and attempt limits (default 60s cooldown, max 2 resends).
 * Reusable anywhere an OTP is verified (ABHA enrollment/linking, mobile verification, password reset, ...).
 */
export function ResendableOtpField({
  value,
  onChange,
  onResend,
  length = 6,
  label = "Enter OTP",
  resendLabel = "Resend OTP",
  cooldownSeconds = 60,
  maxResends = 2,
  disabled = false,
  autoFocus = false,
  startCooldownOnMount = true,
}: ResendableOtpFieldProps) {
  const [isResending, setIsResending] = useState(false);
  const cooldown = useResendCooldown(cooldownSeconds, maxResends);

  useEffect(() => {
    if (startCooldownOnMount) {
      cooldown.start(cooldownSeconds);
    }
    // Intentionally mount-only: `cooldown` is a fresh object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startCooldownOnMount]);

  const handleResend = async () => {
    if (disabled || isResending || !cooldown.canResend) return;
    try {
      setIsResending(true);
      await onResend();
      cooldown.recordResend(cooldownSeconds);
    } catch (err) {
      console.error("Failed to resend OTP:", err);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        maxLength={length}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder={"0".repeat(length)}
        disabled={disabled}
        autoFocus={autoFocus}
        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono tracking-widest text-center focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100"
      />
      <div className="flex items-center justify-between text-xs px-1 mt-1.5">
        <span className="text-slate-500">Didn&apos;t receive OTP?</span>
        {isResending ? (
          <span className="flex items-center gap-1.5 text-sky-600 font-medium">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
            <span>Sending OTP...</span>
          </span>
        ) : cooldown.isMaxReached ? (
          <span className="text-slate-400 font-medium">
            Resend limit reached (max {cooldown.maxResends})
          </span>
        ) : cooldown.isActive ? (
          <span className="text-slate-400 font-medium">
            Resend in <span className="font-semibold text-slate-600">{cooldown.secondsLeft}s</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={disabled || !cooldown.canResend}
            className="text-sky-600 font-semibold hover:text-sky-700 hover:underline transition-colors disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
          >
            {resendLabel}
            {cooldown.maxResends < Infinity && (
              <span className="font-normal text-slate-400 text-[11px] ml-1">
                ({cooldown.resendsLeft} left)
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

