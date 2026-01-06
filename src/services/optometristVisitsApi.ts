import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface OptometristVisitResponse {
  id: string;
  tenant_id: string;
  patient_id: string;
  patient_name: string;
  patient_mobile: string;
  doctor_id: string;
  visit_type: "walk_in" | "appointment" | "emergency";
  visit_number: string;
  status: string;
  appointment_id: string | null;
  token_number: number;
  chief_complaint: string | null;
  notes: string | null;
  checked_in_at: string;
  consultation_started_at: string | null;
  consultation_ended_at: string | null;
  invoice_id: string;
  created_at: string;
  updated_at: string;
  optometrist_id: string | null;
  optometrist_assigned_at: string | null;
  optometrist_investigation_started_at: string | null;
  optometrist_investigation_completed_at: string | null;
  dilation_started_at: string | null;
  dilation_duration_minutes: number | null;
  dilation_completed_at: string | null;
  expected_next_status_time: string | null;
}

export interface PickOptometristRequest {
  optometrist_id: string;
}

export const optometristVisitsApi = {
  /**
   * Pick a patient from the optometrist queue
   * POST /opd/eye-hospital/visits/{visit_id}/pick-optometrist
   */
  async pickOptometrist(
    visitId: string,
    optometristId: string,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const requestBody: PickOptometristRequest = {
      optometrist_id: optometristId,
    };
    const response = await apiClient.post<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}/pick-optometrist`,
      requestBody,
      params ? { params: { tenant_id: params } } : undefined
    );
    return response.data;
  },

  /**
   * Unpick a patient from the optometrist queue
   * POST /opd/eye-hospital/visits/{visit_id}/unpick-optometrist
   */
  async unpickOptometrist(
    visitId: string,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const response = await apiClient.post<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}/unpick-optometrist`,
      {},
      params ? { params: { tenant_id: params } } : undefined
    );
    return response.data;
  },

  /**
   * Start investigation for a patient
   * POST /opd/eye-hospital/visits/{visit_id}/start-investigation
   */
  async startInvestigation(
    visitId: string,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const response = await apiClient.post<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}/start-investigation`,
      {},
      params ? { params: { tenant_id: params } } : undefined
    );
    return response.data;
  },

  /**
   * Complete investigation for a patient
   * POST /opd/eye-hospital/visits/{visit_id}/complete-investigation
   */
  async completeInvestigation(
    visitId: string,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const response = await apiClient.post<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}/complete-investigation`,
      {},
      params ? { params: { tenant_id: params } } : undefined
    );
    return response.data;
  },
};
