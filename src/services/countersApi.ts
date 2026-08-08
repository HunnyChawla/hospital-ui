import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

/**
 * Registration counters and their Scan & Share QR codes.
 *
 * A counter is a physical desk. Its `code` is printed inside the QR and comes
 * back as `context` on every Scan & Share callback, which is why the backend
 * refuses to let it be edited: changing it would orphan every printed sticker
 * silently.
 *
 * ⚠️ THE TWO HALVES LIVE UNDER DIFFERENT PREFIXES.
 *
 * CRUD is `/patients/intake/counters` — a counter is a patient-management
 * concept. The QR is `/abha/counters/...` — it needs the tenant's ABDM
 * facility ID, and putting it beside the CRUD would have made the backend's
 * patient module depend on its ABHA module, reversing a dependency that
 * already runs the other way. Same resource, two prefixes, on purpose.
 */

export interface CounterResponse {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCounterRequest {
  code: string;
  name: string;
  is_active?: boolean;
}

export interface UpdateCounterRequest {
  name?: string | null;
  is_active?: boolean | null;
}

/** ABDM's cap on a counter code. Mirrored here only to fail before the round trip. */
export const COUNTER_CODE_MAX_LENGTH = 20;

export const countersApi = {
  async list(includeInactive = true, tenantId?: string): Promise<CounterResponse[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params: Record<string, unknown> = { include_inactive: includeInactive };
    if (apiTenantId) params.tenant_id = apiTenantId;
    const response = await apiClient.get<CounterResponse[]>("/patients/intake/counters", {
      params,
    });
    return response.data;
  },

  async create(req: CreateCounterRequest, tenantId?: string): Promise<CounterResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<CounterResponse>(
      "/patients/intake/counters",
      req,
      { params }
    );
    return response.data;
  },

  async update(
    counterId: string,
    req: UpdateCounterRequest,
    tenantId?: string
  ): Promise<CounterResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<CounterResponse>(
      `/patients/intake/counters/${counterId}`,
      req,
      { params }
    );
    return response.data;
  },

  /** The QR image to print, as a blob. */
  async qrPng(counterCode: string, tenantId?: string): Promise<Blob> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get(
      `/abha/counters/${encodeURIComponent(counterCode)}/qr`,
      { params, responseType: "blob" }
    );
    return response.data;
  },

  /**
   * What that QR encodes, in plain text.
   *
   * Shown next to the image. When a scan fails this is the only way anyone at
   * the hospital can tell whether the QR is wrong or the phone is.
   */
  async qrUrl(counterCode: string, tenantId?: string): Promise<string> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<{ url: string }>(
      `/abha/counters/${encodeURIComponent(counterCode)}/qr-url`,
      { params }
    );
    return response.data.url;
  },
};
