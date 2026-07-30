import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";
import {
  DayCareVisit,
  CreateDayCareVisitRequest,
  TransitionStatusRequest,
  DayCareClinicalAssessment,
  DayCarePreparationChecklist,
  DayCareOTRecord,
  DayCareRecoveryRecord,
  DayCareDischargeRecord,
  DischargeSummaryPrintResponse,
} from "@/types/dayCare";

export interface DayCareVisitParams {
  date?: string;
  surgeon_id?: string;
  status?: string;
  planned_surgery_id?: string;
}

export const dayCareApi = {
  async listVisits(params?: DayCareVisitParams, tenantId?: string): Promise<DayCareVisit[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const queryParams = { ...params, ...(apiTenantId ? { tenant_id: apiTenantId } : {}) };
    try {
      const { data } = await apiClient.get<any>("/day-care/visits", { params: queryParams });
      if (data && Array.isArray(data.items)) {
        return data.items;
      }
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn("Real API failed, returning empty daycare list fallback", err);
      return [];
    }
  },

  async getVisit(id: string, tenantId?: string): Promise<DayCareVisit> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.get<DayCareVisit>(`/day-care/visits/${id}`, { params });
    return data;
  },

  async createVisit(payload: CreateDayCareVisitRequest, tenantId?: string): Promise<DayCareVisit> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.post<DayCareVisit>("/day-care/visits", payload, { params });
    return data;
  },

  async transitionStatus(id: string, payload: TransitionStatusRequest, tenantId?: string): Promise<DayCareVisit> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.patch<DayCareVisit>(`/day-care/visits/${id}/status`, payload, { params });
    return data;
  },

  async generateInvoice(id: string, lineItems: any[], tenantId?: string): Promise<{ id: string; invoice_id?: string }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.post<{ id: string; invoice_id?: string }>(`/day-care/visits/${id}/invoice`, { line_items: lineItems }, { params });
    return data;
  },

  // Clinical Assessment
  async getClinicalAssessment(visitId: string, tenantId?: string): Promise<DayCareClinicalAssessment | null> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    try {
      const { data } = await apiClient.get<DayCareClinicalAssessment>(`/day-care/visits/${visitId}/clinical-assessment`, { params });
      return data;
    } catch (e: any) {
      if (e.response?.status === 404) return null;
      throw e;
    }
  },

  async upsertClinicalAssessment(visitId: string, payload: Partial<DayCareClinicalAssessment>, tenantId?: string): Promise<DayCareClinicalAssessment> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.put<DayCareClinicalAssessment>(`/day-care/visits/${visitId}/clinical-assessment`, payload, { params });
    return data;
  },

  // Preparation Checklist
  async getPreparationChecklist(visitId: string, tenantId?: string): Promise<DayCarePreparationChecklist | null> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    try {
      const { data } = await apiClient.get<DayCarePreparationChecklist>(`/day-care/visits/${visitId}/preparation`, { params });
      return data;
    } catch (e: any) {
      if (e.response?.status === 404) return null;
      throw e;
    }
  },

  async upsertPreparationChecklist(visitId: string, payload: Partial<DayCarePreparationChecklist>, tenantId?: string): Promise<DayCarePreparationChecklist> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.put<DayCarePreparationChecklist>(`/day-care/visits/${visitId}/preparation`, payload, { params });
    return data;
  },

  // OT Record
  async getOTRecord(visitId: string, tenantId?: string): Promise<DayCareOTRecord | null> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    try {
      const { data } = await apiClient.get<DayCareOTRecord>(`/day-care/visits/${visitId}/ot-record`, { params });
      return data;
    } catch (e: any) {
      if (e.response?.status === 404) return null;
      throw e;
    }
  },

  async upsertOTRecord(visitId: string, payload: Partial<DayCareOTRecord>, tenantId?: string): Promise<DayCareOTRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.put<DayCareOTRecord>(`/day-care/visits/${visitId}/ot-record`, payload, { params });
    return data;
  },

  // Recovery Record
  async getRecoveryRecord(visitId: string, tenantId?: string): Promise<DayCareRecoveryRecord | null> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    try {
      const { data } = await apiClient.get<DayCareRecoveryRecord>(`/day-care/visits/${visitId}/recovery`, { params });
      return data;
    } catch (e: any) {
      if (e.response?.status === 404) return null;
      throw e;
    }
  },

  async upsertRecoveryRecord(visitId: string, payload: Partial<DayCareRecoveryRecord>, tenantId?: string): Promise<DayCareRecoveryRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.put<DayCareRecoveryRecord>(`/day-care/visits/${visitId}/recovery`, payload, { params });
    return data;
  },

  // Discharge Record
  async getDischargeRecord(visitId: string, tenantId?: string): Promise<DayCareDischargeRecord | null> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    try {
      const { data } = await apiClient.get<DayCareDischargeRecord>(`/day-care/visits/${visitId}/discharge`, { params });
      return data;
    } catch (e: any) {
      if (e.response?.status === 404) return null;
      throw e;
    }
  },

  async upsertDischargeRecord(visitId: string, payload: Partial<DayCareDischargeRecord>, tenantId?: string): Promise<DayCareDischargeRecord> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.put<DayCareDischargeRecord>(`/day-care/visits/${visitId}/discharge`, payload, { params });
    return data;
  },

  async getDischargePDF(visitId: string, tenantId?: string): Promise<{ pdf_url: string }> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.get<{ pdf_url: string }>(`/day-care/visits/${visitId}/discharge/pdf`, { params });
    return data;
  },

  async getDischargeSummaryPrintData(visitId: string, tenantId?: string): Promise<DischargeSummaryPrintResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.get<DischargeSummaryPrintResponse>(`/day-care/visits/${visitId}/discharge/print-summary`, { params });
    return data;
  },

  async updateVisitPayment(visitId: string, paymentId: string, tenantId?: string): Promise<DayCareVisit> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const { data } = await apiClient.patch<DayCareVisit>(`/day-care/visits/${visitId}/payment`, { payment_id: paymentId }, { params });
    return data;
  }
};
