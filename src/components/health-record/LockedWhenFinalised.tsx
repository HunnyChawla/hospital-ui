"use client";

import React from "react";
import { Lock } from "lucide-react";
import { useEpisodeLock } from "@/hooks/queries/useHealthRecord";
import type { EpisodeType } from "@/services/healthRecordApi";

interface LockedWhenFinalisedProps {
    episodeType: EpisodeType;
    sourceId: string | null;
    children: React.ReactNode;
    /** Shown instead of the default sentence, when a screen has better words. */
    reason?: string;
}

/**
 * Greys out its children when the record has been finalised, and says why.
 *
 * WHY A WRAPPER RATHER THAN A `disabled` PROP EVERYWHERE
 *
 * The edit controls it covers live in four modules and a dozen components,
 * most of which take no `disabled` prop and several of which are `<a>` or
 * `onClick` divs. Threading a flag through all of them would be a large,
 * error-prone change to working screens, and the one that got missed would be
 * the one that silently let an edit through.
 *
 * This blocks pointer events instead, which cannot be missed, and pairs it
 * with an explanation — a control that is merely grey teaches people the
 * software is broken.
 *
 * It is NOT the enforcement. The server refuses these edits independently;
 * this is so a doctor learns before typing rather than after saving.
 */
export function LockedWhenFinalised({
    episodeType,
    sourceId,
    children,
    reason,
}: LockedWhenFinalisedProps) {
    const { locked, reason: defaultReason } = useEpisodeLock(episodeType, sourceId);

    if (!locked) return <>{children}</>;

    return (
        <div className="space-y-2">
            <div
                className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
                role="status"
            >
                <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                <p className="text-xs text-emerald-800">{reason ?? defaultReason}</p>
            </div>

            {/* `inert` would be the right tool but is not in every browser this
                runs on yet, so pointer-events plus aria-disabled it is. */}
            <div
                className="pointer-events-none select-none opacity-50"
                aria-disabled="true"
                tabIndex={-1}
            >
                {children}
            </div>
        </div>
    );
}
