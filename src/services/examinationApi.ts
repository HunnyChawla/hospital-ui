/**
 * examinationApi.ts
 *
 * Single API client method for the unified examination save endpoint.
 * POST /optometry/examination/save-all
 */

import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

// ─── Sub-section types ───────────────────────────────────────────────────────

export interface ExamVisionData {
  od_ucva_distance?: string | null;
  od_ph_va?: string | null;
  od_va_with_current_specs?: string | null;
  od_near_ucva?: string | null;
  od_near_with_current_specs?: string | null;
  os_ucva_distance?: string | null;
  os_ph_va?: string | null;
  os_va_with_current_specs?: string | null;
  os_near_ucva?: string | null;
  os_near_with_current_specs?: string | null;
  notes?: string | null;
}

export interface ExamSpecsEye {
  sph: number | null;
  cyl: number | null;
  axis: number | null;
  add: number | null;
}

export interface ExamCurrentSpecsData {
  od?: ExamSpecsEye | null;
  os?: ExamSpecsEye | null;
  lens_type?: string | null;
  usage?: string | null;
  measured_by?: string | null;
  is_comfortable?: boolean | null;
  remarks?: string | null;
}

export interface ExamARData {
  od_sphere?: number | null;
  od_cylinder?: number | null;
  od_axis?: number | null;
  os_sphere?: number | null;
  os_cylinder?: number | null;
  os_axis?: number | null;
  od_wet_sphere?: number | null;
  od_wet_cylinder?: number | null;
  od_wet_axis?: number | null;
  os_wet_sphere?: number | null;
  os_wet_cylinder?: number | null;
  os_wet_axis?: number | null;
  pupillary_distance?: number | null;
  notes?: string | null;
}

export interface ExamEyeMeasurements {
  sphere?: number | null;
  cylinder?: number | null;
  axis?: number | null;
  add_power?: number | null;
  visual_acuity_uncorrected?: string | null;
  visual_acuity_corrected?: string | null;
  distance_bcva?: string | null;
  near_bcva?: string | null;
}

export interface ExamRefractionData {
  od?: ExamEyeMeasurements | null;
  os?: ExamEyeMeasurements | null;
  od_prism?: string | null;
  os_prism?: string | null;
  od_dilated_sphere?: number | null;
  od_dilated_cylinder?: number | null;
  od_dilated_axis?: number | null;
  od_dilated_visual_acuity?: string | null;
  od_dilated_pinhole?: string | null;
  os_dilated_sphere?: number | null;
  os_dilated_cylinder?: number | null;
  os_dilated_axis?: number | null;
  os_dilated_visual_acuity?: string | null;
  os_dilated_pinhole?: string | null;
  pupillary_distance?: number | null;
  notes?: string | null;
}

export interface ExistingRecordIds {
  vision_id?: string | null;
  ar_data_id?: string | null;
  current_specs_id?: string | null;
  refraction_id?: string | null;
}

export interface SaveExaminationRequest {
  patient_id: string;
  optometrist_id?: string | null;
  visit_id: string;
  vision?: ExamVisionData | null;
  current_specs?: ExamCurrentSpecsData | null;
  ar_data?: ExamARData | null;
  refraction?: ExamRefractionData | null;
  existing_ids?: ExistingRecordIds;
}

export interface SaveExaminationResponse {
  vision_id: string | null;
  ar_data_id: string | null;
  current_specs_id: string | null;
  refraction_id: string | null;
}

import type { VisionRecord, ARDataRecord, RefractionRecord, CurrentSpecsRecord } from "@/types";

export interface GetExaminationResponse {
  vision: VisionRecord | null;
  ar_data: ARDataRecord | null;
  current_specs: CurrentSpecsRecord | null;
  refraction: RefractionRecord | null;
}

// ─── API client ──────────────────────────────────────────────────────────────

export const examinationApi = {
  async saveAll(
    data: SaveExaminationRequest,
    tenantId?: string
  ): Promise<SaveExaminationResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<SaveExaminationResponse>(
      "/optometry/examination/save-all",
      data,
      { params }
    );
    return response.data;
  },

  async getAll(
    visitId: string,
    patientId: string,
    tenantId?: string
  ): Promise<GetExaminationResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = {
      visit_id: visitId,
      patient_id: patientId,
      ...(apiTenantId ? { tenant_id: apiTenantId } : {}),
    };
    const response = await apiClient.get<GetExaminationResponse>(
      "/optometry/examination/get-all",
      { params }
    );
    return response.data;
  },
};

