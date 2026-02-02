import { apiClient } from "./api";
import { CreateSurgeryRequest, Surgery, UpdateSurgeryRequest } from "@/types";

export type SurgeryParams = {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    is_active?: boolean;
};

export type PaginatedSurgeryResponse = {
    items: Surgery[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
};

export const surgeriesApi = {
    list: async (params?: SurgeryParams) => {
        const { data } = await apiClient.get<PaginatedSurgeryResponse>("/surgeries", {
            params,
        });
        return data;
    },

    get: async (id: string) => {
        const { data } = await apiClient.get<Surgery>(`/surgeries/${id}`);
        return data;
    },

    create: async (payload: CreateSurgeryRequest) => {
        const { data } = await apiClient.post<Surgery>("/surgeries", payload);
        return data;
    },

    update: async (id: string, payload: UpdateSurgeryRequest) => {
        const { data } = await apiClient.put<Surgery>(`/surgeries/${id}`, payload);
        return data;
    },

    delete: async (id: string) => {
        await apiClient.delete(`/surgeries/${id}`);
    },
};
