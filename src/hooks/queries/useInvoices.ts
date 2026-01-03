import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  invoicesApi,
  Invoice,
  CreateInvoiceRequest,
  InvoicesSearchParams
} from '@/services/invoicesApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';

/**
 * Query Keys Factory for Invoices
 */
export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params: InvoicesSearchParams) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

/**
 * Fetch all invoices with optional filters
 */
export function useInvoices(params?: InvoicesSearchParams) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: invoiceKeys.list(params || {}),
    queryFn: async () => {
      return await invoicesApi.list({
        ...params,
        tenant_id: isPlatformOwner ? ((params?.tenant_id || tenantId) ?? undefined) : undefined,
      });
    },
  });
}

/**
 * Fetch single invoice by ID
 */
export function useInvoice(invoiceId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: invoiceKeys.detail(invoiceId!),
    queryFn: async () => {
      return await invoicesApi.getById(
        invoiceId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!invoiceId,
  });
}

/**
 * Create new invoice
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (data: CreateInvoiceRequest) => {
      return await invoicesApi.create(
        data,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onMutate: async (newInvoice) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceKeys.lists() });

      // Snapshot previous value
      const previousInvoices = queryClient.getQueriesData({ queryKey: invoiceKeys.lists() });

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: invoiceKeys.lists() },
        (old: any) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: [{ ...newInvoice, id: 'temp-id' } as Invoice, ...old.items],
            total: old.total + 1,
          };
        }
      );

      return { previousInvoices };
    },
    onError: (err, newInvoice, context) => {
      // Rollback on error
      if (context?.previousInvoices) {
        context.previousInvoices.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to create invoice';
      toast.error(errorMessage);
    },
    onSuccess: () => {
      toast.success('Invoice created successfully');
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}
