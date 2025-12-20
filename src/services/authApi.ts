import axios from "axios";
import { apiClient } from "./api";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export interface LoginRequest {
  email: string;
  password: string;
  hospital_id: string;
}

export interface LoginResponse {
  token: {
    access_token: string;
    token_type: string;
  };
  user_id: string;
  tenant_id: string;
  role: string;
}

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Ensure BASE_URL doesn't have trailing slash
    const baseUrl = BASE_URL.replace(/\/$/, "");
    const loginUrl = `${baseUrl}/auth/login`;
    
    const response = await axios.post<LoginResponse>(
      loginUrl,
      credentials
    );
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      // Use apiClient which already includes the Authorization header
      await apiClient.post("/auth/logout", {});
    } catch (error) {
      // Even if logout API fails, we should still clear local storage
      console.error("Logout API call failed:", error);
    }
  },
};

