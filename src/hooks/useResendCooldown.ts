"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Countdown-based cooldown for "resend" actions (OTP, verification emails, etc).
 * Supports configurable cooldown duration (default 60s) and maximum resend attempts (default 2).
 */
export function useResendCooldown(
  defaultSeconds: number = 60,
  maxResends: number = 2
) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const isActive = secondsLeft > 0;
  const isMaxReached = resendCount >= maxResends;
  const canResend = !isActive && !isMaxReached;
  const resendsLeft = Math.max(0, maxResends - resendCount);

  const start = useCallback((seconds: number = defaultSeconds) => {
    setSecondsLeft(seconds);
  }, [defaultSeconds]);

  const recordResend = useCallback((seconds: number = defaultSeconds) => {
    setResendCount((prev) => prev + 1);
    setSecondsLeft(seconds);
  }, [defaultSeconds]);

  const reset = useCallback(() => {
    setSecondsLeft(0);
    setResendCount(0);
  }, []);

  return {
    secondsLeft,
    isActive,
    resendCount,
    maxResends,
    resendsLeft,
    canResend,
    isMaxReached,
    start,
    recordResend,
    reset,
  };
}

