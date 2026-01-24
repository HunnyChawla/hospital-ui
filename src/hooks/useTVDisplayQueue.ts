"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSSE, SSEConnectionStatus } from "@/hooks/useSSE";
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

// Returns null for heartbeat/keep-alive messages that should be ignored
// Returns TVQueuePatient[] for actual queue data
function mapSSEDataToPatients(data: any): TVQueuePatient[] | null {
    // Check for heartbeat/keep-alive messages first
    // These should be ignored and not affect the current patient list
    if (!data || data === null || data === undefined) return null;

    // Check for explicit heartbeat messages
    if (data.type === 'heartbeat' || data.type === 'ping' || data.type === 'keepalive') {
        return null;
    }

    // Check for empty objects (common heartbeat format)
    if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) {
        return null;
    }

    const mapItem = (item: any): TVQueuePatient => ({
        patient_id: item.patient_id || "",
        patient_name: item.patient_name || "Unknown",
        patient_uhid: item.patient_uhid || item.uhid || null,
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
        optometrist_cabin: item.optometrist_cabin || null,
        doctor_cabin: item.doctor_cabin || null,
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

function arePatientsEqual(prev: TVQueuePatient[], next: TVQueuePatient[]): boolean {
    if (prev.length !== next.length) return false;
    return prev.every((p, i) => {
        const n = next[i];
        return (
            p.patient_id === n.patient_id &&
            p.patient_name === n.patient_name &&
            p.token_number === n.token_number &&
            p.status === n.status &&
            p.visit_id === n.visit_id &&
            p.visit_type === n.visit_type
        );
    });
}

export interface TVDisplayQueueStats {
    total: number;
    waiting: number;
    inProgress: number;
    emergency: number;
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
    const [optometristPatients, setOptometristPatients] = useState<TVQueuePatient[]>([]);
    const [doctorPatients, setDoctorPatients] = useState<TVQueuePatient[]>([]);

    // Optometrist queue SSE URL with relevant statuses
    const optometristSseUrl = useMemo(
        () =>
            doctorId && autoConnect
                ? `/opd/eye-hospital/optometrist-queue/${doctorId}/stream?status=awaiting_optometrist,optometrist_assigned`
                : null,
        [doctorId, autoConnect]
    );

    // Doctor queue SSE URL with relevant statuses
    const doctorSseUrl = useMemo(
        () =>
            doctorId && autoConnect
                ? `/opd/eye-hospital/doctor-queue/${doctorId}/stream?status=awaiting_doctor,consultation_in_progress,optometrist_investigation_in_progress,dilation_in_progress,dilation_completed`
                : null,
        [doctorId, autoConnect]
    );

    // Handle optometrist queue messages
    const handleOptometristMessage = useCallback((data: any) => {
        const newPatients = mapSSEDataToPatients(data);

        // Ignore heartbeat/keep-alive messages (null return)
        // This preserves the current patient list
        if (newPatients === null) {
            return;
        }

        setOptometristPatients((prev) => {
            if (newPatients.length > 0 || (newPatients.length === 0 && prev.length > 0)) {
                if (arePatientsEqual(prev, newPatients)) {
                    return prev;
                }
                return newPatients;
            }
            return prev;
        });
    }, []);

    // Handle doctor queue messages
    const handleDoctorMessage = useCallback((data: any) => {
        const newPatients = mapSSEDataToPatients(data);

        // Ignore heartbeat/keep-alive messages (null return)
        // This preserves the current patient list
        if (newPatients === null) {
            return;
        }

        setDoctorPatients((prev) => {
            if (newPatients.length === 1 && newPatients[0].visit_id) {
                const existingIndex = prev.findIndex((p) => p.visit_id === newPatients[0].visit_id);
                if (existingIndex >= 0) {
                    const existing = prev[existingIndex];
                    const updated = newPatients[0];
                    if (
                        existing.patient_id === updated.patient_id &&
                        existing.status === updated.status &&
                        existing.visit_type === updated.visit_type
                    ) {
                        return prev;
                    }
                    const updatedArray = [...prev];
                    updatedArray[existingIndex] = updated;
                    return updatedArray;
                } else {
                    return [...prev, newPatients[0]];
                }
            } else if (newPatients.length > 0) {
                if (arePatientsEqual(prev, newPatients)) {
                    return prev;
                }
                return newPatients;
            } else {
                // Empty array received from backend - this is actual data indicating empty queue
                return [];
            }
        });
    }, []);

    // SSE connections
    const { status: optometristStatus, reconnect: optometristReconnect } = useSSE(optometristSseUrl, {
        onMessage: handleOptometristMessage,
        autoReconnect: true,
        reconnectInterval: 3000,
        maxReconnectAttempts: 10,
    });

    const { status: doctorStatus, reconnect: doctorReconnect } = useSSE(doctorSseUrl, {
        onMessage: handleDoctorMessage,
        autoReconnect: true,
        reconnectInterval: 3000,
        maxReconnectAttempts: 10,
    });

    // Reset patients when doctor changes
    useEffect(() => {
        setOptometristPatients([]);
        setDoctorPatients([]);
    }, [doctorId]);

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
                let destination = cabin ? cabin : area.en;
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
        // New logic: Track consulting patient and "next" patient separately
        const currentDoc = doctorPatients;
        const prevDoc = prevDocRef.current;

        // Find consulting patient (status = consultation_in_progress)
        const currentConsulting = currentDoc.find(p => p.status === "consultation_in_progress");
        const prevConsulting = prevDoc.find(p => p.status === "consultation_in_progress");

        // Find "Next" patient (first awaiting_doctor in queue)
        const currentNext = currentDoc.find(p => p.status === "awaiting_doctor");
        const prevNext = prevDoc.find(p => p.status === "awaiting_doctor");

        // Check if consulting changed (patient entered or exited consulting)
        const consultingChanged = (prevConsulting?.visit_id || null) !== (currentConsulting?.visit_id || null);

        // Check if next patient changed
        const nextChanged = (prevNext?.visit_id || null) !== (currentNext?.visit_id || null);

        let doctorAnnouncement: {
            name: string;
            token: string | number;
            cabin: string | null;
            messageType: "ready" | "proceed"
        } | null = null;

        // Only announce if consulting OR next changed, and there IS a next patient
        if ((consultingChanged || nextChanged) && currentNext) {
            const hasConsulting = !!currentConsulting;
            doctorAnnouncement = {
                name: currentNext.patient_name,
                token: currentNext.token_number,
                cabin: currentNext.doctor_cabin || null,
                messageType: hasConsulting ? "ready" : "proceed"
            };
        }

        prevDocRef.current = currentDoc;

        // Execution
        if (shouldPlay || doctorAnnouncement) {
            console.log("🔊 Announcement Triggered:", {
                opt: !!announcementData,
                doc: !!doctorAnnouncement,
                consultingChanged,
                nextChanged,
                hasConsulting: !!currentConsulting
            });

            playSound();

            // Optometrist Announcement (Immediate)
            if (announcementData) {
                setTimeout(() => {
                    console.log("🔊 Playing Optometrist Announcement");
                    announce(announcementData!.name, announcementData!.token, announcementData!.areaKey, announcementData!.cabin);
                }, 1000);
            }

            // Doctor Queue Announcement (for Next patient)
            if (doctorAnnouncement) {
                const current = doctorAnnouncement;
                // If Optometrist played (English+Hindi ~12s), wait 14s. Else immediate.
                const delay = announcementData ? 14000 : 1000;

                setTimeout(() => {
                    console.log("🔊 Playing Doctor Queue Announcement", {
                        name: current.name,
                        token: current.token,
                        messageType: current.messageType,
                        cabin: current.cabin
                    });

                    let enText: string;
                    let hiText: string;

                    if (current.messageType === "ready") {
                        // Consulting is in progress, next should be ready
                        enText = current.cabin
                            ? `Token number ${current.token}, ${current.name}, please be ready for ${current.cabin}`
                            : `Token number ${current.token}, ${current.name}, please be ready for consultation`;
                        hiText = current.cabin
                            ? `टोकन नंबर ${current.token}, ${current.name}, कृपया ${current.cabin} के लिए तैयार रहें`
                            : `टोकन नंबर ${current.token}, ${current.name}, कृपया परामर्श के लिए तैयार रहें`;
                    } else {
                        // No consulting, next should proceed
                        enText = current.cabin
                            ? `Token number ${current.token}, ${current.name}, please proceed to ${current.cabin}`
                            : `Token number ${current.token}, ${current.name}, please proceed for consultation`;
                        hiText = current.cabin
                            ? `टोकन नंबर ${current.token}, ${current.name}, कृपया ${current.cabin} में जाएं`
                            : `टोकन नंबर ${current.token}, ${current.name}, कृपया परामर्श के लिए जाएं`;
                    }

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
