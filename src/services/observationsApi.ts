import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

// ============================================================================
// Types
//
// What a hospital records about a patient, defined per tenant rather than per
// database migration. `vital_signs` was nine fixed columns — no room for
// intraocular pressure, head circumference, fundal height or random blood
// sugar — so every new client needed a schema change.
//
// The nine core vitals are seeded and write through to `vital_signs`, so the
// doctor panel's charts keep working and keep agreeing.
// ============================================================================

export type ObservationValueType = "number" | "text" | "boolean" | "choice";

export interface ObservationDefinition {
    id: string;
    /** Immutable identifier. */
    code: string;
    label: string;
    unit: string | null;
    value_type: ObservationValueType;
    /** Outside this range the value is highlighted. Null means none published. */
    min_normal: number | null;
    max_normal: number | null;
    /** Outside this range the value is rejected as a data-entry error. */
    min_allowed: number | null;
    max_allowed: number | null;
    choices: string[] | null;
    display_order: number;
    is_active: boolean;
    /** One of the nine core vitals: editable, but cannot be switched off. */
    is_system: boolean;
    writes_to_vitals: boolean;
}

export interface CreateObservationDefinitionRequest {
    code: string;
    label: string;
    value_type: ObservationValueType;
    unit?: string | null;
    min_normal?: number | null;
    max_normal?: number | null;
    min_allowed?: number | null;
    max_allowed?: number | null;
    choices?: string[] | null;
    display_order?: number;
}

export interface UpdateObservationDefinitionRequest {
    label?: string;
    unit?: string | null;
    min_normal?: number | null;
    max_normal?: number | null;
    min_allowed?: number | null;
    max_allowed?: number | null;
    choices?: string[] | null;
    display_order?: number;
    is_active?: boolean;
}

export interface StageObservation {
    definition: ObservationDefinition;
    /** The visit cannot leave this stage until this has a value. */
    is_required: boolean;
    display_order: number;
}

export interface StageObservationEntry {
    observation_definition_id: string;
    is_required: boolean;
}

export interface VisitObservation {
    id: string;
    code: string;
    label: string;
    unit: string | null;
    value_type: ObservationValueType;
    value_number: number | null;
    value_text: string | null;
    value_boolean: boolean | null;
    display_value: string;
    /** Outside the published normal range — a highlight, not an alarm. */
    is_abnormal: boolean;
    stage_code: string | null;
    recorded_at: string;
    recorded_by: string | null;
}

// ============================================================================
// API
// ============================================================================

function tenantParams(tenantId?: string): Record<string, string> {
    const apiTenantId = getTenantIdForApi(tenantId);
    return apiTenantId ? { tenant_id: apiTenantId } : {};
}

export const observationsApi = {
    async listDefinitions(
        includeInactive: boolean = false,
        tenantId?: string
    ): Promise<ObservationDefinition[]> {
        const response = await apiClient.get<ObservationDefinition[]>("/observations/definitions", {
            params: { ...tenantParams(tenantId), include_inactive: includeInactive },
        });
        return response.data;
    },

    async createDefinition(
        data: CreateObservationDefinitionRequest,
        tenantId?: string
    ): Promise<ObservationDefinition> {
        const response = await apiClient.post<ObservationDefinition>(
            "/observations/definitions",
            data,
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },

    async updateDefinition(
        definitionId: string,
        data: UpdateObservationDefinitionRequest,
        tenantId?: string
    ): Promise<ObservationDefinition> {
        const response = await apiClient.patch<ObservationDefinition>(
            `/observations/definitions/${definitionId}`,
            data,
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },

    async getForStage(stageId: string, tenantId?: string): Promise<StageObservation[]> {
        const response = await apiClient.get<StageObservation[]>(
            `/observations/stages/${stageId}`,
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },

    /** Replace what a stage asks for. Send the complete list, in order. */
    async setForStage(
        stageId: string,
        observations: StageObservationEntry[],
        tenantId?: string
    ): Promise<StageObservation[]> {
        const response = await apiClient.put<StageObservation[]>(
            `/observations/stages/${stageId}`,
            { observations },
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },

    async getForVisit(visitId: string, tenantId?: string): Promise<VisitObservation[]> {
        const response = await apiClient.get<VisitObservation[]>(
            `/observations/visits/${visitId}`,
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },

    /**
     * Record observations, keyed by code.
     *
     * Every value is validated server-side before anything is written, so a
     * form with one bad field saves nothing rather than half of itself — which
     * means the client can send the whole form and trust the outcome.
     */
    async recordForVisit(
        visitId: string,
        values: Record<string, unknown>,
        stageCode?: string,
        tenantId?: string
    ): Promise<VisitObservation[]> {
        const response = await apiClient.post<VisitObservation[]>(
            `/observations/visits/${visitId}`,
            { values, stage_code: stageCode ?? null },
            { params: tenantParams(tenantId) }
        );
        return response.data;
    },
};
