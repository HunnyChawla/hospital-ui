import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

// ============================================================================
// Types
// ============================================================================

export interface DoctorGroup {
    id: string;
    tenant_id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    member_count: number;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
}

export interface DoctorGroupMember {
    id: string;
    doctor_group_id: string;
    doctor_id: string;
    doctor_name: string | null;
    is_active: boolean;
    created_at: string;
}

export interface CreateDoctorGroupRequest {
    name: string;
    description?: string;
}

export interface AddDoctorToGroupRequest {
    doctor_id: string;
}

// ============================================================================
// API Methods
// ============================================================================

export const doctorGroupsApi = {
    /**
     * Create a new doctor group
     */
    async create(data: CreateDoctorGroupRequest, tenantId?: string): Promise<DoctorGroup> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.post<DoctorGroup>("/admin/doctor-groups", data, { params });
        return response.data;
    },

    /**
     * List all doctor groups for the tenant
     */
    async list(includeInactive: boolean = false, tenantId?: string): Promise<DoctorGroup[]> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string | boolean> = { include_inactive: includeInactive };
        if (apiTenantId) params.tenant_id = apiTenantId;
        const response = await apiClient.get<DoctorGroup[]>("/admin/doctor-groups", { params });
        return response.data;
    },

    /**
     * Get a specific doctor group by ID
     */
    async getById(groupId: string, tenantId?: string): Promise<DoctorGroup> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.get<DoctorGroup>(`/admin/doctor-groups/${groupId}`, { params });
        return response.data;
    },

    /**
     * Get all members of a doctor group
     */
    async getMembers(groupId: string, includeInactive: boolean = false, tenantId?: string): Promise<DoctorGroupMember[]> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string | boolean> = { include_inactive: includeInactive };
        if (apiTenantId) params.tenant_id = apiTenantId;
        const response = await apiClient.get<DoctorGroupMember[]>(`/admin/doctor-groups/${groupId}/members`, { params });
        return response.data;
    },

    /**
     * Add a doctor to a group
     */
    async addMember(groupId: string, doctorId: string, tenantId?: string): Promise<DoctorGroupMember> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const data: AddDoctorToGroupRequest = { doctor_id: doctorId };
        const response = await apiClient.post<DoctorGroupMember>(`/admin/doctor-groups/${groupId}/members`, data, { params });
        return response.data;
    },

    /**
     * Remove a doctor from a group
     */
    async removeMember(groupId: string, doctorId: string, tenantId?: string): Promise<void> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        await apiClient.delete(`/admin/doctor-groups/${groupId}/members/${doctorId}`, { params });
    },
};
