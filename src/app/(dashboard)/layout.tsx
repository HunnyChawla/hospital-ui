"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { restoreSession, fetchUserDetails } from "@/redux/authSlice";
import { fetchTenant } from "@/redux/tenantSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { fetchWards } from "@/redux/wardsSlice";
import { fetchBeds } from "@/redux/bedsSlice";
import { TopBar } from "@/components/layout/TopBar";

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
    <div className={`mx-4 mb-4 rounded-xl border ${bgColor} p-4 shadow-sm`}>
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
  const dispatch = useAppDispatch();
  const { isAuthenticated, userDetails } = useAppSelector((s) => s.auth);
  const tenant = useAppSelector((s) => s.tenant);
  const doctors = useAppSelector((s) => s.doctors);
  const wards = useAppSelector((s) => s.wards);
  const beds = useAppSelector((s) => s.beds);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

  useEffect(() => {
    // Restore session on mount
    const checkAuth = async () => {
      await dispatch(restoreSession());

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
    checkAuth();
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
    <main className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
      <TopBar onPatientSelect={(patientId) => {
        // Handle patient selection - will be implemented with patient detail route
        console.log('Selected patient:', patientId);
      }} />
      <LicenseExpiryAlert />
      {children}
    </main>
  );
}
