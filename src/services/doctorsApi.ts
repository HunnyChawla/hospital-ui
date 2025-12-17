import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface Doctor {
  id: string;
  tenant_id: string;
  user_id: string;
  specialization: string | null;
  qualification: string | null;
  registration_number: string | null;
  consultation_fee: string | null;
  created_at: string;
  updated_at: string;
  name?: string; // Optional: if API includes name directly
  user_name?: string; // User's full name from user API
  user?: {
    name?: string;
    email?: string;
  }; // Optional: if API includes user object
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
};

