"use client";

import React from "react";
import { ChevronRight, Users } from "lucide-react";
import { EnhancedQueueBoard } from "./EnhancedQueueBoard";
import type { QueueFilter } from "@/hooks/useDoctorPanelPreferences";
import type { QueuePatient } from "@/utils/queueFilters";
import type { Pathway } from "@/services/pathwaysApi";

interface CollapsibleQueueSectionProps {
  queuePatients: QueuePatient[];
  activeFilter: QueueFilter;
  onFilterChange: (filter: QueueFilter) => void;
  onSelectPatient: (patientId: string) => void;
  selectedPatientId: string | null;
  /** The pathway that decides which actions each patient's stage allows. */
  pathway: Pathway | null;
  onCallPatient?: (visitId: string, toStageCode: string) => void;
  onAdvancePatient?: (visitId: string, toStageCode: string) => void;
  onReleasePatient?: (visitId: string) => void;
  currentUserId?: string | null;
  updatingVisitId?: string | null;
  loading?: boolean;
  isVisible: boolean;
  onToggle: () => void;
}

export const CollapsibleQueueSection: React.FC<CollapsibleQueueSectionProps> = ({
  queuePatients,
  activeFilter,
  onFilterChange,
  onSelectPatient,
  selectedPatientId,
  pathway,
  onCallPatient,
  onAdvancePatient,
  onReleasePatient,
  currentUserId,
  updatingVisitId,
  loading = false,
  isVisible,
  onToggle,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50"
        title="Collapse sidebar"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">Patient Queue</span>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200" />
      </button>

      {/* Queue Content */}
      <div className="border-t border-slate-200">
        <EnhancedQueueBoard
          queuePatients={queuePatients}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          onSelectPatient={onSelectPatient}
          selectedPatientId={selectedPatientId}
          pathway={pathway}
          onCallPatient={onCallPatient}
          onAdvancePatient={onAdvancePatient}
          onReleasePatient={onReleasePatient}
          currentUserId={currentUserId}
          updatingVisitId={updatingVisitId}
          loading={loading}
        />
      </div>
    </div>
  );
};
