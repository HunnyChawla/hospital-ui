import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { ComplaintRecord } from "@/types";

// Request types
export interface CreateComplaintRequest {
  patient_id: string;
  visit_id: string;
  optometrist_id: string;
  complaint: string;
  severity: "mild" | "moderate" | "severe" | null;
  duration: string | null;
  notes?: string | null;
}

// Search/List params and response
export interface ComplaintsSearchParams {
  patient_id?: string;
  optometrist_id?: string;
  visit_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  tenant_id?: string;
}

export interface ComplaintsSearchResponse {
  items: ComplaintRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const complaintsApi = {
  async create(data: CreateComplaintRequest, tenantId?: string): Promise<ComplaintRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<ComplaintRecord>("/complaints", data, { params });
    return response.data;
  },

  async list(params?: ComplaintsSearchParams): Promise<ComplaintsSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.optometrist_id) queryParams.append("optometrist_id", params.optometrist_id);
    if (params?.visit_id) queryParams.append("visit_id", params.visit_id);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/complaints${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<ComplaintsSearchResponse>(url);
    return response.data;
  },

  async getByVisit(visitId: string, tenantId?: string): Promise<ComplaintsSearchResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};

    const response = await apiClient.get<ComplaintsSearchResponse>(`/complaints/visit/${visitId}`, { params });
    return response.data;
  },

  async getByPatient(patientId: string, params?: { page?: number; page_size?: number; tenant_id?: string }): Promise<ComplaintsSearchResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("patient_id", patientId);

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/complaints?${queryString}`;

    const response = await apiClient.get<ComplaintsSearchResponse>(url);
    return response.data;
  },

  async delete(id: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/complaints/${id}`, { params });
  },
};
