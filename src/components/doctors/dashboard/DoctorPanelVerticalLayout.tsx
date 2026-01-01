"use client";

import React from "react";
import { CollapsibleStatsSection } from "./CollapsibleStatsSection";
import { CollapsibleQueueSection } from "./CollapsibleQueueSection";
import { ActivePatientCard } from "./ActivePatientCard";
import type { DoctorStats } from "@/types";
import type { QueueFilter } from "@/hooks/useDoctorPanelPreferences";
import type { QueuePatient } from "@/utils/queueFilters";

type ActiveTab = "history" | "vitals" | "labs" | "notes" | "ipd";

interface DoctorPanelVerticalLayoutProps {
  // Stats
  stats: DoctorStats | null;
  statsLoading?: boolean;
  statsVisible: boolean;
  onToggleStats: () => void;

  // Queue
  queuePatients: QueuePatient[];
  queueFilter: QueueFilter;
  onQueueFilterChange: (filter: QueueFilter) => void;
  queueLoading?: boolean;
  queueVisible: boolean;
  onToggleQueue: () => void;

  // Selected patient
  selectedPatientId: string | null;
  selectedPatientName?: string;
  activeTab: ActiveTab;
  onSelectPatient: (patientId: string) => void;
  onClearPatient: () => void;
  onTabChange: (tab: ActiveTab) => void;

  // Visit status
  onUpdateVisitStatus?: (visitId: string, newStatus: "in_consultation" | "completed") => void;
  updatingVisitId?: string | null;

  // Prescription
  onCreatePrescription?: () => void;

  // Tab content
  children: React.ReactNode;
}

export const DoctorPanelVerticalLayout: React.FC<DoctorPanelVerticalLayoutProps> = ({
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
  activeTab,
  onSelectPatient,
  onClearPatient,
  onTabChange,
  onUpdateVisitStatus,
  updatingVisitId,
  onCreatePrescription,
  children,
}) => {
  return (
    <div className="flex flex-col space-y-3">
      {/* Stats Section - Horizontal 4-column layout at top */}
      <CollapsibleStatsSection
        stats={stats}
        loading={statsLoading}
        isVisible={statsVisible}
        onToggle={onToggleStats}
        compact={false}
      />

      {/* Main content area: Patient Area + Queue Sidebar */}
      <div className="flex gap-3">
        {/* Patient Card - Takes remaining space */}
        <div className="flex-1">
          <ActivePatientCard
            patientId={selectedPatientId}
            patientName={selectedPatientName}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onClose={onClearPatient}
            onCreatePrescription={onCreatePrescription}
            showPrescriptionButton={!!selectedPatientId}
          >
            {children}
          </ActivePatientCard>
        </div>

        {/* Queue Toggle Button (visible when sidebar is collapsed) */}
        {!queueVisible && (
          <button
            onClick={onToggleQueue}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
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

        {/* Queue Sidebar - Right side (collapses to save space) */}
        <div
          className={`sidebar-transition flex-shrink-0 ${
            queueVisible ? "w-80" : "w-0 overflow-hidden"
          }`}
        >
          {queueVisible && (
            <CollapsibleQueueSection
              queuePatients={queuePatients}
              activeFilter={queueFilter}
              onFilterChange={onQueueFilterChange}
              onSelectPatient={onSelectPatient}
              selectedPatientId={selectedPatientId}
              onUpdateStatus={onUpdateVisitStatus}
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
