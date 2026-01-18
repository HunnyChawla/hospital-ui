import { useEffect, useState, useMemo, useCallback } from "react";
import { useSSE, SSEConnectionStatus } from "@/hooks/useSSE";

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

function mapSSEDataToQueuePatients(data: any): QueuePatient[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data.map((item) => ({
      patient_id: item.patient_id || "",
      patient_name: item.patient_name || "Unknown",
      patient_uhid: item.patient_uhid || item.uhid || null,
      patient_mobile: item.patient_mobile || undefined,
      token_number: item.token_number || item.token || 0,
      status: item.status || "scheduled",
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
      visit_id: item.visit_id || item.id || "",
      item_id: item.item_id || item.id || "",
      time: item.time || item.start_time || item.checked_in_at || "",
      checked_in_at: item.checked_in_at,
      optometrist_id: item.optometrist_id || null,
      optometrist_assigned_at: item.optometrist_assigned_at || null,
      optometrist_investigation_started_at: item.optometrist_investigation_started_at || null,
      optometrist_investigation_completed_at: item.optometrist_investigation_completed_at || null,
      dilation_started_at: item.dilation_started_at || null,
      dilation_duration_minutes: item.dilation_duration_minutes || null,
      dilation_completed_at: item.dilation_completed_at || null,
      expected_next_status_time: item.expected_next_status_time || null,
      is_revisit: item.is_revisit || false,
    }));
  }

  if (data.queue && Array.isArray(data.queue)) {
    return data.queue.map((item: any) => ({
      patient_id: item.patient_id || "",
      patient_name: item.patient_name || "Unknown",
      patient_uhid: item.patient_uhid || item.uhid || null,
      patient_mobile: item.patient_mobile || undefined,
      token_number: item.token_number || item.token || 0,
      status: item.status || "scheduled",
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
      visit_id: item.visit_id || item.id || "",
      item_id: item.item_id || item.id || "",
      time: item.time || item.start_time || item.checked_in_at || "",
      checked_in_at: item.checked_in_at,
      optometrist_id: item.optometrist_id || null,
      optometrist_assigned_at: item.optometrist_assigned_at || null,
      optometrist_investigation_started_at: item.optometrist_investigation_started_at || null,
      optometrist_investigation_completed_at: item.optometrist_investigation_completed_at || null,
      dilation_started_at: item.dilation_started_at || null,
      dilation_duration_minutes: item.dilation_duration_minutes || null,
      dilation_completed_at: item.dilation_completed_at || null,
      expected_next_status_time: item.expected_next_status_time || null,
      is_revisit: item.is_revisit || false,
    }));
  }

  if (data.slots && Array.isArray(data.slots)) {
    return data.slots.map((item: any) => ({
      patient_id: item.patient_id || "",
      patient_name: item.patient_name || "Unknown",
      patient_uhid: item.patient_uhid || item.uhid || null,
      patient_mobile: item.patient_mobile || undefined,
      token_number: item.token_number || item.token || 0,
      status: item.status || "scheduled",
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
      visit_id: item.visit_id || item.id || "",
      item_id: item.item_id || item.id || "",
      time: item.time || item.start_time || item.checked_in_at || "",
      checked_in_at: item.checked_in_at,
      optometrist_id: item.optometrist_id || null,
      optometrist_assigned_at: item.optometrist_assigned_at || null,
      optometrist_investigation_started_at: item.optometrist_investigation_started_at || null,
      optometrist_investigation_completed_at: item.optometrist_investigation_completed_at || null,
      dilation_started_at: item.dilation_started_at || null,
      dilation_duration_minutes: item.dilation_duration_minutes || null,
      dilation_completed_at: item.dilation_completed_at || null,
      expected_next_status_time: item.expected_next_status_time || null,
      is_revisit: item.is_revisit || false,
    }));
  }

  if (data.entries && Array.isArray(data.entries)) {
    return data.entries.map((item: any) => ({
      patient_id: item.patient_id || "",
      patient_name: item.patient_name || "Unknown",
      patient_uhid: item.patient_uhid || item.uhid || null,
      patient_mobile: item.patient_mobile || undefined,
      token_number: item.token_number || item.token || 0,
      status: item.status || "scheduled",
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
      visit_id: item.visit_id || item.id || "",
      item_id: item.item_id || item.id || "",
      time: item.time || item.start_time || item.checked_in_at || "",
      checked_in_at: item.checked_in_at,
      optometrist_id: item.optometrist_id || null,
      optometrist_assigned_at: item.optometrist_assigned_at || null,
      optometrist_investigation_started_at: item.optometrist_investigation_started_at || null,
      optometrist_investigation_completed_at: item.optometrist_investigation_completed_at || null,
      dilation_started_at: item.dilation_started_at || null,
      dilation_duration_minutes: item.dilation_duration_minutes || null,
      dilation_completed_at: item.dilation_completed_at || null,
      expected_next_status_time: item.expected_next_status_time || null,
      is_revisit: item.is_revisit || false,
    }));
  }

  if (data.patient_id || data.visit_id || data.id) {
    return [
      {
        patient_id: data.patient_id || "",
        patient_name: data.patient_name || "Unknown",
        patient_uhid: data.patient_uhid || data.uhid || null,
        patient_mobile: data.patient_mobile || undefined,
        token_number: data.token_number || data.token || 0,
        status: data.status || "scheduled",
        visit_type: data.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
        visit_id: data.visit_id || data.id || "",
        item_id: data.item_id || data.id || "",
        time: data.time || data.start_time || data.checked_in_at || "",
        checked_in_at: data.checked_in_at,
        optometrist_id: data.optometrist_id || null,
        optometrist_assigned_at: data.optometrist_assigned_at || null,
        optometrist_investigation_started_at: data.optometrist_investigation_started_at || null,
        optometrist_investigation_completed_at: data.optometrist_investigation_completed_at || null,
        dilation_started_at: data.dilation_started_at || null,
        dilation_duration_minutes: data.dilation_duration_minutes || null,
        dilation_completed_at: data.dilation_completed_at || null,
        expected_next_status_time: data.expected_next_status_time || null,
        is_revisit: data.is_revisit || false,
      },
    ];
  }

  return [];
}

function areQueuePatientsEqual(prev: QueuePatient[], next: QueuePatient[]): boolean {
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
      p.checked_in_at === n.checked_in_at
    );
  });
}

interface UseOptometristLiveQueueOptions {
  doctorId: string | null;
  autoConnect?: boolean;
}

export function useOptometristLiveQueue({
  doctorId,
  autoConnect = true,
}: UseOptometristLiveQueueOptions) {
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>([]);

  // Build status query parameter with all relevant statuses for both Pending and Completed tabs
  // Pending: awaiting_optometrist, optometrist_assigned, optometrist_investigation_in_progress
  // Completed: optometrist_investigation_completed, awaiting_doctor, doctor_assigned, consultation_in_progress, dilation_in_progress, dilation_completed, consultation_completed
  const statusQuery = useMemo(() => {
    const pendingStatuses = [
      "awaiting_optometrist",
      "optometrist_assigned",
      "optometrist_investigation_in_progress",
    ];
    const completedStatuses = [
      "optometrist_investigation_completed",
      "awaiting_doctor",
      "doctor_assigned",
      "consultation_in_progress",
      "dilation_in_progress",
      "dilation_completed",
      "consultation_completed",
      "no_show",
    ];
    return [...pendingStatuses, ...completedStatuses].join(",");
  }, []);

  const sseUrl = useMemo(
    () => (doctorId && autoConnect
      ? `/opd/eye-hospital/optometrist-queue/${doctorId}/stream?status=${statusQuery}`
      : null),
    [doctorId, autoConnect, statusQuery]
  );

  const handleMessage = useCallback((data: any) => {
    const newPatients = mapSSEDataToQueuePatients(data);

    setQueuePatients((prev) => {
      if (newPatients.length === 1 && newPatients[0].visit_id) {
        const existingIndex = prev.findIndex(
          (p) => p.visit_id === newPatients[0].visit_id
        );
        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          const updated = newPatients[0];
          if (
            existing.patient_id === updated.patient_id &&
            existing.patient_name === updated.patient_name &&
            existing.token_number === updated.token_number &&
            existing.status === updated.status &&
            existing.visit_type === updated.visit_type &&
            existing.checked_in_at === updated.checked_in_at
          ) {
            return prev;
          }
          const updatedArray = [...prev];
          updatedArray[existingIndex] = updated;
          return updatedArray;
        } else {
          const existsByVisitId = prev.some(
            (p) => p.visit_id === newPatients[0].visit_id
          );
          if (existsByVisitId) {
            return prev;
          }
          return [...prev, newPatients[0]];
        }
      } else if (newPatients.length > 0) {
        if (areQueuePatientsEqual(prev, newPatients)) {
          return prev;
        }
        return newPatients;
      }
      return prev;
    });
  }, []);

  const { status, reconnect } = useSSE(sseUrl, {
    onMessage: handleMessage,
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });

  useEffect(() => {
    setQueuePatients([]);
  }, [doctorId]);

  return {
    queuePatients,
    connectionStatus: status,
    reconnect,
  };
}
