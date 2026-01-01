"use client";

import { useMemo } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import { Sidebar } from "./Sidebar";
import clsx from "clsx";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { isDesktopCollapsed } = useSidebar();

  // Dynamic padding based on sidebar state
  const mainPadding = useMemo(() => {
    return clsx(
      "transition-all duration-300 ease-in-out",
      {
        "lg:pl-0": isDesktopCollapsed,
        "lg:pl-72": !isDesktopCollapsed,
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
