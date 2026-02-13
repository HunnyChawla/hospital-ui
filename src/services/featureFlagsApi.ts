import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

// Types
export type FlagValue = boolean | string | number | object;

export interface FeatureFlags {
    [featureKey: string]: {
        [flagKey: string]: FlagValue;
    };
}

export interface FeatureFlagUpdate {
    [flagKey: string]: FlagValue;
}

// API Functions

/**
 * Get all feature flags for the current tenant
 */
export const getAllFeatureFlags = async (): Promise<FeatureFlags> => {
    const tenantId = getTenantIdForApi();
    const queryParams = new URLSearchParams();
    if (tenantId) queryParams.append("tenant_id", tenantId);

    const response = await apiClient.get<FeatureFlags>(
        `/feature-flags?${queryParams.toString()}`
    );
    return response.data;
};

/**
 * Get feature flags for a specific feature
 */
export const getFeatureFlags = async (
    featureKey: string
): Promise<Record<string, FlagValue>> => {
    const tenantId = getTenantIdForApi();
    const queryParams = new URLSearchParams();
    if (tenantId) queryParams.append("tenant_id", tenantId);

    const response = await apiClient.get<Record<string, FlagValue>>(
        `/feature-flags/${featureKey}?${queryParams.toString()}`
    );
    return response.data;
};

/**
 * Update feature flags for a specific feature
 */
export const updateFeatureFlags = async (
    featureKey: string,
    flags: FeatureFlagUpdate
): Promise<Record<string, FlagValue>> => {
    const tenantId = getTenantIdForApi();
    const queryParams = new URLSearchParams();
    if (tenantId) queryParams.append("tenant_id", tenantId);

    const response = await apiClient.patch<Record<string, FlagValue>>(
        `/feature-flags/${featureKey}?${queryParams.toString()}`,
        flags
    );
    return response.data;
};
