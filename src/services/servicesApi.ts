import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  category: string;
  price: string; // String format, e.g. "350.00"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServicesSearchParams {
  page?: number;
  page_size?: number;
  is_active?: boolean;
  search?: string;
  tenant_id?: string; // PlatformOwner only
}

export interface ServicesSearchResponse {
  items: Service[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const servicesApi = {
  async list(params?: ServicesSearchParams): Promise<ServicesSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.is_active !== undefined) queryParams.append("is_active", params.is_active.toString());
    if (params?.search) queryParams.append("search", params.search);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);
    
    const queryString = queryParams.toString();
    const url = `/services${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<ServicesSearchResponse>(url);
    return response.data;
  },
};
