import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

// One constant holds the base so any backend rename is a one-line change.
const VISITS_BASE = "/opd/general/visits";

export interface ClinicVisitResponse {
  id: string;
  tenant_id: string;
  patient_id: string;
  patient_name: string;
  patient_mobile: string;
  patient_category?: string | null;
  doctor_id: string | null;
  doctor_name?: string | null;
  visit_type: "walk_in" | "appointment" | "emergency";
  visit_number: string;
  status: string;
  appointment_id: string | null;
  token_number: number | null;
  chief_complaint: string | null;
  notes: string | null;
  checked_in_at: string | null;
  consultation_started_at: string | null;
  consultation_ended_at: string | null;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
  is_revisit?: boolean;
  // General clinic specific fields
  examiner_id: string | null;
  examiner_name: string | null;
  examiner_cabin?: string | null;
  examiner_assigned_at: string | null;
  examination_started_at: string | null;
  examination_completed_at: string | null;
  picked_by_doctor_id?: string | null;
  picked_by_doctor_name?: string | null;
  doctor_picked_at?: string | null;
}

function config(tenantId?: string) {
  const effective = getTenantIdForApi(tenantId);
  return effective ? { params: { tenant_id: effective } } : undefined;
}

export const clinicVisitsApi = {
  /** GET /opd/general/visits/{visit_id} */
  async getById(visitId: string, tenantId?: string): Promise<ClinicVisitResponse> {
    const response = await apiClient.get<ClinicVisitResponse>(
      `${VISITS_BASE}/${visitId}`,
      config(tenantId)
    );
    return response.data;
  },

  /** POST /opd/general/visits/{visit_id}/pick-examiner */
  async pickExaminer(
    visitId: string,
    examinerId: string,
    tenantId?: string
  ): Promise<ClinicVisitResponse> {
    const response = await apiClient.post<ClinicVisitResponse>(
      `${VISITS_BASE}/${visitId}/pick-examiner`,
      { examiner_id: examinerId },
      config(tenantId)
    );
    return response.data;
  },

  /** POST /opd/general/visits/{visit_id}/unpick-examiner */
  async unpickExaminer(visitId: string, tenantId?: string): Promise<ClinicVisitResponse> {
    const response = await apiClient.post<ClinicVisitResponse>(
      `${VISITS_BASE}/${visitId}/unpick-examiner`,
      {},
      config(tenantId)
    );
    return response.data;
  },

  /** POST /opd/general/visits/{visit_id}/start-examination */
  async startExamination(visitId: string, tenantId?: string): Promise<ClinicVisitResponse> {
    const response = await apiClient.post<ClinicVisitResponse>(
      `${VISITS_BASE}/${visitId}/start-examination`,
      {},
      config(tenantId)
    );
    return response.data;
  },

  /** POST /opd/general/visits/{visit_id}/complete-examination */
  async completeExamination(visitId: string, tenantId?: string): Promise<ClinicVisitResponse> {
    const response = await apiClient.post<ClinicVisitResponse>(
      `${VISITS_BASE}/${visitId}/complete-examination`,
      {},
      config(tenantId)
    );
    return response.data;
  },

  /** POST /opd/general/visits/{visit_id}/pick-doctor?doctor_id= */
  async pickDoctor(
    visitId: string,
    doctorId: string,
    tenantId?: string
  ): Promise<ClinicVisitResponse> {
    const effective = getTenantIdForApi(tenantId);
    const params: Record<string, string> = { doctor_id: doctorId };
    if (effective) params.tenant_id = effective;
    const response = await apiClient.post<ClinicVisitResponse>(
      `${VISITS_BASE}/${visitId}/pick-doctor`,
      {},
      { params }
    );
    return response.data;
  },

  /** POST /opd/general/visits/{visit_id}/unpick-doctor */
  async unpickDoctor(visitId: string, tenantId?: string): Promise<ClinicVisitResponse> {
    const response = await apiClient.post<ClinicVisitResponse>(
      `${VISITS_BASE}/${visitId}/unpick-doctor`,
      {},
      config(tenantId)
    );
    return response.data;
  },

  /** POST /opd/general/visits/{visit_id}/start-consultation */
  async startConsultation(visitId: string, tenantId?: string): Promise<ClinicVisitResponse> {
    const response = await apiClient.post<ClinicVisitResponse>(
      `${VISITS_BASE}/${visitId}/start-consultation`,
      {},
      config(tenantId)
    );
    return response.data;
  },

  /** POST /opd/general/visits/{visit_id}/complete-consultation */
  async completeConsultation(visitId: string, tenantId?: string): Promise<ClinicVisitResponse> {
    const response = await apiClient.post<ClinicVisitResponse>(
      `${VISITS_BASE}/${visitId}/complete-consultation`,
      {},
      config(tenantId)
    );
    return response.data;
  },

  /** POST /opd/general/visits/{visit_id}/mark-no-show */
  async markNoShow(
    visitId: string,
    reason?: string,
    tenantId?: string
  ): Promise<ClinicVisitResponse> {
    const response = await apiClient.post<ClinicVisitResponse>(
      `${VISITS_BASE}/${visitId}/mark-no-show`,
      { reason: reason ?? null },
      config(tenantId)
    );
    return response.data;
  },

  /** GET /opd/general/visits/{visit_id}/timeline */
  async getTimeline(visitId: string, tenantId?: string): Promise<unknown> {
    const response = await apiClient.get(`${VISITS_BASE}/${visitId}/timeline`, config(tenantId));
    return response.data;
  },
};
