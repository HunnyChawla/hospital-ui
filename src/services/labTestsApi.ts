import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface LabTest {
  id: string;
  tenant_id: string;
  test_code: string;
  test_name: string;
  description: string | null;
  category: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLabTestRequest {
  test_code: string;
  test_name: string;
  description?: string;
  category: string;
  price: number;
}

export interface UpdateLabTestRequest {
  test_name?: string;
  description?: string;
  category?: string;
  price?: number;
  is_active?: boolean;
}

export interface LabTestsSearchParams {
  page?: number;
  page_size?: number;
  category?: string;
  is_active?: boolean;
  search?: string;
  patient_id?: string;
  tenant_id?: string; // PlatformOwner only
}

export interface LabTestsSearchResponse {
  items: LabTest[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const labTestsApi = {
  async create(test: CreateLabTestRequest, tenantId?: string): Promise<LabTest> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<LabTest>("/lab-tests", test, { params });
    return response.data;
  },

  async list(params?: LabTestsSearchParams): Promise<LabTestsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.category) queryParams.append("category", params.category);
    if (params?.is_active !== undefined) queryParams.append("is_active", params.is_active.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);
    
    const queryString = queryParams.toString();
    const url = `/lab-tests${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<LabTestsSearchResponse>(url);
    return response.data;
  },

  async getById(testId: string, tenantId?: string): Promise<LabTest> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<LabTest>(`/lab-tests/${testId}`, { params });
    return response.data;
  },

  async update(testId: string, updates: UpdateLabTestRequest, tenantId?: string): Promise<LabTest> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<LabTest>(`/lab-tests/${testId}`, updates, { params });
    return response.data;
  },
};

