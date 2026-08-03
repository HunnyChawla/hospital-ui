import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { Invoice } from "./invoicesApi";
import type { CreatePaymentRequest } from "./paymentsApi";
import type {
  CollectSurgeryAdvanceRequest,
  GenerateSurgeryInvoiceRequest,
  SurgeryPaymentEntry,
  SurgeryPaymentSummary,
} from "@/types";

export type CollectBalanceRequest = CreatePaymentRequest;

export const surgeryBillingApi = {
  collectAdvance: async (surgeryId: string, payload: CollectSurgeryAdvanceRequest, tenantId?: string) => {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.post<SurgeryPaymentEntry>(
      `/planned-surgeries/${surgeryId}/billing/advance`,
      payload,
      { params }
    );
    return data;
  },

  generateInvoice: async (surgeryId: string, payload: GenerateSurgeryInvoiceRequest, tenantId?: string) => {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.post<Invoice>(
      `/planned-surgeries/${surgeryId}/billing/invoice`,
      payload,
      { params }
    );
    return data;
  },

  collectBalancePayment: async (
    surgeryId: string,
    invoiceId: string,
    payload: CollectBalanceRequest,
    tenantId?: string
  ) => {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.post<SurgeryPaymentEntry>(
      `/planned-surgeries/${surgeryId}/billing/invoice/${invoiceId}/payment`,
      payload,
      { params }
    );
    return data;
  },

  getSurgeryInvoice: async (surgeryId: string, tenantId?: string) => {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.get<Invoice | null>(
      `/planned-surgeries/${surgeryId}/billing/invoice`,
      { params }
    );
    return data;
  },

  getPaymentSummary: async (surgeryId: string, tenantId?: string) => {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.get<SurgeryPaymentSummary>(
      `/planned-surgeries/${surgeryId}/billing/summary`,
      { params }
    );
    return data;
  },

  listPayments: async (surgeryId: string, tenantId?: string) => {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.get<SurgeryPaymentEntry[]>(
      `/planned-surgeries/${surgeryId}/billing/payments`,
      { params }
    );
    return data;
  },
};
