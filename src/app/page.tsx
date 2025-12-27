"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/common/StatCard";
import { EnhancedStatCard } from "@/components/common/EnhancedStatCard";
import { Section } from "@/components/common/Section";
import { PatientTable } from "@/components/patients/PatientTable";
import { PatientFormModal } from "@/components/patients/PatientFormModal";
import { DoctorTable } from "@/components/doctors/DoctorTable";
import { DoctorFormModal } from "@/components/doctors/DoctorFormModal";
import { ConsultationFeeFormModal } from "@/components/doctors/ConsultationFeeFormModal";
import { OpdForm } from "@/components/opd/OpdForm";
import { AppointmentFormModal } from "@/components/opd/AppointmentFormModal";
import { AppointmentsList } from "@/components/opd/AppointmentsList";
import { OpdList } from "@/components/opd/OpdList";
import { OpdFormModal } from "@/components/opd/OpdFormModal";
import { LabBookingFormModal } from "@/components/lab-bookings/LabBookingFormModal";
import { LabBookingsList } from "@/components/lab-bookings/LabBookingsList";
import { LabTechnicianPanel } from "@/components/lab-technician/LabTechnicianPanel";
import { ManageIPD } from "@/components/ipd/ManageIPD";
import { AdmissionFormModal } from "@/components/ipd/AdmissionFormModal";
import { BillingManagement } from "@/components/billing/BillingManagement";
import { LabTestsPanel } from "@/components/lab-tests/LabTestsPanel";
import { ServicesPanel } from "@/components/services/ServicesPanel";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { QueueBoard } from "@/components/queue/QueueBoard";
import { PatientDetailView } from "@/components/patients/PatientDetailView";
import { UserTable } from "@/components/users/UserTable";
import { UserFormModal } from "@/components/users/UserFormModal";
import { DailyRevenueCard } from "@/components/dashboard/DailyRevenueCard";
import { DashboardBillingList } from "@/components/dashboard/DashboardBillingList";
import { RecentAdmissionsList } from "@/components/dashboard/RecentAdmissionsList";
import { AdmissionDetailModal } from "@/components/ipd/AdmissionDetailModal";
import { MRDPanel } from "@/components/mrd/MRDPanel";
import { useTenant } from "@/hooks/useTenant";
import { formatDate } from "@/utils/format";
import { analyticsApi } from "@/services/analyticsApi";
import { Patient } from "@/types";
import { Doctor } from "@/services/doctorsApi";
import { User } from "@/services/usersApi";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchAdmissions } from "@/redux/admissionsSlice";
import { fetchBilling } from "@/redux/billingSlice";
import { fetchPatients } from "@/redux/patientsSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { restoreSession } from "@/redux/authSlice";
import { fetchTenant } from "@/redux/tenantSlice";
import { currency } from "@/utils/format";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  HeartPulse,
  LayoutList,
  Stethoscope,
  CalendarPlus,
  Calendar,
  Beaker,
  Users2,
  CreditCard,
  BarChart3,
  RefreshCw,
  Coins,
  X,
} from "lucide-react";

// Inline License utility functions to avoid Turbopack HMR issues
function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function isExpiringSoon(expiryDate: string | null, daysThreshold: number = 7): boolean {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  if (daysUntil === null) return false;
  return daysUntil <= daysThreshold && daysUntil >= 0;
}

function isExpired(expiryDate: string | null): boolean {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  if (daysUntil === null) return false;
  return daysUntil < 0;
}

function getExpiryMessage(expiryDate: string | null): string | null {
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
  } else {
    return null;
  }
}

// Inline License Expiry Alert component to avoid Turbopack HMR issues
function LicenseExpiryAlert() {
  const { tenant } = useTenant();
  const [dismissed, setDismissed] = useState(false);
  
  if (!tenant?.license_valid_till || dismissed) {
    return null;
  }
  
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
        <AlertTriangle className={`h-5 w-5 shrink-0 ${iconColor} mt-0.5`} />
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
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BillingSection() {
  const [searchBox, setSearchBox] = useState<React.ReactNode>(null);
  const [filterBox, setFilterBox] = useState<React.ReactNode>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "partial" | "refunded">("all");

  return (
    <div className="mt-6 grid gap-6">
      <Section
        id="billing"
        title="Billing & Receipts"
        description="Manage invoices and payment receipts for patients."
        action={
          <div className="flex items-center gap-3">
            {searchBox}
            {filterBox}
          </div>
        }
      >
        <BillingManagement 
          renderSearchInHeader={setSearchBox}
          renderFilterInHeader={setFilterBox}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </Section>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const tenant = useAppSelector((s) => s.tenant);
  const patients = useAppSelector((s) => s.patients.list);
  const admissions = useAppSelector((s) => s.admissions.list);
  const billing = useAppSelector((s) => s.billing.records);
  const queue = useAppSelector((s) => s.queue.entries);
  const doctors = useAppSelector((s) => s.doctors.list);
  const doctorsLoading = useAppSelector((s) => s.doctors.loading);
  const [activeSection, setActiveSection] = useState<
    | "dashboard"
    | "analytics"
    | "patients"
    | "doctors"
    | "opd"
    | "lab-bookings"
    | "lab-technician"
    | "admissions"
    | "billing"
    | "labs"
    | "services"
    | "queue"
    | "users"
    | "mrd"
  >("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [showConsultationFeeModal, setShowConsultationFeeModal] = useState(false);
  const [selectedDoctorForFees, setSelectedDoctorForFees] = useState<Doctor | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showOpdModal, setShowOpdModal] = useState(false);
  const [showLabBookingModal, setShowLabBookingModal] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [ipdDefaultTab, setIpdDefaultTab] = useState<"wards" | "beds" | "admissions">("wards");
  const [dashboardBillingFilter, setDashboardBillingFilter] = useState<"pending" | "paid">("pending");
  const [showAdmissionDetailModal, setShowAdmissionDetailModal] = useState(false);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userActiveTab, setUserActiveTab] = useState<"admin" | "doctor" | "nurse" | "receptionist" | "all">("all");
  const [opdActiveTab, setOpdActiveTab] = useState<"appointments" | "opd">("appointments");
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [bedOccupancy, setBedOccupancy] = useState<{ occupied: number; total: number; occupancy: number } | null>(null);
  const [appointmentInsights, setAppointmentInsights] = useState<{ today: number; completed: number; scheduled: number } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(false);
  const [analyticsRefreshSignal, setAnalyticsRefreshSignal] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Restore session on mount
    dispatch(restoreSession());
    
    // Get user role from localStorage
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role");
      setUserRole(role);
    }
    
    // Fetch tenant data if not already loaded
    const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
    if (tenantId && (!tenant.tenant && !tenant.loading)) {
      dispatch(fetchTenant(tenantId));
    }
  }, [dispatch, tenant]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchAdmissions({}));
      dispatch(fetchBilling());
      dispatch(fetchPatients({}));
      dispatch(fetchDoctors());
      fetchPaymentTotals();
      fetchDashboardInsights();
    }
  }, [dispatch, isAuthenticated]);

  const fetchPaymentTotals = async () => {
    try {
      // Use analytics API to get revenue totals - much more efficient!
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      
      const revenueData = await analyticsApi.revenue({
        start_date: oneYearAgo.toISOString().split("T")[0],
        end_date: today.toISOString().split("T")[0],
        granularity: "monthly", // Use monthly to get aggregated totals
      });

      // Sum up all collected and outstanding amounts
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
    } catch (err) {
      console.error("Failed to fetch payment totals:", err);
      // Keep using default values (0) if fetch fails
      // This won't break the app, just won't show totals until API is available
    }
  };

  const fetchDashboardInsights = async () => {
    setInsightsLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString().split("T")[0];

      // Fetch bed occupancy
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
      } catch (err) {
        console.error("Failed to fetch bed occupancy:", err);
      }

      // Fetch appointment summary for today
      try {
        const appointmentData = await analyticsApi.appointmentSummary({
          start_date: todayStr,
          end_date: todayStr,
          granularity: "daily",
        });
        const todayAppointmentData = appointmentData.data[0];
        if (todayAppointmentData) {
          setAppointmentInsights({
            today: todayAppointmentData.scheduled + todayAppointmentData.confirmed,
            completed: todayAppointmentData.completed,
            scheduled: todayAppointmentData.scheduled,
          });
        }
      } catch (err) {
        console.error("Failed to fetch appointment summary:", err);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const refreshDashboard = async () => {
    setDashboardRefreshing(true);
    try {
      // Refresh core datasets used on dashboard
      dispatch(fetchAdmissions({}));
      dispatch(fetchBilling());
      dispatch(fetchPatients({}));
      dispatch(fetchDoctors());

      // Refresh analytics-derived numbers
      await Promise.all([fetchPaymentTotals(), fetchDashboardInsights()]);

      // Trigger analytics panel to reload its internal analytics APIs
      setAnalyticsRefreshSignal((s) => s + 1);
    } catch (err) {
      console.error("Failed to refresh dashboard:", err);
    } finally {
      setDashboardRefreshing(false);
    }
  };

  useEffect(() => {
    const syncHash = () => {
      const raw = window.location.hash.replace("#", "");
      let hash: typeof activeSection = "dashboard";
      if (raw === "lookup") {
        hash = "patients";
      } else if (raw === "mrd") {
        hash = "mrd";
      } else if (raw && ["dashboard", "analytics", "patients", "doctors", "opd", "lab-bookings", "lab-technician", "admissions", "billing", "labs", "services", "queue", "users"].includes(raw)) {
        hash = raw as typeof activeSection;
      }
      setActiveSection(hash);
      // Reset IPD tab to wards when navigating away from admissions
      if (hash !== "admissions") {
        setIpdDefaultTab("wards");
      }
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  // When the dashboard tab becomes active, refresh dashboard data
  useEffect(() => {
    if (activeSection === "dashboard") {
      refreshDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // When analytics tab becomes active, refresh dashboard & analytics
  useEffect(() => {
    if (activeSection === "analytics") {
      refreshDashboard();
      // also trigger analytics child reload
      setAnalyticsRefreshSignal((s) => s + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const admittedCount = admissions.length;
  const totalQueue = queue.length;
  // Use actual invoice totals instead of old billing records
  const revenue = totalCollected;
  const pendingBills = totalPending;
  const activeAdmissions = useMemo(
    () => admissions.filter((a) => a.status === "admitted").length,
    [admissions]
  );
  const recentAdmissions = useMemo(
    () =>
      [...admissions]
        .sort((a, b) => (b.admission_date || "").localeCompare(a.admission_date || ""))
        .slice(0, 5),
    [admissions]
  );

  const show = (tab: typeof activeSection) => activeSection === tab;

  // Show nothing while checking auth
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="lg:pl-72">
      <Sidebar />
      <main className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
        <TopBar onPatientSelect={(patientId) => setSelectedPatientId(patientId)} />
        <LicenseExpiryAlert />

        {show("dashboard") && (
          <div className="grid gap-4">
            <div className="flex justify-end">
              <button
                onClick={() => refreshDashboard()}
                disabled={dashboardRefreshing}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                <span>{dashboardRefreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <EnhancedStatCard
                label="Total patients"
                value={patients.length}
                hint="Registered patients"
                icon={HeartPulse}
                tone="sky"
                insights={appointmentInsights ? [
                  {
                    label: "Appointments today",
                    value: appointmentInsights.today,
                    trend: appointmentInsights.today > 0 ? "up" : "neutral",
                  },
                  {
                    label: "Completed",
                    value: appointmentInsights.completed,
                    trend: appointmentInsights.completed > 0 ? "up" : "neutral",
                  },
                ] : undefined}
                loading={insightsLoading}
              />
              <EnhancedStatCard
                label="Active admissions"
                value={activeAdmissions}
                hint={`${admittedCount} total admissions`}
                icon={BedDouble}
                tone="emerald"
                insights={bedOccupancy ? [
                  {
                    label: "Beds occupied",
                    value: `${bedOccupancy.occupied}/${bedOccupancy.total}`,
                    trend: bedOccupancy.occupancy > 80 ? "up" : bedOccupancy.occupancy < 50 ? "down" : "neutral",
                  },
                  {
                    label: "Occupancy rate",
                    value: `${bedOccupancy.occupancy}%`,
                    trend: bedOccupancy.occupancy > 80 ? "up" : "neutral",
                  },
                ] : undefined}
                loading={insightsLoading}
              />
              <EnhancedStatCard
                label="Pending billing"
                value={currency(totalPending)}
                hint="Outstanding invoices"
                icon={Coins}
                tone="amber"
                insights={[
                  {
                    label: "Total collected",
                    value: currency(totalCollected),
                    trend: totalCollected > 0 ? "up" : "neutral",
                  },
                ]}
                loading={false}
              />
              <DailyRevenueCard />
            </div>

            {/* Quick Actions - Enhanced for Hospital Staff */}
            <div className="card p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {/* Patient Management */}
                <button
                  onClick={() => {
                    window.location.hash = "patients";
                    setActiveSection("patients");
                    setEditingPatient(null);
                    setShowPatientModal(true);
                  }}
                  className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-sky-50/30 p-3 text-center transition-all hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100"
                >
                  <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 transition-transform group-hover:scale-110 group-hover:bg-sky-200">
                    <HeartPulse className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Add Patient</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Register new</p>
                </button>

                {/* Appointment Booking */}
                <button
                  onClick={() => {
                    window.location.hash = "opd";
                    setActiveSection("opd");
                    setOpdActiveTab("appointments");
                    setShowAppointmentModal(true);
                  }}
                  className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-emerald-50/30 p-3 text-center transition-all hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100"
                >
                  <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110 group-hover:bg-emerald-200">
                    <CalendarPlus className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Book Appointment</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Schedule visit</p>
                </button>

                {/* OPD Visit */}
                <button
                  onClick={() => {
                    window.location.hash = "opd";
                    setActiveSection("opd");
                    setOpdActiveTab("opd");
                    setShowOpdModal(true);
                  }}
                  className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-blue-50/30 p-3 text-center transition-all hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100"
                >
                  <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-transform group-hover:scale-110 group-hover:bg-blue-200">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">OPD Visit</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Walk-in patient</p>
                </button>

                {/* Lab Booking */}
                <button
                  onClick={() => {
                    window.location.hash = "lab-bookings";
                    setActiveSection("lab-bookings");
                    setShowLabBookingModal(true);
                  }}
                  className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-purple-50/30 p-3 text-center transition-all hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100"
                >
                  <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 transition-transform group-hover:scale-110 group-hover:bg-purple-200">
                    <Beaker className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Lab Booking</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Test request</p>
                </button>

                {/* Billing */}
                <button
                  onClick={() => {
                    window.location.hash = "billing";
                    setActiveSection("billing");
                  }}
                  className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-amber-50/30 p-3 text-center transition-all hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100"
                >
                  <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition-transform group-hover:scale-110 group-hover:bg-amber-200">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Billing</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Invoices & payments</p>
                </button>

                {/* Admissions */}
                <button
                  onClick={() => {
                    window.location.hash = "admissions";
                    setActiveSection("admissions");
                    setIpdDefaultTab("admissions");
                    setShowAdmissionModal(true);
                  }}
                  className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-emerald-50/30 p-3 text-center transition-all hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100"
                >
                  <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110 group-hover:bg-emerald-200">
                    <BedDouble className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Admit Patient</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">IPD admission</p>
                </button>
              </div>

              {/* Additional Quick Links */}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4">
                <button
                  onClick={() => {
                    window.location.hash = "queue";
                    setActiveSection("queue");
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  <LayoutList className="h-4 w-4" />
                  <span>View Queue</span>
                </button>
                <button
                  onClick={() => {
                    window.location.hash = "patients";
                    setActiveSection("patients");
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  <Users2 className="h-4 w-4" />
                  <span>All Patients</span>
                </button>
                <button
                  onClick={() => {
                    window.location.hash = "analytics";
                    setActiveSection("analytics");
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics</span>
                </button>
                <button
                  onClick={() => {
                    window.location.hash = "labs";
                    setActiveSection("labs");
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  <Beaker className="h-4 w-4" />
                  <span>Lab Catalog</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <div className="card p-3 xl:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-900">Recent admissions</p>
                  <span className="text-xs text-slate-500">Latest 5</span>
                </div>
                <RecentAdmissionsList
                  admissions={recentAdmissions}
                  onAdmissionClick={(admissionId) => {
                    setSelectedAdmissionId(admissionId);
                    setShowAdmissionDetailModal(true);
                  }}
                  onViewAll={() => {
                    window.location.hash = "admissions";
                    setActiveSection("admissions");
                    setIpdDefaultTab("admissions");
                  }}
                />
              </div>

              <div className="card p-3">
                <DashboardBillingList
                  statusFilter={dashboardBillingFilter}
                  onStatusFilterChange={setDashboardBillingFilter}
                />
              </div>
            </div>
          </div>
        )}

        {show("analytics") && (
          <div className="mt-4 grid gap-4">
            <Section
              id="analytics"
              title=""
              description=""
            >
                  <AnalyticsDashboard refreshSignal={analyticsRefreshSignal} onRequestRefresh={() => refreshDashboard()} />
            </Section>
          </div>
        )}

        {show("patients") && (
          <div className="mt-6 grid gap-6">
            <div className="grid gap-5">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Patients
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPatient(null);
                      setShowPatientModal(true);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                  >
                    <Activity className="h-4 w-4" />
                    Add Patient
                  </button>
                </div>
                <div className="mt-4">
                  <PatientTable
                    onPatientClick={(id) => setSelectedPatientId(id)}
                    onEditClick={(patient) => {
                      setEditingPatient(patient);
                      setShowPatientModal(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {show("doctors") && (
          <div className="mt-6 grid gap-6">
            <div className="grid gap-5">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Doctors
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingDoctor(null);
                      setShowDoctorModal(true);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                  >
                    <Stethoscope className="h-4 w-4" />
                    Add Doctor
                  </button>
                </div>
                <div className="mt-4">
                  <DoctorTable
                    onEditClick={(doctor) => {
                      setEditingDoctor(doctor);
                      setShowDoctorModal(true);
                    }}
                    onConfigureFeesClick={(doctor) => {
                      setSelectedDoctorForFees(doctor);
                      setShowConsultationFeeModal(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {show("opd") && (
          <div className="mt-6 grid gap-6">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6">
                <div className="flex gap-2">
                  {[
                    { id: "appointments", label: "Appointments", icon: Calendar },
                    { id: "opd", label: "OPD", icon: Stethoscope },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setOpdActiveTab(tab.id as typeof opdActiveTab)}
                      className={`flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold transition ${
                        opdActiveTab === tab.id
                          ? "border-sky-500 text-sky-700"
                          : "border-transparent text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
                {opdActiveTab === "appointments" && (
                  <button
                    onClick={() => setShowAppointmentModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Create Appointment
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {opdActiveTab === "appointments" && (
                  <div>
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-slate-900">Appointments List</p>
                      <p className="text-xs text-slate-500">View and manage appointments by doctor and date</p>
                    </div>
                    <AppointmentsList />
                  </div>
                )}

                {opdActiveTab === "opd" && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">OPD Visits List</p>
                        <p className="text-xs text-slate-500">View and manage OPD visits by doctor and date</p>
                      </div>
                      <button
                        onClick={() => setShowOpdModal(true)}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                      >
                        <Stethoscope className="h-4 w-4" />
                        Create OPD
                      </button>
                    </div>
                    <OpdList />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {show("lab-bookings") && (
          <div className="mt-6 grid gap-6">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Lab Test Bookings</p>
                  <p className="text-xs text-slate-500">Manage lab test bookings for patients</p>
                </div>
                <button
                  onClick={() => setShowLabBookingModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                >
                  <Beaker className="h-4 w-4" />
                  Create Booking
                </button>
              </div>
              <div className="p-6">
                <LabBookingsList />
              </div>
            </div>
          </div>
        )}

        {show("lab-technician") && (
          <div className="mt-6 grid gap-6">
            {userRole === "lab_technician" || userRole === "admin" ? (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="p-6">
                  <LabTechnicianPanel />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                <p className="text-slate-600">You do not have permission to access this section.</p>
                <p className="mt-2 text-sm text-slate-500">This section is only available to lab technicians and administrators.</p>
              </div>
            )}
          </div>
        )}

        {show("admissions") && (
          <div className="mt-6">
            <ManageIPD defaultTab={ipdDefaultTab} />
          </div>
        )}

        {show("billing") && <BillingSection />}

        {show("labs") && (
          <div className="mt-6 grid gap-6">
            <Section
              id="labs"
              title="Test / Lab Management"
              description="Manage the lab test catalog used in bookings."
            >
              <LabTestsPanel />
            </Section>
          </div>
        )}

        {show("services") && (
          <div className="mt-6 grid gap-6">
            <Section
              id="services"
              title="Service Master"
              description="Create and manage available services."
            >
              <ServicesPanel />
            </Section>
          </div>
        )}

        {show("queue") && (
          <div className="mt-4">
            <QueueBoard />
          </div>
        )}

        {show("mrd") && (
          <div className="mt-6 grid gap-6">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="p-6">
                <MRDPanel />
              </div>
            </div>
          </div>
        )}

        {show("users") && (
          <div className="mt-6 grid gap-6">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6">
                <div className="flex gap-2">
                  {[
                    { id: "all", label: "All Staff", icon: Users2 },
                    { id: "admin", label: "Admin", icon: Users2 },
                    { id: "doctor", label: "Doctors", icon: Stethoscope },
                    { id: "nurse", label: "Nurses", icon: Users2 },
                    { id: "receptionist", label: "Receptionists", icon: Users2 },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setUserActiveTab(tab.id as typeof userActiveTab)}
                      className={`flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold transition ${
                        userActiveTab === tab.id
                          ? "border-sky-500 text-sky-700"
                          : "border-transparent text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setShowUserModal(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                >
                  <Activity className="h-4 w-4" />
                  Add Staff
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <UserTable
                  roleFilter={userActiveTab === "all" ? undefined : userActiveTab}
                  onEditClick={(user) => {
                    setEditingUser(user);
                    setShowUserModal(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {selectedPatientId && (
          <PatientDetailView
            patientId={selectedPatientId}
            onClose={() => setSelectedPatientId(null)}
          />
        )}

        <PatientFormModal
          isOpen={showPatientModal}
          onClose={() => {
            setShowPatientModal(false);
            setEditingPatient(null);
          }}
          defaultValues={editingPatient ?? undefined}
        />

        <DoctorFormModal
          isOpen={showDoctorModal}
          onClose={() => {
            setShowDoctorModal(false);
            setEditingDoctor(null);
          }}
          defaultValues={editingDoctor ?? undefined}
        />

        <ConsultationFeeFormModal
          isOpen={showConsultationFeeModal}
          onClose={() => {
            setShowConsultationFeeModal(false);
            setSelectedDoctorForFees(null);
          }}
          doctorId={selectedDoctorForFees?.id || ""}
        />

        <AppointmentFormModal
          isOpen={showAppointmentModal}
          onClose={() => setShowAppointmentModal(false)}
        />

        <OpdFormModal
          isOpen={showOpdModal}
          onClose={() => setShowOpdModal(false)}
        />

        <LabBookingFormModal
          isOpen={showLabBookingModal}
          onClose={() => setShowLabBookingModal(false)}
        />

        <AdmissionFormModal
          isOpen={showAdmissionModal}
          onClose={() => setShowAdmissionModal(false)}
        />

        {selectedAdmissionId && (
          <AdmissionDetailModal
            isOpen={showAdmissionDetailModal}
            onClose={() => {
              setShowAdmissionDetailModal(false);
              setSelectedAdmissionId(null);
            }}
            admissionId={selectedAdmissionId}
          />
        )}

        <UserFormModal
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          defaultValues={editingUser ?? undefined}
        />
      </main>
    </div>
  );
}
