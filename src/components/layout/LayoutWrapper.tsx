"use client";

import { useEffect, useMemo } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import { Sidebar } from "./Sidebar";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { hydratePermissions, fetchMyPermissions } from "@/redux/permissionsSlice";
import { restoreSession } from "@/redux/authSlice";
import { store } from "@/redux/store";
import { useQueryClient } from "@tanstack/react-query";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { isDesktopCollapsed } = useSidebar();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const permissions = useAppSelector((s) => s.permissions);
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  useEffect(() => {
    const init = async () => {
      // 1. Hydrate from localStorage immediately
      dispatch(hydratePermissions());

      // Hydrate feature flags from localStorage into query client on mount
      if (typeof window !== "undefined") {
        const storedFlags = localStorage.getItem("feature_flags");
        if (storedFlags) {
          try {
            const parsedFlags = JSON.parse(storedFlags);
            const tenantId = localStorage.getItem("tenant_id") || "";
            queryClient.setQueryData(["feature-flags", tenantId], parsedFlags);
          } catch (e) {
            console.error("Failed to parse stored feature flags on mount", e);
          }
        }
      }

      // 2. Restore session
      await dispatch(restoreSession());
    };
    init();
  }, [dispatch, queryClient]);

  // Handle permission fetching if hydration failed and we are authenticated
  useEffect(() => {
    if (isAuthenticated && !store.getState().permissions.initialized && !permissions.loading) {
      dispatch(fetchMyPermissions());
    }
  }, [isAuthenticated, permissions.loading, dispatch]);

  // Dynamic padding based on sidebar state
  const mainPadding = useMemo(() => {
    return clsx(
      "transition-all duration-300 ease-in-out min-w-0 max-w-full overflow-x-hidden",
      {
        "lg:pl-16": isDesktopCollapsed,
        "lg:pl-64": !isDesktopCollapsed,
      }
    );
  }, [isDesktopCollapsed]);

  return (
    <>
      <Sidebar />
      <div className={mainPadding}>{children}</div>
    </>
  );
}
