import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { PatientOptometryTimeline } from "@/types";

export interface PatientOptometryHistoryParams {
  patient_id: string;
  event_type?: string;
  page?: number;
  page_size?: number;
  tenant_id?: string;
}

export const patientOptometryHistoryApi = {
  async get(params: PatientOptometryHistoryParams): Promise<PatientOptometryTimeline> {
    const queryParams = new URLSearchParams();

    if (params.event_type) queryParams.append("type", params.event_type);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/patient-optometry-history/${params.patient_id}${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<PatientOptometryTimeline>(url);
    return response.data;
  },

  async getTimeline(
    patientId: string,
    options?: { limit?: number; event_type?: string; tenant_id?: string }
  ): Promise<PatientOptometryTimeline> {
    return this.get({
      patient_id: patientId,
      event_type: options?.event_type,
      page_size: options?.limit || 10,
      tenant_id: options?.tenant_id,
    });
  },
};
