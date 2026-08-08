import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { TaperingStep } from "@/types";

// usage check: They are NOT used in the file.


// Types for prescription templates

export interface MedicineTemplateItem {
    medicine_id?: string;
    medicine_name: string;
    generic_name?: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    applicable_eye?: "LEFT" | "RIGHT" | "BOTH" | "NA" | null;
    tapering_steps?: TaperingStep[];
}

export interface AdviceTemplateItem {
    advice_type: string;
    description: string;
    notes?: string;
}

export interface PrescriptionTemplate {
    id: string;
    tenant_id: string;
    doctor_id: string;
    name: string;
    description?: string;
    category?: string;
    diagnosis?: string;
    plan_of_action?: string;
    followup_days?: number;
    remarks?: string;
    lens_type?: string;
    vision_type?: string;
    lens_material?: string;
    coatings?: string[];
    medicine_items?: MedicineTemplateItem[];
    advice_items?: AdviceTemplateItem[];
    is_public: boolean;
    usage_count: number;
    created_at: string;
    updated_at: string;
    created_by?: string;
}

export interface PrescriptionTemplateListItem {
    id: string;
    name: string;
    description?: string;
    category?: string;
    is_public: boolean;
    is_owner: boolean;
    usage_count: number;
    medicine_count: number;
    advice_count: number;
    created_at: string;
    doctor_name: string;
}

export interface CreatePrescriptionTemplateRequest {
    name: string;
    description?: string;
    category?: string;
    diagnosis?: string;
    plan_of_action?: string;
    followup_days?: number;
    remarks?: string;
    lens_type?: string;
    vision_type?: string;
    lens_material?: string;
    coatings?: string[];
    medicine_items?: MedicineTemplateItem[];
    advice_items?: AdviceTemplateItem[];
    is_public?: boolean;
}

export interface UpdatePrescriptionTemplateRequest {
    name?: string;
    description?: string;
    category?: string;
    diagnosis?: string;
    plan_of_action?: string;
    followup_days?: number;
    remarks?: string;
    lens_type?: string;
    vision_type?: string;
    lens_material?: string;
    coatings?: string[];
    medicine_items?: MedicineTemplateItem[];
    advice_items?: AdviceTemplateItem[];
    is_public?: boolean;
}

export interface PrescriptionTemplateListParams {
    doctor_id?: string;
    include_public?: boolean;
    category?: string;
    search?: string;
    page?: number;
    page_size?: number;
}

export interface PrescriptionTemplateListResponse {
    items: PrescriptionTemplateListItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export const prescriptionTemplatesApi = {
    async create(data: CreatePrescriptionTemplateRequest, tenantId?: string): Promise<PrescriptionTemplate> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.post<PrescriptionTemplate>("/prescription-templates", data, { params });
        return response.data;
    },

    async list(params?: PrescriptionTemplateListParams): Promise<PrescriptionTemplateListResponse> {
        const queryParams = new URLSearchParams();

        if (params?.doctor_id) queryParams.append("doctor_id", params.doctor_id);
        if (params?.include_public !== undefined) queryParams.append("include_public", params.include_public.toString());
        if (params?.category) queryParams.append("category", params.category);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

        const apiTenantId = getTenantIdForApi();
        if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

        const queryString = queryParams.toString();
        const url = `/prescription-templates${queryString ? `?${queryString}` : ""}`;

        const response = await apiClient.get<PrescriptionTemplateListResponse>(url);
        return response.data;
    },

    async getById(id: string, tenantId?: string): Promise<PrescriptionTemplate> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.get<PrescriptionTemplate>(`/prescription-templates/${id}`, { params });
        return response.data;
    },

    async update(id: string, data: UpdatePrescriptionTemplateRequest, tenantId?: string): Promise<PrescriptionTemplate> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.put<PrescriptionTemplate>(`/prescription-templates/${id}`, data, { params });
        return response.data;
    },

    async delete(id: string, tenantId?: string): Promise<void> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        await apiClient.delete(`/prescription-templates/${id}`, { params });
    },

    async apply(id: string, tenantId?: string): Promise<{ message: string; usage_count: number }> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.post<{ message: string; usage_count: number }>(
            `/prescription-templates/${id}/apply`,
            {},
            { params }
        );
        return response.data;
    },
};
