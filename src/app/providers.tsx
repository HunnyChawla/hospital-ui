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
import { useEffect, useState } from "react";
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
          <ServiceWorkerRegistration />
          {children}
          <Toaster richColors position="top-right" />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </TenantContext.Provider>
    </ReduxProvider>
  );
}

