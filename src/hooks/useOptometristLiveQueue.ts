import { useMemo } from "react";
import type { SSEConnectionStatus } from "@/hooks/useSSE";
import { useEyeQueueFromPathway } from "@/hooks/useEyeQueueFromPathway";

export type OptometristQueuePatient = {
  patient_id: string;
  patient_name: string;
  patient_uhid: string | null;
  patient_mobile?: string;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
  visit_id: string;
  item_id: string;
  time: string;
  checked_in_at?: string;
  optometrist_id?: string | null;
  optometrist_assigned_at?: string | null;
  optometrist_investigation_started_at?: string | null;
  optometrist_investigation_completed_at?: string | null;
  dilation_started_at?: string | null;
  dilation_duration_minutes?: number | null;
  dilation_completed_at?: string | null;
  expected_next_status_time?: string | null;
  is_revisit?: boolean;
};

type QueuePatient = OptometristQueuePatient;

interface UseOptometristLiveQueueOptions {
  doctorId: string | null;
  autoConnect?: boolean;
}

/**
 * The stages this panel shows.
 *
 * Unchanged from the status list this hook sent to the eye endpoint — the eye
 * pathway's stage codes ARE those status strings, which was the migration rule
 * the whole of Phase 2 was built on. So this is the same set under a new name,
 * not a translation, and that is what makes Track C a swap of source rather
 * than a change of behaviour.
 */
const OPTOMETRIST_PANEL_STAGES = [
  // Optometry pending / in progress
  "awaiting_optometrist",
  "optometrist_assigned",
  "optometrist_investigation_in_progress",
  // Optometry completed / sent to the doctor
  "optometrist_investigation_completed",
  "awaiting_doctor",
  "doctor_assigned",
  "consultation_in_progress",
  "dilation_in_progress",
  "dilation_completed",
  "consultation_completed",
  "no_show",
];

export function useOptometristLiveQueue({
  doctorId,
  autoConnect = true,
}: UseOptometristLiveQueueOptions) {
  // Served by the generic pathway queue, with the eye-specific fields fetched
  // alongside and merged back in. `queuePatients` keeps exactly the shape it
  // always had, which is why the panel's components are untouched.
  const eyeQueue = useEyeQueueFromPathway({
    stageCodes: OPTOMETRIST_PANEL_STAGES,
    doctorId: doctorId ?? undefined,
    includeCoveringDoctors: true,
    enabled: !!doctorId && autoConnect,
  });

  const queuePatients = useMemo<QueuePatient[]>(
    () =>
      eyeQueue.rows.map((row) => ({
        patient_id: row.patient_id,
        patient_name: row.patient_name || "Unknown",
        patient_uhid: null,
        patient_mobile: row.patient_mobile ?? undefined,
        token_number: row.token_number ?? 0,
        status: row.status,
        visit_type: row.visit_type as QueuePatient["visit_type"],
        visit_id: row.visit_id,
        item_id: row.id,
        time: row.checked_in_at ?? "",
        checked_in_at: row.checked_in_at ?? undefined,
        optometrist_id: row.optometrist_id ?? null,
        optometrist_assigned_at: row.optometrist_assigned_at ?? null,
        optometrist_investigation_started_at:
          row.optometrist_investigation_started_at ?? null,
        optometrist_investigation_completed_at:
          row.optometrist_investigation_completed_at ?? null,
        dilation_started_at: row.dilation_started_at ?? null,
        dilation_duration_minutes: row.dilation_duration_minutes ?? null,
        dilation_completed_at: row.dilation_completed_at ?? null,
        expected_next_status_time: row.expected_next_status_time ?? null,
        is_revisit: row.is_revisit,
      })),
    [eyeQueue.rows]
  );

  return {
    queuePatients,
    // Mapped to the vocabulary callers already switch on.
    connectionStatus: (eyeQueue.status === "live"
      ? "connected"
      : eyeQueue.status === "connecting"
        ? "connecting"
        : "reconnecting") as SSEConnectionStatus,
    reconnect: eyeQueue.reconnect,
  };
}

