import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type BedStatus = "available" | "occupied" | "maintenance" | "reserved";
export type BedType = "general" | "private" | "semi_private" | "icu" | "ccu" | "nicu" | "picu" | "hdu" | "isolation";

export interface Bed {
  id: string;
  tenant_id: string;
  ward_id: string;
  ward_name: string | null; // Populated in responses
  bed_number: string;
  bed_type: BedType;
  status: BedStatus;
  daily_rate: string; // String pattern for decimal
  is_active: boolean;
  occupied_by_patient_name?: string | null; // Patient name when bed is occupied
  occupied_by_patient_mobile?: string | null; // Patient mobile when bed is occupied
  created_at: string;
  updated_at: string;
}

export interface CreateBedRequest {
  ward_id: string;
  bed_number: string;
  bed_type: BedType;
  daily_rate: number | string; // Can be number or string pattern
}

export interface UpdateBedRequest {
  ward_id?: string;
  bed_number?: string;
  bed_type?: BedType;
  status?: BedStatus;
  daily_rate?: number | string;
  is_active?: boolean;
}

export interface BedsSearchParams {
  page?: number;
  page_size?: number;
  ward_id?: string;
  status?: BedStatus;
  bed_type?: BedType;
  search?: string; // Search parameter for bed number
  tenant_id?: string;
}

export interface BedTypesResponse {
  bed_types: BedType[];
}

export interface BedsSearchResponse {
  items: Bed[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AddBulkBedsRequest {
  ward_id: string;
  number_of_beds: number;
  bed_type: BedType;
  daily_rate: number | string;
}

export interface AddBulkBedsResponse {
  beds: Bed[];
  total_created: number;
}

export const bedsApi = {
  async create(bed: CreateBedRequest, tenantId?: string): Promise<Bed> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<Bed>("/beds", bed, { params });
    return response.data;
  },

  async list(params?: BedsSearchParams): Promise<BedsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.ward_id) queryParams.append("ward_id", params.ward_id);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.bed_type) queryParams.append("bed_type", params.bed_type);
    if (params?.search) queryParams.append("search", params.search);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/beds${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<BedsSearchResponse>(url);
    return response.data;
  },

  async getById(bedId: string, tenantId?: string): Promise<Bed> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<Bed>(`/beds/${bedId}`, { params });
    return response.data;
  },

  async update(bedId: string, updates: UpdateBedRequest, tenantId?: string): Promise<Bed> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<Bed>(`/beds/${bedId}`, updates, { params });
    return response.data;
  },

  async delete(bedId: string, tenantId?: string): Promise<void> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    await apiClient.delete(`/beds/${bedId}`, { params });
  },

  async addBulk(bulkData: AddBulkBedsRequest, tenantId?: string): Promise<AddBulkBedsResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<AddBulkBedsResponse>("/beds/add-bulk", bulkData, { params });
    return response.data;
  },

  async getBedTypes(tenantId?: string): Promise<BedTypesResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<BedTypesResponse>("/beds/bed-types", { params });
    return response.data;
  },
};
