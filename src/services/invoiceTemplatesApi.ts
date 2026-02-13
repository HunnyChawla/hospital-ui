import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

// Types
export interface TemplateLineItem {
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    discount_type: "percentage" | "amount";
}

export interface InvoiceTemplate {
    id: string;
    tenant_id: string;
    name: string;
    description?: string;
    line_items: TemplateLineItem[];
    tax_rate: number;
    discount: number;
    notes?: string;
    is_active: boolean;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateTemplateRequest {
    name: string;
    description?: string;
    line_items: TemplateLineItem[];
    tax_rate: number;
    discount: number;
    notes?: string;
}

export interface UpdateTemplateRequest {
    name: string;
    description?: string;
    line_items: TemplateLineItem[];
    tax_rate: number;
    discount: number;
    notes?: string;
}

export interface ListTemplatesParams {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
}

export interface ListTemplatesResponse {
    items: InvoiceTemplate[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

// API Functions

/**
 * List all invoice templates with optional pagination and filtering
 */
export const listTemplates = async (
    params: ListTemplatesParams = {}
): Promise<ListTemplatesResponse> => {
    const tenantId = getTenantIdForApi();
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.is_active !== undefined) queryParams.append("is_active", params.is_active.toString());
    if (tenantId) queryParams.append("tenant_id", tenantId);

    const response = await apiClient.get<ListTemplatesResponse>(
        `/invoice-templates?${queryParams.toString()}`
    );
    return response.data;
};

/**
 * Get a single invoice template by ID
 */
export const getTemplateById = async (id: string): Promise<InvoiceTemplate> => {
    const tenantId = getTenantIdForApi();
    const queryParams = new URLSearchParams();
    if (tenantId) queryParams.append("tenant_id", tenantId);

    const response = await apiClient.get<InvoiceTemplate>(
        `/invoice-templates/${id}?${queryParams.toString()}`
    );
    return response.data;
};

/**
 * Create a new invoice template
 */
export const createTemplate = async (
    data: CreateTemplateRequest
): Promise<InvoiceTemplate> => {
    const tenantId = getTenantIdForApi();
    const queryParams = new URLSearchParams();
    if (tenantId) queryParams.append("tenant_id", tenantId);

    const response = await apiClient.post<InvoiceTemplate>(
        `/invoice-templates?${queryParams.toString()}`,
        data
    );
    return response.data;
};

/**
 * Update an existing invoice template
 */
export const updateTemplate = async (
    id: string,
    data: UpdateTemplateRequest
): Promise<InvoiceTemplate> => {
    const tenantId = getTenantIdForApi();
    const queryParams = new URLSearchParams();
    if (tenantId) queryParams.append("tenant_id", tenantId);

    const response = await apiClient.put<InvoiceTemplate>(
        `/invoice-templates/${id}?${queryParams.toString()}`,
        data
    );
    return response.data;
};

/**
 * Delete an invoice template (soft delete by default, hard delete if permanent=true)
 */
export const deleteTemplate = async (
    id: string,
    permanent: boolean = false
): Promise<void> => {
    const tenantId = getTenantIdForApi();
    const queryParams = new URLSearchParams();
    if (tenantId) queryParams.append("tenant_id", tenantId);
    if (permanent) queryParams.append("permanent", "true");

    await apiClient.delete(`/invoice-templates/${id}?${queryParams.toString()}`);
};
