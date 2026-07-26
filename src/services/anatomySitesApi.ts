import { apiClient } from "./api";
import { AnatomySite } from "@/types";

export const anatomySitesApi = {
  list: async (params?: { department?: string; is_active_only?: boolean }): Promise<AnatomySite[]> => {
    const response = await apiClient.get<AnatomySite[]>("/anatomy-sites", { params });
    return response.data;
  },

  create: async (data: { name: string; short_code: string; department?: string; sort_order?: number }): Promise<AnatomySite> => {
    const response = await apiClient.post<AnatomySite>("/anatomy-sites", data);
    return response.data;
  },

  update: async (id: string, data: Partial<AnatomySite>): Promise<AnatomySite> => {
    const response = await apiClient.put<AnatomySite>(`/anatomy-sites/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<void> => {
    await apiClient.delete(`/anatomy-sites/${id}`);
  },
};
