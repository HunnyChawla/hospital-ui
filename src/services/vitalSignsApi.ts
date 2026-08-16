import { apiClient } from "./api";
import { VitalSigns, VitalSignsTrend } from "@/types";
import { getTenantIdForApi } from "@/utils/auth";

export interface CreateVitalSignsRequest {
  patient_id: string;
  /** OPD visit this reading was taken during; ties it to the encounter. */
  visit_id?: string | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  pulse_rate?: number | null;
  temperature?: number | null;
  spo2?: number | null;
  respiratory_rate?: number | null;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  notes?: string | null;
  recorded_at?: string; // ISO datetime, defaults to now if not provided
}

export interface UpdateVitalSignsRequest {
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  pulse_rate?: number | null;
  temperature?: number | null;
  spo2?: number | null;
  respiratory_rate?: number | null;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  notes?: string | null;
}

export interface VitalSignsListParams {
  patient_id: string;
  visit_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface VitalSignsListResponse {
  items: VitalSigns[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface VitalSignsTrendsParams {
  patient_id: string;
  days?: number; // Default 7, max 90
}

export const vitalSignsApi = {
  /**
   * Create a new vital signs record
   */
  async create(
    data: CreateVitalSignsRequest,
    tenantId?: string
  ): Promise<VitalSigns> {
    const params = getTenantIdForApi(tenantId)
      ? { tenant_id: getTenantIdForApi(tenantId) }
      : {};

    const response = await apiClient.post<VitalSigns>(
      "/vital-signs",
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Get vital signs list for a patient
   */
  async list(
    params: VitalSignsListParams,
    tenantId?: string
  ): Promise<VitalSignsListResponse> {
    const apiParams = {
      ...params,
      ...(getTenantIdForApi(tenantId)
        ? { tenant_id: getTenantIdForApi(tenantId) }
        : {}),
    };

    const response = await apiClient.get<VitalSignsListResponse>(
      "/vital-signs",
      { params: apiParams }
    );
    return response.data;
  },

  /**
   * Get a single vital signs record by ID
   */
  async getById(id: string, tenantId?: string): Promise<VitalSigns> {
    const params = getTenantIdForApi(tenantId)
      ? { tenant_id: getTenantIdForApi(tenantId) }
      : {};

    const response = await apiClient.get<VitalSigns>(
      `/vital-signs/${id}`,
      { params }
    );
    return response.data;
  },

  /**
   * Update a vital signs record
   */
  async update(
    id: string,
    data: UpdateVitalSignsRequest,
    tenantId?: string
  ): Promise<VitalSigns> {
    const params = getTenantIdForApi(tenantId)
      ? { tenant_id: getTenantIdForApi(tenantId) }
      : {};

    const response = await apiClient.put<VitalSigns>(
      `/vital-signs/${id}`,
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Delete a vital signs record
   */
  async delete(id: string, tenantId?: string): Promise<void> {
    const params = getTenantIdForApi(tenantId)
      ? { tenant_id: getTenantIdForApi(tenantId) }
      : {};

    await apiClient.delete(`/vital-signs/${id}`, { params });
  },

  /**
   * Get vital signs trends for charting
   */
  async getTrends(
    params: VitalSignsTrendsParams,
    tenantId?: string
  ): Promise<VitalSignsTrend[]> {
    const apiParams = {
      ...params,
      ...(getTenantIdForApi(tenantId)
        ? { tenant_id: getTenantIdForApi(tenantId) }
        : {}),
    };

    const response = await apiClient.get<VitalSignsTrend[]>(
      "/vital-signs/trends",
      { params: apiParams }
    );
    return response.data;
  },

  /**
   * Get latest vital signs for a patient
   */
  async getLatest(
    patientId: string,
    tenantId?: string
  ): Promise<VitalSigns | null> {
    const result = await this.list(
      { patient_id: patientId, page: 1, page_size: 1 },
      tenantId
    );
    return result.items[0] || null;
  },
};
