import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type BodyPartLaterality = "left" | "right" | "bilateral" | "na";

export interface BodyPart {
    id: string;
    tenant_id: string | null;
    code: string;
    name: string;
    department: string;
    laterality: BodyPartLaterality;
    group_code: string | null;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
}

export interface CreateBodyPartRequest {
    name: string;
    code: string;
    department: string;
    laterality?: BodyPartLaterality;
    group_code?: string;
    description?: string;
    is_active?: boolean;
    sort_order?: number;
}

export interface UpdateBodyPartRequest {
    name?: string;
    code?: string;
    department?: string;
    laterality?: BodyPartLaterality;
    group_code?: string;
    description?: string;
    is_active?: boolean;
    sort_order?: number;
}

export interface BodyPartsSearchParams {
    page?: number;
    page_size?: number;
    department?: string;
    is_active?: boolean;
    search?: string;
    include_global?: boolean;
    tenant_id?: string; // PlatformOwner only
}

export interface BodyPartsSearchResponse {
    items: BodyPart[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export const bodyPartsApi = {
    async create(
        bodyPart: CreateBodyPartRequest,
        isGlobal: boolean = false,
        tenantId?: string
    ): Promise<BodyPart> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string> = {};
        if (isGlobal) params.is_global = "true";
        if (apiTenantId) params.tenant_id = apiTenantId;

        const response = await apiClient.post<BodyPart>("/body-parts", bodyPart, { params });
        return response.data;
    },

    async list(params?: BodyPartsSearchParams): Promise<BodyPartsSearchResponse> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params?.department) queryParams.append("department", params.department);
        if (params?.is_active !== undefined)
            queryParams.append("is_active", params.is_active.toString());
        if (params?.search) queryParams.append("search", params.search);
        if (params?.include_global !== undefined)
            queryParams.append("include_global", params.include_global.toString());
        const apiTenantId = getTenantIdForApi(params?.tenant_id);
        if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

        const queryString = queryParams.toString();
        const url = `/body-parts${queryString ? `?${queryString}` : ""}`;

        const response = await apiClient.get<BodyPartsSearchResponse>(url);
        return response.data;
    },

    async getById(bodyPartId: string, tenantId?: string): Promise<BodyPart> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.get<BodyPart>(`/body-parts/${bodyPartId}`, { params });
        return response.data;
    },

    async update(
        bodyPartId: string,
        updates: UpdateBodyPartRequest,
        tenantId?: string
    ): Promise<BodyPart> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.put<BodyPart>(
            `/body-parts/${bodyPartId}`,
            updates,
            { params }
        );
        return response.data;
    },

    async deactivate(bodyPartId: string, tenantId?: string): Promise<BodyPart> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.patch<BodyPart>(
            `/body-parts/${bodyPartId}/deactivate`,
            {},
            { params }
        );
        return response.data;
    },

    async delete(bodyPartId: string, tenantId?: string): Promise<void> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        await apiClient.delete(`/body-parts/${bodyPartId}`, { params });
    },
};
