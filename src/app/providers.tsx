/* Providers for Redux + React Query + Toasts */
"use client";

import { Provider as ReduxProvider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { store } from "@/redux/store";
import { getQueryClient } from "@/lib/react-query";
import { TenantContext } from "@/lib/tenant-context";
import { ServiceWorkerRegistration } from "@/components/common/ServiceWorkerRegistration";
import { SidebarProvider } from "@/hooks/useSidebar";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isPlatformOwner } from "@/utils/auth";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use singleton QueryClient to prevent multiple instances
  // This is critical for React Query to work properly with Next.js App Router
  const queryClient = getQueryClient();

  // Tenant context from localStorage
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [platformOwner, setPlatformOwner] = useState(false);

  // Get current pathname to conditionally render sidebar
  const pathname = usePathname();
  // Handle both /login and /login/ paths
  const isLoginPage = pathname === "/login" || pathname === "/login/";

  useEffect(() => {
    // Read tenant_id and role from localStorage
    if (typeof window !== "undefined") {
      const storedTenantId = localStorage.getItem("tenant_id");
      setTenantId(storedTenantId);
      setPlatformOwner(isPlatformOwner());
    }
  }, []);

  return (
    <ReduxProvider store={store}>
      <TenantContext.Provider value={{ tenantId, isPlatformOwner: platformOwner }}>
        <QueryClientProvider client={queryClient}>
          <SidebarProvider>
            <div className="overflow-x-hidden w-full">
              {isLoginPage ? (
                // Login page - no sidebar/layout wrapper
                <>
                  <ServiceWorkerRegistration />
                  {children}
                  <Toaster richColors position="top-right" />
                  <ReactQueryDevtools initialIsOpen={false} />
                </>
              ) : (
                // All other pages - with sidebar
                <LayoutWrapper>
                  <ServiceWorkerRegistration />
                  {children}
                  <Toaster richColors position="top-right" />
                  <ReactQueryDevtools initialIsOpen={false} />
                </LayoutWrapper>
              )}
            </div>
          </SidebarProvider>
        </QueryClientProvider>
      </TenantContext.Provider>
    </ReduxProvider>
  );
}

