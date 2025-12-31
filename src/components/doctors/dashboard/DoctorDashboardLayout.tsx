"use client";

import React from "react";
import { DoctorStatsCards } from "./DoctorStatsCards";
import { TodayScheduleTimeline } from "./TodayScheduleTimeline";
import { QueueStatusBoard } from "./QueueStatusBoard";
import { ActivePatientCard } from "./ActivePatientCard";
import { DoctorSchedule, DoctorStats } from "@/types";

type ActiveTab = "history" | "vitals" | "labs" | "notes" | "ipd";

interface QueuePatient {
  patient_id: string;
  patient_name: string;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
}

interface DoctorDashboardLayoutProps {
  // Stats
  stats: DoctorStats | null;
  statsLoading?: boolean;

  // Schedule
  schedule: DoctorSchedule | null;
  scheduleLoading?: boolean;

  // Queue
  queuePatients: QueuePatient[];
  queueLoading?: boolean;

  // Selected patient
  selectedPatientId: string | null;
  selectedPatientName?: string;
  activeTab: ActiveTab;

  // Handlers
  onSelectPatient: (patientId: string) => void;
  onClearPatient: () => void;
  onTabChange: (tab: ActiveTab) => void;
  onViewFullQueue?: () => void;
  onUpdateVisitStatus?: (visitId: string, newStatus: "in_consultation" | "completed") => void;
  updatingVisitId?: string | null;

  // Tab content
  children: React.ReactNode;
}

export const DoctorDashboardLayout: React.FC<DoctorDashboardLayoutProps> = ({
  stats,
  statsLoading,
  schedule,
  scheduleLoading,
  queuePatients,
  queueLoading,
  selectedPatientId,
  selectedPatientName,
  activeTab,
  onSelectPatient,
  onClearPatient,
  onTabChange,
  onViewFullQueue,
  onUpdateVisitStatus,
  updatingVisitId,
  children,
}) => {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <DoctorStatsCards stats={stats} loading={statsLoading} />

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column: Schedule (25%) */}
        <div className="lg:col-span-3">
          <div className="sticky top-4">
            <TodayScheduleTimeline
              schedule={schedule}
              loading={scheduleLoading}
              selectedPatientId={selectedPatientId}
              onSelectPatient={onSelectPatient}
              onUpdateStatus={onUpdateVisitStatus}
              updatingVisitId={updatingVisitId}
            />
          </div>
        </div>

        {/* Center column: Active Patient (50%) */}
        <div className="lg:col-span-6">
          <ActivePatientCard
            patientId={selectedPatientId}
            patientName={selectedPatientName}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onClose={onClearPatient}
          >
            {children}
          </ActivePatientCard>
        </div>

        {/* Right column: Queue (25%) */}
        <div className="lg:col-span-3">
          <div className="sticky top-4">
            <QueueStatusBoard
              queuePatients={queuePatients}
              loading={queueLoading}
              onSelectPatient={onSelectPatient}
              onViewFullQueue={onViewFullQueue}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
