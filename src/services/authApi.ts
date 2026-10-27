import axios from "axios";
import { apiClient } from "./api";

import { getEnv } from "../utils/env";

export interface CaptchaResponse {
  captcha_id: string;
  captcha_token: string;
  image: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  hospital_id: string;
  captcha_id?: string;
  captcha_answer?: string;
  captcha_token?: string;
}

export interface ActiveSession {
  id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

export interface SessionPolicyInfo {
  max_concurrent_sessions: number;
  allow_keep_alive: boolean;
  message?: string | null;
  session_expiry_minutes?: number;
  idle_timeout_minutes?: number | null;
}

export interface InvalidateSessionsResponse {
  success: boolean;
  invalidated_count: number;
  message: string;
}

export interface TenantSessionPolicy {
  id?: string | null;
  tenant_id: string;
  tenant_name?: string | null;
  subdomain?: string | null;
  max_concurrent_sessions: number;
  session_expiry_minutes?: number;
  idle_timeout_minutes?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface SessionExtendResponse {
  token: {
    access_token: string;
    token_type: string;
    expires_in?: number;
  };
  session_id: string;
  expires_at: string;
  session_expiry_minutes: number;
}

export interface LoginResponse {
  token: {
    access_token: string;
    token_type: string;
    expires_in?: number;
  };
  user_id: string;
  tenant_id: string;
  role: string;
  full_name?: string;
  email?: string;
  must_change_password?: boolean;
  consent_required?: boolean;
  pending_consents?: any[];
  current_session_id?: string;
  other_active_sessions?: ActiveSession[];
  session_policy?: SessionPolicyInfo;
}

export const authApi = {
  async getCaptcha(): Promise<CaptchaResponse> {
    const baseUrl = getEnv("NEXT_PUBLIC_API_BASE_URL", "/api").replace(/\/$/, "");
    const captchaUrl = baseUrl ? `${baseUrl}/auth/captcha` : "/api/auth/captcha";
    const response = await axios.get<CaptchaResponse>(captchaUrl, {
      withCredentials: true,
    });
    return response.data;
  },

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Get API URL at runtime to ensure window.__ENV is available
    const baseUrl = getEnv("NEXT_PUBLIC_API_BASE_URL", "/api").replace(/\/$/, "");
    const loginUrl = baseUrl ? `${baseUrl}/auth/login` : "/api/auth/login";

    const response = await axios.post<LoginResponse>(
      loginUrl,
      credentials,
      {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      }
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

  async getActiveSessions(): Promise<ActiveSession[]> {
    const response = await apiClient.get<ActiveSession[]>("/auth/sessions");
    return response.data;
  },

  async invalidateSessions(sessionIds: string[], token?: string): Promise<InvalidateSessionsResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await apiClient.post<InvalidateSessionsResponse>(
      "/auth/sessions/invalidate",
      { session_ids: sessionIds },
      { headers }
    );
    return response.data;
  },

  async invalidateOtherSessions(token?: string): Promise<InvalidateSessionsResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await apiClient.post<InvalidateSessionsResponse>(
      "/auth/sessions/invalidate-others",
      {},
      { headers }
    );
    return response.data;
  },

  async getSessionPolicies(): Promise<{ items: TenantSessionPolicy[]; total: number }> {
    const response = await apiClient.get<{ items: TenantSessionPolicy[]; total: number }>("/session-policies/tenants");
    return response.data;
  },

  async updateSessionPolicy(
    tenantId: string,
    maxConcurrentSessions: number,
    sessionExpiryMinutes: number = 600,
    idleTimeoutMinutes: number = 15
  ): Promise<TenantSessionPolicy> {
    const response = await apiClient.put<TenantSessionPolicy>(`/session-policies/tenants/${tenantId}`, {
      max_concurrent_sessions: maxConcurrentSessions,
      session_expiry_minutes: sessionExpiryMinutes,
      idle_timeout_minutes: idleTimeoutMinutes,
    });
    return response.data;
  },

  async extendSession(): Promise<SessionExtendResponse> {
    const response = await apiClient.post<SessionExtendResponse>("/auth/session/extend", {});
    return response.data;
  },
};
