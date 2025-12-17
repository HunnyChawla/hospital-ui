import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type UserRole = "admin" | "doctor" | "nurse" | "receptionist";
export type UserStatus = "active" | "inactive";

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  full_name: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
}

export interface UpdateUserRequest {
  full_name?: string;
  status?: UserStatus;
}

export interface UsersSearchParams {
  page?: number;
  page_size?: number;
  role?: UserRole;
  status?: UserStatus;
  tenant_id?: string;
}

export interface UsersSearchResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const usersApi = {
  async create(user: CreateUserRequest, tenantId?: string): Promise<User> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<User>("/users", user, { params });
    return response.data;
  },

  async list(params?: UsersSearchParams): Promise<UsersSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.role) queryParams.append("role", params.role);
    if (params?.status) queryParams.append("status", params.status);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);
    
    const queryString = queryParams.toString();
    const url = `/users${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<UsersSearchResponse>(url);
    return response.data;
  },

  async getById(userId: string, tenantId?: string): Promise<User> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<User>(`/users/${userId}`, { params });
    return response.data;
  },

  async update(
    userId: string,
    updates: UpdateUserRequest,
    tenantId?: string
  ): Promise<User> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<User>(`/users/${userId}`, updates, { params });
    return response.data;
  },

  async getDoctorsWithoutDoctorRecord(tenantId?: string): Promise<User[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<User[]>("/users/doctors/without-doctor-record", { params });
    return response.data;
  },
};
