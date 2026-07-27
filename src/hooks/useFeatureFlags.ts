import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAllFeatureFlags,
    getFeatureFlags,
    updateFeatureFlags,
    type FeatureFlagUpdate
} from '@/services/featureFlagsApi';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorHandler';

/**
 * Hook to get and update feature flags
 * @param featureKey - Optional feature key to filter by specific feature
 */
export function useFeatureFlags(featureKey?: string) {
    const queryClient = useQueryClient();

    // Get all feature flags
    const { data: allFlags, isLoading: isLoadingAll, error: errorAll, refetch: refetchAll } = useQuery({
        queryKey: ['feature-flags'],
        queryFn: getAllFeatureFlags,
        enabled: !featureKey,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Get feature-specific flags
    const { data: featureFlags, isLoading: isLoadingFeature, error: errorFeature, refetch: refetchFeature } = useQuery({
        queryKey: ['feature-flags', featureKey],
        queryFn: () => getFeatureFlags(featureKey!),
        enabled: !!featureKey,
        staleTime: 5 * 60 * 1000,
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ feature, flags }: { feature: string; flags: FeatureFlagUpdate }) =>
            updateFeatureFlags(feature, flags),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
            toast.success(`${variables.feature} settings updated successfully`);
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error));
            console.error('Update error:', error);
        },
    });

    return {
        allFlags,
        featureFlags,
        isLoading: isLoadingAll || isLoadingFeature,
        error: errorAll || errorFeature,
        updateFlags: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
        refetch: featureKey ? refetchFeature : refetchAll,
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

