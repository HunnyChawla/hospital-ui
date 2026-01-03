"use client";

import { createContext, useContext } from 'react';

export type TenantContextType = {
  tenantId: string | null;
  isPlatformOwner: boolean;
};

// Create context with default values
export const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  isPlatformOwner: false,
});

/**
 * Hook to access tenant context in React Query hooks
 * Provides tenantId and isPlatformOwner for API calls
 */
export function useTenantContext() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenantContext must be used within TenantProvider');
  }

  return context;
}
