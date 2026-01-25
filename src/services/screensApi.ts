import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

// ============================================================================
// Types
// ============================================================================

export interface ScreenResponse {
    id: string;
    path: string;
    label: string;
    icon: string | null;
    category: string | null;
    display_order: number;
}

export interface ScreenCreate {
    path: string;
    label: string;
    icon?: string | null;
    category?: string | null;
    display_order?: number;
}

export interface ScreenUpdate {
    path?: string | null;
    label?: string | null;
    icon?: string | null;
    category?: string | null;
    display_order?: number | null;
}

// ============================================================================
// API Methods
// ============================================================================

export const screensApi = {
    /**
     * List all screens
     */
    async list(): Promise<ScreenResponse[]> {
        const response = await apiClient.get<ScreenResponse[]>("/screens");
        return response.data;
    },

    /**
     * Create a new screen
     */
    async create(data: ScreenCreate): Promise<ScreenResponse> {
        const response = await apiClient.post<ScreenResponse>("/screens", data);
        return response.data;
    },

    /**
     * Get a specific screen by ID
     */
    async getById(screenId: string): Promise<ScreenResponse> {
        const response = await apiClient.get<ScreenResponse>(`/screens/${screenId}`);
        return response.data;
    },

    /**
     * Update a specific screen
     */
    async update(screenId: string, data: ScreenUpdate): Promise<ScreenResponse> {
        const response = await apiClient.put<ScreenResponse>(`/screens/${screenId}`, data);
        return response.data;
    },

    /**
     * Delete a screen
     */
    async delete(screenId: string): Promise<void> {
        await apiClient.delete(`/screens/${screenId}`);
    },
};
