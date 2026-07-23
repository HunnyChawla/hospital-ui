"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toaster } from "sonner";

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
