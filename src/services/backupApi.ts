import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type BackupStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
export type BackupFormat = "EXCEL" | "CSV";

export interface DatasetOption {
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

export interface BackupJob {
  id: string;
  tenant_id: string;
  created_by: string | null;
  created_by_name?: string | null;
  status: BackupStatus;
  file_format: BackupFormat;
  start_date: string;
  end_date: string;
  selected_datasets: string[];
  file_size_bytes: number | null;
  record_counts: Record<string, number>;
  error_message: string | null;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  download_url?: string | null;
}

export interface CreateBackupRequest {
  start_date: string;
  end_date: string;
  datasets: string[];
  file_format: BackupFormat;
}

export interface BackupListResponse {
  items: BackupJob[];
  total: number;
  has_active_job: boolean;
}

export const backupApi = {
  /**
   * Fetch the list of non-master operational datasets available for tenant backup.
   */
  async getAvailableDatasets(tenantId?: string): Promise<DatasetOption[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<DatasetOption[]>("/backup/datasets", { params });
    return response.data;
  },

  /**
   * List past and current backups.
   */
  async listBackups(tenantId?: string, limit = 50): Promise<BackupListResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = {
      ...(apiTenantId ? { tenant_id: apiTenantId } : {}),
      limit,
    };
    const response = await apiClient.get<BackupListResponse>("/backup", { params });
    return response.data;
  },

  /**
   * Get status of a specific backup job.
   */
  async getBackup(backupId: string, tenantId?: string): Promise<BackupJob> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<BackupJob>(`/backup/${backupId}`, { params });
    return response.data;
  },

  /**
   * Trigger a new asynchronous data backup task.
   */
  async triggerBackup(data: CreateBackupRequest, tenantId?: string): Promise<BackupJob> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<BackupJob>("/backup", data, { params });
    return response.data;
  },

  /**
   * Download the generated backup file as a blob.
   */
  async downloadBackup(backupId: string, tenantId?: string): Promise<Blob> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get(`/backup/${backupId}/download`, {
      params,
      responseType: "blob",
    });
    return response.data;
  },
};
