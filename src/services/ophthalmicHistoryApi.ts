import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { OphthalmicSurgeryRecord } from "@/types";

// Request types
export interface CreateOphthalmicSurgeryRequest {
  patient_id: string;
  surgery_type: string;
  eye: "OD" | "OS" | "Both";
  surgery_date: string;
  hospital: string | null;
  surgeon: string | null;
  notes: string | null;
}

// Search/List params and response
export interface OphthalmicHistorySearchParams {
  patient_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  tenant_id?: string;
}

export interface OphthalmicHistorySearchResponse {
  items: OphthalmicSurgeryRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const ophthalmicHistoryApi = {
  async create(data: CreateOphthalmicSurgeryRequest, tenantId?: string): Promise<OphthalmicSurgeryRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<OphthalmicSurgeryRecord>("/ophthalmic-history", data, { params });
    return response.data;
  },

  async list(params?: OphthalmicHistorySearchParams): Promise<OphthalmicHistorySearchResponse> {
    const queryParams = new URLSearchParams();

    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/ophthalmic-history${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<OphthalmicHistorySearchResponse>(url);
    return response.data;
  },

  async delete(id: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/ophthalmic-history/${id}`, { params });
  },
};
