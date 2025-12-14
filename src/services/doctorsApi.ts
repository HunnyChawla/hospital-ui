import { apiClient } from "./api";

export interface Doctor {
  id: string;
  tenant_id: string;
  user_id: string;
  specialization: string;
  qualification: string;
  registration_number: string;
  consultation_fee: string;
  created_at: string;
  updated_at: string;
  name?: string; // Optional: if API includes name directly
  user?: {
    name?: string;
    email?: string;
  }; // Optional: if API includes user object
}

export const doctorsApi = {
  async list(): Promise<Doctor[]> {
    const response = await apiClient.get<Doctor[]>("/doctors");
    return response.data;
  },
};

