import axios from "axios";

import { API_BASE_URL } from "../utils/env";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 errors - redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("tenant_id");
        localStorage.removeItem("role");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Mock call utility for mockData.ts (used by features that don't have real API yet)
export const wait = (ms = 400) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const mockCall = async <T>(url: string, data: T, ms?: number) => {
  // Intentionally skip real HTTP, but keep URLs discoverable
  await wait(ms ?? 420);
  return { data, url };
};

