import { apiClient } from "./api";

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: "active" | "inactive" | "suspended";
  plan: "basic" | "standard" | "premium" | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  email: string | null;
  website: string | null;
  phone_no: string | null;
  logo: string | null;
  created_at: string;
  updated_at: string;
}

export const tenantsApi = {
  async getById(tenantId: string): Promise<Tenant> {
    const response = await apiClient.get<Tenant>(`/tenants/${tenantId}`);
    return response.data;
  },

  async getLogo(tenantId: string): Promise<Blob> {
    const response = await apiClient.get(`/tenants/${tenantId}/logo`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

