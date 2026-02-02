"use client";

import { useEffect, useMemo } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import { Sidebar } from "./Sidebar";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { hydratePermissions, fetchMyPermissions } from "@/redux/permissionsSlice";
import { restoreSession } from "@/redux/authSlice";
import { store } from "@/redux/store";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { isDesktopCollapsed } = useSidebar();
  const dispatch = useAppDispatch();
  const permissions = useAppSelector((s) => s.permissions);
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  useEffect(() => {
    const init = async () => {
      // 1. Hydrate from localStorage immediately
      dispatch(hydratePermissions());

      // 2. Restore session
      await dispatch(restoreSession());
    };
    init();
  }, [dispatch]);

  // Handle permission fetching if hydration failed and we are authenticated
  useEffect(() => {
    if (isAuthenticated && !store.getState().permissions.initialized && !permissions.loading) {
      dispatch(fetchMyPermissions());
    }
  }, [isAuthenticated, permissions.loading, dispatch]);

  // Dynamic padding based on sidebar state
  const mainPadding = useMemo(() => {
    return clsx(
      "transition-all duration-300 ease-in-out max-w-full overflow-x-hidden",
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
