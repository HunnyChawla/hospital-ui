"use client";

import React, { memo } from "react";
import { OptometristCollapsibleStatsSection } from "./OptometristCollapsibleStatsSection";
import { OptometristCollapsibleQueueSection, type OptometristActionType } from "./OptometristCollapsibleQueueSection";
import { OptometristActivePatientCard } from "@/components/optometrist/dashboard/OptometristActivePatientCard";
import type { OptometristStats } from "@/types";
import type { OptometristQueueFilter } from "@/hooks/useOptometristPanelPreferences";

type ActiveTab = 
  | "complaints"
  | "medical_history"
  | "ophthalmic_history"
  | "allergies"
  | "ar_data"
  | "refraction"
  | "iop"
  | "previous_history"
  | "diagnosis";

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
}

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
}) => {
  return (
    <div className="flex flex-col space-y-3 sm:space-y-4 h-full min-h-0">
      {/* Stats Section - Horizontal 4-column layout at top */}
      <OptometristCollapsibleStatsSection
        stats={stats}
        loading={statsLoading}
        isVisible={statsVisible}
        onToggle={onToggleStats}
        compact={false}
      />

      {/* Main content area: Patient Area + Queue Sidebar */}
      <div className="flex gap-3 sm:gap-4 relative flex-1 min-h-0 overflow-hidden">
        {/* Patient Card - Takes remaining space */}
        <div className="flex-1 h-full min-h-0 min-w-0 overflow-hidden transition-all duration-300">
          <OptometristActivePatientCard
            patientId={selectedPatientId}
            patientName={selectedPatientName}
            patientUhid={selectedPatientUhid}
            visitId={visitId}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onClose={onClearPatient}
            showPatientCard={!!selectedPatientId}
          >
            {children}
          </OptometristActivePatientCard>
        </div>

        {/* Queue Toggle Button (visible when sidebar is collapsed) */}
        {!queueVisible && (
          <button
            onClick={onToggleQueue}
            className="group flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-md transition-all hover:bg-sky-50 hover:border-sky-400 hover:text-sky-600 hover:scale-110 active:scale-95 z-20 relative animate-in fade-in slide-in-from-right-2 duration-300"
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

        {/* Queue Sidebar - Right side with responsive width */}
        <div
          className={`sidebar-transition flex-shrink-0 h-full min-h-0 transition-all duration-300 ${
            queueVisible ? "w-72 sm:w-80 lg:w-96" : "w-0 overflow-hidden"
          }`}
        >
          {queueVisible && (
            <OptometristCollapsibleQueueSection
              queuePatients={queuePatients}
              activeFilter={queueFilter}
              onFilterChange={onQueueFilterChange}
              onSelectPatient={onSelectPatient}
              selectedPatientId={selectedPatientId}
              onAction={onAction}
              updatingVisitId={updatingVisitId}
              loading={queueLoading}
              isVisible={queueVisible}
              onToggle={onToggleQueue}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export const OptometristPanelVerticalLayout = memo(OptometristPanelVerticalLayoutComponent);
