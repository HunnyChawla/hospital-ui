import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  labBookingsApi,
  LabBooking,
  CreateLabBookingRequest,
  BookingStatus,
  LabBookingsSearchParams
} from '@/services/labBookingsApi';
import { useTenantContext } from '@/lib/tenant-context';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorHandler';

/**
 * Query Keys Factory for Lab Bookings
 */
export const labBookingKeys = {
  all: ['lab-bookings'] as const,
  lists: () => [...labBookingKeys.all, 'list'] as const,
  list: (params: LabBookingsSearchParams) => [...labBookingKeys.lists(), params] as const,
  details: () => [...labBookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...labBookingKeys.details(), id] as const,
};

/**
 * Fetch all lab bookings with optional filters
 */
export function useLabBookings(params?: LabBookingsSearchParams) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: labBookingKeys.list(params || {}),
    queryFn: async () => {
      return await labBookingsApi.list({
        ...params,
        tenant_id: isPlatformOwner ? ((params?.tenant_id || tenantId) ?? undefined) : undefined,
      });
    },
  });
}

/**
 * Fetch single lab booking by ID
 */
export function useLabBooking(bookingId: string | null) {
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useQuery({
    queryKey: labBookingKeys.detail(bookingId!),
    queryFn: async () => {
      return await labBookingsApi.getById(
        bookingId!,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    enabled: !!bookingId,
  });
}

/**
 * Create new lab booking
 */
export function useCreateLabBooking() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async (data: CreateLabBookingRequest) => {
      return await labBookingsApi.create(
        data,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onMutate: async (newBooking) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: labBookingKeys.lists() });

      // Snapshot previous value
      const previousBookings = queryClient.getQueriesData({ queryKey: labBookingKeys.lists() });

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: labBookingKeys.lists() },
        (old: any) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: [{ ...newBooking, id: 'temp-id' } as LabBooking, ...old.items],
            total: old.total + 1,
          };
        }
      );

      return { previousBookings };
    },
    onError: (err, newBooking, context) => {
      // Rollback on error
      if (context?.previousBookings) {
        context.previousBookings.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      const errorMessage = getErrorMessage(err);
      toast.error(errorMessage);
    },
    onSuccess: () => {
      toast.success('Lab booking created successfully');
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: labBookingKeys.lists() });
    },
  });
}

/**
 * Update lab booking status
 */
export function useUpdateLabBookingStatus() {
  const queryClient = useQueryClient();
  const { tenantId, isPlatformOwner } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      bookingId,
      status,
      notes,
    }: {
      bookingId: string;
      status: BookingStatus;
      notes?: string;
    }) => {
      return await labBookingsApi.updateStatus(
        bookingId,
        status,
        notes,
        isPlatformOwner ? tenantId ?? undefined : undefined
      );
    },
    onMutate: async ({ bookingId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: labBookingKeys.detail(bookingId) });
      await queryClient.cancelQueries({ queryKey: labBookingKeys.lists() });

      // Snapshot previous values
      const previousBooking = queryClient.getQueryData(labBookingKeys.detail(bookingId));
      const previousBookings = queryClient.getQueriesData({ queryKey: labBookingKeys.lists() });

      // Optimistically update detail cache
      queryClient.setQueryData(labBookingKeys.detail(bookingId), (old: LabBooking | undefined) => {
        if (!old) return old;
        return { ...old, status };
      });

      // Optimistically update list caches
      queryClient.setQueriesData(
        { queryKey: labBookingKeys.lists() },
        (old: any) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((booking: LabBooking) =>
              booking.id === bookingId ? { ...booking, status } : booking
            ),
          };
        }
      );

      return { previousBooking, previousBookings };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousBooking) {
        queryClient.setQueryData(labBookingKeys.detail(variables.bookingId), context.previousBooking);
      }
      if (context?.previousBookings) {
        context.previousBookings.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      const errorMessage = getErrorMessage(err);
      toast.error(errorMessage);
    },
    onSuccess: () => {
      toast.success('Booking status updated successfully');
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: labBookingKeys.detail(variables.bookingId) });
      queryClient.invalidateQueries({ queryKey: labBookingKeys.lists() });
    },
  });
}
