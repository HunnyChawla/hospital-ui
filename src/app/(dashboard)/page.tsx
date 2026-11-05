"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardCustomizer } from "@/components/dashboard/DashboardCustomizer";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchAdmissions } from "@/redux/admissionsSlice";
import { fetchBilling } from "@/redux/billingSlice";
import { fetchPatients } from "@/redux/patientsSlice";
import { analyticsApi } from "@/services/analyticsApi";
import { invoicesApi } from "@/services/invoicesApi";
import { getTenantIdForApi } from "@/utils/auth";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const {
    activeWidgets,
    allConfiguredWidgets,
    loading: layoutLoading,
    isEditing,
    setIsEditing,
    updateLayout,
    resetToHospitalDefaults,
    scope,
    hasTenantOverride,
  } = useDashboardLayout();

  const { hasAccess, initialized: permissionsInitialized, loading: permissionsLoading } =
    usePermissions();

  // Screen permission helpers
  const canAccessIpd = Boolean(
    permissionsInitialized &&
      !permissionsLoading &&
      (hasAccess("/admissions") || hasAccess("/ipd-workspace"))
  );
  const canAccessBilling = Boolean(
    permissionsInitialized && !permissionsLoading && hasAccess("/billing")
  );
  const canAccessPatients = Boolean(
    permissionsInitialized &&
      !permissionsLoading &&
      (hasAccess("/patients") || hasAccess("/opd"))
  );
  const canAccessAnalytics = Boolean(
    permissionsInitialized && !permissionsLoading && hasAccess("/analytics")
  );

  // Listen for open-dashboard-customizer event or ?customize=true URL parameter
  useEffect(() => {
    const handleOpenCustomizer = () => {
      setIsEditing(true);
    };

    window.addEventListener("open-dashboard-customizer", handleOpenCustomizer);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("customize") === "true") {
        setIsEditing(true);
        // Clean URL query param cleanly without reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }

    return () => {
      window.removeEventListener("open-dashboard-customizer", handleOpenCustomizer);
    };
  }, [setIsEditing]);

  // Analytics & Summary states
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [bedOccupancy, setBedOccupancy] = useState<{
    occupied: number;
    total: number;
    occupancy: number;
  } | null>(null);
  const [appointmentInsights, setAppointmentInsights] = useState<{
    today: number;
    completed: number;
    scheduled: number;
  } | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<{
    today: { collected: number; outstanding: number; invoiced: number };
    yesterday: { collected: number; outstanding: number; invoiced: number };
  } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(false);
  const hasLoadedInitialDataRef = useRef(false);

  // Fetch payment totals
  const fetchPaymentTotals = useCallback(
    async (hasAnalytics: boolean, hasBillingPermission: boolean) => {
      try {
        if (hasAnalytics) {
          const today = new Date();
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(today.getFullYear() - 1);

          const revenueData = await analyticsApi.revenue({
            start_date: oneYearAgo.toISOString().split("T")[0],
            end_date: today.toISOString().split("T")[0],
            granularity: "monthly",
          });

          const collected = revenueData.data.reduce(
            (sum, point) => sum + point.collected_amount,
            0
          );
          const pending = revenueData.data.reduce(
            (sum, point) => sum + point.outstanding_amount,
            0
          );

          setTotalCollected(collected);
          setTotalPending(pending);
        } else if (hasBillingPermission) {
          const tenantId =
            typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
          const [pendingInvoices, paidInvoices] = await Promise.all([
            invoicesApi.list({
              page: 1,
              page_size: 100,
              status: "pending",
              tenant_id: getTenantIdForApi(tenantId),
            }),
            invoicesApi.list({
              page: 1,
              page_size: 100,
              status: "paid",
              tenant_id: getTenantIdForApi(tenantId),
            }),
          ]);

          const pending = (pendingInvoices.items || []).reduce(
            (sum, inv) => sum + (inv.balance_amount || inv.total_amount || 0),
            0
          );
          const collected = (paidInvoices.items || []).reduce(
            (sum, inv) => sum + (inv.paid_amount || inv.total_amount || 0),
            0
          );

          setTotalPending(pending);
          setTotalCollected(collected);
        }
      } catch (err) {
        console.error("Failed to fetch payment totals:", err);
      }
    },
    []
  );

  // Fetch dashboard insights (bed occupancy, appointments, daily revenue)
  const fetchDashboardInsights = useCallback(
    async (hasAnalytics: boolean) => {
      if (!hasAnalytics) {
        setInsightsLoading(false);
        return;
      }

      setInsightsLoading(true);
      try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todayStr = today.toISOString().split("T")[0];
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        // Bed occupancy
        if (canAccessIpd) {
          try {
            const bedData = await analyticsApi.bedOccupancy({
              start_date: todayStr,
              end_date: todayStr,
              granularity: "daily",
            });
            const todayBedData = bedData.data[0];
            if (todayBedData) {
              setBedOccupancy({
                occupied: Math.round(todayBedData.avg_occupied_beds),
                total: todayBedData.total_beds,
                occupancy: Math.round(todayBedData.occupancy_pct),
              });
            }
          } catch (e) {
            console.error("Bed occupancy fetch error:", e);
          }
        }

        // Appointments summary
        try {
          const appointmentData = await analyticsApi.appointmentSummary({
            start_date: todayStr,
            end_date: todayStr,
            granularity: "daily",
          });
          const todayAppointmentData = appointmentData.data[0];
          if (todayAppointmentData) {
            setAppointmentInsights({
              today:
                todayAppointmentData.scheduled + todayAppointmentData.confirmed,
              completed: todayAppointmentData.completed,
              scheduled: todayAppointmentData.scheduled,
            });
          }
        } catch (e) {
          console.error("Appointment summary fetch error:", e);
        }

        // Revenue comparison
        try {
          const [todayRev, yesterdayRev] = await Promise.all([
            analyticsApi.revenue({
              start_date: todayStr,
              end_date: todayStr,
              granularity: "daily",
            }),
            analyticsApi.revenue({
              start_date: yesterdayStr,
              end_date: yesterdayStr,
              granularity: "daily",
            }),
          ]);

          setDailyRevenue({
            today: {
              collected: todayRev.data[0]?.collected_amount || 0,
              outstanding: todayRev.data[0]?.outstanding_amount || 0,
              invoiced: todayRev.data[0]?.invoiced_amount || 0,
            },
            yesterday: {
              collected: yesterdayRev.data[0]?.collected_amount || 0,
              outstanding: yesterdayRev.data[0]?.outstanding_amount || 0,
              invoiced: yesterdayRev.data[0]?.invoiced_amount || 0,
            },
          });
        } catch (e) {
          console.error("Daily revenue fetch error:", e);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard insights:", err);
      } finally {
        setInsightsLoading(false);
      }
    },
    [canAccessIpd]
  );

  // Initial load
  useEffect(() => {
    if (
      isAuthenticated &&
      permissionsInitialized &&
      !permissionsLoading &&
      !hasLoadedInitialDataRef.current
    ) {
      if (canAccessIpd) dispatch(fetchAdmissions({}));
      if (canAccessBilling) dispatch(fetchBilling());
      if (canAccessPatients) dispatch(fetchPatients({}));

      fetchPaymentTotals(canAccessAnalytics, canAccessBilling);
      fetchDashboardInsights(canAccessAnalytics);

      hasLoadedInitialDataRef.current = true;
    }
  }, [
    isAuthenticated,
    permissionsInitialized,
    permissionsLoading,
    canAccessIpd,
    canAccessBilling,
    canAccessPatients,
    canAccessAnalytics,
    dispatch,
    fetchPaymentTotals,
    fetchDashboardInsights,
  ]);

  // Refresh handler
  const refreshDashboard = async () => {
    setDashboardRefreshing(true);
    try {
      const promises: Promise<any>[] = [];
      if (canAccessIpd) promises.push(dispatch(fetchAdmissions({})).unwrap());
      if (canAccessBilling) promises.push(dispatch(fetchBilling()).unwrap());
      if (canAccessPatients) promises.push(dispatch(fetchPatients({})).unwrap());

      promises.push(fetchPaymentTotals(canAccessAnalytics, canAccessBilling));
      promises.push(fetchDashboardInsights(canAccessAnalytics));

      await Promise.all(promises);
    } catch (err) {
      console.error("Failed to refresh dashboard:", err);
    } finally {
      setDashboardRefreshing(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-4">
      {/* Auto-Reflowing Dynamic Dashboard Grid */}
      <DashboardGrid
        widgets={activeWidgets}
        isEditing={false}
        onCustomizeClick={() => setIsEditing(true)}
        onRefreshClick={refreshDashboard}
        isRefreshing={dashboardRefreshing}
        insightsLoading={insightsLoading}
        dailyRevenue={dailyRevenue}
        appointmentInsights={appointmentInsights}
        bedOccupancy={bedOccupancy}
        totalCollected={totalCollected}
        totalPending={totalPending}
      />

      {/* Staff Personal Customizer Drawer */}
      <DashboardCustomizer
        open={isEditing}
        onClose={() => setIsEditing(false)}
        configuredWidgets={allConfiguredWidgets}
        onSave={updateLayout}
        onReset={resetToHospitalDefaults}
        scope={scope}
        hasTenantOverride={hasTenantOverride}
      />
    </div>
  );
}
