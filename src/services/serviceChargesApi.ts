import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type ServiceChargeStatus = "ACTIVE" | "CANCELLED" | "PENDING";

export interface ServiceCharge {
  charge_id: string;
  tenant_id: string;
  admission_id: string;
  service_id: string;
  service_name: string;
  service_category: string;
  quantity: number;
  unit_price: string;
  total_amount: string;
  performed_at: string;
  status: ServiceChargeStatus;
  created_by: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceChargeRequest {
  service_id: string;
  quantity: number;
  discount: number;
}

export const serviceChargesApi = {
  async list(admissionId: string, tenantId?: string): Promise<ServiceCharge[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<ServiceCharge[]>(
      `/admissions/${admissionId}/charges`,
      { params }
    );
    return response.data;
  },

  async create(
    admissionId: string,
    charge: CreateServiceChargeRequest,
    tenantId?: string
  ): Promise<ServiceCharge> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<ServiceCharge>(
      `/admissions/${admissionId}/charges`,
      charge,
      { params }
    );
    return response.data;
  },

  async cancel(chargeId: string, tenantId?: string): Promise<ServiceCharge> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<ServiceCharge>(
      `/admission-charges/${chargeId}/cancel`,
      {},
      { params }
    );
    return response.data;
  },
};
