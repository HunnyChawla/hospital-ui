import axios from "axios";
import { apiClient } from "./api";

import { getEnv } from "../utils/env";

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
  must_change_password?: boolean;
}

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Get API URL at runtime to ensure window.__ENV is available
    const baseUrl = getEnv("NEXT_PUBLIC_API_BASE_URL", "/api").replace(/\/$/, "");
    const loginUrl = baseUrl ? `${baseUrl}/auth/login` : "/api/auth/login";

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

