import { useEffect, useState, useMemo, useCallback } from "react";
import { useSSE, SSEConnectionStatus } from "@/hooks/useSSE";

type QueuePatient = {
  patient_id: string;
  patient_name: string;
  patient_uhid: string | null;
  token_number: string | number;
  status: string;
  visit_type?: "walk_in" | "appointment" | "emergency";
  visit_id: string;
  item_id: string;
  time: string;
  checked_in_at?: string;
};

function mapSSEDataToQueuePatients(data: any): QueuePatient[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data.map((item) => ({
      patient_id: item.patient_id || "",
      patient_name: item.patient_name || "Unknown",
      patient_uhid: item.patient_uhid || item.uhid || null,
      token_number: item.token_number || item.token || 0,
      status: item.status || "scheduled",
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
      visit_id: item.visit_id || item.id || "",
      item_id: item.item_id || "",
      time: item.time || item.start_time || "",
      checked_in_at: item.checked_in_at,
    }));
  }

  if (data.queue && Array.isArray(data.queue)) {
    return data.queue.map((item: any) => ({
      patient_id: item.patient_id || "",
      patient_name: item.patient_name || "Unknown",
      patient_uhid: item.patient_uhid || item.uhid || null,
      token_number: item.token_number || item.token || 0,
      status: item.status || "scheduled",
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
      visit_id: item.visit_id || item.id || "",
      item_id: item.item_id || "",
      time: item.time || item.start_time || "",
      checked_in_at: item.checked_in_at,
    }));
  }

  if (data.slots && Array.isArray(data.slots)) {
    return data.slots.map((item: any) => ({
      patient_id: item.patient_id || "",
      patient_name: item.patient_name || "Unknown",
      patient_uhid: item.patient_uhid || item.uhid || null,
      token_number: item.token_number || item.token || 0,
      status: item.status || "scheduled",
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
      visit_id: item.visit_id || item.id || "",
      item_id: item.item_id || "",
      time: item.time || item.start_time || "",
      checked_in_at: item.checked_in_at,
    }));
  }

  if (data.entries && Array.isArray(data.entries)) {
    return data.entries.map((item: any) => ({
      patient_id: item.patient_id || "",
      patient_name: item.patient_name || "Unknown",
      patient_uhid: item.patient_uhid || item.uhid || null,
      token_number: item.token_number || item.token || 0,
      status: item.status || "scheduled",
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
      visit_id: item.visit_id || item.id || "",
      item_id: item.item_id || "",
      time: item.time || item.start_time || "",
      checked_in_at: item.checked_in_at,
    }));
  }

  if (data.patient_id || data.visit_id || data.id) {
    return [
      {
        patient_id: data.patient_id || "",
        patient_name: data.patient_name || "Unknown",
        patient_uhid: data.patient_uhid || data.uhid || null,
        token_number: data.token_number || data.token || 0,
        status: data.status || "scheduled",
        visit_type: data.visit_type as "walk_in" | "appointment" | "emergency" | undefined,
        visit_id: data.visit_id || data.id || "",
        item_id: data.item_id || "",
        time: data.time || data.start_time || "",
        checked_in_at: data.checked_in_at,
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
  optometristId: string | null;
  autoConnect?: boolean;
}

export function useOptometristLiveQueue({
  optometristId,
  autoConnect = true,
}: UseOptometristLiveQueueOptions) {
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>([]);

  const sseUrl = useMemo(
    () => (optometristId && autoConnect ? `/opd/queue/public/doctor/${optometristId}/stream` : null),
    [optometristId, autoConnect]
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
          const newArray = [...prev, newPatients[0]].sort((a, b) => {
            const tokenA = typeof a.token_number === 'string' ? parseInt(a.token_number) : a.token_number;
            const tokenB = typeof b.token_number === 'string' ? parseInt(b.token_number) : b.token_number;
            return tokenA - tokenB;
          });
          return newArray;
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
  }, [optometristId]);

  return {
    queuePatients,
    connectionStatus: status,
    reconnect,
  };
}
