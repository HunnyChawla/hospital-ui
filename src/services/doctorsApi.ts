import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface Doctor {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name: string; // User's full name from API
  user_mobile?: string | null;
  specialization: string | null;
  qualification: string | null;
  registration_number: string | null;
  consultation_fee?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  // Legacy fields for backwards compatibility
  name?: string;
  user?: {
    name?: string;
    email?: string;
  };
}

export interface CreateDoctorRequest {
  user_id: string;
  specialization?: string;
  qualification?: string;
  registration_number?: string;
  consultation_fee?: number;
}

export interface UpdateDoctorRequest {
  specialization?: string;
  qualification?: string;
  registration_number?: string;
  consultation_fee?: number;
}

export interface ConsultationFee {
  id: string;
  doctor_id: string;
  day_of_week: number;
  shift: "morning" | "evening" | "night" | "emergency";
  fee: string;
  patient_type: "old" | "new" | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultationFeeRequest {
  day_of_week: number;
  shift: "morning" | "evening" | "night" | "emergency";
  fee: number;
  patient_type: "old" | "new" | null;
}

export interface ConsultationFeeCalculation {
  doctor_id: string;
  patient_id: string;
  patient_name: string;
  is_old_patient: boolean;
  consultation_fee: string;
  visit_datetime: string;
  day_of_week: number;
  shift: "morning" | "evening" | "night" | "emergency";
  is_emergency: boolean;
  patient_type_used: "old" | "new";
}

export const doctorsApi = {
  async create(doctor: CreateDoctorRequest, tenantId?: string): Promise<Doctor> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<Doctor>("/doctors", doctor, { params });
    return response.data;
  },

  async list(tenantId?: string): Promise<Doctor[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<Doctor[]>("/doctors", { params });
    return response.data;
  },

  async getById(doctorId: string, tenantId?: string): Promise<Doctor> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<Doctor>(`/doctors/${doctorId}`, { params });
    return response.data;
  },

  async update(doctorId: string, updates: UpdateDoctorRequest, tenantId?: string): Promise<Doctor> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<Doctor>(`/doctors/${doctorId}`, updates, { params });
    return response.data;
  },

  async getConsultationFees(doctorId: string, tenantId?: string): Promise<ConsultationFee[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<ConsultationFee[]>(`/doctors/${doctorId}/consultation-fees`, { params });
    return response.data;
  },

  async setConsultationFees(doctorId: string, fees: ConsultationFeeRequest[], tenantId?: string): Promise<{ fees: ConsultationFeeRequest[] }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<{ fees: ConsultationFeeRequest[] }>(`/doctors/${doctorId}/consultation-fees`, { fees }, { params });
    return response.data;
  },

  async calculateConsultationFee(doctorId: string, patientId: string, isEmergency: boolean = false, tenantId?: string, signal?: AbortSignal): Promise<ConsultationFeeCalculation> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params: any = { 
      patient_id: patientId,
      is_emergency: isEmergency.toString(),
      ...(apiTenantId ? { tenant_id: apiTenantId } : {})
    };
    const response = await apiClient.get<ConsultationFeeCalculation>(`/doctors/${doctorId}/consultation-fees/calculate`, { params, signal });
    return response.data;
  },
};

