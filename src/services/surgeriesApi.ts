import { apiClient } from "./api";
import { CreateSurgeryRequest, Surgery, SurgeryPackage, UpdateSurgeryRequest } from "@/types";

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

    listPackages: async (surgeryId: string) => {
        const { data } = await apiClient.get<SurgeryPackage[]>(`/surgeries/${surgeryId}/packages`);
        return data;
    },

    createPackage: async (surgeryId: string, payload: { name: string; description?: string; price: number; is_default?: boolean }) => {
        const { data } = await apiClient.post<SurgeryPackage>(`/surgeries/${surgeryId}/packages`, payload);
        return data;
    },

    updatePackage: async (surgeryId: string, packageId: string, payload: { name?: string; description?: string; price?: number; is_active?: boolean; is_default?: boolean }) => {
        const { data } = await apiClient.put<SurgeryPackage>(`/surgeries/${surgeryId}/packages/${packageId}`, payload);
        return data;
    },

    setDefaultPackage: async (surgeryId: string, packageId: string) => {
        await apiClient.patch(`/surgeries/${surgeryId}/packages/${packageId}/set-default`);
    },

    deletePackage: async (surgeryId: string, packageId: string) => {
        await apiClient.delete(`/surgeries/${surgeryId}/packages/${packageId}`);
    },
};
