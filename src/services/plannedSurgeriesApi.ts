import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type {
    PlannedSurgery,
    CreatePlannedSurgeryRequest,
    UpdatePlannedSurgeryRequest,
    PlannedSurgeryStatus,
} from "@/types";

export type PlannedSurgeryParams = {
    patient_id?: string;
    visit_id?: string;
    surgeon_id?: string;
    from_date?: string;
    to_date?: string;
    status?: PlannedSurgeryStatus;
    sort_by?: "advised_date" | "planned_date" | "created_at";
    date_status?: "all" | "planned" | "not_planned";
    page?: number;
    page_size?: number;
};

export type PaginatedPlannedSurgeryResponse = {
    items: PlannedSurgery[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
};

export const plannedSurgeriesApi = {
    list: async (params?: PlannedSurgeryParams, tenantId?: string) => {
        const apiTenantId = getTenantIdForApi(tenantId);
        const queryParams = { ...params, ...(apiTenantId ? { tenant_id: apiTenantId } : {}) };
        const { data } = await apiClient.get<PaginatedPlannedSurgeryResponse>("/planned-surgeries", {
            params: queryParams,
        });
        return data;
    },

    get: async (id: string, tenantId?: string) => {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const { data } = await apiClient.get<PlannedSurgery>(`/planned-surgeries/${id}`, { params });
        return data;
    },

    create: async (payload: CreatePlannedSurgeryRequest, tenantId?: string) => {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const { data } = await apiClient.post<PlannedSurgery>("/planned-surgeries", payload, { params });
        return data;
    },

    update: async (id: string, payload: UpdatePlannedSurgeryRequest, tenantId?: string) => {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const { data } = await apiClient.put<PlannedSurgery>(`/planned-surgeries/${id}`, payload, { params });
        return data;
    },

    delete: async (id: string, tenantId?: string) => {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        await apiClient.delete(`/planned-surgeries/${id}`, { params });
    },

    cancel: async (id: string, tenantId?: string) => {
        return plannedSurgeriesApi.update(id, { status: "cancelled" }, tenantId);
    },
};
