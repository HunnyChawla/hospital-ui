"use client";

import { useEffect, useState, isValidElement } from "react";
import { createPortal } from "react-dom";
import { Toaster, toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

// Protect Sonner from raw API error objects (e.g. FastAPI 422 [{ loc, msg, type, ctx }])
// which cause React runtime errors ("Objects are not valid as a React child").
if (typeof window !== "undefined") {
  const patchToast = (method: "error" | "success" | "warning" | "info" | "message") => {
    const original = (toast as any)[method];
    if (typeof original === "function" && !(original as any).__isSafePatched) {
      const patched = (message: any, ...args: any[]) => {
        if (
          message != null &&
          typeof message === "object" &&
          !isValidElement(message) &&
          !(Array.isArray(message) && message.every(isValidElement))
        ) {
          return original(getErrorMessage(message), ...args);
        }
        return original(message, ...args);
      };
      patched.__isSafePatched = true;
      (toast as any)[method] = patched;
    }
  };

  (["error", "success", "warning", "info", "message"] as const).forEach(patchToast);
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
