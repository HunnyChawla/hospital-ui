import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface PrescriptionDataResponse {
  patient_id: string;
  uhid?: string;
  visit_id: string;
  visit_number?: string;
  complaints: Array<{
    id: string;
    tenant_id: string;
    patient_id: string;
    visit_id: string;
    complaint: string;
    severity: string;
    duration: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string | null;
  }>;
  ar_data: {
    id: string;
    tenant_id: string;
    patient_id: string;
    visit_id: string;
    od_sphere: string;
    od_cylinder: string;
    od_axis: number;
    od_visual_acuity: string;
    os_sphere: string;
    os_cylinder: string;
    os_axis: number;
    os_visual_acuity: string;
    pupillary_distance: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string | null;
  } | null;
  refraction: {
    id: string;
    tenant_id: string;
    patient_id: string;
    optometrist_id: string;
    visit_id: string;
    od_sphere: string;
    od_cylinder: string;
    od_axis: number;
    od_visual_acuity_uncorrected: string;
    od_visual_acuity_corrected: string;
    od_add_power: string;
    os_sphere: string;
    os_cylinder: string;
    os_axis: number;
    os_visual_acuity_uncorrected: string;
    os_visual_acuity_corrected: string;
    os_add_power: string;
    notes: string | null;
    recorded_at: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string | null;
  } | null;
  iop: {
    id: string;
    tenant_id: string;
    patient_id: string;
    visit_id: string;
    od_pressure: string;
    os_pressure: string;
    measurement_time: string;
    measurement_method: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string | null;
  } | null;
  vision: {
    id: string;
    tenant_id: string;
    patient_id: string;
    optometrist_id: string;
    visit_id: string;
    od_ucva_distance: string;
    od_ph_va: string;
    od_va_with_current_specs: string;
    od_bcva_distance: string;
    od_near_ucva: string;
    od_near_with_current_specs: string;
    od_near_bcva: string;
    os_ucva_distance: string;
    os_ph_va: string;
    os_va_with_current_specs: string;
    os_bcva_distance: string;
    os_near_ucva: string;
    os_near_with_current_specs: string;
    os_near_bcva: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string | null;
  } | null;
  prescription: any | null;
  medical_conditions: Array<{
    id: string;
    tenant_id: string;
    patient_id: string;
    condition_name: string;
    duration: string | null;
    is_controlled: boolean | null;
    on_medication: boolean | null;
    remarks: string | null;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string | null;
  }>;
  ophthalmic_history: Array<{
    id: string;
    tenant_id: string;
    patient_id: string;
    surgery_name: string;
    eye: string;
    surgery_date: string;
    surgeon_name: string;
    hospital_name: string;
    complications: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string | null;
  }>;
  drug_allergies: Array<{
    id: string;
    tenant_id: string;
    patient_id: string;
    drug_name: string;
    reaction: string;
    severity: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string | null;
  }>;
}

export const prescriptionDataApi = {
  async getPrescriptionData(patientId: string, visitId?: string): Promise<PrescriptionDataResponse> {
    const tenantId = getTenantIdForApi();
    const params = visitId ? { visit_id: visitId } : {};
    const response = await apiClient.get(`/prescription-data/${patientId}`, {
      params,
      headers: {
        "X-Tenant-ID": tenantId,
      },
    });
    return response.data;
  },
};
