"use client";

import React from "react";
import { ChevronLeft, Users } from "lucide-react";
import { EnhancedQueueBoard } from "./EnhancedQueueBoard";
import type { QueueFilter } from "@/hooks/useDoctorPanelPreferences";
import type { QueuePatient } from "@/utils/queueFilters";

interface CollapsibleQueueSectionProps {
  queuePatients: QueuePatient[];
  activeFilter: QueueFilter;
  onFilterChange: (filter: QueueFilter) => void;
  onSelectPatient: (patientId: string) => void;
  selectedPatientId: string | null;
  onUpdateStatus?: (visitId: string, newStatus: "in_consultation" | "completed") => void;
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
  onUpdateStatus,
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
        <ChevronLeft className="h-4 w-4 text-slate-400 transition-transform duration-200" />
      </button>

      {/* Queue Content */}
      <div className="border-t border-slate-200">
        <EnhancedQueueBoard
          queuePatients={queuePatients}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          onSelectPatient={onSelectPatient}
          selectedPatientId={selectedPatientId}
          onUpdateStatus={onUpdateStatus}
          updatingVisitId={updatingVisitId}
          loading={loading}
        />
      </div>
    </div>
  );
};
