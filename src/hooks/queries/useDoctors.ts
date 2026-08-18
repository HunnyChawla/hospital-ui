import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorsApi, Doctor, CreateDoctorRequest, UpdateDoctorRequest, ConsultationFeeRequest } from '@/services/doctorsApi';
import { usersApi } from '@/services/usersApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';

/**
 * Query Keys Factory for Doctors
 */
export const doctorKeys = {
  all: ['doctors'] as const,
  lists: () => [...doctorKeys.all, 'list'] as const,
  list: (tenantId: string | null) => [...doctorKeys.lists(), tenantId] as const,
  details: () => [...doctorKeys.all, 'detail'] as const,
  detail: (id: string) => [...doctorKeys.details(), id] as const,
  consultationFees: (id: string) => [...doctorKeys.detail(id), 'consultation-fees'] as const,
};

/**
 * Fetch all doctors with user information
 */
export function useDoctors() {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: doctorKeys.list(tenantId),
    queryFn: async () => {
      const doctors = await doctorsApi.list(isPlatformOwner ? tenantId ?? undefined : undefined);

      // Fetch user data for each doctor to get their names
      const doctorsWithUsers = await Promise.all(
        doctors.map(async (doctor) => {
          try {
            const user = await usersApi.getById(doctor.user_id, isPlatformOwner ? tenantId ?? undefined : undefined);
            return {
              ...doctor,
              name: user.full_name,
              user: {
                name: user.full_name,
                email: user.email,
              },
              is_active: doctor.is_active !== undefined ? doctor.is_active : user.status === "active",
              status: doctor.status || user.status,
            };
          } catch (error) {
            // If user fetch fails, return doctor without user info
            console.error(`Failed to fetch user for doctor ${doctor.id}:`, error);
            return doctor;
          }
        })
      );

      return doctorsWithUsers;
    },
  });
}

/**
 * Fetch single doctor by ID
 */
export function useDoctor(doctorId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: doctorKeys.detail(doctorId!),
    queryFn: async () => {
      return await doctorsApi.getById(
        doctorId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!doctorId,
  });
}

/**
 * Fetch consultation fees for a doctor
 */
export function useConsultationFees(doctorId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: doctorKeys.consultationFees(doctorId!),
    queryFn: async () => {
      return await doctorsApi.getConsultationFees(
        doctorId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!doctorId,
  });
}

/**
 * Create new doctor
 */
export function useCreateDoctor() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (data: CreateDoctorRequest) => {
      return await doctorsApi.create(
        data,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onMutate: async (newDoctor) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: doctorKeys.lists() });

      // Snapshot previous value
      const previousDoctors = queryClient.getQueryData(doctorKeys.list(tenantId));

      // Optimistically update
      queryClient.setQueryData(doctorKeys.list(tenantId), (old: Doctor[] | undefined) => {
        if (!old) return old;
        return [...old, { ...newDoctor, id: 'temp-id' } as unknown as Doctor];
      });

      return { previousDoctors };
    },
    onError: (err, newDoctor, context) => {
      // Rollback on error
      if (context?.previousDoctors) {
        queryClient.setQueryData(doctorKeys.list(tenantId), context.previousDoctors);
      }

      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to create doctor';
      toast.error(errorMessage);
    },
    onSuccess: () => {
      toast.success('Doctor created successfully');
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: doctorKeys.lists() });
    },
  });
}

/**
 * Update existing doctor
 */
export function useUpdateDoctor() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      doctorId,
      updates,
    }: {
      doctorId: string;
      updates: UpdateDoctorRequest;
    }) => {
      return await doctorsApi.update(
        doctorId,
        updates,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onMutate: async ({ doctorId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: doctorKeys.detail(doctorId) });
      await queryClient.cancelQueries({ queryKey: doctorKeys.lists() });

      // Snapshot previous values
      const previousDoctor = queryClient.getQueryData(doctorKeys.detail(doctorId));
      const previousDoctors = queryClient.getQueryData(doctorKeys.list(tenantId));

      // Optimistically update detail cache
      queryClient.setQueryData(doctorKeys.detail(doctorId), (old: Doctor | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      // Optimistically update list cache
      queryClient.setQueryData(doctorKeys.list(tenantId), (old: Doctor[] | undefined) => {
        if (!old) return old;
        return old.map((doctor) =>
          doctor.id === doctorId ? { ...doctor, ...updates } : doctor
        );
      });

      return { previousDoctor, previousDoctors };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousDoctor) {
        queryClient.setQueryData(doctorKeys.detail(variables.doctorId), context.previousDoctor);
      }
      if (context?.previousDoctors) {
        queryClient.setQueryData(doctorKeys.list(tenantId), context.previousDoctors);
      }

      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to update doctor';
      toast.error(errorMessage);
    },
    onSuccess: () => {
      toast.success('Doctor updated successfully');
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: doctorKeys.detail(variables.doctorId) });
      queryClient.invalidateQueries({ queryKey: doctorKeys.lists() });
    },
  });
}

/**
 * Set consultation fees for a doctor
 */
export function useSetConsultationFees() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      doctorId,
      fees,
    }: {
      doctorId: string;
      fees: ConsultationFeeRequest[];
    }) => {
      return await doctorsApi.setConsultationFees(
        doctorId,
        fees,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (data, variables) => {
      toast.success('Consultation fees updated successfully');
      // Invalidate consultation fees query
      queryClient.invalidateQueries({ queryKey: doctorKeys.consultationFees(variables.doctorId) });
    },
    onError: (err) => {
      const errorMessage = (err as any)?.response?.data?.detail || 'Failed to update consultation fees';
      toast.error(errorMessage);
    },
  });
}

/**
 * Calculate consultation fee for a patient visit
 */
export function useCalculateConsultationFee(doctorId: string, patientId: string, isEmergency: boolean = false) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: [...doctorKeys.detail(doctorId), 'calculate-fee', patientId, isEmergency],
    queryFn: async ({ signal }) => {
      return await doctorsApi.calculateConsultationFee(
        doctorId,
        patientId,
        isEmergency,
        isPlatformOwner ? tenantId ?? undefined : undefined,
        signal
      );
    },
    enabled: !!doctorId && !!patientId,
    staleTime: 0, // Always fetch fresh calculation
  });
}
