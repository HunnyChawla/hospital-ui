import { apiClient } from "./api";

export type OTConsumable = {
    id: string;
    name: string;
    category?: string;
    unit?: string;
    selling_price?: number;
    purchase_price?: number;
    is_active: boolean;
};

export type PaginatedOTConsumableResponse = {
    items: OTConsumable[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
};

export type OTConsumableParams = {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    is_active?: boolean;
};

export const otConsumablesApi = {
    list: async (params?: OTConsumableParams) => {
        const { data } = await apiClient.get<PaginatedOTConsumableResponse>("/ot-consumables", {
            params,
        });
        return data;
    },
};
