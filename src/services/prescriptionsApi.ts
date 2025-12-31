import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface PrescriptionMedicine {
  id: string;
  medicine_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  quantity: number;
  unit: string; // e.g., "tablets", "ml", "bottles"
}

export interface Prescription {
  id: string;
  tenant_id: string;
  visit_id: string | null;
  appointment_id: string | null;
  patient_id: string;
  doctor_id: string;
  medicines: PrescriptionMedicine[];
  diagnosis: string | null;
  notes: string | null;
  status: "draft" | "finalized" | "dispensed";
  created_at: string;
  updated_at: string;
}

export interface CreatePrescriptionMedicine {
  medicine_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
  quantity: number;
  unit: string;
}

export interface CreatePrescriptionRequest {
  visit_id?: string | null;
  appointment_id?: string | null;
  patient_id: string;
  doctor_id: string;
  medicines: CreatePrescriptionMedicine[];
  diagnosis?: string | null;
  notes?: string | null;
}

export interface UpdatePrescriptionRequest {
  medicines?: CreatePrescriptionMedicine[];
  diagnosis?: string | null;
  notes?: string | null;
}

export interface PrescriptionsSearchParams {
  visit_id?: string;
  appointment_id?: string;
  patient_id?: string;
  doctor_id?: string;
  page?: number;
  page_size?: number;
  tenant_id?: string;
}

export interface PrescriptionsSearchResponse {
  items: Prescription[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const prescriptionsApi = {
  async create(prescription: CreatePrescriptionRequest, tenantId?: string): Promise<Prescription> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<Prescription>("/prescriptions", prescription, { params });
    return response.data;
  },

  async list(params?: PrescriptionsSearchParams): Promise<PrescriptionsSearchResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.visit_id) queryParams.append("visit_id", params.visit_id);
    if (params?.appointment_id) queryParams.append("appointment_id", params.appointment_id);
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.doctor_id) queryParams.append("doctor_id", params.doctor_id);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);
    
    const queryString = queryParams.toString();
    const url = `/prescriptions${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<PrescriptionsSearchResponse>(url);
    return response.data;
  },

  async getById(prescriptionId: string, tenantId?: string): Promise<Prescription> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<Prescription>(`/prescriptions/${prescriptionId}`, { params });
    return response.data;
  },

  async update(prescriptionId: string, updates: UpdatePrescriptionRequest, tenantId?: string): Promise<Prescription> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<Prescription>(`/prescriptions/${prescriptionId}`, updates, { params });
    return response.data;
  },

  async finalize(prescriptionId: string, tenantId?: string): Promise<Prescription> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<Prescription>(`/prescriptions/${prescriptionId}/finalize`, {}, { params });
    return response.data;
  },

  async getByPatient(patientId: string, params?: { page?: number; page_size?: number; tenant_id?: string }): Promise<PrescriptionsSearchResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);
    
    const queryString = queryParams.toString();
    const url = `/prescriptions/patient/${patientId}${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<PrescriptionsSearchResponse>(url);
    return response.data;
  },
};



