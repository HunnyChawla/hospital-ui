import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { OptometryPrescription, OptometryPrescriptionItem, MedicineItem, AdviceItem, PrescriptionSymptom } from "@/types";

// Request types
export interface CreateOptometryPrescriptionRequest {
  patient_id: string;
  optometrist_id: string;
  visit_id: string;
  doctor_id?: string;
  diagnosis: string | null;
  notes: string | null;
  items?: OptometryPrescriptionItem[];
  pupillary_distance?: number | null;
  frame_fitting_notes?: string | null;
  // Doctor prescription fields
  followup_date?: string | null;
  plan_of_action?: string | null;
  remarks?: string | null;
  lens_type?: string | null;
  vision_type?: string | null;
  lens_material?: string | null;
  coatings?: string[] | null;
  medicine_items?: MedicineItem[];
  advice_items?: AdviceItem[];
  symptoms?: PrescriptionSymptom[];
}

export interface UpdateOptometryPrescriptionRequest {
  diagnosis?: string | null;
  notes?: string | null;
  items?: OptometryPrescriptionItem[];
  pupillary_distance?: number | null;
  frame_fitting_notes?: string | null;
  followup_date?: string | null;
  plan_of_action?: string | null;
  remarks?: string | null;
  lens_type?: string | null;
  vision_type?: string | null;
  lens_material?: string | null;
  coatings?: string[] | null;
  medicine_items?: MedicineItem[];
  advice_items?: AdviceItem[];
  symptoms?: PrescriptionSymptom[];
}

// Search/List params and response
export interface OptometryPrescriptionSearchParams {
  patient_id?: string;
  optometrist_id?: string;
  visit_id?: string;
  status?: "draft" | "finalized";
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  tenant_id?: string;
}

export interface OptometryPrescriptionSearchResponse {
  items: OptometryPrescription[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const optometryPrescriptionApi = {
  async create(data: CreateOptometryPrescriptionRequest, tenantId?: string): Promise<OptometryPrescription> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<OptometryPrescription>("/optometry-prescriptions", data, { params });
    return response.data;
  },

  async list(params?: OptometryPrescriptionSearchParams): Promise<OptometryPrescriptionSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.optometrist_id) queryParams.append("optometrist_id", params.optometrist_id);
    if (params?.visit_id) queryParams.append("visit_id", params.visit_id);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/optometry-prescriptions${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<OptometryPrescriptionSearchResponse>(url);
    return response.data;
  },

  async getById(id: string, tenantId?: string): Promise<OptometryPrescription> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<OptometryPrescription>(`/optometry-prescriptions/${id}`, { params });
    return response.data;
  },

  async update(id: string, data: UpdateOptometryPrescriptionRequest, tenantId?: string): Promise<OptometryPrescription> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<OptometryPrescription>(`/optometry-prescriptions/${id}`, data, { params });
    return response.data;
  },

  async finalize(id: string, tenantId?: string): Promise<OptometryPrescription> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<OptometryPrescription>(`/optometry-prescriptions/${id}/finalize`, {}, { params });
    return response.data;
  },

  async getByPatient(patientId: string, params?: { page?: number; page_size?: number; tenant_id?: string }): Promise<OptometryPrescriptionSearchResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("patient_id", patientId);

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/optometry-prescriptions?${queryString}`;

    const response = await apiClient.get<OptometryPrescriptionSearchResponse>(url);
    return response.data;
  },
};
