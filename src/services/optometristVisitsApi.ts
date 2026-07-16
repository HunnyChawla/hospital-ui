import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface OptometristVisitResponse {
  id: string;
  tenant_id: string;
  patient_id: string;
  patient_name: string;
  patient_mobile: string;
  patient_category?: string | null;
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
   * Get optometrist visit details
   * GET /opd/eye-hospital/visits/{visit_id}
   */
  async getById(
    visitId: string,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const response = await apiClient.get<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}`,
      params ? { params: { tenant_id: params } } : undefined
    );
    return response.data;
  },

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

  /**
   * Mark patient as NO SHOW
   * POST /opd/eye-hospital/visits/{visit_id}/mark-no-show
   */
  async markNoShow(
    visitId: string,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const response = await apiClient.post<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}/mark-no-show`,
      {},
      params ? { params: { tenant_id: params } } : undefined
    );
    return response.data;
  },

  /**
   * Start consultation for a patient (Doctor)
   * POST /opd/eye-hospital/visits/{visit_id}/start-consultation
   */
  async startConsultation(
    visitId: string,
    doctorId: string,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const response = await apiClient.post<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}/start-consultation`,
      { doctor_id: doctorId },
      params ? { params: { tenant_id: params } } : undefined
    );
    return response.data;
  },

  /**
   * Complete consultation for a patient (Doctor)
   * POST /opd/eye-hospital/visits/{visit_id}/complete-consultation
   */
  async completeConsultation(
    visitId: string,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const response = await apiClient.post<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}/complete-consultation`,
      {},
      params ? { params: { tenant_id: params } } : undefined
    );
    return response.data;
  },

  /**
   * Start dilation for a patient
   * POST /opd/eye-hospital/visits/{visit_id}/start-dilation
   */
  async startDilation(
    visitId: string,
    durationMinutes: number,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const response = await apiClient.post<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}/start-dilation`,
      { duration_minutes: durationMinutes },
      params ? { params: { tenant_id: params } } : undefined
    );
    return response.data;
  },

  /**
   * Complete dilation for a patient
   * POST /opd/eye-hospital/visits/{visit_id}/complete-dilation
   */
  async completeDilation(
    visitId: string,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const response = await apiClient.post<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}/complete-dilation`,
      {},
      params ? { params: { tenant_id: params } } : undefined
    );
    return response.data;
  },

  /**
   * Pick a patient from the group queue (Doctor)
   * POST /opd/eye-hospital/visits/{visit_id}/pick-doctor
   */
  async pickDoctor(
    visitId: string,
    doctorId: string,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const response = await apiClient.post<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}/pick-doctor`,
      {},
      {
        params: {
          doctor_id: doctorId,
          ...(params ? { tenant_id: params } : {})
        }
      }
    );
    return response.data;
  },

  /**
   * Release a patient back to the group queue (Doctor)
   * POST /opd/eye-hospital/visits/{visit_id}/unpick-doctor
   */
  async unpickDoctor(
    visitId: string,
    tenantId?: string
  ): Promise<OptometristVisitResponse> {
    const params = getTenantIdForApi(tenantId);
    const response = await apiClient.post<OptometristVisitResponse>(
      `/opd/eye-hospital/visits/${visitId}/unpick-doctor`,
      {},
      params ? { params: { tenant_id: params } } : undefined
    );
    return response.data;
  },
};
