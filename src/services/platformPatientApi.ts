import { apiClient } from "./api";

export interface PlatformPatientSearchItem {
  id: string;
  tenant_id: string;
  uhid: string;
  title: string | null;
  first_name: string;
  last_name: string | null;
  full_name: string;
  mobile: string | null;
  mobile_verified: boolean;
  mobile_verified_source: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  abha_id: string | null;
  abha_number: string | null;
  abha_address: string | null;
  abha_linked_at: string | null;
  abha_verified: boolean;
  is_old_patient: boolean;
  created_at: string;
  updated_at: string;

  // Record counts
  opd_visit_count: number;
  ipd_admission_count: number;
  day_care_visit_count: number;
  invoice_count: number;
  prescription_count: number;
  episode_count: number;
  lab_booking_count: number;
  planned_surgery_count: number;
}

export interface PlatformPatientSearchResponse {
  items: PlatformPatientSearchItem[];
  total: number;
}

export interface DeletePatientResponse {
  success: boolean;
  message: string;
  patient_id: string;
  uhid: string;
  tenant_id: string;
  deleted_at: string;
  details: Record<string, any>;
}

export interface UnlinkAbhaResponse {
  success: boolean;
  message: string;
  patient_id: string;
  uhid: string;
  tenant_id: string;
  unlinked_at: string;
  cleared_records: Record<string, any>;
  patient: Record<string, any>;
}

export const platformPatientApi = {
  /**
   * Search patients for a specific tenant by mobile, ABHA number, or ABHA address/ID.
   */
  searchPatients: async (params: {
    tenant_id: string;
    query: string;
    search_type?: "all" | "mobile" | "abha_number" | "abha_address";
  }): Promise<PlatformPatientSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("tenant_id", params.tenant_id);
    queryParams.append("query", params.query);
    if (params.search_type && params.search_type !== "all") {
      queryParams.append("search_type", params.search_type);
    }

    const res = await apiClient.get<PlatformPatientSearchResponse>(
      `/platform/patients/search?${queryParams.toString()}`
    );
    return res.data;
  },

  /**
   * Permanently delete a patient and cascade delete all related clinical and ABDM data.
   */
  deletePatient: async (params: {
    patient_id: string;
    tenant_id: string;
    reason?: string;
  }): Promise<DeletePatientResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("tenant_id", params.tenant_id);
    if (params.reason) {
      queryParams.append("reason", params.reason);
    }

    const res = await apiClient.delete<DeletePatientResponse>(
      `/platform/patients/${params.patient_id}?${queryParams.toString()}`
    );
    return res.data;
  },

  /**
   * Unlink ABHA ID from patient and clear associated cached tokens and care-context linkages.
   */
  unlinkAbha: async (params: {
    patient_id: string;
    tenant_id: string;
    reason?: string;
  }): Promise<UnlinkAbhaResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("tenant_id", params.tenant_id);

    const res = await apiClient.post<UnlinkAbhaResponse>(
      `/platform/patients/${params.patient_id}/unlink-abha?${queryParams.toString()}`,
      { reason: params.reason }
    );
    return res.data;
  },
};
