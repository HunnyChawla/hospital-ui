import { apiClient } from "./api";
import { BodyPartSummary, CreateSurgeryRequest, Surgery, UpdateSurgeryRequest } from "@/types";

export type SurgeryParams = {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    is_active?: boolean;
    body_part_id?: string;
};

export type PaginatedSurgeryResponse = {
    items: Surgery[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
};

export type SurgeryPrescriptionOption = {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    body_parts: BodyPartSummary[];
};

export type PrescriptionOptionsParams = {
    page?: number;
    page_size?: number;
    search?: string;
};

export type PaginatedSurgeryPrescriptionOptionResponse = {
    items: SurgeryPrescriptionOption[];
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

    /** Metadata-light, searchable/paginated listing for the doctor/optometrist
     * prescription panel - omits price/service_id/is_active/audit fields. */
    listForPrescription: async (params?: PrescriptionOptionsParams) => {
        const { data } = await apiClient.get<PaginatedSurgeryPrescriptionOptionResponse>(
            "/surgeries/prescription-options",
            { params }
        );
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
