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
import { OpdForm } from "@/components/opd/OpdForm";
import { AppointmentFormModal } from "@/components/opd/AppointmentFormModal";
import { AppointmentsList } from "@/components/opd/AppointmentsList";
import { OpdList } from "@/components/opd/OpdList";
import { OpdFormModal } from "@/components/opd/OpdFormModal";
import { LabBookingFormModal } from "@/components/lab-bookings/LabBookingFormModal";
import { LabBookingsList } from "@/components/lab-bookings/LabBookingsList";
import { ManageIPD } from "@/components/ipd/ManageIPD";
import { AdmissionFormModal } from "@/components/ipd/AdmissionFormModal";
import { BillingManagement } from "@/components/billing/BillingManagement";
import { LabTestsPanel } from "@/components/lab-tests/LabTestsPanel";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { QueueBoard } from "@/components/queue/QueueBoard";
import { PatientDetailView } from "@/components/patients/PatientDetailView";
import { UserTable } from "@/components/users/UserTable";
import { UserFormModal } from "@/components/users/UserFormModal";
import { DailyRevenueCard } from "@/components/dashboard/DailyRevenueCard";
import { DashboardBillingList } from "@/components/dashboard/DashboardBillingList";
import { RecentAdmissionsList } from "@/components/dashboard/RecentAdmissionsList";
import { AdmissionDetailModal } from "@/components/ipd/AdmissionDetailModal";
import { analyticsApi } from "@/services/analyticsApi";
import { Patient } from "@/types";
import { Doctor } from "@/services/doctorsApi";
import { User } from "@/services/usersApi";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchAdmissions } from "@/redux/admissionsSlice";
import { fetchBilling } from "@/redux/billingSlice";
import { fetchQueue } from "@/redux/queueSlice";
import { fetchPatients } from "@/redux/patientsSlice";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { restoreSession } from "@/redux/authSlice";
import { currency } from "@/utils/format";
import {
  Activity,
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
} from "lucide-react";

function BillingSection() {
  const [searchBox, setSearchBox] = useState<React.ReactNode>(null);
  const [filterToggle, setFilterToggle] = useState<React.ReactNode>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");

  return (
    <div className="mt-6 grid gap-6">
      <Section
        id="billing"
        title="Billing & Receipts"
        description="Manage invoices and payment receipts for patients."
        action={
          <div className="flex items-center gap-3">
            {searchBox}
            {filterToggle}
          </div>
        }
      >
        <BillingManagement 
          renderSearchInHeader={setSearchBox}
          renderFilterInHeader={setFilterToggle}
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
    | "admissions"
    | "billing"
    | "labs"
    | "queue"
    | "users"
  >("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
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

  useEffect(() => {
    // Restore session on mount
    dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchAdmissions());
      dispatch(fetchBilling());
      dispatch(fetchQueue());
      dispatch(fetchPatients());
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

  useEffect(() => {
    const syncHash = () => {
      const raw = window.location.hash.replace("#", "");
      const hash =
        raw === "lookup" ? "patients" : (raw as typeof activeSection);
      setActiveSection(hash || "dashboard");
      // Reset IPD tab to wards when navigating away from admissions
      if (hash !== "admissions") {
        setIpdDefaultTab("wards");
      }
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

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

        {show("dashboard") && (
          <div className="grid gap-4">
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
                icon={Stethoscope}
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
              <AnalyticsDashboard />
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

        {show("queue") && (
          <div className="mt-6 grid gap-6">
            <Section
              id="queue"
              title="Real-time Queue"
              description="Automatic queue after OPD creation with drag-and-move statuses."
              action={
                <span className="pill bg-emerald-50 text-emerald-700">
                  Live sync enabled
                </span>
              }
            >
              <QueueBoard />
            </Section>
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
