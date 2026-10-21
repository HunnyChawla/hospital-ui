import { apiClient } from "./api";
import {
  ApiPermissionItem,
  ApiPermissionListResponse,
  ApiPermissionSyncResponse,
} from "@/types";

export interface ApiPermissionFilters {
  module_tag?: string;
  http_method?: string;
  search?: string;
  role?: string;
}

export interface ApiPermissionUpdatePayload {
  allowed_roles: string[];
  is_public?: boolean;
  is_active?: boolean;
}

export interface ApiPermissionBulkUpdateItem {
  id: string;
  allowed_roles: string[];
  is_public?: boolean;
}

export const apiPermissionsApi = {
  /**
   * List all platform API permissions with filtering (Platform Owner only)
   */
  async list(filters?: ApiPermissionFilters): Promise<ApiPermissionListResponse> {
    const params: Record<string, string> = {};
    if (filters?.module_tag) params.module_tag = filters.module_tag;
    if (filters?.http_method) params.http_method = filters.http_method;
    if (filters?.search && filters.search.trim()) params.search = filters.search.trim();
    if (filters?.role) params.role = filters.role;

    const response = await apiClient.get<ApiPermissionListResponse>("/api-permissions", {
      params,
    });
    return response.data;
  },

  /**
   * Update allowed roles for an individual API endpoint
   */
  async update(id: string, payload: ApiPermissionUpdatePayload): Promise<ApiPermissionItem> {
    const response = await apiClient.put<ApiPermissionItem>(`/api-permissions/${id}`, payload);
    return response.data;
  },

  /**
   * Bulk update multiple API permissions in a single transaction
   */
  async bulkUpdate(updates: ApiPermissionBulkUpdateItem[]): Promise<{ updated: number }> {
    const response = await apiClient.put<{ updated: number }>("/api-permissions/bulk", {
      updates,
    });
    return response.data;
  },

  /**
   * Sync API endpoints from live codebase routes
   */
  async syncRoutes(): Promise<ApiPermissionSyncResponse> {
    const response = await apiClient.post<ApiPermissionSyncResponse>("/api-permissions/sync", {});
    return response.data;
  },
};
