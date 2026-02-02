import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, Appointment, CreateAppointmentRequest, AppointmentStatus } from '@/services/appointmentsApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';
import { createMutationErrorHandler } from '@/utils/errorHandler';

/**
 * Query Keys Factory for Appointments
 */
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  byDoctor: (doctorId: string, startDate: string, endDate: string) =>
    [...appointmentKeys.lists(), 'doctor', doctorId, startDate, endDate] as const,
  byPatient: (patientId: string) =>
    [...appointmentKeys.lists(), 'patient', patientId] as const,
};

/**
 * Fetch appointments by doctor with date range
 */
export function useAppointmentsByDoctor(
  doctorId: string,
  startDate: string,
  endDate: string,
  options?: {
    page?: number;
    page_size?: number;
    appointmentsOnly?: boolean;
  }
) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: appointmentKeys.byDoctor(doctorId, startDate, endDate),
    queryFn: async () => {
      return await appointmentsApi.getByDoctor(
        doctorId,
        startDate,
        endDate,
        {
          ...options,
          tenantId: isPlatformOwner ? tenantId ?? undefined : undefined,
        }
      );
    },
    enabled: !!doctorId && !!startDate && !!endDate,
  });
}

/**
 * Fetch appointments by patient
 */
export function useAppointmentsByPatient(
  patientId: string,
  options?: {
    page?: number;
    page_size?: number;
  }
) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: appointmentKeys.byPatient(patientId),
    queryFn: async () => {
      return await appointmentsApi.getByPatient(
        patientId,
        {
          ...options,
          tenantId: isPlatformOwner ? tenantId ?? undefined : undefined,
        }
      );
    },
    enabled: !!patientId,
  });
}

/**
 * Create new appointment
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (data: CreateAppointmentRequest) => {
      return await appointmentsApi.create(
        data,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onSuccess: (data) => {
      toast.success('Appointment created successfully');
      // Invalidate relevant appointment queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
    onError: createMutationErrorHandler('Failed to create appointment'),
  });
}

/**
 * Update appointment status
 */
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      newStatus,
    }: {
      appointmentId: string;
      newStatus: AppointmentStatus;
    }) => {
      return await appointmentsApi.updateStatus(
        appointmentId,
        newStatus,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onMutate: async ({ appointmentId, newStatus }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: appointmentKeys.lists() });

      // Snapshot previous values
      const previousData = queryClient.getQueriesData({ queryKey: appointmentKeys.lists() });

      // Optimistically update all matching queries
      queryClient.setQueriesData(
        { queryKey: appointmentKeys.lists() },
        (old: any) => {
          if (!old) return old;

          // Handle both single appointment and appointment list responses
          if (Array.isArray(old.items)) {
            return {
              ...old,
              items: old.items.map((apt: Appointment) =>
                apt.id === appointmentId ? { ...apt, status: newStatus } : apt
              ),
            };
          }
          return old;
        }
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      createMutationErrorHandler('Failed to update appointment status')(err);
    },
    onSuccess: () => {
      toast.success('Appointment status updated successfully');
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}
