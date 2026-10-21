/**
 * Extract verified role claim directly from JWT payload
 * Mitigates localStorage tampering attacks
 */
export function getRoleFromToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("auth_token");
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.role ? String(parsed.role).toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Check if the current user is a PlatformOwner
 * PlatformOwner is the only role that can specify tenant_id parameter
 */
export function isPlatformOwner(): boolean {
  if (typeof window === "undefined") return false;
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const tokenRole = getRoleFromToken();
  if (tokenRole) {
    return tokenRole === "platform_owner" && role === "platform_owner";
  }
  return role === "platform_owner";
}

/**
 * Check if the current user is an Admin or PlatformOwner
 */
export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  const role = (localStorage.getItem("role") || localStorage.getItem("user_role") || "").toLowerCase();
  const tokenRole = getRoleFromToken();
  if (tokenRole) {
    return (tokenRole === "admin" || tokenRole === "platform_owner") && (role === "admin" || role === "platform_owner");
  }
  return role === "admin" || role === "platform_owner";
}

/**
 * Get tenant_id for API calls
 * Only PlatformOwner can specify tenant_id, others should use undefined
 * @param tenantId - Optional tenant ID to use (only if user is PlatformOwner)
 * @returns tenant_id if user is PlatformOwner and tenantId is provided, undefined otherwise
 */
export function getTenantIdForApi(tenantId?: string | null): string | undefined {
  if (isPlatformOwner()) {
    return tenantId || localStorage.getItem("tenant_id") || undefined;
  }
  return undefined;
}


