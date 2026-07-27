"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toaster, toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

// Patch sonner toast methods once on client side to guarantee non-string objects never reach React render tree
if (typeof window !== "undefined") {
  const originalError = toast.error;
  const originalSuccess = toast.success;
  const originalWarning = toast.warning;
  const originalInfo = toast.info;

  if (!(toast as any).__isPatchedForObjects) {
    (toast as any).__isPatchedForObjects = true;

    toast.error = (message: any, data?: any) => {
      let safeMessage = message;
      if (message && typeof message !== "string" && !React.isValidElement(message)) {
        safeMessage = getErrorMessage(message);
      }
      return originalError(safeMessage, data);
    };

    toast.success = (message: any, data?: any) => {
      let safeMessage = message;
      if (message && typeof message !== "string" && !React.isValidElement(message)) {
        safeMessage = typeof message === "object" ? (message.message || message.msg || getErrorMessage(message)) : String(message);
      }
      return originalSuccess(safeMessage, data);
    };

    toast.warning = (message: any, data?: any) => {
      let safeMessage = message;
      if (message && typeof message !== "string" && !React.isValidElement(message)) {
        safeMessage = getErrorMessage(message);
      }
      return originalWarning(safeMessage, data);
    };

    toast.info = (message: any, data?: any) => {
      let safeMessage = message;
      if (message && typeof message !== "string" && !React.isValidElement(message)) {
        safeMessage = getErrorMessage(message);
      }
      return originalInfo(safeMessage, data);
    };
  }
}

export function FullscreenAwareToaster() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTarget = () => {
      const fullscreenElem = (document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement) as HTMLElement | null;
      setTarget(fullscreenElem || document.body);
    };

    updateTarget();
    document.addEventListener("fullscreenchange", updateTarget);
    document.addEventListener("webkitfullscreenchange", updateTarget);
    document.addEventListener("mozfullscreenchange", updateTarget);
    document.addEventListener("MSFullscreenChange", updateTarget);

    return () => {
      document.removeEventListener("fullscreenchange", updateTarget);
      document.removeEventListener("webkitfullscreenchange", updateTarget);
      document.removeEventListener("mozfullscreenchange", updateTarget);
      document.removeEventListener("MSFullscreenChange", updateTarget);
    };
  }, []);

  if (!mounted || !target) return null;

  return createPortal(
    <Toaster richColors position="top-right" style={{ zIndex: 999999 }} />,
    target
  );
}
