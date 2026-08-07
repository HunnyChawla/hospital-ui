"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import type { SSEConnectionStatus } from "@/hooks/useSSE";
import { useEyeQueueFromPathway, type EyeQueueRow } from "@/hooks/useEyeQueueFromPathway";
import { playNotificationSound, announceText } from "@/utils/sound";

export type TVQueuePatient = {
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
    optometrist_id?: string | null;
    optometrist_assigned_at?: string | null;
    optometrist_investigation_started_at?: string | null;
    optometrist_investigation_completed_at?: string | null;
    optometrist_cabin?: string | null;
    doctor_cabin?: string | null;
};

export interface TVDisplayQueueStats {
    total: number;
    waiting: number;
    inProgress: number;
    emergency: number;
}

/**
 * The two columns, as stage codes.
 *
 * Identical to the status lists these URLs carried, minus `scheduled`, which is
 * not a stage of any pathway and has no visits — it only ever matched nothing.
 * The eye pathway's stage codes ARE the old status strings, so a wall display
 * shows exactly the patients it showed before.
 */
const TV_OPTOMETRIST_STAGES = ["awaiting_optometrist", "optometrist_assigned"];

const TV_DOCTOR_STAGES = [
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

/**
 * Exactly the fields `TVQueuePatient` declares — no cast, so a field the type
 * does not have is a compile error rather than a silent extra.
 *
 * The cabins matter most here: they are what the spoken announcement reads out
 * ("please proceed to Room 2"), which is why the eye detail fetch carries them.
 */
function toTvPatient(row: EyeQueueRow): TVQueuePatient {
    return {
        patient_id: row.patient_id,
        patient_name: row.patient_name || "Unknown",
        patient_uhid: null,
        token_number: row.token_number ?? 0,
        status: row.status,
        visit_type: row.visit_type as TVQueuePatient["visit_type"],
        visit_id: row.visit_id,
        item_id: row.id,
        time: row.checked_in_at ?? "",
        checked_in_at: row.checked_in_at ?? undefined,
        optometrist_id: row.optometrist_id ?? null,
        optometrist_assigned_at: row.optometrist_assigned_at ?? null,
        optometrist_investigation_started_at: row.optometrist_investigation_started_at ?? null,
        optometrist_investigation_completed_at:
            row.optometrist_investigation_completed_at ?? null,
        optometrist_cabin: row.optometrist_cabin ?? null,
        doctor_cabin: row.doctor_cabin ?? null,
    };
}

/** Map the stream's vocabulary onto the one this hook already reports. */
function toSseStatus(status: string): SSEConnectionStatus {
    if (status === "live") return "connected";
    if (status === "connecting") return "connecting";
    if (status === "stale") return "error";
    return "reconnecting";
}

interface UseTVDisplayQueueOptions {
    doctorId: string | null;
    autoConnect?: boolean;
    enableSound?: boolean;
    enableVoice?: boolean;
    enableHindiVoice?: boolean;
    englishVoiceGender?: 'male' | 'female';
    hindiVoiceGender?: 'male' | 'female';
}

export function useTVDisplayQueue({
    doctorId,
    autoConnect = true,
    enableSound = true,
    enableVoice = false,
    enableHindiVoice = false,
    englishVoiceGender = 'female',
    hindiVoiceGender = 'female',
}: UseTVDisplayQueueOptions) {
    // Both columns now come from the generic pathway queue, with the eye
    // fields fetched alongside and merged. Everything below this point —
    // the stats, the chime, the spoken announcements — is untouched and still
    // reads `TVQueuePatient`.
    const optometristQueue = useEyeQueueFromPathway({
        stageCodes: TV_OPTOMETRIST_STAGES,
        doctorId: doctorId ?? undefined,
        includeCoveringDoctors: true,
        enabled: !!doctorId && autoConnect,
    });

    const doctorQueue = useEyeQueueFromPathway({
        stageCodes: TV_DOCTOR_STAGES,
        doctorId: doctorId ?? undefined,
        includeCoveringDoctors: true,
        enabled: !!doctorId && autoConnect,
    });

    const optometristPatients = useMemo<TVQueuePatient[]>(
        () => optometristQueue.rows.map(toTvPatient),
        [optometristQueue.rows]
    );
    const doctorPatients = useMemo<TVQueuePatient[]>(
        () => doctorQueue.rows.map(toTvPatient),
        [doctorQueue.rows]
    );

    const optometristStatus = toSseStatus(optometristQueue.status);
    const doctorStatus = toSseStatus(doctorQueue.status);
    const optometristReconnect = optometristQueue.reconnect;
    const doctorReconnect = doctorQueue.reconnect;

    // Calculate optometrist queue stats
    const optometristStats: TVDisplayQueueStats = useMemo(() => {
        return {
            total: optometristPatients.length,
            waiting: optometristPatients.filter((p) => p.status === "awaiting_optometrist").length,
            inProgress: optometristPatients.filter(
                (p) => p.status === "optometrist_assigned"
            ).length,
            emergency: optometristPatients.filter((p) => p.visit_type === "emergency").length,
        };
    }, [optometristPatients]);

    // Calculate doctor queue stats
    const doctorStats: TVDisplayQueueStats = useMemo(() => {
        const awaitingDoctor = doctorPatients.filter((p) => p.status === "awaiting_doctor");
        const inConsultation = doctorPatients.filter((p) => p.status === "consultation_in_progress");
        const greyedOut = doctorPatients.filter(
            (p) => p.status === "optometrist_investigation_in_progress"
        );

        return {
            total: doctorPatients.length,
            waiting: awaitingDoctor.length,
            inProgress: inConsultation.length,
            emergency: doctorPatients.filter((p) => p.visit_type === "emergency").length,
        };
    }, [doctorPatients]);

    // Combined connection status
    const connectionStatus: SSEConnectionStatus = useMemo(() => {
        if (optometristStatus === "error" || doctorStatus === "error") return "error";
        if (optometristStatus === "connecting" || doctorStatus === "connecting") return "connecting";
        if (optometristStatus === "reconnecting" || doctorStatus === "reconnecting") return "reconnecting";
        if (optometristStatus === "connected" && doctorStatus === "connected") return "connected";
        return "disconnected";
    }, [optometristStatus, doctorStatus]);

    const reconnect = useCallback(() => {
        optometristReconnect();
        doctorReconnect();
    }, [optometristReconnect, doctorReconnect]);

    // Sound notification logic
    const prevOptRef = useRef<TVQueuePatient[]>([]);
    const prevDocRef = useRef<TVQueuePatient[]>([]);

    useEffect(() => {
        const playSound = () => {
            if (!enableSound) return;
            try {
                // Try playing the custom file first, fallback to synthesized beep
                const audio = new Audio("/sound/mixkit-bell-notification-933.wav");
                audio.play().catch(() => playNotificationSound());
            } catch (e) {
                playNotificationSound();
            }
        };

        const areaTranslations: Record<string, { en: string; hi: string }> = {
            "eye examination": { en: "eye examination", hi: "आंख की जांच" },
            "consultation": { en: "consultation", hi: "परामर्श" }
        };

        const announce = (patientName: string, token: string | number, areaKey: string, cabin: string | null) => {
            if (!enableVoice && !enableHindiVoice) return;

            const area = areaTranslations[areaKey] || { en: areaKey, hi: areaKey };

            if (enableVoice) {
                const destination = cabin ? cabin : area.en;
                const enText = `Token number ${token}, ${patientName}, please proceed to ${destination}`;
                announceText(enText, "en-IN", englishVoiceGender);
            }

            if (enableHindiVoice) {
                let hiText;
                if (cabin) {
                    hiText = `टोकन नंबर ${token}, ${patientName}, कृपया ${cabin} में जाएं`;
                } else {
                    hiText = `टोकन नंबर ${token}, ${patientName}, कृपया ${area.hi} के लिए जाएं`;
                }

                // If English played, wait before playing Hindi
                const delay = enableVoice ? 6000 : 0;
                setTimeout(() => {
                    announceText(hiText, "hi-IN", hindiVoiceGender);
                }, delay);
            }
        };

        let shouldPlay = false;
        let announcementData: { name: string; token: string | number; areaKey: string; cabin: string | null } | null = null;

        // Check Optometrist Queue Changes
        const currentOpt = optometristPatients;
        const prevOpt = prevOptRef.current;

        currentOpt.forEach(curr => {
            if (curr.status === "optometrist_assigned") {
                const prev = prevOpt.find(p => p.visit_id === curr.visit_id);
                if (!prev || prev.status !== "optometrist_assigned") {
                    shouldPlay = true;
                    announcementData = {
                        name: curr.patient_name,
                        token: curr.token_number,
                        areaKey: "eye examination",
                        cabin: curr.optometrist_cabin || null
                    };
                }
            }
        });
        prevOptRef.current = currentOpt;

        // Check Doctor Queue Changes
        const currentDoc = doctorPatients;
        const prevDoc = prevDocRef.current;

        let doctorAnnouncement: {
            name: string;
            token: string | number;
            cabin: string | null;
            messageType: "proceed"
        } | null = null;

        currentDoc.forEach(curr => {
            if (curr.status === "doctor_assigned") {
                const prev = prevDoc.find(p => p.visit_id === curr.visit_id);
                // Announce if it's a new assignment (status changed to doctor_assigned)
                if (!prev || prev.status !== "doctor_assigned") {
                    doctorAnnouncement = {
                        name: curr.patient_name,
                        token: curr.token_number,
                        cabin: curr.doctor_cabin || null,
                        messageType: "proceed" // Always "proceed" since they are now assigned
                    };
                }
            }
        });

        prevDocRef.current = currentDoc;

        // Execution
        if (shouldPlay || doctorAnnouncement) {
            console.log("🔊 Announcement Triggered:", {
                opt: !!announcementData,
                doc: !!doctorAnnouncement,
            });

            playSound();

            // Optometrist Announcement (Immediate)
            if (announcementData) {
                setTimeout(() => {
                    console.log("🔊 Playing Optometrist Announcement");
                    announce(announcementData!.name, announcementData!.token, announcementData!.areaKey, announcementData!.cabin);
                }, 1000);
            }

            // Doctor Queue Announcement
            if (doctorAnnouncement) {
                const current: {
                    name: string;
                    token: string | number;
                    cabin: string | null;
                    messageType: "proceed"
                } = doctorAnnouncement;
                // If Optometrist played (English+Hindi ~12s), wait 14s. Else immediate.
                const delay = announcementData ? 14000 : 1000;

                setTimeout(() => {
                    console.log("🔊 Playing Doctor Queue Announcement", {
                        name: current.name,
                        token: current.token,
                        messageType: current.messageType,
                        cabin: current.cabin
                    });

                    // Standard announcement for doctor assignment
                    const enText = current.cabin
                        ? `Token number ${current.token}, ${current.name}, please proceed to ${current.cabin}`
                        : `Token number ${current.token}, ${current.name}, please proceed for consultation`;
                    const hiText = current.cabin
                        ? `टोकन नंबर ${current.token}, ${current.name}, कृपया ${current.cabin} में जाएं`
                        : `टोकन नंबर ${current.token}, ${current.name}, कृपया परामर्श के लिए जाएं`;

                    if (enableVoice) announceText(enText, "en-IN", englishVoiceGender);
                    if (enableHindiVoice) {
                        setTimeout(() => announceText(hiText, "hi-IN", hindiVoiceGender), enableVoice ? 6000 : 0);
                    }
                }, delay);
            }
        }



    }, [optometristPatients, doctorPatients, enableSound, enableVoice, enableHindiVoice, englishVoiceGender, hindiVoiceGender]);

    return {
        optometristPatients,
        doctorPatients,
        optometristStats,
        doctorStats,
        optometristStatus,
        doctorStatus,
        connectionStatus,
        reconnect,
    };
}
