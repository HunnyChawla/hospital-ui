import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface TenantAbdmConfigDto {
  hip_id?: string | null;
  hip_name?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface AbhaProfileDto {
  abha_number?: string | null;
  abha_address?: string | null;
  name?: string | null;
  gender?: string | null;
  dob?: string | null;
  mobile?: string | null;
  email?: string | null;
  photo_base64?: string | null;
}

export interface AbhaEnrollmentResult {
  profile: AbhaProfileDto;
  message?: string | null;
  is_new_abha: boolean;
  suggested_addresses?: string[];
  auto_selected_address?: string | null;
  session_key?: string | null;
  card_session_key?: string | null;
}

export interface AbhaPatientProfileResponseDto {
  patient_id: string;
  abha_number?: string | null;
  abha_address?: string | null;
  abha_linked_at?: string | null;
  abha_verified?: boolean;
  is_linked?: boolean;
}

export interface AbhaOtpRequestDto {
  aadhaar_number: string;
  scope?: string[];
  consent_accepted: boolean;
}

export interface AbhaVerifyOtpDto {
  session_key: string;
  otp: string;
  mobile: string;
}

/** Mobile verification for an Aadhaar enrollment that came back without a mobile number.
 * Reuses the Aadhaar enrollment session key so the verified mobile binds to that profile. */
export interface AbhaAadhaarMobileOtpRequestDto {
  session_key: string;
  mobile: string;
}

export interface AbhaAadhaarMobileVerifyOtpDto {
  session_key: string;
  otp: string;
}

export interface AbhaDocumentOtpRequestDto {
  mobile: string;
}

export interface AbhaDocumentVerifyOtpDto {
  session_key: string;
  otp: string;
}

export interface AbhaDocumentEnrollRequestDto {
  session_key: string;
  document_type: string;
  document_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  dob: string;
  gender: string;
  front_side_photo: string;
  back_side_photo: string;
  address: string;
  state: string;
  district: string;
  pin_code: string;
}

export interface AbhaConfirmAddressDto {
  session_key: string;
  abha_address: string;
}

export interface AbhaLinkOtpRequestDto {
  abha_number: string;
  consent_accepted: boolean;
}

export interface AbhaLinkVerifyOtpDto {
  session_key: string;
  otp: string;
}

export interface AbhaPatientSyncRequestDto {
  session_key: string;
  aadhaar_number?: string | null;
  override_mismatch?: boolean;
}

/**
 * Ask whether a verified ABHA profile can be linked, before actually linking it.
 * Keyed on the session_key rather than the ABHA number for the same reason as the sync
 * request: the profile is read server-side from the completed ABDM verification.
 */
export interface AbhaLinkCheckRequestDto {
  session_key: string;
  /** Omit when checking before the patient record exists (the add-patient flow). */
  patient_id?: string | null;
}

export interface AbhaLinkCheckResponseDto {
  can_link: boolean;
  conflict_field?: string | null;
  conflict_patient_id?: string | null;
  conflict_patient_uhid?: string | null;
  message?: string | null;
  /** Non-blocking: an unverified/legacy record already carries this ABHA. */
  warning?: string | null;
  identity_mismatches?: string[];
}

export const abhaApi = {
  // Tenant Config
  async getConfig(tenantId?: string): Promise<TenantAbdmConfigDto> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<TenantAbdmConfigDto>("/abha/config", { params });
    return response.data;
  },

  async updateConfig(config: TenantAbdmConfigDto, tenantId?: string): Promise<TenantAbdmConfigDto> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<TenantAbdmConfigDto>("/abha/config", config, { params });
    return response.data;
  },

  // Multi-Modal Enrollment
  async requestAadhaarOtp(req: AbhaOtpRequestDto, tenantId?: string): Promise<{ session_key: string; message: string }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post("/abha/enroll/aadhaar/request-otp", req, { params });
    return response.data;
  },

  async verifyAadhaarOtp(req: AbhaVerifyOtpDto, tenantId?: string): Promise<AbhaEnrollmentResult> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<AbhaEnrollmentResult>("/abha/enroll/aadhaar/verify-otp", req, { params });
    return response.data;
  },

  async requestAadhaarMobileOtp(req: AbhaAadhaarMobileOtpRequestDto, tenantId?: string): Promise<{ session_key: string; message: string }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post("/abha/enroll/aadhaar/mobile/request-otp", req, { params });
    return response.data;
  },

  async verifyAadhaarMobileOtp(req: AbhaAadhaarMobileVerifyOtpDto, tenantId?: string): Promise<AbhaEnrollmentResult> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<AbhaEnrollmentResult>("/abha/enroll/aadhaar/mobile/verify-otp", req, { params });
    return response.data;
  },

  async requestDocumentOtp(req: AbhaDocumentOtpRequestDto, tenantId?: string): Promise<{ session_key: string; message: string }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post("/abha/enroll/document/request-otp", req, { params });
    return response.data;
  },

  async verifyDocumentOtp(req: AbhaDocumentVerifyOtpDto, tenantId?: string): Promise<{ session_key: string; message: string }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post("/abha/enroll/document/verify-otp", req, { params });
    return response.data;
  },

  async enrolByDocument(req: AbhaDocumentEnrollRequestDto, tenantId?: string): Promise<AbhaEnrollmentResult> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<AbhaEnrollmentResult>("/abha/enroll/document", req, { params });
    return response.data;
  },

  async confirmAddress(req: AbhaConfirmAddressDto, tenantId?: string): Promise<AbhaEnrollmentResult> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<AbhaEnrollmentResult>("/abha/enroll/confirm-address", req, { params });
    return response.data;
  },

  // Linking Existing ABHA
  async requestLinkOtp(req: AbhaLinkOtpRequestDto, tenantId?: string): Promise<{ session_key: string; message: string }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post("/abha/link/request-otp", req, { params });
    return response.data;
  },

  async verifyLinkOtp(req: AbhaLinkVerifyOtpDto, tenantId?: string): Promise<AbhaEnrollmentResult> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<AbhaEnrollmentResult>("/abha/link/verify-otp", req, { params });
    return response.data;
  },

  // Patient Sync
  /**
   * Pre-flight check for syncToPatient. Does NOT consume the session, so the caller can go on
   * to complete the real sync with the same session_key.
   */
  async checkLinkConflict(
    req: AbhaLinkCheckRequestDto,
    tenantId?: string
  ): Promise<AbhaLinkCheckResponseDto> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<AbhaLinkCheckResponseDto>(
      "/abha/patients/link-check",
      req,
      { params }
    );
    return response.data;
  },

  async syncToPatient(
    patientId: string,
    req: AbhaPatientSyncRequestDto,
    tenantId?: string
  ): Promise<AbhaPatientProfileResponseDto> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<AbhaPatientProfileResponseDto>(
      `/abha/patients/${patientId}/sync`,
      req,
      { params }
    );
    return response.data;
  },

  // Card Download
  async downloadAbhaCard(sessionKey: string, tenantId?: string): Promise<Blob> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get(`/abha/card/${sessionKey}`, { params, responseType: "blob" });
    return response.data;
  },
};
