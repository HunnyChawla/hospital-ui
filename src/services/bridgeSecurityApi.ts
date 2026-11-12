import { apiClient } from "./api";

export interface GeoIPStatus {
  has_database: boolean;
  database_path: string;
  file_size_bytes: number;
  last_modified: string | null;
  build_epoch: number | null;
  maxminddb_installed: boolean;
  warning: string | null;
  enabled?: boolean;
  allowed_countries?: string[];
}

export interface SecurityOverview {
  configs: Record<string, string>;
  geoip: GeoIPStatus;
  blocked_ips_count: number;
  trusted_ips_count: number;
  custom_facilities_count: number;
}

export interface BlockedIpItem {
  ip_or_cidr: string;
  reason?: string;
  created_by?: string;
  created_at: string;
  expires_at?: string | null;
}

export interface TrustedIpItem {
  ip_or_cidr: string;
  description?: string;
  created_by?: string;
  created_at: string;
}

export interface FacilityRateLimitItem {
  hip_id: string;
  tenant_id: string;
  callback_url?: string | null;
  custom_limit?: number | null;
  effective_limit: number;
  is_custom: boolean;
}

export interface TestIpResult {
  ip: string;
  resolved_country: string;
  is_trusted: boolean;
  is_blocked: boolean;
  allowed_countries: string[];
  verdict: "ALLOWED" | "BLOCKED";
}

export const bridgeSecurityApi = {
  /**
   * Get complete bridge security overview
   */
  async getOverview(): Promise<SecurityOverview> {
    const res = await apiClient.get<SecurityOverview>("/platform/bridge-security/overview");
    return res.data;
  },

  /**
   * Get all security config keys
   */
  async getConfig(): Promise<Record<string, string>> {
    const res = await apiClient.get<Record<string, string>>("/platform/bridge-security/config");
    return res.data;
  },

  /**
   * Update security configs
   */
  async updateConfig(configs: Record<string, string>): Promise<any> {
    const res = await apiClient.post("/platform/bridge-security/config", { configs });
    return res.data;
  },

  /**
   * Get GeoIP database status
   */
  async getGeoIPStatus(): Promise<GeoIPStatus> {
    const res = await apiClient.get<GeoIPStatus>("/platform/bridge-security/geoip/status");
    return res.data;
  },

  /**
   * Upload GeoIP MMDB database file
   */
  async uploadGeoIPDatabase(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post("/platform/bridge-security/geoip/database", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  /**
   * Delete GeoIP MMDB database from bridge
   */
  async deleteGeoIPDatabase(): Promise<any> {
    const res = await apiClient.delete("/platform/bridge-security/geoip/database");
    return res.data;
  },

  /**
   * Test IP country resolution and verdict
   */
  async testIpLookup(ip: string): Promise<TestIpResult> {
    const res = await apiClient.post<TestIpResult>("/platform/bridge-security/geoip/test-ip", { ip });
    return res.data;
  },

  /**
   * List all hospital facilities with rate limits
   */
  async listFacilities(): Promise<FacilityRateLimitItem[]> {
    const res = await apiClient.get<FacilityRateLimitItem[]>("/platform/bridge-security/facilities");
    return res.data;
  },

  /**
   * Update facility rate limit
   */
  async updateFacilityRateLimit(hipId: string, limit: number | null): Promise<any> {
    const res = await apiClient.put(`/platform/bridge-security/facilities/${hipId}/rate-limit`, {
      rate_limit_per_minute: limit,
    });
    return res.data;
  },

  /**
   * Reset facility rate limit to default
   */
  async resetFacilityRateLimit(hipId: string): Promise<any> {
    const res = await apiClient.delete(`/platform/bridge-security/facilities/${hipId}/rate-limit`);
    return res.data;
  },

  /**
   * List all blocked IPs/CIDRs
   */
  async listBlockedIps(): Promise<BlockedIpItem[]> {
    const res = await apiClient.get<BlockedIpItem[]>("/platform/bridge-security/blocked-ips");
    return res.data;
  },

  /**
   * Add IP/CIDR to blacklist
   */
  async addBlockedIp(ipOrCidr: string, reason?: string, expiresAt?: string): Promise<any> {
    const res = await apiClient.post("/platform/bridge-security/blocked-ips", {
      ip_or_cidr: ipOrCidr,
      reason: reason || "",
      expires_at: expiresAt || null,
    });
    return res.data;
  },

  /**
   * Remove IP/CIDR from blacklist
   */
  async removeBlockedIp(ipOrCidr: string): Promise<any> {
    const encoded = encodeURIComponent(ipOrCidr);
    const res = await apiClient.delete(`/platform/bridge-security/blocked-ips/${encoded}`);
    return res.data;
  },

  /**
   * List all trusted exempt IPs
   */
  async listTrustedIps(): Promise<TrustedIpItem[]> {
    const res = await apiClient.get<TrustedIpItem[]>("/platform/bridge-security/trusted-ips");
    return res.data;
  },

  /**
   * Add IP/CIDR to trusted exemptions
   */
  async addTrustedIp(ipOrCidr: string, description?: string): Promise<any> {
    const res = await apiClient.post("/platform/bridge-security/trusted-ips", {
      ip_or_cidr: ipOrCidr,
      description: description || "",
    });
    return res.data;
  },

  /**
   * Remove IP/CIDR from trusted exemptions
   */
  async removeTrustedIp(ipOrCidr: string): Promise<any> {
    const encoded = encodeURIComponent(ipOrCidr);
    const res = await apiClient.delete(`/platform/bridge-security/trusted-ips/${encoded}`);
    return res.data;
  },
};
