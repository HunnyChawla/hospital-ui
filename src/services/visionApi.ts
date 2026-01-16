import { apiClient } from "./api";
import { CreateVisionRequest, VisionResponse } from "@/types";

export type { CreateVisionRequest, VisionResponse };
import { getTenantIdForApi } from "@/utils/auth";

export const visionApi = {
    create: async (data: CreateVisionRequest, tenant_id?: string | null): Promise<VisionResponse> => {
        const apiTenantId = getTenantIdForApi(tenant_id);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.post<VisionResponse>("/vision", data, { params });
        return response.data;
    },

    getByPatient: async (
        patient_id: string,
        params: { page?: number; page_size?: number; tenant_id?: string | null } = {}
    ): Promise<{ items: VisionResponse[]; total: number }> => {
        const apiTenantId = getTenantIdForApi(params.tenant_id);
        const apiParams = {
            patient_id,
            ...params,
        };
        if (apiTenantId) {
            apiParams.tenant_id = apiTenantId;
        }

        const response = await apiClient.get("/vision", {
            params: apiParams,
        });
        return response.data;
    },
};
