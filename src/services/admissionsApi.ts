import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type AdmissionStatus = "admitted" | "discharged" | "transferred" | "deceased" | "cancelled";
export type AdmissionType = "emergency" | "planned" | "transfer" | "day_care";
export type DischargeType = "normal" | "ama" | "transfer" | "deceased" | "lama";

export interface Admission {
  id: string;
  tenant_id: string;
  patient_id: string;
  patient_name: string | null; // Populated in responses
  doctor_id: string;
  doctor_name: string | null; // Populated in responses
  bed_id: string;
  bed_number: string | null; // Populated in responses
  ward_name: string | null; // Populated in responses
  admission_number: string;
  admission_date: string; // YYYY-MM-DD
  admission_time: string; // date-time format
  admission_type: AdmissionType;
  status: AdmissionStatus;
  reason_for_admission: string | null;
  diagnosis: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  next_of_kin_name: string | null;
  next_of_kin_relation: string | null;
  next_of_kin_contact: string | null;
  visit_id: string | null; // OPD visit ID
  discharge_date: string | null; // YYYY-MM-DD
  discharge_time: string | null; // date-time format
  discharge_type: DischargeType | null;
  discharge_summary: string | null;
  discharge_instructions: string | null;
  final_diagnosis: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAdmissionRequest {
  patient_id: string;
  doctor_id: string;
  bed_id: string;
  admission_date: string; // YYYY-MM-DD
  admission_type: AdmissionType;
  reason_for_admission?: string | null;
  diagnosis?: string | null;
  insurance_provider?: string | null;
  insurance_policy_number?: string | null;
  next_of_kin_name?: string | null;
  next_of_kin_relation?: string | null;
  next_of_kin_contact?: string | null;
  visit_id?: string | null; // OPD visit ID
}

export interface UpdateAdmissionRequest {
  doctor_id?: string | null;
  reason_for_admission?: string | null;
  diagnosis?: string | null;
  insurance_provider?: string | null;
  insurance_policy_number?: string | null;
  next_of_kin_name?: string | null;
  next_of_kin_relation?: string | null;
  next_of_kin_contact?: string | null;
}

export interface DischargeRequest {
  discharge_date: string; // YYYY-MM-DD
  discharge_type: DischargeType;
  discharge_summary?: string | null;
  discharge_instructions?: string | null;
  final_diagnosis?: string | null;
  create_invoice?: boolean; // Default: true
  payment_method?: string | null; // cash/upi
  payment_reference?: string | null; // Required if payment_method is upi
  tax_rate?: number | null; // 0-100, defaults to 0
  discount?: number | null;
}

export interface TransferBedRequest {
  new_bed_id: string;
  reason: string;
}

export interface AdmissionsSearchParams {
  page?: number;
  page_size?: number;
  patient_id?: string;
  doctor_id?: string;
  ward_id?: string;
  bed_id?: string;
  status?: AdmissionStatus;
  admission_date?: string; // YYYY-MM-DD
  tenant_id?: string;
}

export interface AdmissionsSearchResponse {
  items: Admission[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const admissionsApi = {
  async create(admission: CreateAdmissionRequest, tenantId?: string): Promise<Admission> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<Admission>("/admissions", admission, { params });
    return response.data;
  },

  async list(params?: AdmissionsSearchParams): Promise<AdmissionsSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.doctor_id) queryParams.append("doctor_id", params.doctor_id);
    if (params?.ward_id) queryParams.append("ward_id", params.ward_id);
    if (params?.bed_id) queryParams.append("bed_id", params.bed_id);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.admission_date) queryParams.append("admission_date", params.admission_date);
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/admissions${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<AdmissionsSearchResponse>(url);
    return response.data;
  },

  async getById(admissionId: string, tenantId?: string): Promise<Admission> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<Admission>(`/admissions/${admissionId}`, { params });
    return response.data;
  },

  async update(admissionId: string, updates: UpdateAdmissionRequest, tenantId?: string): Promise<Admission> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<Admission>(`/admissions/${admissionId}`, updates, { params });
    return response.data;
  },

  async discharge(admissionId: string, dischargeData: DischargeRequest, tenantId?: string): Promise<Admission> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<Admission>(`/admissions/${admissionId}/discharge`, dischargeData, { params });
    return response.data;
  },

  async transferBed(admissionId: string, transferData: TransferBedRequest, tenantId?: string): Promise<Admission> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<Admission>(`/admissions/${admissionId}/transfer`, transferData, { params });
    return response.data;
  },
};
