"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QueueItem } from "@/services/pathwaysApi";
import { getTenantIdForApi } from "@/utils/auth";
import { useSSE } from "./useSSE";

export type QueueStreamStatus = "connecting" | "live" | "reconnecting" | "stale";

interface UsePathwayQueueStreamOptions {
    stageCodes: string[];
    pathwayCode?: string;
    doctorId?: string;
    includeCoveringDoctors?: boolean;
    enabled?: boolean;
}

interface UsePathwayQueueStreamResult {
    items: QueueItem[] | null;
    status: QueueStreamStatus;
    /** Last time the server said anything at all, heartbeats included. */
    lastMessageAt: Date | null;
    reconnect: () => void;
}

/**
 * The server heartbeats every 30s. Two missed beats plus slack means a genuinely
 * dead connection rather than a quiet one — a display must not flap on a single
 * delayed packet, and must not sit frozen for minutes either.
 */
const SILENCE_LIMIT_MS = 75_000;

/**
 * Live queue for a set of pathway stages.
 *
 * Built on `useSSE`, which streams over `fetch` and can therefore send a proper
 * Authorization header. `EventSource` cannot, and the workaround — a token in
 * the query string — puts credentials somewhere proxies and access logs keep.
 *
 * Written for a screen nobody is watching. A wall display runs for weeks
 * unattended, through deploys and wifi drops, with nobody there to press
 * refresh. Two things matter above all: it always reconnects, and it never
 * *looks* live while showing stale data.
 */
export function usePathwayQueueStream({
    stageCodes,
    pathwayCode,
    doctorId,
    includeCoveringDoctors,
    enabled = true,
}: UsePathwayQueueStreamOptions): UsePathwayQueueStreamResult {
    const [items, setItems] = useState<QueueItem[] | null>(null);
    const [lastMessageAt, setLastMessageAt] = useState<Date | null>(null);
    const [isStale, setIsStale] = useState(false);
    // Zero, not Date.now(): a ref initializer runs during render, and reading
    // the clock there is impure. It is set for real when the stream connects.
    const lastMessageRef = useRef<number>(0);

    // Join so the URL changes on content, not on every render that happens to
    // build a new array.
    const codesKey = stageCodes.join(",");

    const url = useMemo(() => {
        if (!enabled || !codesKey) return null;
        const params = new URLSearchParams({ stage_codes: codesKey });
        if (pathwayCode) params.set("pathway_code", pathwayCode);
        if (doctorId) params.set("doctor_id", doctorId);
        if (includeCoveringDoctors) params.set("include_covering_doctors", "true");
        const tenantId = getTenantIdForApi();
        if (tenantId) params.set("tenant_id", tenantId);
        return `/pathways/queue/stream?${params.toString()}`;
    }, [enabled, codesKey, pathwayCode, doctorId, includeCoveringDoctors]);

    const onMessage = useCallback((payload: unknown) => {
        lastMessageRef.current = Date.now();
        setLastMessageAt(new Date());
        setIsStale(false);

        // Frames are tagged in the body because useSSE delivers only `data:`
        // and drops the `event:` line — so shape-guessing is the alternative.
        const frame = payload as { type?: string; items?: QueueItem[] };
        if (frame?.type === "queue" && Array.isArray(frame.items)) {
            setItems(frame.items);
        }
    }, []);

    const { status: sseStatus, reconnect } = useSSE(url, {
        onMessage,
        autoReconnect: true,
        // A wall display must keep trying forever. The default cap would leave
        // it dark after a long outage with nobody present to reload it.
        maxReconnectAttempts: Number.MAX_SAFE_INTEGER,
    });

    // The failure SSE cannot report: a socket the browser still believes is
    // open, delivering nothing. Without this the board shows an hour-old queue
    // and looks perfectly healthy.
    useEffect(() => {
        if (!url) return;
        // Start the clock here rather than in the ref initializer, so a stream
        // that has never delivered is not immediately judged stale.
        lastMessageRef.current = Date.now();
        const timer = setInterval(() => {
            if (Date.now() - lastMessageRef.current > SILENCE_LIMIT_MS) {
                setIsStale(true);
                reconnect();
            }
        }, 15_000);
        return () => clearInterval(timer);
    }, [url, reconnect]);

    const status: QueueStreamStatus = isStale
        ? "stale"
        : sseStatus === "connected"
          ? "live"
          : sseStatus === "connecting"
            ? "connecting"
            : "reconnecting";

    return { items, status, lastMessageAt, reconnect };
}
