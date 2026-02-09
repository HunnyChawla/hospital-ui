import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type JobStatus = "pending" | "running" | "completed" | "failed";
export type JobType = "full_import" | "master_only" | "tenant_only";

export interface CreateSeedJobRequest {
    job_type: JobType;
    tenant_id?: string | null;
}

export interface SeedJobResponse {
    id: string;
    status: JobStatus;
    job_type: JobType;
    tenant_id: string | null;
    started_at: string; // ISO datetime
    completed_at: string | null; // ISO datetime
    total_tables: number;
    completed_tables: number;
    total_rows: number;
    inserted_rows: number;
    error_message: string | null;
    error_details: Record<string, any> | null;
    progress_percentage: number;
    duration_seconds: number | null;
    created_by: string;
}

export interface ListJobsParams {
    limit?: number;
    tenant_id?: string;
}

export const seedDataApi = {
    async createImportJob(request: CreateSeedJobRequest): Promise<SeedJobResponse> {
        const params: Record<string, string> = {};
        const apiTenantId = getTenantIdForApi(request.tenant_id);

        // For tenant_only jobs, tenant_id is required in the body or logic
        // But apiClient might append it to params if we use existing patterns?
        // Let's stick to the spec: "tenant_id: Specify tenant_id for tenant-specific imports" in request body
        // But also check if we need to pass it as query param for auth verification if mostly used in body
        // The spec implementation shows it in requestBody schema.

        const response = await apiClient.post<SeedJobResponse>(
            "/api/admin/seed-data/import",
            request
        );
        return response.data;
    },

    async listJobs(listParams?: ListJobsParams): Promise<SeedJobResponse[]> {
        const params: Record<string, string | number> = {};
        if (listParams?.limit) params.limit = listParams.limit;

        const apiTenantId = getTenantIdForApi(listParams?.tenant_id);
        if (apiTenantId) params.tenant_id = apiTenantId;

        const response = await apiClient.get<SeedJobResponse[]>("/api/admin/seed-data/jobs", { params });
        return response.data;
    },

    async getJobStatus(jobId: string): Promise<SeedJobResponse> {
        const response = await apiClient.get<SeedJobResponse>(`/api/admin/seed-data/jobs/${jobId}`);
        return response.data;
    }
};
