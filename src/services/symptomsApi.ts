import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type SymptomCategory = "Visual" | "Pain" | "Redness" | "Discharge" | "Neuro";
export type ApplicableEye = "LEFT" | "RIGHT" | "BOTH" | "NA";

export interface Symptom {
    id: string;
    tenant_id: string | null;
    symptom_name: string;
    category: SymptomCategory;
    description: string | null;
    is_eye_specific: boolean;
    applicable_eye: ApplicableEye;
    is_active: boolean;
    display_order: number | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
}

export interface CreateSymptomRequest {
    symptom_name: string;
    category: SymptomCategory;
    description?: string;
    is_eye_specific?: boolean;
    applicable_eye?: ApplicableEye;
    display_order?: number;
}

export interface UpdateSymptomRequest {
    symptom_name?: string;
    category?: SymptomCategory;
    description?: string;
    is_eye_specific?: boolean;
    applicable_eye?: ApplicableEye;
    display_order?: number;
    is_active?: boolean;
}

export interface SymptomsSearchParams {
    page?: number;
    page_size?: number;
    is_active?: boolean;
    search?: string;
    category?: SymptomCategory;
    include_global?: boolean;
    tenant_id?: string; // PlatformOwner only
}

export interface SymptomsSearchResponse {
    items: Symptom[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface DiagnosisSymptomMap {
    id: string;
    diagnosis_id: string;
    symptom_id: string;
    symptom_name: string;
    category: SymptomCategory;
    is_eye_specific: boolean;
    applicable_eye: ApplicableEye;
    is_common: boolean;
    is_key_symptom: boolean;
    weight: number | null;
    created_at: string;
    created_by: string | null;
}

export interface DiagnosisSymptomMapRequest {
    symptom_id: string;
    is_common?: boolean;
    is_key_symptom?: boolean;
    weight?: number;
}

export interface UpdateDiagnosisSymptomMapRequest {
    is_common?: boolean;
    is_key_symptom?: boolean;
    weight?: number;
}

export const symptomsApi = {
    async create(
        symptom: CreateSymptomRequest,
        isGlobal: boolean = false,
        tenantId?: string
    ): Promise<Symptom> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string> = {};
        if (isGlobal) params.is_global = "true";
        if (apiTenantId) params.tenant_id = apiTenantId;

        const response = await apiClient.post<Symptom>("/symptoms", symptom, { params });
        return response.data;
    },

    async list(params?: SymptomsSearchParams): Promise<SymptomsSearchResponse> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.page_size) queryParams.append("page_size", params.page_size.toString());
        if (params?.is_active !== undefined)
            queryParams.append("is_active", params.is_active.toString());
        if (params?.search) queryParams.append("search", params.search);
        if (params?.category) queryParams.append("category", params.category);
        if (params?.include_global !== undefined)
            queryParams.append("include_global", params.include_global.toString());
        const apiTenantId = getTenantIdForApi(params?.tenant_id);
        if (apiTenantId) queryParams.append("tenant_id", apiTenantId);

        const queryString = queryParams.toString();
        const url = `/symptoms${queryString ? `?${queryString}` : ""}`;

        const response = await apiClient.get<SymptomsSearchResponse>(url);
        return response.data;
    },

    async getById(symptomId: string, tenantId?: string): Promise<Symptom> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.get<Symptom>(`/symptoms/${symptomId}`, { params });
        return response.data;
    },

    async update(
        symptomId: string,
        updates: UpdateSymptomRequest,
        tenantId?: string
    ): Promise<Symptom> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.put<Symptom>(
            `/symptoms/${symptomId}`,
            updates,
            { params }
        );
        return response.data;
    },

    async delete(symptomId: string, tenantId?: string): Promise<void> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        await apiClient.delete(`/symptoms/${symptomId}`, { params });
    },

    async bulkCreate(
        symptoms: CreateSymptomRequest[],
        isGlobal: boolean = false,
        tenantId?: string
    ): Promise<Symptom[]> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params: Record<string, string> = {};
        if (isGlobal) params.is_global = "true";
        if (apiTenantId) params.tenant_id = apiTenantId;

        const response = await apiClient.post<Symptom[]>(
            "/symptoms/bulk",
            { symptoms },
            { params }
        );
        return response.data;
    },

    // Diagnosis-Symptom Linking Methods
    async linkToDiagnosis(
        diagnosisId: string,
        mappings: DiagnosisSymptomMapRequest[],
        tenantId?: string
    ): Promise<DiagnosisSymptomMap[]> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.post<DiagnosisSymptomMap[]>(
            `/symptoms/diagnoses/${diagnosisId}/symptoms`,
            { mappings },
            { params }
        );
        return response.data;
    },

    async getSymptomsByDiagnosis(
        diagnosisId: string,
        tenantId?: string
    ): Promise<DiagnosisSymptomMap[]> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.get<DiagnosisSymptomMap[]>(
            `/symptoms/diagnoses/${diagnosisId}/symptoms`,
            { params }
        );
        return response.data;
    },

    async updateDiagnosisSymptomLink(
        diagnosisId: string,
        symptomId: string,
        updates: UpdateDiagnosisSymptomMapRequest,
        tenantId?: string
    ): Promise<DiagnosisSymptomMap> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        const response = await apiClient.put<DiagnosisSymptomMap>(
            `/symptoms/diagnoses/${diagnosisId}/symptoms/${symptomId}`,
            updates,
            { params }
        );
        return response.data;
    },

    async unlinkFromDiagnosis(
        diagnosisId: string,
        symptomId: string,
        tenantId?: string
    ): Promise<void> {
        const apiTenantId = getTenantIdForApi(tenantId);
        const params = apiTenantId ? { tenant_id: apiTenantId } : {};
        await apiClient.delete(
            `/symptoms/diagnoses/${diagnosisId}/symptoms/${symptomId}`,
            { params }
        );
    },
};
