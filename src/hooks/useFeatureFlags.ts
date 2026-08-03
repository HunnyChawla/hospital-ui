import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
    getAllFeatureFlags,
    updateFeatureFlags,
    type FeatureFlagUpdate
} from '@/services/featureFlagsApi';
import { toast } from 'sonner';

/**
 * Hook to get and update feature flags
 * @param featureKey - Optional feature key to filter by specific feature
 */
export function useFeatureFlags(featureKey?: string) {
    const queryClient = useQueryClient();
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') || '' : '';

    // Get all feature flags
    const { data: allFlags, isLoading, error, refetch } = useQuery({
        queryKey: ['feature-flags', tenantId],
        queryFn: getAllFeatureFlags,
        staleTime: Infinity, // Prevent automatic refetching since we manage caching ourselves
    });

    // Save fetched feature flags to localStorage
    useEffect(() => {
        if (allFlags && typeof window !== 'undefined') {
            const stored = localStorage.getItem('feature_flags');
            if (!stored || stored !== JSON.stringify(allFlags)) {
                localStorage.setItem('feature_flags', JSON.stringify(allFlags));
            }
        }
    }, [allFlags]);

    // Extract feature-specific flags from the consolidated flags object
    const featureFlags = featureKey && allFlags ? allFlags[featureKey] : undefined;

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ feature, flags }: { feature: string; flags: FeatureFlagUpdate }) =>
            updateFeatureFlags(feature, flags),
        onSuccess: (updatedFeatureData, variables) => {
            // Update localStorage and query cache immediately
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('feature_flags');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        parsed[variables.feature] = updatedFeatureData;
                        localStorage.setItem('feature_flags', JSON.stringify(parsed));
                        
                        // Update cache for the current tenant
                        queryClient.setQueryData(['feature-flags', tenantId], parsed);
                    } catch (e) {
                        console.error('Failed to update localStorage feature flags after mutation:', e);
                    }
                }
            }
            // Invalidate to keep in sync
            queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
            toast.success(`${variables.feature} settings updated successfully`);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.detail || 'Failed to update feature flags');
            console.error('Update error:', error);
        },
    });

    return {
        allFlags,
        featureFlags,
        isLoading,
        error,
        updateFlags: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
        refetch,
    };
}

/**
 * Convenience hook for queue feature flags
 */
export function useQueueFlags() {
    const { featureFlags, isLoading, updateFlags, isUpdating } = useFeatureFlags('queue');

    return {
        allowDoctorPickAny: (featureFlags?.allow_doctor_pick_any as boolean) ?? false,
        allowOptometristPickAny: (featureFlags?.allow_optometrist_pick_any as boolean) ?? false,
        isLoading,
        updateFlags: (flags: FeatureFlagUpdate) => updateFlags({ feature: 'queue', flags }),
        isUpdating,
    };
}

/**
 * Convenience hook for prescription feature flags
 */
export function usePrescriptionFlags() {
    const { featureFlags, isLoading, updateFlags, isUpdating } = useFeatureFlags('prescription');

    return {
        allowEditAfterFinalize: (featureFlags?.allow_edit_after_finalize as boolean) ?? false,
        allowEditAfterVisitCompleted: (featureFlags?.allow_edit_after_visit_completed as boolean) ?? false,
        isLoading,
        updateFlags: (flags: FeatureFlagUpdate) => updateFlags({ feature: 'prescription', flags }),
        isUpdating,
    };
}

/**
 * Hook to calculate permissions for editing a prescription based on status and feature flags
 */
export function usePrescriptionPermissions(options?: {
    prescriptionStatus?: string | null;
    isVisitCompleted?: boolean;
    isReadOnlyProp?: boolean;
    hasPrescription?: boolean;
}) {
    const { allowEditAfterFinalize, allowEditAfterVisitCompleted, isLoading } = usePrescriptionFlags();

    const hasPrescription = options?.hasPrescription ?? (options?.prescriptionStatus != null);
    const isFinalized = options?.prescriptionStatus === 'finalized';
    const isVisitCompleted = (options?.isVisitCompleted ?? false) || (options?.isReadOnlyProp ?? false);

    let canEdit = true;

    if (!hasPrescription) {
        // When no prescription exists for the visit yet, allow creating one
        canEdit = true;
    } else if (isFinalized && !allowEditAfterFinalize) {
        canEdit = false;
    } else if (isVisitCompleted && !allowEditAfterVisitCompleted) {
        canEdit = false;
    }

    return {
        canEdit,
        isFinalized,
        isVisitCompleted,
        allowEditAfterFinalize,
        allowEditAfterVisitCompleted,
        isLoading,
    };
}

/**
 * Convenience hook for ABHA integration feature flags
 */
export function useAbhaFlags() {
    const { featureFlags, isLoading, updateFlags, isUpdating } = useFeatureFlags('abha');

    return {
        enabled: (featureFlags?.enabled as boolean) ?? false,
        isLoading,
        updateFlags: (flags: FeatureFlagUpdate) => updateFlags({ feature: 'abha', flags }),
        isUpdating,
    };
}


