import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type {
    SurgeryPackage,
    CreateSurgeryPackageRequest,
    UpdateSurgeryPackageRequest,
} from "@/types";

export const surgeryPackagesApi = {
    list: async (surgeryId: string, is_active?: boolean, tenantId?: string) => {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = {
            ...(is_active !== undefined ? { is_active } : {}),
            ...(apiTenantId ? { tenant_id: apiTenantId } : {}),
        };
        const { data } = await apiClient.get<SurgeryPackage[]>(`/surgeries/${surgeryId}/packages`, {
            params,
        });
        return data;
    },

    get: async (surgeryId: string, packageId: string, tenantId?: string) => {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const { data } = await apiClient.get<SurgeryPackage>(`/surgeries/${surgeryId}/packages/${packageId}`, {
            params,
        });
        return data;
    },

    create: async (surgeryId: string, payload: CreateSurgeryPackageRequest, tenantId?: string) => {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const { data } = await apiClient.post<SurgeryPackage>(`/surgeries/${surgeryId}/packages`, payload, {
            params,
        });
        return data;
    },

    update: async (
        surgeryId: string,
        packageId: string,
        payload: UpdateSurgeryPackageRequest,
        tenantId?: string
    ) => {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const { data } = await apiClient.put<SurgeryPackage>(
            `/surgeries/${surgeryId}/packages/${packageId}`,
            payload,
            { params }
        );
        return data;
    },

    delete: async (surgeryId: string, packageId: string, tenantId?: string) => {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        await apiClient.delete(`/surgeries/${surgeryId}/packages/${packageId}`, { params });
    },
};
