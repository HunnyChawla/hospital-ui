import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import {
  UserPermissions,
  RolePermissions,
  UserSpecificPermissions,
  UserPermissionSummary,
} from "@/types";


export interface AllRolesPermissionsResponse {
  roles: RolePermissions[];
}

export interface UpdateRolePermissionsRequest {
  screen_paths: string[];
}

export interface UpdateUserPermissionsRequest {
  additional_screens: string[];
}

export interface UsersWithPermissionsParams {
  tenant_id?: string;
}

export interface UsersWithPermissionsResponse {
  users: UserPermissionSummary[];
}

export const permissionsApi = {
  /**
   * Get current user's permissions (called after login)
   * Returns combined role + user-specific permissions
   */
  async getMyPermissions(): Promise<UserPermissions> {
    const response = await apiClient.get<UserPermissions>("/permissions/my");
    return response.data;
  },

  /**
   * List all roles with their permissions (admin only)
   */
  async listRolePermissions(tenantId?: string): Promise<RolePermissions[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<AllRolesPermissionsResponse>("/permissions/roles", {
      params,
    });
    return response.data.roles;
  },

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(role: string, tenantId?: string): Promise<RolePermissions> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<RolePermissions>(`/permissions/roles/${role}`, { params });
    return response.data;
  },

  /**
   * Update permissions for a role (admin only)
   */
  async updateRolePermissions(
    role: string,
    screenPaths: string[],
    tenantId?: string,
    defaultScreenPath?: string
  ): Promise<RolePermissions> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<RolePermissions>(
      `/permissions/roles/${role}`,
      {
        screen_paths: screenPaths,
        default_screen_path: defaultScreenPath,
      },
      { params }
    );
    return response.data;
  },

  /**
   * Seed default permissions (platform owner only)
   */
  async seedDefaults(tenantId?: string): Promise<{ message: string }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<{ message: string }>(
      "/permissions/seed-defaults",
      {},
      { params }
    );
    return response.data;
  },

  /**
   * List users with their custom permissions (admin only)
   * @param tenantId - Optional tenant ID for platform owners
   * @param search - Optional search query to filter users by name or role
   */
  async listUsersWithPermissions(tenantId?: string, search?: string): Promise<UserPermissionSummary[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params: Record<string, string> = {};
    if (apiTenantId) {
      params.tenant_id = apiTenantId;
    }
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const response = await apiClient.get<UsersWithPermissionsResponse | UserPermissionSummary[]>("/permissions/users", { params });
    // Handle both wrapped { users: [...] } and direct array responses
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.users || [];
  },

  /**
   * Get specific user's permissions (admin only)
   */
  async getUserPermissions(userId: string, tenantId?: string): Promise<UserSpecificPermissions> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<UserSpecificPermissions>(
      `/permissions/users/${userId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Update user's additional screens (admin only)
   */
  async updateUserPermissions(
    userId: string,
    additionalScreens: string[],
    tenantId?: string
  ): Promise<{ user_id: string; additional_screens: string[] }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<{ user_id: string; additional_screens: string[] }>(
      `/permissions/users/${userId}`,
      { additional_screens: additionalScreens },
      { params }
    );
    return response.data;
  },
};
