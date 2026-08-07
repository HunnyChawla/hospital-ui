"use client";

import { useMemo } from "react";
import type { Pathway } from "@/services/pathwaysApi";
import { usePathways } from "@/hooks/queries/usePathways";
import { useDepartments } from "@/hooks/queries/useDepartments";

/**
 * The pathway a doctor's patients actually follow.
 *
 * Resolved the way the backend resolves it: the doctor's department's pathway,
 * falling back to the hospital default. The fallback is not a convenience — a
 * department with no pathway of its own genuinely follows the default, which is
 * why `departments.pathway_id` is nullable.
 *
 * Needed because a tenant has several pathways seeded at once. Anything that
 * asks "what is this hospital's assistant called" by scanning them all gets the
 * eye answer even in a general hospital — exactly how a dashboard came to read
 * "Pending at Optometrist" somewhere with no optometrist employed.
 *
 * @param departmentId the doctor's department, from the doctors list
 */
export function useDoctorPathway(departmentId: string | null | undefined): Pathway | null {
    const { data: pathways } = usePathways();
    const { data: departments } = useDepartments();

    return useMemo(() => {
        if (!pathways?.length) return null;
        const fallback = pathways.find((p) => p.is_default) ?? null;
        if (!departmentId) return fallback;

        const department = departments?.find((d) => d.id === departmentId);
        if (!department?.pathway_id) return fallback;

        return pathways.find((p) => p.id === department.pathway_id) ?? fallback;
    }, [pathways, departments, departmentId]);
}

/**
 * The pathway a set of queued patients are on.
 *
 * Derived from the stages actually present, which is exact and needs no extra
 * request. Used when the queue is the better evidence than configuration —
 * a doctor covering another department is on the pathway of the patients in
 * front of them, not the one their own department is configured with.
 *
 * Returns null for an empty queue, so callers fall back to `useDoctorPathway`.
 */
export function usePathwayForStages(stageCodes: string[]): Pathway | null {
    const { data: pathways } = usePathways();
    const key = stageCodes.join(",");

    return useMemo(() => {
        if (!pathways?.length || !key) return null;
        const wanted = new Set(key.split(","));

        // Most matched stages wins. `checked_in` and `no_show` exist in both
        // pathways, so a single shared code must not decide the answer.
        let best: Pathway | null = null;
        let bestScore = 0;
        for (const pathway of pathways) {
            const score = pathway.stages.filter((s) => wanted.has(s.code)).length;
            if (score > bestScore) {
                best = pathway;
                bestScore = score;
            }
        }
        return best;
    }, [pathways, key]);
}
