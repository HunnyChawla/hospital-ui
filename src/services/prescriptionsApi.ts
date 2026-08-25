import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import type { TaperingStep } from "@/types";

export interface StructuredFrequency {
  morning?: number | string | null;
  afternoon?: number | string | null;
  evening?: number | string | null;
  night?: number | string | null;
}

// Request types - for creating/updating prescriptions
export interface PrescriptionItemRequest {
  medicine_id?: string | null;
  medicine_name?: string | null;
  generic_name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  tapering_steps?: TaperingStep[];
  brand?: string | null;
  form?: string | null;
  strength?: string | null;
  route?: string | null;
  dose?: string | null;
  frequency_structure?: StructuredFrequency | null;
  timing?: string | null;
  quantity?: string | null;
  is_prn?: boolean | null;
  prn_reason?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  special_instructions?: string | null;
}

/**
 * One line of advice on a prescription.
 *
 * `instruction` is something the patient does ("rest for three days");
 * `lab-test` is something they are sent for. A lab-test may name a catalogue
 * entry, but need not — "X-ray, left knee" is a valid order even if nobody
 * has added that exact test to the master.
 */
export interface AdviceItemRequest {
  advice_type: "lab-test" | "instruction";
  description: string;
  notes?: string | null;
  lab_test_id?: string | null;
}

export interface AdviceItem extends AdviceItemRequest {
  id: string;
  created_at: string;
}

export interface CreatePrescriptionRequest {
  patient_id: string;
  doctor_id: string;
  visit_id: string; // Required
  diagnosis?: string;
  notes?: string;
  items: PrescriptionItemRequest[];
  advice_items?: AdviceItemRequest[];
  followup_date?: string | null;
  plan_of_action?: string | null;
  remarks?: string | null;
}

export interface UpdatePrescriptionRequest {
  items?: PrescriptionItemRequest[];
  diagnosis?: string;
  notes?: string;
  /** Omit to leave advice alone; send [] to clear it. */
  advice_items?: AdviceItemRequest[];
  /** For these scalars: omit to leave alone; send null to clear. */
  followup_date?: string | null;
  plan_of_action?: string | null;
  remarks?: string | null;
}

// Response types - for API responses
export interface PrescriptionItemResponse {
  id: string;
  prescription_id: string;
  medicine_id: string | null;
  medicine_name: string;
  generic_name?: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  created_at: string;
  created_by: string | null;
  tapering_steps?: TaperingStep[];
  brand?: string | null;
  form?: string | null;
  strength?: string | null;
  route?: string | null;
  dose?: string | null;
  frequency_structure?: StructuredFrequency | null;
  timing?: string | null;
  quantity?: string | null;
  is_prn?: boolean | null;
  prn_reason?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  special_instructions?: string | null;
}

export interface PrescriptionResponse {
  id: string;
  tenant_id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  visit_id: string;
  visit_number: string | null;
  prescription_number: string;
  status: "draft" | "finalized" | "dispensed";
  diagnosis: string | null;
  notes: string | null;
  finalized_at: string | null;
  items: PrescriptionItemResponse[];
  advice_items: AdviceItem[];
  symptoms?: Array<{ symptom_id?: string; symptom_name?: string; name?: string; applicable_eye?: string | null }>;
  followup_date: string | null;
  plan_of_action: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// Search/List params and response
export interface PrescriptionsSearchParams {
  visit_id?: string;
  patient_id?: string;
  doctor_id?: string;
  status?: "draft" | "finalized" | "dispensed";
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  tenant_id?: string;
}

export interface PrescriptionsSearchResponse {
  items: PrescriptionResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Legacy type aliases for backward compatibility during migration
/** @deprecated Use PrescriptionItemResponse instead */
export type PrescriptionMedicine = PrescriptionItemResponse;
/** @deprecated Use PrescriptionResponse instead */
export type Prescription = PrescriptionResponse;
/** @deprecated Use PrescriptionItemRequest instead */
export type CreatePrescriptionMedicine = PrescriptionItemRequest;

export const prescriptionsApi = {
  async create(prescription: CreatePrescriptionRequest, tenantId?: string): Promise<PrescriptionResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<PrescriptionResponse>("/prescriptions", prescription, { params });
    return response.data;
  },

  async list(params?: PrescriptionsSearchParams): Promise<PrescriptionsSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params?.visit_id) queryParams.append("visit_id", params.visit_id);
    if (params?.patient_id) queryParams.append("patient_id", params.patient_id);
    if (params?.doctor_id) queryParams.append("doctor_id", params.doctor_id);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/prescriptions${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<PrescriptionsSearchResponse>(url);
    return response.data;
  },

  async getById(prescriptionId: string, tenantId?: string): Promise<PrescriptionResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<PrescriptionResponse>(`/prescriptions/${prescriptionId}`, { params });
    return response.data;
  },

  async update(prescriptionId: string, updates: UpdatePrescriptionRequest, tenantId?: string): Promise<PrescriptionResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<PrescriptionResponse>(`/prescriptions/${prescriptionId}`, updates, { params });
    return response.data;
  },

  async finalize(prescriptionId: string, tenantId?: string): Promise<PrescriptionResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<PrescriptionResponse>(`/prescriptions/${prescriptionId}/finalize`, {}, { params });
    return response.data;
  },

  async getByPatient(patientId: string, params?: { page?: number; page_size?: number; tenant_id?: string }): Promise<PrescriptionsSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size) queryParams.append("page_size", params.page_size.toString());

    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

    const queryString = queryParams.toString();
    const url = `/prescriptions/patient/${patientId}${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<PrescriptionsSearchResponse>(url);
    return response.data;
  },

  async getPdf(prescriptionId: string, tenantId?: string): Promise<Blob> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get(`/prescriptions/${prescriptionId}/pdf`, {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  async downloadPdf(prescriptionId: string, filename?: string, tenantId?: string): Promise<void> {
    const blob = await this.getPdf(prescriptionId, tenantId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `Prescription-${prescriptionId.slice(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async getPrintPdf(prescriptionOrVisitId: string, sections?: string[], tenantId?: string): Promise<Blob> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params: Record<string, any> = {};
    if (apiTenantId) params.tenant_id = apiTenantId;
    if (sections && sections.length > 0) {
      params.sections = sections.join(",");
    }
    const response = await apiClient.get(`/prescriptions/${prescriptionOrVisitId}/print-pdf`, {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  async downloadPrintPdf(prescriptionOrVisitId: string, filename?: string, sections?: string[], tenantId?: string): Promise<void> {
    const blob = await this.getPrintPdf(prescriptionOrVisitId, sections, tenantId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `Prescription-Print-${prescriptionOrVisitId.slice(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

