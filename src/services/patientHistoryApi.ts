import { apiClient } from "./api";
import { PatientHistoryTimeline } from "@/types";
import { getTenantIdForApi } from "@/utils/auth";

export interface PatientHistoryParams {
  patient_id: string;
  start_date?: string;
  end_date?: string;
  type?: "all" | "visits" | "labs" | "prescriptions" | "admissions" | "vitals";
  page?: number;
  page_size?: number;
}

export const patientHistoryApi = {
  /**
   * Get aggregated patient history timeline
   */
  async get(
    params: PatientHistoryParams,
    tenantId?: string
  ): Promise<PatientHistoryTimeline> {
    const apiParams = {
      ...params,
      ...(getTenantIdForApi(tenantId)
        ? { tenant_id: getTenantIdForApi(tenantId) }
        : {}),
    };

    const response = await apiClient.get<PatientHistoryTimeline>(
      `/patients/${params.patient_id}/history`,
      { params: apiParams }
    );
    return response.data;
  },
};
