import { QueryClient, DefaultOptions } from '@tanstack/react-query';

const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 1000 * 30, // 30 seconds - data considered fresh for 30 sec
    gcTime: 1000 * 60 * 30, // 30 minutes - unused data kept in cache for 30 min
    refetchOnWindowFocus: true, // Refetch when user returns to window
    refetchOnReconnect: true, // Refetch when network reconnects
    refetchOnMount: true, // Always refetch when component mounts (even if data is cached)
    retry: 1, // Retry failed requests once
  },
  mutations: {
    retry: false, // Don't retry failed mutations
  },
};

export function makeQueryClient() {
  return new QueryClient({ defaultOptions: queryConfig });
}

// Browser-side singleton QueryClient to prevent multiple instances
// This is critical for React Query to work properly with Next.js App Router
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  // Server-side: always create a new QueryClient
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }

  // Browser-side: create QueryClient once and reuse
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}
