import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import {
  AutoFillDischargeSummary,
  IpdAdmittedPatient,
  IpdDischargeSummaryResponse,
  IpdMedicationOrder,
  IpdOrder,
  IpdPatientChart,
  IpdProgressNote,
  MedicationAdministration,
  SaveDischargeSummaryRequest,
} from "@/types/ipdDoctor";

export const ipdDoctorApi = {
  /**
   * List active admitted patients with stay details and order counts.
   */
  async listAdmittedPatients(params?: {
    doctor_id?: string;
    ward_id?: string;
    search?: string;
    tenant_id?: string;
  }): Promise<IpdAdmittedPatient[]> {
    const apiTenantId = getTenantIdForApi(params?.tenant_id);
    const query = new URLSearchParams();
    if (params?.doctor_id) query.append("doctor_id", params.doctor_id);
    if (params?.ward_id) query.append("ward_id", params.ward_id);
    if (params?.search) query.append("search", params.search);
    if (apiTenantId) query.append("tenant_id", apiTenantId);

    const queryString = query.toString();
    const url = `/ipd/workspace/admissions${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get<IpdAdmittedPatient[]>(url);
    return response.data;
  },

  /**
   * Get full IPD patient clinical chart.
   */
  async getPatientChart(admissionId: string, tenantId?: string): Promise<IpdPatientChart> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<IpdPatientChart>(
      `/ipd/workspace/admissions/${admissionId}/chart`,
      { params }
    );
    return response.data;
  },

  /**
   * Create a doctor order (Lab, Radiology, Diet, Nursing instruction, Procedure, etc.).
   */
  async createOrder(
    admissionId: string,
    data: {
      order_category: string;
      order_title: string;
      instructions?: string | null;
      priority?: string;
      lab_test_id?: string | null;
      ordered_at?: string | null;
    },
    tenantId?: string
  ): Promise<IpdOrder> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<IpdOrder>(
      `/ipd/workspace/admissions/${admissionId}/orders`,
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Create multiple doctor orders in a batch.
   */
  async createOrdersBatch(
    admissionId: string,
    orders: Array<{
      order_category: string;
      order_title: string;
      instructions?: string | null;
      priority?: string;
      lab_test_id?: string | null;
      ordered_at?: string | null;
    }>,
    tenantId?: string
  ): Promise<IpdOrder[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<IpdOrder[]>(
      `/ipd/workspace/admissions/${admissionId}/orders/batch`,
      { orders },
      { params }
    );
    return response.data;
  },

  /**
   * Discontinue an order with reason.
   */
  async discontinueOrder(
    orderId: string,
    reason: string,
    tenantId?: string
  ): Promise<{ status: string; message: string }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<{ status: string; message: string }>(
      `/ipd/workspace/orders/${orderId}/discontinue`,
      { reason },
      { params }
    );
    return response.data;
  },

  /**
   * Prescribe a medication order with start/stop datetime, dose, route, frequency.
   */
  async createMedicationOrder(
    admissionId: string,
    data: {
      medicine_id?: string | null;
      medicine_name: string;
      generic_name?: string | null;
      dose: string;
      route: string;
      frequency: string;
      start_date_time: string;
      stop_date_time?: string | null;
      is_sos?: boolean;
      sos_condition?: string | null;
      instructions?: string | null;
    },
    tenantId?: string
  ): Promise<IpdMedicationOrder> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<IpdMedicationOrder>(
      `/ipd/workspace/admissions/${admissionId}/medications`,
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Stop / discontinue a medication order with reason and timestamp.
   */
  async stopMedicationOrder(
    medOrderId: string,
    data: {
      stop_date_time?: string | null;
      reason: string;
    },
    tenantId?: string
  ): Promise<{ status: string; message: string }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<{ status: string; message: string }>(
      `/ipd/workspace/medications/${medOrderId}/stop`,
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Create a Daily Progress Note (SOAP or Nursing shift note).
   */
  async createProgressNote(
    admissionId: string,
    data: {
      note_date?: string;
      note_time?: string;
      note_type?: string;
      subjective?: string | null;
      objective?: string | null;
      assessment?: string | null;
      plan?: string | null;
      notes?: string | null;
    },
    tenantId?: string
  ): Promise<IpdProgressNote> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<IpdProgressNote>(
      `/ipd/workspace/admissions/${admissionId}/progress-notes`,
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Record medication dose administration in MAR.
   */
  async recordMarAdministration(
    admissionId: string,
    data: {
      medication_order_id: string;
      dose_given: string;
      status: string;
      administered_at?: string;
      notes?: string | null;
    },
    tenantId?: string
  ): Promise<MedicationAdministration> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<MedicationAdministration>(
      `/ipd/workspace/admissions/${admissionId}/mar/administer`,
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Get auto-filled discharge summary data from hospital stay.
   */
  async getDischargeSummaryAutoFill(
    admissionId: string,
    tenantId?: string
  ): Promise<AutoFillDischargeSummary> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<AutoFillDischargeSummary>(
      `/ipd/workspace/admissions/${admissionId}/discharge-summary/auto-fill`,
      { params }
    );
    return response.data;
  },

  /**
   * Save and finalize the discharge summary.
   */
  async saveDischargeSummary(
    admissionId: string,
    data: SaveDischargeSummaryRequest,
    tenantId?: string
  ): Promise<IpdDischargeSummaryResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<IpdDischargeSummaryResponse>(
      `/ipd/workspace/admissions/${admissionId}/discharge-summary`,
      data,
      { params }
    );
    return response.data;
  },

  /**
   * Get saved discharge summary if exists.
   */
  async getDischargeSummary(
    admissionId: string,
    tenantId?: string
  ): Promise<IpdDischargeSummaryResponse | null> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<IpdDischargeSummaryResponse | null>(
      `/ipd/workspace/admissions/${admissionId}/discharge-summary`,
      { params }
    );
    return response.data;
  },
};
