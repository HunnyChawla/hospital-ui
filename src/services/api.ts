import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://mock-hospital-api.local",
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

export const wait = (ms = 400) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const mockCall = async <T>(url: string, data: T, ms?: number) => {
  // Intentionally skip real HTTP, but keep URLs discoverable
  await wait(ms ?? 420);
  return { data, url };
};

