import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface VaccineMaster {
    id: string;
    tenant_id: string | null;
    code: string | null;
    name: string;
    short_name: string | null;
    vaccine_type: string | null;
    disease: string | null;
    description: string | null;
    route: string | null;
    administration_site: string | null;
    dose_volume: number | null;
    dose_unit: string | null;
    doses_required: number | null;
    minimum_age_days: number | null;
    maximum_age_days: number | null;
    minimum_interval_days: number | null;
    storage_min_temp: number | null;
    storage_max_temp: number | null;
    schedule_hint: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
}

export interface CreateVaccineMasterRequest {
    code: string;
    name: string;
    short_name?: string;
    vaccine_type?: string;
    disease?: string;
    description?: string;
    route?: string;
    administration_site?: string;
    dose_volume?: number;
    dose_unit?: string;
    doses_required?: number;
    minimum_age_days?: number;
    maximum_age_days?: number;
    minimum_interval_days?: number;
    storage_min_temp?: number;
    storage_max_temp?: number;
    schedule_hint?: string;
    is_active?: boolean;
}

export interface UpdateVaccineMasterRequest {
    code?: string;
    name?: string;
    short_name?: string;
    vaccine_type?: string;
    disease?: string;
    description?: string;
    route?: string;
    administration_site?: string;
    dose_volume?: number;
    dose_unit?: string;
    doses_required?: number;
    minimum_age_days?: number;
    maximum_age_days?: number;
    minimum_interval_days?: number;
    storage_min_temp?: number;
    storage_max_temp?: number;
    schedule_hint?: string;
    is_active?: boolean;
}

export interface VaccinesSearchParams {
    page?: number;
    page_size?: number;
    is_active?: boolean;
    search?: string;
    disease?: string;
    vaccine_type?: string;
    include_global?: boolean;
    tenant_id?: string;
}

export interface VaccinesSearchResponse {
    items: VaccineMaster[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface BulkVaccinesImportRequest {
    vaccines: CreateVaccineMasterRequest[];
}

export const vaccinesApi = {
    async create(
        vaccine: CreateVaccineMasterRequest,
        isGlobal: boolean = false,
        tenantId?: string
    ): Promise<VaccineMaster> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string> = {};
        if (isGlobal) params.is_global = "true";
        if (apiTenantId) params.tenant_id = apiTenantId;

        const response = await apiClient.post<VaccineMaster>("/vaccines", vaccine, { params });
        return response.data;
    },

    async list(params?: VaccinesSearchParams): Promise<VaccinesSearchResponse> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params?.is_active !== undefined)
            queryParams.append("is_active", params.is_active.toString());
        if (params?.search) queryParams.append("search", params.search);
        if (params?.disease) queryParams.append("disease", params.disease);
        if (params?.vaccine_type) queryParams.append("vaccine_type", params.vaccine_type);
        if (params?.include_global !== undefined)
            queryParams.append("include_global", params.include_global.toString());
        const apiTenantId = getTenantIdForApi(params?.tenant_id);
        if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

        const queryString = queryParams.toString();
        const url = `/vaccines${queryString ? `?${queryString}` : ""}`;

        const response = await apiClient.get<VaccinesSearchResponse>(url);
        return response.data;
    },

    async search(q: string, tenantId?: string, includeGlobal: boolean = true): Promise<VaccinesSearchResponse> {
        const queryParams = new URLSearchParams();
        queryParams.append("q", q);
        queryParams.append("include_global", includeGlobal.toString());
        const apiTenantId = getTenantIdForApi(tenantId);
        if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

        const response = await apiClient.get<VaccinesSearchResponse>(`/vaccines/search?${queryParams.toString()}`);
        return response.data;
    },

    async getById(vaccineId: string, tenantId?: string): Promise<VaccineMaster> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.get<VaccineMaster>(`/vaccines/${vaccineId}`, { params });
        return response.data;
    },

    async update(
        vaccineId: string,
        updates: UpdateVaccineMasterRequest,
        tenantId?: string
    ): Promise<VaccineMaster> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.put<VaccineMaster>(`/vaccines/${vaccineId}`, updates, { params });
        return response.data;
    },

    async delete(vaccineId: string, tenantId?: string): Promise<void> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        await apiClient.delete(`/vaccines/${vaccineId}`, { params });
    },

    async bulkImport(
        data: BulkVaccinesImportRequest,
        isGlobal: boolean = false,
        tenantId?: string
    ): Promise<VaccineMaster[]> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string> = {};
        if (isGlobal) params.is_global = "true";
        if (apiTenantId) params.tenant_id = apiTenantId;

        const response = await apiClient.post<VaccineMaster[]>("/vaccines/bulk-import", data, { params });
        return response.data;
    },
};
