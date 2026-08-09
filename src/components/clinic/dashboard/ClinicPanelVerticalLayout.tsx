"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface ClinicPanelVerticalLayoutProps {
  statsSection: React.ReactNode;
  patientCard: React.ReactNode;
  queueSection: React.ReactNode;
  queueVisible: boolean;
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
}: ClinicPanelVerticalLayoutProps) {
  const [queueWidth, setQueueWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = parseInt(localStorage.getItem(WIDTH_STORAGE_KEY) || "", 10);
      if (!Number.isNaN(stored)) return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, stored));
    }
    return 320;
  });
  const isResizing = useRef(false);
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
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {statsSection}
      <div ref={containerRef} className="flex min-h-0 flex-1 gap-0">
        <div className="min-w-0 flex-1">{patientCard}</div>
        {queueVisible && (
          <>
            <div
              onMouseDown={startResize}
              onTouchStart={startResize}
              className="mx-1 w-1 flex-shrink-0 cursor-col-resize rounded bg-slate-200 transition hover:bg-sky-300"
            />
            <div className="flex-shrink-0" style={{ width: queueWidth }}>
              {queueSection}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
