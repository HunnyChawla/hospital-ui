"use client";

import React, { memo, useState, useRef, useCallback, useEffect } from "react";
import clsx from "clsx";
import { Users } from "lucide-react";
import { OptometristCollapsibleStatsSection } from "./OptometristCollapsibleStatsSection";
import { OptometristCollapsibleQueueSection, type OptometristActionType } from "./OptometristCollapsibleQueueSection";
import { OptometristActivePatientCard } from "@/components/optometrist/dashboard/OptometristActivePatientCard";
import type { OptometristStats } from "@/types";
import type { OptometristQueueFilter } from "@/hooks/useOptometristPanelPreferences";

type ActiveTab =
  | "complaints"
  | "vision"
  | "current_specs"
  | "medical_history"
  | "ophthalmic_history"
  | "allergies"
  | "ar_data"
  | "refraction"
  | "iop"
  | "previous_history";

interface OptometristPanelVerticalLayoutProps {
  // Stats
  stats: OptometristStats | null;
  statsLoading?: boolean;
  statsVisible: boolean;
  onToggleStats: () => void;

  // Queue
  queuePatients: any[];
  queueFilter: OptometristQueueFilter;
  onQueueFilterChange: (filter: OptometristQueueFilter) => void;
  queueLoading?: boolean;
  queueVisible: boolean;
  onToggleQueue: () => void;

  // Selected patient
  selectedPatientId: string | null;
  selectedPatientName?: string;
  selectedPatientUhid?: string;
  visitId?: string;
  activeTab: ActiveTab;
  onSelectPatient: (patientId: string) => void;
  onClearPatient: () => void;
  onTabChange: (tab: ActiveTab) => void;

  // Visit actions
  onAction?: (visitId: string, action: OptometristActionType) => void;
  updatingVisitId?: string | null;

  // Tab content
  children: React.ReactNode;

  // Doctor mode
  isDoctor?: boolean;
  optometristId?: string;
  doctorId?: string;
  doctorName?: string;
}

const STORAGE_KEY = "optometry-queue-sidebar-width";
const DEFAULT_QUEUE_WIDTH = 290; // pixels
const MIN_QUEUE_WIDTH = 220;
const MAX_QUEUE_WIDTH = 480;

const OptometristPanelVerticalLayoutComponent: React.FC<OptometristPanelVerticalLayoutProps> = ({
  stats,
  statsLoading,
  statsVisible,
  onToggleStats,
  queuePatients,
  queueFilter,
  onQueueFilterChange,
  queueLoading,
  queueVisible,
  onToggleQueue,
  selectedPatientId,
  selectedPatientName,
  selectedPatientUhid,
  visitId,
  activeTab,
  onSelectPatient,
  onClearPatient,
  onTabChange,
  onAction,
  updatingVisitId,
  children,
  isDoctor,
  optometristId,
  doctorId,
  doctorName,
}) => {
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isQueueExpanded, setIsQueueExpanded] = useState(true);
  const [queueWidth, setQueueWidth] = useState(DEFAULT_QUEUE_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPatient = queuePatients.find(p => p.patient_id === selectedPatientId);
  const isCompleted = selectedPatient?.status === "completed" || selectedPatient?.status === "consultation_completed";

  // Track viewport breakpoint for responsive overlay drawer vs inline sidebar
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      setIsMobileOrTablet(isMobile);
      if (isMobile && selectedPatientId) {
        setIsQueueExpanded(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedPatientId]);

  // Load saved width from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_QUEUE_WIDTH && parsed <= MAX_QUEUE_WIDTH) {
          setQueueWidth(parsed);
        }
      }
    }
  }, []);

  // Save width to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined" && !isDragging) {
      localStorage.setItem(STORAGE_KEY, queueWidth.toString());
    }
  }, [queueWidth, isDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerRight = containerRect.right;
      // Calculate new width based on distance from right edge
      const newWidth = containerRight - clientX;

      // Clamp within min/max bounds
      const clampedWidth = Math.min(MAX_QUEUE_WIDTH, Math.max(MIN_QUEUE_WIDTH, newWidth));
      setQueueWidth(clampedWidth);
    },
    [isDragging]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientX);
    },
    [handleMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    },
    [handleMove]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleEnd);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

  return (
    <div className="flex flex-col space-y-1.5 sm:space-y-2 h-full min-h-0 scrollbar-hide">
      {/* Stats Section - Horizontal 4-column layout at top */}
      {statsVisible && (
        <OptometristCollapsibleStatsSection
          stats={stats}
          loading={statsLoading}
          isVisible={isStatsExpanded}
          onToggle={() => setIsStatsExpanded(!isStatsExpanded)}
          compact={false}
        />
      )}

      {/* Main content area: Patient Area + Queue Sidebar */}
      <div ref={containerRef} className="flex gap-0 relative flex-1 min-h-0 overflow-hidden">
        {/* Patient Card - Takes remaining space */}
        <div className="flex-1 h-full min-h-0 min-w-0 overflow-hidden transition-none">
          <OptometristActivePatientCard
            patientId={selectedPatientId}
            patientName={selectedPatientName}
            patientUhid={selectedPatientUhid}
            visitId={visitId}
            visitType={selectedPatient?.visit_type}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onClose={onClearPatient}
            showPatientCard={!!selectedPatientId}
            isDoctor={isDoctor}
            optometristId={optometristId}
            doctorId={doctorId}
            doctorName={doctorName}
            isCompleted={isCompleted}
            onAction={onAction}
            activeQueuePatient={selectedPatient}
          >
            {children}
          </OptometristActivePatientCard>
        </div>

        {/* Queue Toggle Button (visible when sidebar is collapsed or on mobile/tablet) */}
        {queueVisible && (!isQueueExpanded || isMobileOrTablet) && (
          <button
            onClick={() => setIsQueueExpanded(true)}
            className="group flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:bg-sky-50 hover:border-sky-300 hover:text-sky-600 z-20 relative ml-1.5 self-start mt-0.5"
            title="Open patient queue"
          >
            <Users className="h-4 w-4" />
          </button>
        )}

        {/* Mobile / Tablet Responsive Drawer Overlay */}
        {queueVisible && isQueueExpanded && isMobileOrTablet && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150">
            <div
              className="fixed inset-0"
              onClick={() => setIsQueueExpanded(false)}
              aria-hidden="true"
            />
            <div className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl z-10 flex flex-col animate-in slide-in-from-right duration-200">
              <OptometristCollapsibleQueueSection
                queuePatients={queuePatients}
                activeFilter={queueFilter}
                onFilterChange={onQueueFilterChange}
                onSelectPatient={(id) => {
                  onSelectPatient(id);
                  setIsQueueExpanded(false); // auto-close drawer on selection on mobile/tablet
                }}
                selectedPatientId={selectedPatientId}
                onAction={onAction}
                updatingVisitId={updatingVisitId}
                loading={queueLoading}
                isVisible={true}
                onToggle={() => setIsQueueExpanded(false)}
                isDoctor={isDoctor}
                optometristId={optometristId}
              />
            </div>
          </div>
        )}

        {/* Desktop Drag Handle - Visible when queue is expanded on desktop */}
        {queueVisible && isQueueExpanded && !isMobileOrTablet && (
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={clsx(
              "relative flex-shrink-0 w-2.5 group cursor-col-resize z-10",
              "flex items-center justify-center select-none",
              isDragging && "bg-sky-50"
            )}
            title="Drag to resize queue sidebar"
          >
            {/* Visual drag divider */}
            <div
              className={clsx(
                "absolute inset-y-0 w-0.5 transition-all duration-150",
                "bg-slate-200 group-hover:bg-sky-400 group-hover:w-1",
                isDragging && "bg-sky-500 w-1"
              )}
            />
          </div>
        )}

        {/* Desktop Queue Sidebar - Right side with resizable width */}
        {!isMobileOrTablet && (
          <div
            style={{ width: queueVisible && isQueueExpanded ? `${queueWidth}px` : 0 }}
            className={clsx(
              "flex-shrink-0 h-full min-h-0 transition-none",
              !queueVisible || !isQueueExpanded ? "overflow-hidden" : ""
            )}
          >
            {queueVisible && isQueueExpanded && (
              <OptometristCollapsibleQueueSection
                queuePatients={queuePatients}
                activeFilter={queueFilter}
                onFilterChange={onQueueFilterChange}
                onSelectPatient={onSelectPatient}
                selectedPatientId={selectedPatientId}
                onAction={onAction}
                updatingVisitId={updatingVisitId}
                loading={queueLoading}
                isVisible={true}
                onToggle={() => setIsQueueExpanded(!isQueueExpanded)}
                isDoctor={isDoctor}
                optometristId={optometristId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export const OptometristPanelVerticalLayout = memo(OptometristPanelVerticalLayoutComponent);
