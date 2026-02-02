"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route protection component that redirects unauthorized users to dashboard
 * Wraps content and checks if user has access to the current route
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasAccess, initialized, loading } = usePermissions();

  useEffect(() => {
    // Skip check on login page
    if (pathname === "/login" || pathname === "/login/") return;

    // Wait for permissions to load
    if (!initialized || loading) return;

    // Normalize pathname (remove trailing slash)
    const normalizedPath =
      pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

    // Check if user has access to current route
    if (!hasAccess(normalizedPath)) {
      // Redirect to dashboard
      router.push("/");
    }
  }, [pathname, hasAccess, initialized, loading, router]);

  // Show loading state while permissions are being fetched
  if (!initialized && pathname !== "/login" && pathname !== "/login/") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
