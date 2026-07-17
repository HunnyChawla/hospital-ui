import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { ARDataRecord } from "@/types";

// Request types
export interface CreateARDataRequest {
  patient_id: string;
  visit_id: string;
  optometrist_id: string;
  od_sphere: number | null;
  od_cylinder: number | null;
  od_axis: number | null;
  od_visual_acuity?: string | null;
  os_sphere: number | null;
  os_cylinder: number | null;
  os_axis: number | null;
  os_visual_acuity?: string | null;
  pupillary_distance: number | null;
  notes: string | null;

  // New fields
  od_wet_sphere?: number | null;
  od_wet_cylinder?: number | null;
  od_wet_axis?: number | null;
  os_wet_sphere?: number | null;
  os_wet_cylinder?: number | null;
  os_wet_axis?: number | null;
}

// Search/List params and response
export interface ARDataSearchParams {
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

export interface ARDataSearchResponse {
  items: ARDataRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const arDataApi = {
  async create(data: CreateARDataRequest, tenantId?: string): Promise<ARDataRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<ARDataRecord>("/ar-data", data, { params });
    return response.data;
  },

  async update(id: string, data: CreateARDataRequest, tenantId?: string): Promise<ARDataRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<ARDataRecord>(`/ar-data/${id}`, data, { params });
    return response.data;
  },

  async list(params?: ARDataSearchParams): Promise<ARDataSearchResponse> {
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
    const url = `/ar-data${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<ARDataSearchResponse>(url);
    return response.data;
  },

  async getByVisit(visitId: string, tenantId?: string): Promise<ARDataRecord[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params: any = { visit_id: visitId };
    if (apiTenantId) params.tenant_id = apiTenantId;

    const response = await apiClient.get<ARDataRecord[]>(`/ar-data/visit/${visitId}`, { params });
    return response.data;
  },

  async getByPatient(patientId: string, params?: { page?: number; page_size?: number; tenant_id?: string }): Promise<ARDataSearchResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("patient_id", patientId);

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/ar-data?${queryString}`;

    const response = await apiClient.get<ARDataSearchResponse>(url);
    return response.data;
  },
};
