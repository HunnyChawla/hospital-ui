import { apiClient } from "./api";
import { Visit } from "./opdVisitsApi";
import { Appointment } from "./appointmentsApi";

export interface QueueVisit extends Visit {
  patient_name?: string;
}

export interface CombinedQueueItem {
  id: string;
  type: "appointment" | "visit";
  patient_id: string;
  patient_name: string;
  token_number: number;
  status: string;
  appointment_date?: string;
  appointment_time?: string;
  visit_type?: string;
  created_at?: string;
}

export const queueApi = {
  async getDoctorQueue(
    doctorId: string,
    options?: {
      status?: string;
      tenantId?: string;
    }
  ): Promise<QueueVisit[]> {
    const params: Record<string, string> = {};
    if (options?.status) {
      params.status = options.status;
    }
    if (options?.tenantId) {
      params.tenant_id = options.tenantId;
    }
    const response = await apiClient.get<QueueVisit[]>(`/opd/queue/doctor/${doctorId}`, { params });
    return response.data;
  },

  async getCombinedQueue(
    doctorId: string,
    options?: {
      queueDate?: string; // YYYY-MM-DD, defaults to today
      appointmentsOnly?: boolean;
      tenantId?: string;
    }
  ): Promise<CombinedQueueItem[]> {
    const params: Record<string, string> = {};
    if (options?.queueDate) {
      params.queue_date = options.queueDate;
    }
    if (options?.appointmentsOnly) {
      params.appointments_only = "true";
    }
    if (options?.tenantId) {
      params.tenant_id = options.tenantId;
    }
    const response = await apiClient.get<CombinedQueueItem[]>(
      `/opd/combined/doctor/${doctorId}`,
      { params }
    );
    return response.data;
  },

  async getPatientHistory(patientId: string, tenantId?: string): Promise<{
    appointments: Appointment[];
    visits: Visit[];
  }> {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await apiClient.get<{
      appointments: Appointment[];
      visits: Visit[];
    }>(`/opd/patient/${patientId}/history`, { params });
    return response.data;
  },
};

