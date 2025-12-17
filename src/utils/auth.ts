/**
 * Check if the current user is a PlatformOwner
 * PlatformOwner is the only role that can specify tenant_id parameter
 */
export function isPlatformOwner(): boolean {
  if (typeof window === "undefined") return false;
  const role = localStorage.getItem("role");
  return role === "platform_owner";
}

/**
 * Get tenant_id for API calls
 * Only PlatformOwner can specify tenant_id, others should use undefined
 * @param tenantId - Optional tenant ID to use (only if user is PlatformOwner)
 * @returns tenant_id if user is PlatformOwner and tenantId is provided, undefined otherwise
 */
export function getTenantIdForApi(tenantId?: string | null): string | undefined {
  if (isPlatformOwner() && tenantId) {
    return tenantId;
  }
  return undefined;
}


