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
}

export interface AbhaVerifyOtpDto {
  session_key: string;
  otp: string;
  mobile: string;
}

export interface AbhaDemoAuthRequestDto {
  aadhaar_number: string;
  name: string;
  gender: string;
  date_of_birth: string;
  mobile?: string;
}

export interface AbhaBiometricRequestDto {
  aadhaar_number: string;
  bio_type: "bio" | "face" | "iris";
  pid_data: string;
  mobile: string;
}

export interface AbhaDocumentEnrollRequestDto {
  document_type: string;
  document_id: string;
  demographics: Record<string, any>;
}

export interface AbhaConfirmAddressDto {
  session_key: string;
  abha_address: string;
}

export interface AbhaLinkOtpRequestDto {
  abha_number: string;
}

export interface AbhaLinkVerifyOtpDto {
  session_key: string;
  otp: string;
}

export interface AbhaPatientSyncRequestDto {
  profile: AbhaProfileDto;
  aadhaar_number?: string | null;
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

  async enrolByDemographic(req: AbhaDemoAuthRequestDto, tenantId?: string): Promise<AbhaEnrollmentResult> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<AbhaEnrollmentResult>("/abha/enroll/demographic", req, { params });
    return response.data;
  },

  async enrolByBiometric(req: AbhaBiometricRequestDto, tenantId?: string): Promise<AbhaEnrollmentResult> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<AbhaEnrollmentResult>("/abha/enroll/biometric", req, { params });
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
};
