import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { DrugAllergyRecord } from "@/types";

// Request types
export interface CreateDrugAllergyRequest {
  patient_id: string;
  drug_name: string;
  reaction: string;
  severity: "mild" | "moderate" | "severe";
  notes: string | null;
}

// Search/List params and response
export interface DrugAllergySearchParams {
  patient_id?: string;
  page?: number;
  page_size?: number;
  tenant_id?: string;
}

export interface DrugAllergySearchResponse {
  items: DrugAllergyRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const drugAllergyApi = {
  async create(data: CreateDrugAllergyRequest, tenantId?: string): Promise<DrugAllergyRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<DrugAllergyRecord>("/drug-allergies", data, { params });
    return response.data;
  },

  async list(params?: DrugAllergySearchParams): Promise<DrugAllergySearchResponse> {
    const queryParams = new URLSearchParams();

    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/drug-allergies${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<DrugAllergySearchResponse>(url);
    return response.data;
  },

  async delete(id: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/drug-allergies/${id}`, { params });
  },
};
