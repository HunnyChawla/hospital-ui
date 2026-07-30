import { apiClient } from "./api";
import { PreOpClearance, UpsertPreOpClearanceRequest } from "@/types";

export const preOpClearanceApi = {
  get: async (plannedSurgeryId: string): Promise<PreOpClearance> => {
    const response = await apiClient.get<PreOpClearance>(
      `/planned-surgeries/${plannedSurgeryId}/pre-op`
    );
    return response.data;
  },

  upsert: async (
    plannedSurgeryId: string,
    data: UpsertPreOpClearanceRequest
  ): Promise<PreOpClearance> => {
    const response = await apiClient.put<PreOpClearance>(
      `/planned-surgeries/${plannedSurgeryId}/pre-op`,
      data
    );
    return response.data;
  },
};
