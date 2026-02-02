import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { CurrentSpecsRecord, LensType, SpecsUsage, MeasuredBy } from "@/types";

// Request types
export interface CreateCurrentSpecsRequest {
    patient_id: string;
    optometrist_id: string;
    visit_id: string;
    od?: {
        sph?: string | number | null;
        cyl?: string | number | null;
        axis?: number | null;
        add?: string | number | null;
    } | null;
    os?: {
        sph?: string | number | null;
        cyl?: string | number | null;
        axis?: number | null;
        add?: string | number | null;
    } | null;
    lens_type?: LensType | null;
    usage?: SpecsUsage | null;
    measured_by?: MeasuredBy | null;
    is_comfortable?: boolean | null;
    remarks?: string | null;
}

export interface UpdateCurrentSpecsRequest {
    od?: {
        sph?: string | number | null;
        cyl?: string | number | null;
        axis?: number | null;
        add?: string | number | null;
    } | null;
    os?: {
        sph?: string | number | null;
        cyl?: string | number | null;
        axis?: number | null;
        add?: string | number | null;
    } | null;
    lens_type?: LensType | null;
    usage?: SpecsUsage | null;
    measured_by?: MeasuredBy | null;
    is_comfortable?: boolean | null;
    remarks?: string | null;
}

export interface CurrentSpecsSearchParams {
    patient_id?: string;
    optometrist_id?: string;
    visit_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
    tenant_id?: string;
}

export interface CurrentSpecsSearchResponse {
    items: CurrentSpecsRecord[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export const currentSpecsApi = {
    async create(data: CreateCurrentSpecsRequest, tenantId?: string): Promise<CurrentSpecsRecord> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.post<CurrentSpecsRecord>("/current-specs", data, { params });
        return response.data;
    },

    async list(params?: CurrentSpecsSearchParams): Promise<CurrentSpecsSearchResponse> {
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
        const url = `/current-specs${queryString ? `?${queryString}` : ""}`;

        const response = await apiClient.get<CurrentSpecsSearchResponse>(url);
        return response.data;
    },

    async getById(id: string, tenantId?: string): Promise<CurrentSpecsRecord> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.get<CurrentSpecsRecord>(`/current-specs/${id}`, { params });
        return response.data;
    },

    async getByPatient(patientId: string, params?: { page?: number; page_size?: number; tenant_id?: string }): Promise<CurrentSpecsSearchResponse> {
        const queryParams = new URLSearchParams();
        queryParams.append("patient_id", patientId);

        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

        const apiTenantId = getTenantIdForApi(params?.tenant_id);
        if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

        const queryString = queryParams.toString();
        const url = `/current-specs?${queryString}`;

        const response = await apiClient.get<CurrentSpecsSearchResponse>(url);
        return response.data;
    },

    async update(id: string, data: UpdateCurrentSpecsRequest, tenantId?: string): Promise<CurrentSpecsRecord> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.put<CurrentSpecsRecord>(`/current-specs/${id}`, data, { params });
        return response.data;
    },

    async delete(id: string, tenantId?: string): Promise<void> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        await apiClient.delete(`/current-specs/${id}`, { params });
    },
};
