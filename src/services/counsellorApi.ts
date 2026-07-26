import { apiClient } from "./api";
import {
  CancelSurgeryRequest,
  ConfirmSurgeryRequest,
  CounsellorInteraction,
  LogInteractionRequest,
  PlannedSurgery,
  PostponeSurgeryRequest,
  SurgeryAdviceHistory,
} from "@/types";

export const counsellorApi = {
  confirm: async (adviceId: string, data: ConfirmSurgeryRequest): Promise<PlannedSurgery> => {
    const response = await apiClient.post<PlannedSurgery>(`/planned-surgeries/${adviceId}/confirm`, data);
    return response.data;
  },

  postpone: async (adviceId: string, data: PostponeSurgeryRequest): Promise<PlannedSurgery> => {
    const response = await apiClient.post<PlannedSurgery>(`/planned-surgeries/${adviceId}/postpone`, data);
    return response.data;
  },

  cancel: async (adviceId: string, data: CancelSurgeryRequest): Promise<PlannedSurgery> => {
    const response = await apiClient.post<PlannedSurgery>(`/planned-surgeries/${adviceId}/cancel`, data);
    return response.data;
  },

  logInteraction: async (adviceId: string, data: LogInteractionRequest): Promise<CounsellorInteraction> => {
    const response = await apiClient.post<CounsellorInteraction>(`/planned-surgeries/${adviceId}/interactions`, data);
    return response.data;
  },

  getInteractions: async (adviceId: string): Promise<CounsellorInteraction[]> => {
    const response = await apiClient.get<CounsellorInteraction[]>(`/planned-surgeries/${adviceId}/interactions`);
    return response.data;
  },

  getHistory: async (adviceId: string): Promise<SurgeryAdviceHistory[]> => {
    const response = await apiClient.get<SurgeryAdviceHistory[]>(`/planned-surgeries/${adviceId}/history`);
    return response.data;
  },
};
