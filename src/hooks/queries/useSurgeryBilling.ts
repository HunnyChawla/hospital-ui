import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { surgeryBillingApi } from "@/services/surgeryBillingApi";
import { paymentsApi, PaymentMethod, CreatePaymentRequest } from "@/services/paymentsApi";
import { plannedSurgeryKeys } from "./usePlannedSurgeries";
import { useTenantContext } from "@/lib/tenant-context";
import { toast } from "sonner";
import { createMutationErrorHandler } from "@/utils/errorHandler";
import type {
  CollectSurgeryAdvanceRequest,
  GenerateSurgeryInvoiceRequest,
} from "@/types";

export const surgeryBillingKeys = {
  all: ["surgery-billing"] as const,
  summaries: () => [...surgeryBillingKeys.all, "summary"] as const,
  summary: (surgeryId: string) => [...surgeryBillingKeys.summaries(), surgeryId] as const,
  payments: (surgeryId: string) => [...surgeryBillingKeys.all, "payments", surgeryId] as const,
  invoice: (surgeryId: string) => [...surgeryBillingKeys.all, "invoice", surgeryId] as const,
};

export function useSurgeryPaymentSummary(surgeryId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: surgeryBillingKeys.summary(surgeryId!),
    queryFn: async () => {
      return await surgeryBillingApi.getPaymentSummary(
        surgeryId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!surgeryId,
  });
}

export function useSurgeryPayments(surgeryId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: surgeryBillingKeys.payments(surgeryId!),
    queryFn: async () => {
      return await surgeryBillingApi.listPayments(
        surgeryId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!surgeryId,
  });
}

export function useSurgeryInvoice(surgeryId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: surgeryBillingKeys.invoice(surgeryId!),
    queryFn: async () => {
      return await surgeryBillingApi.getSurgeryInvoice(
        surgeryId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!surgeryId,
  });
}

export function useCollectSurgeryAdvance() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      surgeryId,
      payload,
    }: {
      surgeryId: string;
      payload: CollectSurgeryAdvanceRequest;
    }) => {
      return await surgeryBillingApi.collectAdvance(
        surgeryId,
        payload,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (_, variables) => {
      toast.success("Surgery advance payment collected successfully");
      queryClient.invalidateQueries({ queryKey: surgeryBillingKeys.summary(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: surgeryBillingKeys.payments(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.detail(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.lists() });
    },
    onError: createMutationErrorHandler("collecting surgery advance payment"),
  });
}

export function useGenerateSurgeryInvoice() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      surgeryId,
      payload,
    }: {
      surgeryId: string;
      payload: GenerateSurgeryInvoiceRequest;
    }) => {
      return await surgeryBillingApi.generateInvoice(
        surgeryId,
        payload,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (_, variables) => {
      toast.success("Surgery invoice generated successfully");
      queryClient.invalidateQueries({ queryKey: surgeryBillingKeys.summary(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: surgeryBillingKeys.invoice(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.detail(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.lists() });
    },
    onError: createMutationErrorHandler("generating surgery invoice"),
  });
}

export function useCollectSurgeryBalance() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      surgeryId,
      invoiceId,
      payload,
    }: {
      surgeryId: string;
      invoiceId: string;
      payload: CreatePaymentRequest;
    }) => {
      return await surgeryBillingApi.collectBalancePayment(
        surgeryId,
        invoiceId,
        payload,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (_, variables) => {
      toast.success("Surgery balance payment collected successfully");
      queryClient.invalidateQueries({ queryKey: surgeryBillingKeys.summary(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: surgeryBillingKeys.payments(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: surgeryBillingKeys.invoice(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.detail(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.lists() });
    },
    onError: createMutationErrorHandler("collecting surgery balance payment"),
  });
}

export function useRefundSurgeryPayment() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      surgeryId,
      paymentId,
      payload,
    }: {
      surgeryId: string;
      paymentId: string;
      payload: {
        refund_amount: number;
        refund_method: PaymentMethod;
        refund_reference?: string | null;
        reason: string;
        notes?: string | null;
      };
    }) => {
      return await paymentsApi.createRefund(
        paymentId,
        payload,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (_, variables) => {
      toast.success("Refund processed successfully");
      queryClient.invalidateQueries({ queryKey: surgeryBillingKeys.summary(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: surgeryBillingKeys.payments(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.detail(variables.surgeryId) });
      queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.lists() });
    },
    onError: createMutationErrorHandler("processing surgery payment refund"),
  });
}
