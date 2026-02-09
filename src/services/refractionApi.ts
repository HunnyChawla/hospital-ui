import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { RefractionRecord } from "@/types";

// Request types - for creating/updating refraction records
export interface CreateRefractionRequest {
  patient_id: string;
  optometrist_id: string;
  visit_id: string;
  od: {
    sphere: number;
    cylinder: number | null;
    axis: number | null;
    visual_acuity_uncorrected: string;
    visual_acuity_corrected: string;
    distance_bcva: string;
    near_bcva: string;
    add_power: number | null;
  };
  os: {
    sphere: number;
    cylinder: number | null;
    axis: number | null;
    visual_acuity_uncorrected: string;
    visual_acuity_corrected: string;
    distance_bcva: string;
    near_bcva: string;
    add_power: number | null;
  };
  pupillary_distance?: number | null;
  notes: string | null;
  recorded_at?: string;
}

export interface UpdateRefractionRequest {
  sphere?: number;
  cylinder?: number | null;
  axis?: number | null;
  visual_acuity_uncorrected?: string;
  visual_acuity_corrected?: string;
  distance_bcva?: string;
  near_bcva?: string;
  add_power?: number | null;
  pupillary_distance?: number | null;
  notes?: string | null;
}

// Search/List params and response
export interface RefractionSearchParams {
  patient_id?: string;
  optometrist_id?: string;
  visit_id?: string;
  eye?: "OD" | "OS";
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  tenant_id?: string;
}

export interface RefractionSearchResponse {
  items: RefractionRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const refractionApi = {
  async create(data: CreateRefractionRequest, tenantId?: string): Promise<RefractionRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<RefractionRecord>("/refraction", data, { params });
    return response.data;
  },

  async list(params?: RefractionSearchParams): Promise<RefractionSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.optometrist_id) queryParams.append("optometrist_id", params.optometrist_id);
    if (params?.visit_id) queryParams.append("visit_id", params.visit_id);
    if (params?.eye) queryParams.append("eye", params.eye);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/refraction${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<RefractionSearchResponse>(url);
    return response.data;
  },

  async getById(id: string, tenantId?: string): Promise<RefractionRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<RefractionRecord>(`/refraction/${id}`, { params });
    return response.data;
  },

  async getByPatient(patientId: string, params?: { page?: number; page_size?: number; tenant_id?: string }): Promise<RefractionSearchResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("patient_id", patientId);

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/refraction?${queryString}`;

    const response = await apiClient.get<RefractionSearchResponse>(url);
    return response.data;
  },

  async update(id: string, data: UpdateRefractionRequest, tenantId?: string): Promise<RefractionRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<RefractionRecord>(`/refraction/${id}`, data, { params });
    return response.data;
  },

  async updateCombined(id: string, data: CreateRefractionRequest, tenantId?: string): Promise<RefractionRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<RefractionRecord>(`/refraction/${id}`, data, { params });
    return response.data;
  },
};
