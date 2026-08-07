import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type {
    PrintDocumentType,
    PrintLayoutConfig,
    PrintLayoutResponse,
} from "@/types/printLayout";

/**
 * Per-tenant print/letterhead layout configuration.
 *
 * Reads are permitted for any authenticated user (a layout is required in order
 * to render any printable document); writes are Admin/PlatformOwner only.
 */
export const printLayoutApi = {
    /** Get the layout for a document type. Falls back to server-side defaults. */
    async get(
        documentType: PrintDocumentType,
        tenantId?: string
    ): Promise<PrintLayoutResponse> {
        const effectiveTenantId = getTenantIdForApi(tenantId);
        const params = effectiveTenantId ? { tenant_id: effectiveTenantId } : {};
        const response = await apiClient.get<PrintLayoutResponse>(
            `/print-layouts/${documentType}`,
            { params }
        );
        return response.data;
    },

    /** List every stored layout for the tenant (unconfigured types are omitted). */
    async list(tenantId?: string): Promise<PrintLayoutResponse[]> {
        const effectiveTenantId = getTenantIdForApi(tenantId);
        const params = effectiveTenantId ? { tenant_id: effectiveTenantId } : {};
        const response = await apiClient.get<PrintLayoutResponse[]>("/print-layouts", {
            params,
        });
        return response.data;
    },

    /** Create or replace the hospital-wide layout for a document type. */
    async set(
        documentType: PrintDocumentType,
        config: PrintLayoutConfig,
        tenantId?: string
    ): Promise<PrintLayoutResponse> {
        const effectiveTenantId = getTenantIdForApi(tenantId);
        const params = effectiveTenantId ? { tenant_id: effectiveTenantId } : {};
        const response = await apiClient.put<PrintLayoutResponse>(
            `/print-layouts/${documentType}`,
            { config },
            { params }
        );
        return response.data;
    },

    /** Delete the stored layout, reverting the hospital to built-in defaults. */
    async remove(documentType: PrintDocumentType, tenantId?: string): Promise<void> {
        const effectiveTenantId = getTenantIdForApi(tenantId);
        const params = effectiveTenantId ? { tenant_id: effectiveTenantId } : {};
        await apiClient.delete(`/print-layouts/${documentType}`, { params });
    },
};
