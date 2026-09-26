import axios from "axios";

import { getEnv } from "../utils/env";

// Lazy initialization to ensure window.__ENV is loaded before baseURL is set
let _apiClient: ReturnType<typeof axios.create> | null = null;

const getApiClient = () => {
  if (_apiClient === null) {
    _apiClient = axios.create({
      baseURL: getEnv("NEXT_PUBLIC_API_BASE_URL", "/api"),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth token to requests
    _apiClient.interceptors.request.use((config) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Handle 401 (logout) and 403 consent_required errors
    let isRedirectingToLogin = false;
    _apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (typeof window !== "undefined" && !isRedirectingToLogin) {
            isRedirectingToLogin = true;
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user_id");
            localStorage.removeItem("tenant_id");
            localStorage.removeItem("role");
            localStorage.removeItem("consent_required");
            const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
            window.location.href = `${basePath}/login`;
          }
        } else if (error.response?.status === 403) {
          const detail = error.response.data?.detail;
          const isConsentRequired =
            Array.isArray(detail) &&
            detail.some((d: any) => d.type === "consent_required");
          if (isConsentRequired && typeof window !== "undefined") {
            localStorage.setItem("consent_required", "true");
            window.dispatchEvent(new CustomEvent("legal:consent_required"));
          }
        }
        return Promise.reject(error);
      }
    );
  }

  return _apiClient;
};

export const apiClient = new Proxy({} as ReturnType<typeof axios.create>, {
  get(target, prop) {
    const client = getApiClient();
    const value = client[prop as keyof typeof client];
    return typeof value === "function" ? value.bind(client) : value;
  },
});


// Mock call utility for mockData.ts (used by features that don't have real API yet)
export const wait = (ms = 400) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const mockCall = async <T>(url: string, data: T, ms?: number) => {
  // Intentionally skip real HTTP, but keep URLs discoverable
  await wait(ms ?? 420);
  return { data, url };
};

