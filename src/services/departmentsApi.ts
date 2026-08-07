import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

// ============================================================================
// Types
//
// A department is the organisational home of a doctor — one department per
// doctor — and it is what a clinical pathway attaches to.
//
// Not to be confused with a doctor *group* (`doctorGroupsApi`), which is a
// cover arrangement: many per doctor, operational, and free to span
// departments. Conflating the two is the easiest mistake to make here.
// ============================================================================

export interface Department {
    id: string;
    tenant_id: string;
    name: string;
    /** Stable identifier that configuration points at. Never changes on rename. */
    code: string;
    description: string | null;
    is_active: boolean;
    display_order: number;
    /**
     * True for departments created by migrating free-text specialisations,
     * where the value may be a job title ("ENT Specialist") rather than a
     * department. The admin screen surfaces these for renaming.
     */
    needs_review: boolean;
    /** Null means "follow the tenant default pathway", not "no workflow". */
    pathway_id: string | null;
    pathway_name: string | null;
    doctor_count: number;
    created_at: string;
    updated_at: string;
}

export interface CreateDepartmentRequest {
    name: string;
    /** Derived from the name when omitted. */
    code?: string;
    description?: string | null;
    is_active?: boolean;
    display_order?: number;
    pathway_id?: string | null;
}

export interface UpdateDepartmentRequest {
    name?: string;
    description?: string | null;
    is_active?: boolean;
    display_order?: number;
    needs_review?: boolean;
    pathway_id?: string;
    /**
     * Detach from the pathway, falling back to the tenant default. Needed
     * because an omitted `pathway_id` means "unchanged", so attaching one
     * would otherwise be irreversible.
     */
    clear_pathway?: boolean;
}

// ============================================================================
// API Methods
// ============================================================================

function tenantParams(tenantId?: string): Record<string, string> {
    const apiTenantId = getTenantIdForApi(tenantId);
    return apiTenantId ? { tenant_id: apiTenantId } : {};
}

export const departmentsApi = {
    /** List departments. Readable by any staff member — it drives pickers. */
    async list(includeInactive: boolean = true, tenantId?: string): Promise<Department[]> {
        const response = await apiClient.get<Department[]>("/departments", {
            params: { ...tenantParams(tenantId), include_inactive: includeInactive },
        });
        return response.data;
    },

    async getById(departmentId: string, tenantId?: string): Promise<Department> {
        const response = await apiClient.get<Department>(`/departments/${departmentId}`, {
            params: tenantParams(tenantId),
        });
        return response.data;
    },

    async create(data: CreateDepartmentRequest, tenantId?: string): Promise<Department> {
        const response = await apiClient.post<Department>("/departments", data, {
            params: tenantParams(tenantId),
        });
        return response.data;
    },

    async update(
        departmentId: string,
        data: UpdateDepartmentRequest,
        tenantId?: string
    ): Promise<Department> {
        const response = await apiClient.patch<Department>(`/departments/${departmentId}`, data, {
            params: tenantParams(tenantId),
        });
        return response.data;
    },

    /** Place a doctor in a department, or (with null) remove them from one. */
    async assignDoctor(
        doctorId: string,
        departmentId: string | null,
        tenantId?: string
    ): Promise<void> {
        await apiClient.put(
            `/departments/doctors/${doctorId}`,
            { department_id: departmentId },
            { params: tenantParams(tenantId) }
        );
    },
};
