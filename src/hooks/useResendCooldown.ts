"use client";

import { useEffect, useState } from "react";

/**
 * Countdown-based cooldown for "resend" actions (OTP, verification emails, etc).
 * Call `start()` right after the resend action succeeds.
 */
export function useResendCooldown(defaultSeconds: number = 30) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  return {
    secondsLeft,
    isActive: secondsLeft > 0,
    start: (seconds: number = defaultSeconds) => setSecondsLeft(seconds),
    reset: () => setSecondsLeft(0),
  };
}
