"use client";

import React, { useMemo } from "react";
import { Check } from "lucide-react";
import type { Pathway, PathwayStage } from "@/services/pathwaysApi";

interface StageProgressProps {
    /** The stage code the patient is currently in. */
    status: string | null;
    pathway: Pathway | null;
    className?: string;
}

/**
 * Where this patient is in their journey.
 *
 * Drawn from the pathway, so a hospital that adds a step sees it here without a
 * release, and a hospital with three steps does not get an eye hospital's
 * eleven. The eye panel has had a progress indicator for a long time; the
 * general panel had none, which is part of why the two looked unrelated.
 *
 * Abandonment stages are left out of the track — "did not attend" and
 * "cancelled" are not further along the journey, they are off it. When the
 * patient IS in one, the track is replaced by a single honest chip: showing a
 * no-show as 40% of the way through a consultation would be a lie.
 */
export function StageProgress({ status, pathway, className = "" }: StageProgressProps) {
    const stages = useMemo<PathwayStage[]>(
        () =>
            (pathway?.stages ?? [])
                .filter((s) => !s.is_abandonment)
                .sort((a, b) => a.display_order - b.display_order),
        [pathway]
    );

    const current = pathway?.stages.find((s) => s.code === status) ?? null;
    const currentIndex = stages.findIndex((s) => s.code === status);

    if (!pathway || !status || stages.length === 0) return null;

    if (current?.is_abandonment) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                    {current.label}
                </span>
            </div>
        );
    }

    return (
        <ol className={`flex flex-wrap items-center gap-x-1 gap-y-2 ${className}`}>
            {stages.map((stage, index) => {
                const done = currentIndex >= 0 && index < currentIndex;
                const active = index === currentIndex;
                const colour = stage.colour ?? "#0ea5e9";

                return (
                    <li key={stage.code} className="flex items-center gap-1">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                active
                                    ? "text-white shadow-sm"
                                    : done
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-500"
                            }`}
                            style={active ? { backgroundColor: colour } : undefined}
                            // The colour alone must not carry the meaning — the
                            // tick and the current-step wording do that too.
                            aria-current={active ? "step" : undefined}
                        >
                            {done && <Check className="h-3 w-3" />}
                            {stage.label}
                        </span>
                        {index < stages.length - 1 && (
                            <span
                                aria-hidden
                                className={`h-px w-3 ${done ? "bg-emerald-300" : "bg-slate-200"}`}
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
