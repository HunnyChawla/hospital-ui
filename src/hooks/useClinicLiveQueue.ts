import { useEffect, useState, useMemo, useCallback } from "react";
import { useSSE } from "@/hooks/useSSE";
import type { ClinicQueuePatient } from "@/utils/clinicQueueFilters";

/**
 * Live clinic queue over SSE against /opd/general.
 *
 * ONE hook for both roles (the optometrist panel's "call both hooks, only
 * one connects" pattern is deliberately not repeated): `as` picks the
 * endpoint — examiners watch the examiner queue for their doctor's
 * patients, doctors watch the shared group queue.
 */

// Returns null for heartbeat/keep-alive messages that should be ignored.
function mapSSEDataToQueuePatients(data: unknown): ClinicQueuePatient[] | null {
  if (!data) return null;

  const record = data as Record<string, unknown>;
  if (
    record.type === "heartbeat" ||
    record.type === "ping" ||
    record.type === "keepalive"
  ) {
    return null;
  }
  if (typeof data === "object" && !Array.isArray(data) && Object.keys(record).length === 0) {
    return null;
  }

  const items: Record<string, unknown>[] | null = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : Array.isArray(record.queue)
      ? (record.queue as Record<string, unknown>[])
      : Array.isArray(record.entries)
        ? (record.entries as Record<string, unknown>[])
        : null;

  if (items === null) {
    // A lone patient object — wrap it, anything else is noise.
    if (record.patient_id || record.visit_id || record.id) {
      return [mapItem(record)];
    }
    return null;
  }

  return items.map(mapItem);
}

function mapItem(item: Record<string, unknown>): ClinicQueuePatient {
  const str = (v: unknown): string => (typeof v === "string" ? v : v ? String(v) : "");
  const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));
  return {
    patient_id: str(item.patient_id),
    patient_name: str(item.patient_name) || "Unknown",
    patient_uhid: strOrNull(item.patient_uhid ?? item.uhid),
    patient_mobile: item.patient_mobile ? str(item.patient_mobile) : undefined,
    patient_category: strOrNull(item.patient_category),
    token_number: (item.token_number as string | number) ?? (item.token as number) ?? 0,
    status: str(item.status) || "scheduled",
    visit_type: item.visit_type as ClinicQueuePatient["visit_type"],
    visit_id: str(item.visit_id ?? item.id),
    item_id: str(item.item_id ?? item.id),
    time: str(item.time ?? item.start_time ?? item.checked_in_at),
    checked_in_at: item.checked_in_at ? str(item.checked_in_at) : undefined,
    examiner_id: strOrNull(item.examiner_id),
    examiner_name: strOrNull(item.examiner_name),
    examiner_assigned_at: strOrNull(item.examiner_assigned_at),
    examination_started_at: strOrNull(item.examination_started_at),
    examination_completed_at: strOrNull(item.examination_completed_at),
    expected_next_status_time: strOrNull(item.expected_next_status_time),
    picked_by_doctor_id: strOrNull(item.picked_by_doctor_id),
    picked_by_doctor_name: strOrNull(item.picked_by_doctor_name),
    is_revisit: Boolean(item.is_revisit),
  };
}

function areQueuePatientsEqual(prev: ClinicQueuePatient[], next: ClinicQueuePatient[]): boolean {
  if (prev.length !== next.length) return false;
  return prev.every((p, i) => {
    const n = next[i];
    return (
      p.patient_id === n.patient_id &&
      p.patient_name === n.patient_name &&
      p.token_number === n.token_number &&
      p.status === n.status &&
      p.visit_id === n.visit_id &&
      p.visit_type === n.visit_type &&
      p.checked_in_at === n.checked_in_at &&
      p.is_revisit === n.is_revisit &&
      p.examiner_id === n.examiner_id &&
      p.examination_started_at === n.examination_started_at &&
      p.examination_completed_at === n.examination_completed_at &&
      p.picked_by_doctor_id === n.picked_by_doctor_id
    );
  });
}

const ALL_STATUSES = [
  "awaiting_examiner",
  "examiner_assigned",
  "examination_in_progress",
  "examination_completed",
  "awaiting_doctor",
  "doctor_assigned",
  "consultation_in_progress",
  "consultation_completed",
  "no_show",
].join(",");

interface UseClinicLiveQueueOptions {
  doctorId: string | null;
  as: "examiner" | "doctor";
  autoConnect?: boolean;
}

export function useClinicLiveQueue({
  doctorId,
  as,
  autoConnect = true,
}: UseClinicLiveQueueOptions) {
  const [queuePatients, setQueuePatients] = useState<ClinicQueuePatient[]>([]);

  const sseUrl = useMemo(() => {
    if (!doctorId || !autoConnect) return null;
    const endpoint = as === "examiner" ? "examiner-queue" : "group-queue";
    return `/opd/general/${endpoint}/${doctorId}/stream?status=${ALL_STATUSES}`;
  }, [doctorId, as, autoConnect]);

  const handleMessage = useCallback((data: unknown) => {
    const newPatients = mapSSEDataToQueuePatients(data);
    if (newPatients === null) return; // heartbeat — keep the current list

    setQueuePatients((prev) =>
      areQueuePatientsEqual(prev, newPatients) ? prev : newPatients
    );
  }, []);

  const { status, reconnect } = useSSE(sseUrl, {
    onMessage: handleMessage,
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });

  useEffect(() => {
    setQueuePatients([]);
  }, [doctorId, as]);

  return {
    queuePatients,
    connectionStatus: status,
    reconnect,
  };
}
