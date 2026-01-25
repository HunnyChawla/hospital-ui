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
      if (!initialized) return false;
      // Platform owner has access to all screens
      if (userRole === "platform_owner") return true;
      return allowedScreens.includes(screenPath);
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
    userRole,
    hasAccess,
    isAdmin,
    isPlatformOwner,
    initialized,
    loading,
  };
}
