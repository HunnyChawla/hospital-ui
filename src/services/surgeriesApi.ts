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

export type ProcedurePerformedOption = {
    id: string;
    tenant_id: string;
    code?: string | null;
    name: string;
    description?: string | null;
    category?: string | null;
    is_active: boolean;
    is_default: boolean;
    display_order: number;
};

export type ProcedurePerformedParams = {
    surgery_id?: string;
    surgery_name?: string;
    is_active?: boolean;
    search?: string;
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

    listProcedures: async (params?: ProcedurePerformedParams) => {
        const { data } = await apiClient.get<ProcedurePerformedOption[]>(
            "/surgeries/procedures",
            { params }
        );
        return data;
    },

    listSurgeryProcedures: async (surgeryId: string) => {
        const { data } = await apiClient.get<ProcedurePerformedOption[]>(
            `/surgeries/${surgeryId}/procedures`
        );
        return data;
    },

    updateSurgeryProcedures: async (
        surgeryId: string,
        payload: {
            procedures: {
                procedure_id: string;
                is_default: boolean;
                display_order: number;
            }[];
        }
    ) => {
        const { data } = await apiClient.put<ProcedurePerformedOption[]>(
            `/surgeries/${surgeryId}/procedures`,
            payload
        );
        return data;
    },

    createProcedure: async (payload: {
        name: string;
        code?: string | null;
        description?: string | null;
        category?: string | null;
        surgery_id?: string | null;
        is_default?: boolean;
        display_order?: number;
    }) => {
        const { data } = await apiClient.post<ProcedurePerformedOption>(
            "/surgeries/procedures",
            payload
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
