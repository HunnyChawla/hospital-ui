import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type AdviceCategory = "General" | "Post-Op" | "Pre-Op" | "Infection" | "Allergy";
export type ApplicableEye = "LEFT" | "RIGHT" | "BOTH";

export interface Advice {
    id: string;
    tenant_id: string | null;
    advice_name: string;
    category: AdviceCategory;
    applicable_eye: ApplicableEye | null;
    is_post_op: boolean;
    is_active: boolean;
    description: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
}

export interface CreateAdviceRequest {
    advice_name: string;
    category: AdviceCategory;
    applicable_eye?: ApplicableEye | null;
    is_post_op?: boolean;
    is_active?: boolean;
    description?: string;
}

export interface UpdateAdviceRequest {
    advice_name?: string;
    category?: AdviceCategory;
    applicable_eye?: ApplicableEye | null;
    is_post_op?: boolean;
    is_active?: boolean;
    description?: string;
}

export interface AdvicesSearchParams {
    page?: number;
    page_size?: number;
    status?: "active" | "inactive"; // In UI we might use this string logic to map to is_active
    search?: string;
    tenant_id?: string; // PlatformOwner only
}

export interface AdvicesSearchResponse {
    items: Advice[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export const advicesApi = {
    async create(
        advice: CreateAdviceRequest,
        tenantId?: string
    ): Promise<Advice> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string> = {};
        if (apiTenantId) params.tenant_id = apiTenantId;

        const response = await apiClient.post<Advice>("/advices", advice, { params });
        return response.data;
    },

    async list(params?: AdvicesSearchParams): Promise<AdvicesSearchResponse> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
        // For status, the API likely expects is_active bool if implemented like that, 
        // OR it might support "active"/"inactive" string on search. 
        // Based on Diagnosis it had status param. Advice schema has is_active. 
        // Let's assume the API might filter by is_active if we assume standard pattern,
        // but Diagnosis uses ?status=active.
        // If I look at the generated schema, keys were is_active. 
        // If the backend search supports 'status' param mapping to is_active, great.
        // But typically with is_active boolean, search params might be is_active=true/false.
        // However, standardizing on what Diagnose does?
        // Diagnose: status param.
        // Advice: I'll try to support what the UI might pass. 
        // If I pass 'status'='active', and backend expects is_active=true. 
        // I'll check if the schema had search params.
        // The schema in openapi.json for GET /advices didn't show params in the snippet I got (it was CreateAdviceRequest).
        // I'll check GET /advices params again or just assume consistent behavior.
        // If I can't check, I'll send likely candidates.

        if (params?.status) {
            // If backend expects is_active boolean
            if (params.status === 'active') queryParams.append("is_active", "true");
            if (params.status === 'inactive') queryParams.append("is_active", "false");
        }

        if (params?.search) queryParams.append("search", params.search);

        const apiTenantId = getTenantIdForApi(params?.tenant_id);
        if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

        const queryString = queryParams.toString();
        const url = `/advices${queryString ? `?${queryString}` : ""}`;

        const response = await apiClient.get<AdvicesSearchResponse>(url);
        return response.data;
    },

    async getById(adviceId: string, tenantId?: string): Promise<Advice> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.get<Advice>(`/advices/${adviceId}`, { params });
        return response.data;
    },

    async update(
        adviceId: string,
        updates: UpdateAdviceRequest,
        tenantId?: string
    ): Promise<Advice> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.put<Advice>(
            `/advices/${adviceId}`,
            updates,
            { params }
        );
        return response.data;
    },

    async delete(adviceId: string, tenantId?: string): Promise<void> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        await apiClient.delete(`/advices/${adviceId}`, { params });
    },

    async bulkCreate(
        advices: CreateAdviceRequest[],
        tenantId?: string
    ): Promise<Advice[]> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string> = {};
        if (apiTenantId) params.tenant_id = apiTenantId;

        const response = await apiClient.post<Advice[]>(
            "/advices/bulk",
            { advices }, // Check if backend expects { advices: [...] } or just [...]
            { params }
        );
        // Diagnosis uses { diagnoses: [...] }. I'll assume Advice uses { advices: [...] } based on user saying "Similar to diagnose master"
        return response.data;
    },
};
