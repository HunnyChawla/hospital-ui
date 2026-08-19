import { QueryClient, DefaultOptions } from '@tanstack/react-query';

const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 1000 * 30, // 30 seconds - data considered fresh for 30 sec
    gcTime: 1000 * 60 * 30, // 30 minutes - unused data kept in cache for 30 min
    refetchOnWindowFocus: false, // Prevent refetch bursts on tab switch
    refetchOnReconnect: true, // Refetch when network reconnects
    refetchOnMount: true, // Refetch when component mounts if data is stale
    retry: (failureCount, error: any) => {
      // Extract HTTP status code if available (Axios / fetch error)
      const status = error?.response?.status ?? error?.status;
      // Do NOT retry for 4xx client errors (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity, etc.)
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return false;
      }
      // Retry at most 2 times for transient network/5xx server errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff (1s, 2s, capped at 10s)
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
