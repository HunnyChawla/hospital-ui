import { apiClient } from "./api";
import { getTenantIdForApi } from "../utils/auth";

export type VisitStatus =
  | "checked_in"
  | "in_consultation"
  | "completed"
  | "cancelled"
  | "no_show"
  // New detailed workflow statuses
  | "checked_in_opd"
  | "awaiting_optometrist"
  | "optometrist_assigned"
  | "optometrist_investigation_in_progress"
  | "optometrist_investigation_completed"
  | "awaiting_doctor"
  | "doctor_assigned"
  | "consultation_in_progress"
  | "dilation_in_progress"
  | "dilation_completed"
  | "consultation_completed";
export type VisitType = "walk_in" | "appointment" | "emergency";
export type PaymentMethod = "cash" | "upi" | "card" | "cheque";

export interface Visit {
  id: string;
  tenant_id: string;
  patient_id: string;
  patient_name?: string;
  patient_mobile?: string;
  doctor_id: string | null;
  visit_type: VisitType;
  visit_number: string;
  status: VisitStatus;
  appointment_id: string | null;
  token_number: number | null;
  chief_complaint: string | null;
  notes: string | null;
  checked_in_at: string | null;
  consultation_started_at: string | null;
  consultation_ended_at: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  optometrist_id?: string | null;
  optometrist_name?: string | null;
  optometrist_investigation_completed_at?: string | null;
  dilation_started_at?: string | null;
  dilation_duration_minutes?: number | null;
  dilation_completed_at?: string | null;
}

export interface CreateVisitRequest {
  patient_id: string;
  doctor_id?: string | null;
  visit_type: VisitType;
  appointment_id?: string | null;
  chief_complaint?: string | null;
  notes?: string | null;
  payment_method: PaymentMethod;
  payment_reference?: string | null;
  consultation_fee?: number | null;
  consultation_fee_override?: number | null;
}

export type SortField = "token_number" | "visit_date" | "created_at" | "checked_in_at" | "visit_number" | "status" | "visit_type";
export type SortOrder = "asc" | "desc";

export interface OpdVisitsSearchParams {
  page?: number;
  page_size?: number;
  sort_by?: SortField;
  sort_order?: SortOrder;
  patient_id?: string;
  doctor_id?: string;
  status?: VisitStatus;
  visit_type?: VisitType;
  visit_date?: string; // YYYY-MM-DD (kept for backward compatibility)
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  tenant_id?: string;
}

export interface OpdVisitsSearchResponse {
  items: Visit[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CompleteAndAdvanceResponse {
  completed_visit: Visit;
  next_visit_advanced: Visit | null;
  message: string;
}

export const opdVisitsApi = {
  async create(visit: CreateVisitRequest, tenantId?: string): Promise<Visit> {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await apiClient.post<Visit>("/opd/visits", visit, { params });
    return response.data;
  },

  async getById(visitId: string, tenantId?: string): Promise<Visit> {
    const effectiveTenantId = getTenantIdForApi(tenantId);
    const params = effectiveTenantId ? { tenant_id: effectiveTenantId } : {};
    const response = await apiClient.get<Visit>(`/opd/visits/${visitId}`, { params });
    return response.data;
  },

  async updateStatus(
    visitId: string,
    newStatus: VisitStatus,
    tenantId?: string
  ): Promise<Visit> {
    const params: Record<string, string> = { new_status: newStatus };
    if (tenantId) {
      params.tenant_id = tenantId;
    }
    const response = await apiClient.patch<Visit>(
      `/opd/visits/${visitId}/status`,
      {},
      { params }
    );
    return response.data;
  },

  async markNoShow(visitId: string, tenantId?: string): Promise<Visit> {
    const effectiveTenantId = getTenantIdForApi(tenantId);
    const params = effectiveTenantId ? { params: { tenant_id: effectiveTenantId } } : undefined;
    const response = await apiClient.post<Visit>(
      `/opd/eye-hospital/visits/${visitId}/mark-no-show`,
      {},
      params
    );
    return response.data;
  },

  async completeAndAdvance(
    visitId: string,
    tenantId?: string
  ): Promise<CompleteAndAdvanceResponse> {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await apiClient.post<CompleteAndAdvanceResponse>(
      `/opd/visits/${visitId}/complete-and-advance`,
      {},
      { params }
    );
    return response.data;
  },

  async list(params?: OpdVisitsSearchParams): Promise<OpdVisitsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.doctor_id) queryParams.append("doctor_id", params.doctor_id);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.visit_type) queryParams.append("visit_type", params.visit_type);

    // Use start_date and end_date if provided, otherwise fall back to visit_date
    if (params?.start_date && params?.end_date) {
      queryParams.append("start_date", params.start_date);
      queryParams.append("end_date", params.end_date);
    } else if (params?.visit_date) {
      queryParams.append("visit_date", params.visit_date);
    }

    if (params?.tenant_id) queryParams.append("tenant_id", params.tenant_id);

    const queryString = queryParams.toString();
    const url = `/opd/visits${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<OpdVisitsSearchResponse>(url);
    return response.data;
  },

  async completeDilation(visitId: string, tenantId?: string): Promise<Visit> {
    const effectiveTenantId = getTenantIdForApi(tenantId);
    const params = effectiveTenantId ? { tenant_id: effectiveTenantId } : {};
    const response = await apiClient.post<Visit>(
      `/opd/eye-hospital/visits/${visitId}/complete-dilation`,
      {},
      { params }
    );
    return response.data;
  },
};

