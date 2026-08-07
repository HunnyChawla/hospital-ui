import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

/**
 * The eye-specific half of a queue item.
 *
 * The generic queue (`/pathways/queue`) carries only what every speciality has.
 * These are the fields the eye screens additionally need — the dilation
 * countdown, who the optometrist is, which cabin — fetched separately and
 * merged by the screen that needs them.
 *
 * That split is deliberate: widening the shared queue response with eye columns
 * would hand every other speciality a dozen permanent nulls, and every new
 * speciality would add more.
 */
export interface EyeVisitDetail {
    optometrist_id: string | null;
    optometrist_name: string | null;
    optometrist_cabin: string | null;
    optometrist_assigned_at: string | null;
    optometrist_investigation_started_at: string | null;
    optometrist_investigation_completed_at: string | null;
    dilation_started_at: string | null;
    dilation_duration_minutes: number | null;
    dilation_completed_at: string | null;
    /** When the current timed step is due to finish — the dilation countdown. */
    expected_next_status_time: string | null;
    doctor_cabin: string | null;
    picked_by_doctor_id: string | null;
    doctor_picked_at: string | null;
}

export const eyeVisitDetailsApi = {
    /**
     * Eye detail for a set of visits, keyed by visit id.
     *
     * One request for a whole queue. A visit with no eye data is simply absent
     * from the result — a general-pathway visit has no dilation timer, and a
     * screen renders a missing key as blank.
     */
    async forVisits(
        visitIds: string[],
        tenantId?: string
    ): Promise<Record<string, EyeVisitDetail>> {
        if (visitIds.length === 0) return {};

        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string> = { visit_ids: visitIds.join(",") };
        if (apiTenantId) params.tenant_id = apiTenantId;

        const response = await apiClient.get<Record<string, EyeVisitDetail>>(
            "/opd/eye-hospital/visit-details",
            { params }
        );
        return response.data;
    },
};
