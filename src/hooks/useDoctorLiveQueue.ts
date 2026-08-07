import { useMemo } from "react";
import type { SSEConnectionStatus } from "@/hooks/useSSE";
import { useEyeQueueFromPathway } from "@/hooks/useEyeQueueFromPathway";

export type DoctorQueuePatient = {
    patient_id: string;
    patient_name: string;
    patient_uhid: string | null;
    patient_mobile?: string;
    token_number: string | number;
    status: string;
    /** The pathway's own wording for this stage. See EyeQueueRow.stage_label. */
    stage_label?: string;
    /** Who holds this patient, so the panel can offer to undo a call. */
    assignments?: { role: string; user_id: string; user_name: string | null }[];
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

interface UseDoctorLiveQueueOptions {
    doctorId: string | null;
    autoConnect?: boolean;
}

/**
 * The stages this queue shows.
 *
 * Same list this hook sent to the eye endpoint, minus two that were dead:
 * `checked_in_opd` and `scheduled` have no visits and are not stages of any
 * pathway, so asking for them only ever returned nothing. `completed` stays —
 * it is a stage of the standard pathway, and a hospital running both sees
 * visits in it.
 *
 * Verified before changing: no visit anywhere currently holds a status that is
 * not a stage of its own pathway, so nothing drops out of this queue.
 */
const DOCTOR_QUEUE_STAGES = [
    "checked_in",
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
];

export function useDoctorLiveQueue({
    doctorId,
    autoConnect = true,
}: UseDoctorLiveQueueOptions) {
    // Served by the generic pathway queue with the eye fields merged back in.
    // `queuePatients` keeps the shape its consumers already read.
    const eyeQueue = useEyeQueueFromPathway({
        stageCodes: DOCTOR_QUEUE_STAGES,
        doctorId: doctorId ?? undefined,
        // The group queue always widened to covering doctors — that is what
        // made it a *group* queue rather than one doctor's list.
        includeCoveringDoctors: true,
        enabled: !!doctorId && autoConnect,
    });

    const queuePatients = useMemo<DoctorQueuePatient[]>(
        () =>
            eyeQueue.rows.map((row) => ({
                patient_id: row.patient_id,
                patient_name: row.patient_name || "Unknown",
                patient_uhid: null,
                patient_mobile: row.patient_mobile ?? undefined,
                token_number: row.token_number ?? 0,
                status: row.status,
                stage_label: row.stage_label,
                assignments: row.assignments,
                visit_type: row.visit_type as DoctorQueuePatient["visit_type"],
                visit_id: row.visit_id,
                item_id: row.id,
                time: row.checked_in_at ?? "",
                checked_in_at: row.checked_in_at ?? undefined,
                optometrist_id: row.optometrist_id ?? null,
                optometrist_name: row.optometrist_name ?? null,
                doctor_id: row.doctor_id,
                doctor_name: row.doctor_name,
                optometrist_investigation_completed_at:
                    row.optometrist_investigation_completed_at ?? null,
                consultation_started_at: row.consultation_started_at,
                consultation_ended_at: row.consultation_ended_at,
                dilation_started_at: row.dilation_started_at ?? null,
                dilation_duration_minutes: row.dilation_duration_minutes ?? null,
                dilation_completed_at: row.dilation_completed_at ?? null,
                is_revisit: row.is_revisit,
            })),
        [eyeQueue.rows]
    );

    return {
        queuePatients,
        connectionStatus: (eyeQueue.status === "live"
            ? "connected"
            : eyeQueue.status === "connecting"
              ? "connecting"
              : "reconnecting") as SSEConnectionStatus,
        reconnect: eyeQueue.reconnect,
    };
}

