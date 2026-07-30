import { useEffect, useState, useMemo, useCallback } from "react";
import { useSSE, SSEConnectionStatus } from "@/hooks/useSSE";

export type DoctorQueuePatient = {
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
    optometrist_name?: string | null;
    doctor_id?: string | null;
    doctor_name?: string | null;
    optometrist_investigation_completed_at?: string | null;
    consultation_started_at?: string | null;
    consultation_ended_at?: string | null;
    dilation_started_at?: string | null;
    dilation_duration_minutes?: number | null;
    dilation_completed_at?: string | null;
    is_revisit?: boolean;
};

// Returns null for heartbeat/keep-alive messages that should be ignored
// Returns DoctorQueuePatient[] for actual queue data
function mapSSEDataToQueuePatients(data: any): DoctorQueuePatient[] | null {
    // Check for heartbeat/keep-alive messages first
    // These should be ignored and not affect the current patient list
    if (!data || data === null || data === undefined) return null;

    // Check for explicit heartbeat messages
    if (data.type === 'heartbeat' || data.type === 'ping' || data.type === 'keepalive') {
        return null;
    }

    // Check for empty objects or timestamp heartbeat objects
    if (typeof data === 'object' && !Array.isArray(data)) {
        if (Object.keys(data).length === 0) return null;
        if (data.timestamp && !data.patient_id && !data.visit_id && !data.id && !data.queue && !data.items && !data.data && !data.entries && !data.slots) {
            return null;
        }
    }

    const mapItem = (item: any): DoctorQueuePatient => ({
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
        optometrist_name: item.optometrist_name || null,
        doctor_id: item.doctor_id || null,
        doctor_name: item.doctor_name || null,
        optometrist_investigation_completed_at: item.optometrist_investigation_completed_at || null,
        consultation_started_at: item.consultation_started_at || null,
        consultation_ended_at: item.consultation_ended_at || null,
        dilation_started_at: item.dilation_started_at || null,
        dilation_duration_minutes: item.dilation_duration_minutes || null,
        dilation_completed_at: item.dilation_completed_at || null,
        is_revisit: item.is_revisit || false,
    });

    if (Array.isArray(data)) {
        return data.map(mapItem);
    }

    if (data.queue && Array.isArray(data.queue)) {
        return data.queue.map(mapItem);
    }

    if (data.slots && Array.isArray(data.slots)) {
        return data.slots.map(mapItem);
    }

    if (data.entries && Array.isArray(data.entries)) {
        return data.entries.map(mapItem);
    }

    if (data.patient_id || data.visit_id || data.id) {
        return [mapItem(data)];
    }

    // Data exists but is unrecognized format - treat as heartbeat/ignored
    return null;
}

function areQueuePatientsEqual(prev: DoctorQueuePatient[], next: DoctorQueuePatient[]): boolean {
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
            p.doctor_id === n.doctor_id &&
            p.optometrist_id === n.optometrist_id &&
            p.dilation_started_at === n.dilation_started_at &&
            p.dilation_duration_minutes === n.dilation_duration_minutes &&
            p.dilation_completed_at === n.dilation_completed_at
        );
    });
}

interface UseDoctorLiveQueueOptions {
    doctorId: string | null;
    autoConnect?: boolean;
}

export function useDoctorLiveQueue({
    doctorId,
    autoConnect = true,
}: UseDoctorLiveQueueOptions) {
    const [queuePatients, setQueuePatients] = useState<DoctorQueuePatient[]>([]);

    // Build status query parameter for doctor queue
    // Include: awaiting_doctor, doctor_assigned, consultation_in_progress, dilation_in_progress, 
    // dilation_completed, consultation_completed, no_show
    const statusQuery = useMemo(() => {
        const statuses = [
            "awaiting_optometrist",
            "optometrist_assigned",
            "optometrist_investigation_in_progress",
            "optometrist_investigation_completed",
            "awaiting_doctor",
            "doctor_assigned",
            "consultation_in_progress",
            "dilation_in_progress",
            "dilation_completed",
            "consultation_completed",
            "completed",
            "no_show",
            "checked_in",
            "checked_in_opd",
            "scheduled",
        ];
        return statuses.join(",");
    }, []);

    const sseUrl = useMemo(
        () => (doctorId && autoConnect
            ? `/opd/eye-hospital/group-queue/${doctorId}/stream?status=${statusQuery}`
            : null),
        [doctorId, autoConnect, statusQuery]
    );

    const handleMessage = useCallback((data: any) => {
        const newPatients = mapSSEDataToQueuePatients(data);

        // Ignore heartbeat/keep-alive messages (null return)
        // This preserves the current patient list
        if (newPatients === null) {
            return;
        }

        setQueuePatients((prev) => {
            // Treat incoming SSE data as final - replace existing queue entirely
            // Whether it's 0, 1, or multiple records, it's the complete source of truth
            if (areQueuePatientsEqual(prev, newPatients)) {
                // Only skip update if the data is exactly the same to avoid unnecessary re-renders
                return prev;
            }
            return newPatients;
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
