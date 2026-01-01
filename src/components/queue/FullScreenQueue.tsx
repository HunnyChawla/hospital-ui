"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { LiveQueueBoard } from "./LiveQueueBoard";

interface FullScreenQueueProps {
  onClose: () => void;
}

export function FullScreenQueue({ onClose }: FullScreenQueueProps) {
  // Handle Escape key to exit full screen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    // Prevent body scroll when in full screen
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-white">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-50 flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 shadow-lg transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        title="Exit full screen (Esc)"
        aria-label="Exit full screen"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Queue Content */}
      <div className="h-full w-full overflow-y-auto p-6">
        <LiveQueueBoard />
      </div>
    </div>
  );
}

