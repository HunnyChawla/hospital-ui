import { apiClient } from "./api";

export type AppointmentStatus = "scheduled" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: string;
  tenant_id: string;
  patient_id: string;
  patient_name?: string;
  patient_mobile?: string;
  doctor_id: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS or HH:MM:SS.microseconds
  status: AppointmentStatus;
  token_number: number;
  visit_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentRequest {
  patient_id: string;
  doctor_id: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS
  notes?: string;
}

export const appointmentsApi = {
  async create(appointment: CreateAppointmentRequest, tenantId?: string): Promise<Appointment> {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await apiClient.post<Appointment>("/appointments", appointment, { params });
    return response.data;
  },

  async getByDoctor(
    doctorId: string,
    appointmentDate: string,
    options?: {
      appointmentsOnly?: boolean;
      tenantId?: string;
    }
  ): Promise<Appointment[]> {
    const params: Record<string, string> = {
      appointment_date: appointmentDate,
    };
    if (options?.appointmentsOnly) {
      params.appointments_only = "true";
    }
    if (options?.tenantId) {
      params.tenant_id = options.tenantId;
    }
    const response = await apiClient.get<Appointment[]>(`/appointments/doctor/${doctorId}`, { params });
    return response.data;
  },

  async updateStatus(
    appointmentId: string,
    newStatus: AppointmentStatus,
    tenantId?: string
  ): Promise<Appointment> {
    const params: Record<string, string> = { new_status: newStatus };
    if (tenantId) {
      params.tenant_id = tenantId;
    }
    const response = await apiClient.patch<Appointment>(
      `/appointments/${appointmentId}/status`,
      {},
      { params }
    );
    return response.data;
  },
};

