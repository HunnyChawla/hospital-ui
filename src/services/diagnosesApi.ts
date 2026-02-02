import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type DiagnosisStatus = "active" | "inactive";

export interface Diagnosis {
    id: string;
    tenant_id: string | null;
    diagnosis_name: string;
    diagnosis_code: string;
    description: string | null;
    category: string | null;
    status: DiagnosisStatus;
    icd_10_code: string | null;
    icd_11_code: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
}

export interface CreateDiagnosisRequest {
    diagnosis_name: string;
    diagnosis_code: string;
    description?: string;
    category?: string;
    status?: DiagnosisStatus;
    icd_10_code?: string;
    icd_11_code?: string;
}

export interface UpdateDiagnosisRequest {
    diagnosis_name?: string;
    diagnosis_code?: string;
    description?: string;
    category?: string;
    status?: DiagnosisStatus;
    icd_10_code?: string;
    icd_11_code?: string;
}

export interface DiagnosesSearchParams {
    page?: number;
    page_size?: number;
    status?: DiagnosisStatus;
    search?: string;
    include_global?: boolean;
    tenant_id?: string; // PlatformOwner only
}

export interface DiagnosesSearchResponse {
    items: Diagnosis[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export const diagnosesApi = {
    async create(
        diagnosis: CreateDiagnosisRequest,
        isGlobal: boolean = false,
        tenantId?: string
    ): Promise<Diagnosis> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string> = {};
        if (isGlobal) params.is_global = "true";
        if (apiTenantId) params.tenant_id = apiTenantId;

        const response = await apiClient.post<Diagnosis>("/diagnoses", diagnosis, { params });
        return response.data;
    },

    async list(params?: DiagnosesSearchParams): Promise<DiagnosesSearchResponse> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params?.status) queryParams.append("status", params.status);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.include_global !== undefined)
            queryParams.append("include_global", params.include_global.toString());
        const apiTenantId = getTenantIdForApi(params?.tenant_id);
        if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

        const queryString = queryParams.toString();
        const url = `/diagnoses${queryString ? `?${queryString}` : ""}`;

        const response = await apiClient.get<DiagnosesSearchResponse>(url);
        return response.data;
    },

    async getById(diagnosisId: string, tenantId?: string): Promise<Diagnosis> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.get<Diagnosis>(`/diagnoses/${diagnosisId}`, { params });
        return response.data;
    },

    async update(
        diagnosisId: string,
        updates: UpdateDiagnosisRequest,
        tenantId?: string
    ): Promise<Diagnosis> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.put<Diagnosis>(
            `/diagnoses/${diagnosisId}`,
            updates,
            { params }
        );
        return response.data;
    },

    async delete(diagnosisId: string, tenantId?: string): Promise<void> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        await apiClient.delete(`/diagnoses/${diagnosisId}`, { params });
    },

    async bulkCreate(
        diagnoses: CreateDiagnosisRequest[],
        isGlobal: boolean = false,
        tenantId?: string
    ): Promise<Diagnosis[]> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string> = {};
        if (isGlobal) params.is_global = "true";
        if (apiTenantId) params.tenant_id = apiTenantId;

        const response = await apiClient.post<Diagnosis[]>(
            "/diagnoses/bulk",
            { diagnoses },
            { params }
        );
        return response.data;
    },
};
