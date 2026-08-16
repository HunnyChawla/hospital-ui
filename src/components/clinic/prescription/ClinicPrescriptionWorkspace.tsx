"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ClinicExaminationSummaryPane } from "./ClinicExaminationSummaryPane";
import { PrescriptionForm } from "@/components/doctors/PrescriptionForm";

interface ClinicPrescriptionWorkspaceProps {
  patientId: string;
  visitId: string;
  doctorId: string;
  /** Flip the card to Examine mode on a specific section. */
  onEditSection?: (componentKey: string) => void;
  onPrescriptionSaved?: () => void;
}

const WIDTH_STORAGE_KEY = "clinic-rx-summary-width";
const MIN_WIDTH = 220;
const MAX_WIDTH = 520;

/**
 * The doctor's inline prescription surface: examination summary (read-only,
 * collapsible, resizable) on the left, the general prescription form on the
 * right. No portal, no fullscreen takeover, no body scroll lock — unlike the
 * eye panel's DoctorPrescriptionModal, this lives inside the patient card.
 */
export function ClinicPrescriptionWorkspace({
  patientId,
  visitId,
  doctorId,
  onEditSection,
  onPrescriptionSaved,
}: ClinicPrescriptionWorkspaceProps) {
  const [summaryWidth, setSummaryWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = parseInt(localStorage.getItem(WIDTH_STORAGE_KEY) || "", 10);
      if (!Number.isNaN(stored)) return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, stored));
    }
    return 300;
  });
  const [collapsed, setCollapsed] = useState(false);
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
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, clientX - rect.left));
      setSummaryWidth(next);
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const stop = () => {
      if (isResizing.current) {
        isResizing.current = false;
        setSummaryWidth((width) => {
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
    <div ref={containerRef} className="flex h-full min-h-0 min-w-0">
      {/* Left: examination summary */}
      {collapsed ? (
        <div className="flex w-10 flex-shrink-0 flex-col items-center border-r border-slate-200 bg-slate-50 py-2">
          <button
            onClick={() => setCollapsed(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
            title="Show examination summary"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div
            className="flex flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50/50"
            style={{ width: summaryWidth }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Examination Summary
              </span>
              <button
                onClick={() => setCollapsed(true)}
                className="rounded p-1 text-slate-400 hover:bg-slate-200"
                title="Collapse"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ClinicExaminationSummaryPane
                patientId={patientId}
                visitId={visitId}
                onEditSection={onEditSection}
              />
            </div>
          </div>

          {/* Drag handle (mouse + touch) */}
          <div
            onMouseDown={startResize}
            onTouchStart={startResize}
            className="w-1 flex-shrink-0 cursor-col-resize bg-slate-100 transition hover:bg-sky-300"
          />
        </>
      )}

      {/* Right: the general prescription form */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <PrescriptionForm
          visitId={visitId}
          patientId={patientId}
          doctorId={doctorId}
          onSuccess={onPrescriptionSaved}
        />
      </div>
    </div>
  );
}
