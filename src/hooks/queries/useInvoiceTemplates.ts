import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    listTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    InvoiceTemplate,
    CreateTemplateRequest,
    UpdateTemplateRequest,
    ListTemplatesParams,
} from '@/services/invoiceTemplatesApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';

/**
 * Query Keys Factory for Invoice Templates
 */
export const invoiceTemplateKeys = {
    all: ['invoice-templates'] as const,
    lists: () => [...invoiceTemplateKeys.all, 'list'] as const,
    list: (params: ListTemplatesParams) => [...invoiceTemplateKeys.lists(), params] as const,
    details: () => [...invoiceTemplateKeys.all, 'detail'] as const,
    detail: (id: string) => [...invoiceTemplateKeys.details(), id] as const,
};

/**
 * Fetch all invoice templates with optional filters and pagination
 */
export function useInvoiceTemplates(params?: ListTemplatesParams) {
    return useQuery({
        queryKey: invoiceTemplateKeys.list(params || {}),
        queryFn: async () => {
            return await listTemplates(params || {});
        },
    });
}

/**
 * Fetch single invoice template by ID
 */
export function useInvoiceTemplate(id: string | null) {
    return useQuery({
        queryKey: invoiceTemplateKeys.detail(id || ''),
        queryFn: async () => {
            if (!id) throw new Error('Template ID is required');
            return await getTemplateById(id);
        },
        enabled: !!id,
    });
}

/**
 * Create a new invoice template
 */
export function useCreateTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateTemplateRequest) => {
            return await createTemplate(data);
        },
        onSuccess: (data) => {
            // Invalidate template lists to refetch
            queryClient.invalidateQueries({ queryKey: invoiceTemplateKeys.lists() });
            toast.success('Template created successfully');
        },
        onError: (error: any) => {
            const errorMessage =
                error?.response?.data?.detail ||
                error?.message ||
                'Failed to create template';
            toast.error(errorMessage);
        },
    });
}

/**
 * Update an existing invoice template
 */
export function useUpdateTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: string; data: UpdateTemplateRequest }) => {
            return await updateTemplate(params.id, params.data);
        },
        onSuccess: (data) => {
            // Invalidate both list and detail queries
            queryClient.invalidateQueries({ queryKey: invoiceTemplateKeys.lists() });
            queryClient.invalidateQueries({ queryKey: invoiceTemplateKeys.detail(data.id) });
            toast.success('Template updated successfully');
        },
        onError: (error: any) => {
            const errorMessage =
                error?.response?.data?.detail ||
                error?.message ||
                'Failed to update template';
            toast.error(errorMessage);
        },
    });
}

/**
 * Delete an invoice template
 */
export function useDeleteTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: string; permanent?: boolean }) => {
            return await deleteTemplate(params.id, params.permanent || false);
        },
        onSuccess: (_, variables) => {
            // Invalidate template lists
            queryClient.invalidateQueries({ queryKey: invoiceTemplateKeys.lists() });
            // Remove detail from cache
            queryClient.removeQueries({ queryKey: invoiceTemplateKeys.detail(variables.id) });
            toast.success(
                variables.permanent ? 'Template permanently deleted' : 'Template archived'
            );
        },
        onError: (error: any) => {
            const errorMessage =
                error?.response?.data?.detail ||
                error?.message ||
                'Failed to delete template';
            toast.error(errorMessage);
        },
    });
}
