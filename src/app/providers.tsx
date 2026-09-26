/* Providers for Redux + React Query + Toasts */
"use client";

import { Provider as ReduxProvider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { FullscreenAwareToaster } from "@/components/common/FullscreenAwareToaster";
import { store } from "@/redux/store";
import { getQueryClient } from "@/lib/react-query";
import { TenantContext } from "@/lib/tenant-context";
import { ServiceWorkerRegistration } from "@/components/common/ServiceWorkerRegistration";
import { SidebarProvider } from "@/hooks/useSidebar";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isPlatformOwner } from "@/utils/auth";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setConsentRequired } from "@/redux/authSlice";
import { ForceChangePasswordModal } from "@/components/password/ForceChangePasswordModal";
import { ForceAcceptTermsModal } from "@/components/legal/ForceAcceptTermsModal";

/**
 * Global Password Change Modal
 * Renders at the provider level to ensure it shows immediately after login
 * without waiting for dashboard's auth check
 */
function GlobalPasswordChangeModal() {
  const { isAuthenticated, mustChangePassword } = useAppSelector((s) => s.auth);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/login/" || pathname === "/tv-login";

  // Only show if user is authenticated, must change password, and not on login page
  if (!isAuthenticated || !mustChangePassword || isLoginPage) {
    return null;
  }

  return <ForceChangePasswordModal isOpen={true} />;
}

/**
 * Global Legal Terms & Privacy Consent Modal
 * Renders at the provider level immediately after auth or mid-session when new terms are published
 */
function GlobalLegalConsentModal() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, consentRequired, mustChangePassword } = useAppSelector((s) => s.auth);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/login/" || pathname === "/tv-login";

  useEffect(() => {
    const handleConsentRequired = () => {
      dispatch(setConsentRequired(true));
    };
    window.addEventListener("legal:consent_required", handleConsentRequired);
    return () => {
      window.removeEventListener("legal:consent_required", handleConsentRequired);
    };
  }, [dispatch]);

  // Only show if user is authenticated, consent is required, not changing password first, and not on login page
  if (!isAuthenticated || !consentRequired || mustChangePassword || isLoginPage) {
    return null;
  }

  return <ForceAcceptTermsModal isOpen={true} />;
}

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
  // Handle both /login and /login/ paths, and /tv-login for standalone auth
  const isLoginPage = pathname === "/login" || pathname === "/login/" || pathname === "/tv-login";

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
                  <FullscreenAwareToaster />
                  <ReactQueryDevtools initialIsOpen={false} />
                </>
              ) : (
                // All other pages - with sidebar
                <LayoutWrapper>
                  <ServiceWorkerRegistration />
                  {children}
                  <FullscreenAwareToaster />
                  <ReactQueryDevtools initialIsOpen={false} />
                </LayoutWrapper>
              )}
              {/* Global Force Change Password Modal - renders immediately after auth */}
              <GlobalPasswordChangeModal />
              {/* Global Legal Consent Modal - renders immediately after auth or when terms update */}
              <GlobalLegalConsentModal />
            </div>
          </SidebarProvider>
        </QueryClientProvider>
      </TenantContext.Provider>
    </ReduxProvider>
  );
}
