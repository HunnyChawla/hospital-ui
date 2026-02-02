import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { IOPRecord, IOPTrend } from "@/types";

// Request types
export interface CreateIOPRequest {
  patient_id: string;
  optometrist_id: string;
  visit_id: string | null;
  eye: "OD" | "OS";
  pressure: number;
  measurement_method: string;
  notes: string | null;
}

export interface UpdateIOPRequest {
  pressure?: number;
  measurement_method?: string;
  notes?: string | null;
}

// Combined IOP create/update payload (one record per visit)
export interface CreateIOPCombinedRequest {
  patient_id: string;
  visit_id: string;
  optometrist_id: string;
  od_pressure: number;
  os_pressure: number;
  measurement_time?: string;
  measurement_method: string;
  notes: string | null;
}

// Search/List params and response
export interface IOPSearchParams {
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

export interface IOPSearchResponse {
  items: IOPRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const iopApi = {
  async create(data: CreateIOPRequest, tenantId?: string): Promise<IOPRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<IOPRecord>("/iop", data, { params });
    return response.data;
  },

  async createCombined(data: CreateIOPCombinedRequest, tenantId?: string): Promise<any> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post("/iop", data, { params });
    return response.data;
  },

  async update(id: string, data: UpdateIOPRequest, tenantId?: string): Promise<IOPRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<IOPRecord>(`/iop/${id}`, data, { params });
    return response.data;
  },

  async updateCombined(id: string, data: CreateIOPCombinedRequest, tenantId?: string): Promise<any> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put(`/iop/${id}`, data, { params });
    return response.data;
  },

  async list(params?: IOPSearchParams): Promise<IOPSearchResponse> {
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
    const url = `/iop${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<IOPSearchResponse>(url);
    return response.data;
  },

  async getByPatient(patientId: string, params?: { days?: number; tenant_id?: string }): Promise<IOPSearchResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("patient_id", patientId);

    if (params?.days) queryParams.append("days", params.days.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/iop?${queryString}`;

    const response = await apiClient.get<IOPSearchResponse>(url);
    return response.data;
  },

  async getTrends(patientId: string, days: number = 180, tenantId?: string): Promise<IOPTrend[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params: any = { days };
    if (apiTenantId) params.tenant_id = apiTenantId;

    const response = await apiClient.get<IOPTrend[]>(`/iop/trends/${patientId}`, { params });
    return response.data;
  },
};
