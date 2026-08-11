"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";

interface ClinicPanelVerticalLayoutProps {
  statsSection: React.ReactNode;
  patientCard: React.ReactNode;
  queueSection: React.ReactNode;
  queueVisible: boolean;
  isQueueExpanded: boolean;
  onToggleQueue: () => void;
}

const WIDTH_STORAGE_KEY = "clinic-queue-sidebar-width";
const MIN_WIDTH = 240;
const MAX_WIDTH = 600;

/**
 * Stats row on top; patient card + resizable queue rail below.
 * The rail's width persists per browser (mouse and touch both drag).
 */
export function ClinicPanelVerticalLayout({
  statsSection,
  patientCard,
  queueSection,
  queueVisible,
  isQueueExpanded,
  onToggleQueue,
}: ClinicPanelVerticalLayoutProps) {
  const [queueWidth, setQueueWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = parseInt(localStorage.getItem(WIDTH_STORAGE_KEY) || "", 10);
      if (!Number.isNaN(stored)) return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, stored));
    }
    return 320;
  });
  const isResizing = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const persistWidth = useCallback((width: number) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
    }
  }, []);

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isResizing.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, rect.right - clientX));
      setQueueWidth(next);
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const stop = () => {
      if (isResizing.current) {
        isResizing.current = false;
        setIsDragging(false);
        setQueueWidth((width) => {
          persistWidth(width);
          return width;
        });
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stop);
    };
  }, [persistWidth]);

  const startResize = () => {
    isResizing.current = true;
    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {statsSection}
      <div ref={containerRef} className="flex min-h-0 flex-1 gap-0 relative overflow-hidden">
        <div className="min-w-0 flex-1 h-full overflow-hidden transition-none">{patientCard}</div>
        
        {/* Queue Toggle Button (visible when sidebar is collapsed) */}
        {queueVisible && !isQueueExpanded && (
          <button
            onClick={onToggleQueue}
            className="group flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-md transition-all hover:bg-sky-50 hover:border-sky-400 hover:text-sky-600 hover:scale-110 active:scale-95 z-20 relative animate-in fade-in slide-in-from-right-2 duration-300 ml-2 animate-duration-300"
            title="Show patient queue"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        )}

        {queueVisible && isQueueExpanded && (
          <>
            {/* Drag Handle */}
            <div
              onMouseDown={startResize}
              onTouchStart={startResize}
              className={clsx(
                "relative flex-shrink-0 w-3 group cursor-col-resize z-10",
                "flex items-center justify-center transition-all",
                isDragging && "bg-sky-100/50"
              )}
            >
              {/* Visual drag indicator */}
              <div
                className={clsx(
                  "absolute inset-y-0 w-1 rounded-full transition-all duration-200",
                  "bg-slate-200 group-hover:bg-sky-400 group-hover:w-1.5",
                  isDragging && "bg-sky-500 w-1.5 shadow-lg shadow-sky-500/30"
                )}
              />
              {/* Grip dots */}
              <div
                className={clsx(
                  "absolute flex flex-col gap-1 pointer-events-none",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  isDragging && "opacity-100"
                )}
              >
                <div className="w-1 h-1 rounded-full bg-sky-500" />
                <div className="w-1 h-1 rounded-full bg-sky-500" />
                <div className="w-1 h-1 rounded-full bg-sky-500" />
              </div>
            </div>
          </>
        )}
        <div
          style={{ width: queueVisible && isQueueExpanded ? `${queueWidth}px` : 0 }}
          className={clsx(
            "flex-shrink-0 h-full min-h-0 transition-none",
            !queueVisible || !isQueueExpanded ? "overflow-hidden" : ""
          )}
        >
          {queueVisible && queueSection}
        </div>
      </div>
    </div>
  );
}
