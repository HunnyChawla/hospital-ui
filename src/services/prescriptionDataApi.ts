import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export interface PrescriptionDataResponse {
  patient_id: string;
  uhid?: string;
  mobile?: string | null;
  category?: string | null;
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

    // Wet AR fields
    od_wet_sphere?: string | null;
    od_wet_cylinder?: string | null;
    od_wet_axis?: number | null;
    os_wet_sphere?: string | null;
    os_wet_cylinder?: string | null;
    os_wet_axis?: number | null;
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
    od_distance_bcva: string;
    od_near_bcva: string;
    od_add_power: string;
    os_sphere: string;
    os_cylinder: string;
    os_axis: number;
    os_visual_acuity_uncorrected: string;
    os_visual_acuity_corrected: string;
    os_distance_bcva: string;
    os_near_bcva: string;
    os_add_power: string;
    notes: string | null;
    recorded_at: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string | null;

    // Prism and Dilated Acceptance fields
    od_prism?: string | null;
    os_prism?: string | null;
    od_dilated_sphere?: string | null;
    od_dilated_cylinder?: string | null;
    od_dilated_axis?: number | null;
    od_dilated_visual_acuity?: string | null;
    od_dilated_pinhole?: string | null;
    os_dilated_sphere?: string | null;
    os_dilated_cylinder?: string | null;
    os_dilated_axis?: number | null;
    os_dilated_visual_acuity?: string | null;
    os_dilated_pinhole?: string | null;
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
    od_near_ucva: string;
    od_near_with_current_specs: string;
    os_ucva_distance: string;
    os_ph_va: string;
    os_va_with_current_specs: string;
    os_near_ucva: string;
    os_near_with_current_specs: string;
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
    surgery_date: string | null;
    surgeon_name: string | null;
    hospital_name: string | null;
    complications: string | null;
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
  current_specs?: Array<{
    id: string;
    tenant_id: string;
    patient_id: string;
    optometrist_id: string;
    visit_id: string;
    od_sph: string;
    od_cyl: string;
    od_axis: number;
    od_add: string;
    os_sph: string;
    os_cyl: string;
    os_axis: number;
    os_add: string;
    lens_type: string;
    usage: string;
    measured_by: string;
    is_comfortable: boolean;
    remarks: string | null;
    recorded_at: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string | null;
  }> | null;
  address?: string | null;
  checked_in_at?: string | null;
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
