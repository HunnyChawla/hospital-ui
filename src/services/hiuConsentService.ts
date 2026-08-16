import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface CreateConsentRequestPayload {
  patient_id?: string | null;
  patient_abha: string;
  purpose_code?: string;
  hi_types?: string[];
  date_range_from: string;
  date_range_to: string;
  expiry_at: string;
  requester_name?: string | null;
  requester_reg_no?: string | null;
}

export interface ConsentRequestDto {
  id: string;
  consent_request_id: string;
  patient_id?: string | null;
  patient_abha: string;
  purpose_code: string;
  hi_types: string[];
  date_range_from: string;
  date_range_to: string;
  expiry_at: string;
  status: "REQUESTED" | "GRANTED" | "DENIED" | "REVOKED" | "EXPIRED";
  requester_name?: string | null;
  requester_reg_no?: string | null;
  last_fetched_at?: string | null;
  fetched_records_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ClinicalMedication {
  name: string;
  dosage?: string;
  frequency?: string | null;
  duration?: string | null;
  route?: string | null;
  instructions?: string | null;
  status?: string;
}

export interface ClinicalObservation {
  name: string;
  value?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ClinicalInvoice {
  invoice_number?: string | null;
  status?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  line_items?: InvoiceLineItem[];
}

export interface ClinicalAllergy {
  substance: string;
  criticality?: string | null;
}

export interface ClinicalProcedure {
  name: string;
  status?: string | null;
}

export interface ClinicalSummary {
  title?: string | null;
  document_type?: string | null;
  practitioner?: string | null;
  organization?: string | null;
  medications?: ClinicalMedication[];
  diagnoses?: string[];
  observations?: ClinicalObservation[];
  allergies?: ClinicalAllergy[];
  procedures?: ClinicalProcedure[];
  notes?: string[];
  invoice?: ClinicalInvoice | null;
}

export interface ExternalHealthRecordDto {
  id: string;
  transaction_id: string;
  consent_id: string;
  patient_id?: string | null;
  patient_abha: string;
  hip_id?: string | null;
  hip_name?: string | null;
  hi_type: string;
  care_context_reference?: string | null;
  care_context_name?: string | null;
  record_date?: string | null;
  has_pdf: boolean;
  document_media_type?: string | null;
  checksum_verified: boolean;
  checksum?: string | null;
  data_erase_at?: string | null;
  created_at: string;
  summary: ClinicalSummary;
  bundle_json?: any;
}

export const hiuConsentService = {
  /** Initiate a consent request to the patient's ABHA app */
  createConsentRequest: async (
    payload: CreateConsentRequestPayload,
    tenantId?: string | null
  ): Promise<ConsentRequestDto> => {
    const res = await apiClient.post<ConsentRequestDto>(
      "/api/v1/abdm/hiu/consent-requests",
      payload,
      {
        params: { tenant_id: getTenantIdForApi(tenantId) },
      }
    );
    return res.data;
  },

  /** List active and historical consent requests */
  listConsentRequests: async (
    patientId?: string | null,
    patientAbha?: string | null,
    tenantId?: string | null
  ): Promise<ConsentRequestDto[]> => {
    const res = await apiClient.get<ConsentRequestDto[]>(
      "/api/v1/abdm/hiu/consent-requests",
      {
        params: {
          patient_id: patientId || undefined,
          patient_abha: patientAbha || undefined,
          tenant_id: getTenantIdForApi(tenantId),
        },
      }
    );
    return res.data;
  },

  /** Trigger health information transfer from HIP for approved consent */
  fetchHealthInformation: async (
    consentRequestId: string,
    tenantId?: string | null
  ): Promise<{ transaction_id: string; status: string; message: string }> => {
    const res = await apiClient.post(
      `/api/v1/abdm/hiu/consent-requests/${encodeURIComponent(consentRequestId)}/fetch-data`,
      {},
      {
        params: { tenant_id: getTenantIdForApi(tenantId) },
      }
    );
    return res.data;
  },

  /** List all decrypted historical health records fetched for a patient */
  getPatientExternalRecords: async (
    patientId: string,
    tenantId?: string | null
  ): Promise<ExternalHealthRecordDto[]> => {
    const res = await apiClient.get<ExternalHealthRecordDto[]>(
      `/api/v1/abdm/hiu/patients/${encodeURIComponent(patientId)}/records`,
      {
        params: { tenant_id: getTenantIdForApi(tenantId) },
      }
    );
    return res.data;
  },

  /** Stream decrypted binary PDF url */
  getRecordPdfBlob: async (
    recordId: string,
    tenantId?: string | null
  ): Promise<Blob> => {
    const res = await apiClient.get(
      `/api/v1/abdm/hiu/records/${encodeURIComponent(recordId)}/pdf`,
      {
        responseType: "blob",
        params: { tenant_id: getTenantIdForApi(tenantId) },
      }
    );
    return res.data;
  },
};
