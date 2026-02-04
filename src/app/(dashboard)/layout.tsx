"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { restoreSession, fetchUserDetails } from "@/redux/authSlice";
import { fetchTenant } from "@/redux/tenantSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { fetchMyPermissions, hydratePermissions } from "@/redux/permissionsSlice";
import { fetchWards } from "@/redux/wardsSlice";
import { fetchBeds } from "@/redux/bedsSlice";
import { store } from "@/redux/store";
import { TopBar } from "@/components/layout/TopBar";
import { Footer } from "@/components/layout/Footer";
import { PatientDetailView } from "@/components/patients/PatientDetailView";
import { usePermissions } from "@/hooks/usePermissions";
import { Shield, Home as HomeIcon } from "lucide-react";

/**
 * LicenseExpiryAlert Component
 * Inline to avoid import issues during migration
 */
function LicenseExpiryAlert() {
  const { tenant } = useAppSelector((s) => s.tenant);
  const [dismissed, setDismissed] = React.useState(false);

  if (!tenant?.license_valid_till || dismissed) {
    return null;
  }

  const getDaysUntilExpiry = (expiryDate: string | null): number | null => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isExpired = (expiryDate: string | null): boolean => {
    const daysUntil = getDaysUntilExpiry(expiryDate);
    return daysUntil !== null && daysUntil < 0;
  };

  const isExpiringSoon = (expiryDate: string | null, threshold = 7): boolean => {
    const daysUntil = getDaysUntilExpiry(expiryDate);
    return daysUntil !== null && daysUntil <= threshold && daysUntil >= 0;
  };

  const getExpiryMessage = (expiryDate: string | null): string | null => {
    if (!expiryDate) return null;
    const daysUntil = getDaysUntilExpiry(expiryDate);
    if (daysUntil === null) return null;

    if (daysUntil < 0) {
      return `License expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`;
    } else if (daysUntil === 0) {
      return 'License expires today';
    } else if (daysUntil === 1) {
      return 'License expires tomorrow';
    } else if (daysUntil <= 7) {
      return `License expires in ${daysUntil} days`;
    }
    return null;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const daysUntil = getDaysUntilExpiry(tenant.license_valid_till);
  const expired = isExpired(tenant.license_valid_till);
  const expiringSoon = isExpiringSoon(tenant.license_valid_till);

  if (!expired && !expiringSoon) {
    return null;
  }

  const message = getExpiryMessage(tenant.license_valid_till);
  const expiryDate = formatDate(tenant.license_valid_till);
  const isUrgent = expired || (daysUntil !== null && daysUntil <= 3);
  const bgColor = isUrgent ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200";
  const textColor = isUrgent ? "text-rose-800" : "text-amber-800";
  const iconColor = isUrgent ? "text-rose-600" : "text-amber-600";

  return (
    <div className={`mx-3 mb-2 rounded-xl border ${bgColor} p-3 shadow-sm`}>
      <div className="flex items-start gap-3">
        <svg className={`h-5 w-5 shrink-0 ${iconColor} mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${textColor} mb-1`}>
            {expired ? "License Expired" : "License Expiring Soon"}
          </h3>
          <p className={`text-sm ${textColor} mb-2`}>
            {message && <span className="font-medium">{message}.</span>}
            {!expired && <span className="ml-1">Expiry date: {expiryDate}</span>}
            {expired && <span className="ml-1">Expired on: {expiryDate}</span>}
          </p>
          <p className={`text-xs ${textColor} opacity-90`}>
            Please renew your license to continue using all features.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`shrink-0 rounded-lg p-1 transition hover:bg-white/50 ${textColor}`}
          aria-label="Dismiss alert"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Dashboard Layout Component
 * Wraps all authenticated routes in the (dashboard) route group
 * Handles authentication check, session restoration, and tenant loading
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, userDetails } = useAppSelector((s) => s.auth);
  const tenant = useAppSelector((s) => s.tenant);
  const doctors = useAppSelector((s) => s.doctors);
  const wards = useAppSelector((s) => s.wards);
  const beds = useAppSelector((s) => s.beds);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Permission-based route protection
  const {
    hasAccess,
    initialized: permissionsInitialized,
    loading: permissionsLoading,
    userRole,
    allowedScreens,
    userPermissions
  } = usePermissions();

  const isAuthorized = useMemo(() => {
    if (!permissionsInitialized || permissionsLoading || !isAuthenticated) return true;

    // Check doctor panel access based on specialization (logic from Sidebar.tsx)
    if (userRole === "doctor") {
      const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
      const currentDoctor = doctors.list?.find((d) => d.user_id === userId);
      const isOphthalmologist = currentDoctor?.specialization === "Ophthalmology";

      if (pathname.startsWith("/optometrist-panel") && !isOphthalmologist) return false;
      if (pathname.startsWith("/doctor-panel") && isOphthalmologist) return false;
    }

    return hasAccess(pathname);
  }, [pathname, permissionsInitialized, permissionsLoading, isAuthenticated, hasAccess, userRole, doctors]);

  // Handle redirection to default screen if root (/) is not the intended start page
  useEffect(() => {
    if (permissionsInitialized && !permissionsLoading && isAuthenticated && pathname === "/") {
      const defaultScreen = userPermissions?.default_screen;

      // If root is not in allowed screens but they have a default screen, go there
      if (defaultScreen && !allowedScreens.includes("/") && defaultScreen !== "/") {
        router.push(defaultScreen);
      }
    }
  }, [permissionsInitialized, permissionsLoading, isAuthenticated, pathname, userPermissions, allowedScreens, router]);

  useEffect(() => {
    // Domain data fetching on mount
    const fetchData = async () => {
      // Fetch user details only if not already loaded
      if (typeof window !== "undefined" && !userDetails) {
        const userId = localStorage.getItem("user_id");
        if (userId) {
          dispatch(fetchUserDetails(userId));
        }
      }

      // Fetch doctors once if not already loaded
      if (doctors.list.length === 0 && !doctors.loading) {
        dispatch(fetchDoctors());
      }

      // Fetch wards once if not already loaded
      if (wards.list.length === 0 && !wards.loading) {
        dispatch(fetchWards());
      }

      // Fetch beds once if not already loaded
      if (beds.list.length === 0 && !beds.loading) {
        dispatch(fetchBeds());
      }

      setIsCheckingAuth(false);
    };
    fetchData();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only redirect to login after we've checked authentication
    // This prevents flickering and unwanted redirects during session restore
    if (!isCheckingAuth && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isCheckingAuth, router]);

  useEffect(() => {
    // Fetch tenant data if not already loaded
    if (isAuthenticated && typeof window !== "undefined") {
      const tenantId = localStorage.getItem("tenant_id");
      if (tenantId && !tenant.tenant && !tenant.loading) {
        dispatch(fetchTenant(tenantId));
      }
    }
  }, [isAuthenticated, dispatch, tenant]);

  // Show nothing while checking auth or if not authenticated
  if (isCheckingAuth || !isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col px-3 py-3 lg:px-6 pb-20">
      <TopBar onPatientSelect={(patientId) => {
        setSelectedPatientId(patientId);
      }} />
      <LicenseExpiryAlert />

      {isAuthorized ? (
        children
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-rose-100 p-6 rounded-full mb-6 ring-8 ring-rose-50">
            <Shield className="h-16 w-16 text-rose-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 max-w-md mb-8">
            You do not have permission to access the <span className="font-semibold text-slate-900">"{pathname}"</span> screen.
            Please contact your administrator if you believe this is an error.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push(userPermissions?.default_screen || "/")}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 transition shadow-lg shadow-sky-100"
            >
              <HomeIcon className="h-4 w-4" />
              {userPermissions?.default_screen && userPermissions.default_screen !== "/" ? "Go to Main Screen" : "Go to Dashboard"}
            </button>
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Patient Detail Modal - Opens when patient selected from global search */}
      {selectedPatientId && (
        <PatientDetailView
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}

      <Footer />
    </main>
  );
}
