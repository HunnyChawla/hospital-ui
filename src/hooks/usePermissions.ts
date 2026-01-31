"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/redux/hooks";

export function usePermissions() {
  const {
    allowedScreens,
    screenDetails,
    userPermissions,
    initialized,
    loading,
  } = useAppSelector((state) => state.permissions);

  const userRole = userPermissions?.role || null;

  /**
   * Check if user has access to a specific screen path
   */
  const hasAccess = useMemo(() => {
    return (screenPath: string): boolean => {
      if (!initialized) return true; // Assume true while loading to avoid flickering

      // Platform owner has access to all screens
      if (userRole === "platform_owner") return true;

      // Normalize path: take only the pathname part
      const normalizedPath = screenPath.split("?")[0].split("#")[0];

      // Exact match
      if (allowedScreens.includes(normalizedPath)) return true;

      // Check for nested routes: if the current path starts with an allowed screen path
      // Example: If /patients is allowed, /patients/add should also be allowed
      const isSubPathAllowed = allowedScreens.some(path =>
        path !== "/" && normalizedPath.startsWith(path + "/")
      );

      return isSubPathAllowed;
    };
  }, [allowedScreens, initialized, userRole]);

  /**
   * Check if current user is admin or platform owner
   */
  const isAdmin = useMemo(() => {
    return userRole === "admin" || userRole === "platform_owner";
  }, [userRole]);

  /**
   * Check if current user is platform owner
   */
  const isPlatformOwner = useMemo(() => {
    return userRole === "platform_owner";
  }, [userRole]);

  return {
    allowedScreens,
    screenDetails,
    userPermissions,
    userRole,
    hasAccess,
    isAdmin,
    isPlatformOwner,
    initialized,
    loading,
  };
}
