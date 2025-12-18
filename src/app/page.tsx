"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/common/StatCard";
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
import { BillingPanel } from "@/components/billing/BillingPanel";
import { LabTestsPanel } from "@/components/lab-tests/LabTestsPanel";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { QueueBoard } from "@/components/queue/QueueBoard";
import { PatientDetailView } from "@/components/patients/PatientDetailView";
import { UserTable } from "@/components/users/UserTable";
import { UserFormModal } from "@/components/users/UserFormModal";
import { PaymentSummaryModal } from "@/components/payments/PaymentSummaryModal";
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
} from "lucide-react";

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
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userActiveTab, setUserActiveTab] = useState<"admin" | "doctor" | "nurse" | "receptionist" | "all">("all");
  const [opdActiveTab, setOpdActiveTab] = useState<"appointments" | "opd">("appointments");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalType, setPaymentModalType] = useState<"collected" | "pending">("collected");
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

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

  useEffect(() => {
    const syncHash = () => {
      const raw = window.location.hash.replace("#", "");
      const hash =
        raw === "lookup" ? "patients" : (raw as typeof activeSection);
      setActiveSection(hash || "dashboard");
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
  const pendingBillingRecords = useMemo(
    () =>
      billing
        .filter((rec) => rec.status === "Pending")
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
    [billing]
  );

  const show = (tab: typeof activeSection) => activeSection === tab;

  // Show nothing while checking auth
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="lg:pl-72">
      <Sidebar />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <TopBar onPatientSelect={(patientId) => setSelectedPatientId(patientId)} />

        {show("dashboard") && (
          <div className="grid gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total patients"
                value={patients.length}
                hint="Managed today"
                icon={HeartPulse}
                tone="sky"
              />
              <StatCard
                label="Active admissions"
                value={activeAdmissions}
                hint={`${admittedCount} total admissions loaded`}
                icon={BedDouble}
                tone="emerald"
              />
              <StatCard
                label="Pending billing"
                value={currency(totalPending)}
                hint="Outstanding invoices"
                icon={Stethoscope}
                tone="amber"
              />
              <StatCard
                label="OPD queue"
                value={totalQueue}
                hint="Tokens live"
                icon={LayoutList}
                tone="fuchsia"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="card col-span-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    Quick actions
                  </p>
                  <span className="pill bg-sky-50 text-sky-700">Today</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                  <button
                    onClick={() => {
                      window.location.hash = "patients";
                      setActiveSection("patients");
                      setEditingPatient(null);
                      setShowPatientModal(true);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                  >
                    + Add patient
                  </button>
                  <button
                    onClick={() => {
                      window.location.hash = "opd";
                      setActiveSection("opd");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                  >
                    Generate OPD
                  </button>
                  <button
                    onClick={() => {
                      window.location.hash = "admissions";
                      setActiveSection("admissions");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                  >
                    Admit patient
                  </button>
                  <button
                    onClick={() => {
                      window.location.hash = "billing";
                      setActiveSection("billing");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                  >
                    Collect payment
                  </button>
                </div>
              </div>

              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    Revenue snapshot
                  </p>
                  <span className="pill bg-emerald-50 text-emerald-700">
                    {billing.length} records
                  </span>
                </div>
                <div className="flex flex-col gap-2 text-sm text-slate-700">
                  <button
                    onClick={() => {
                      setPaymentModalType("collected");
                      setShowPaymentModal(true);
                    }}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition hover:border-sky-300 hover:bg-sky-50 cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800">Collected</span>
                    <span className="text-emerald-600">{currency(totalCollected)}</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaymentModalType("pending");
                      setShowPaymentModal(true);
                    }}
                    className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 transition hover:border-amber-300 hover:bg-amber-100 cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800">Pending</span>
                    <span className="text-amber-700">{currency(totalPending)}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="card p-4 space-y-3 xl:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Recent admissions</p>
                  <span className="text-xs text-slate-500">Latest 5</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr className="border-b border-slate-100">
                        <th className="py-2 text-left">Patient</th>
                        <th className="py-2 text-left">Ward/Bed</th>
                        <th className="py-2 text-left">Doctor</th>
                        <th className="py-2 text-left">Status</th>
                        <th className="py-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentAdmissions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-500">
                            No admissions yet
                          </td>
                        </tr>
                      )}
                      {recentAdmissions.map((adm) => (
                        <tr key={adm.id} className="hover:bg-slate-50/50">
                          <td className="py-3">
                            <div className="font-semibold text-slate-900">{adm.patient_name || "Patient"}</div>
                            <div className="text-xs text-slate-500">#{adm.admission_number}</div>
                          </td>
                          <td className="py-3 text-slate-700">
                            {adm.ward_name || "Ward"} • {adm.bed_number || "Bed"}
                          </td>
                          <td className="py-3 text-slate-700">
                            {adm.doctor_name || "Doctor"}
                          </td>
                          <td className="py-3">
                            <span className="pill bg-sky-50 text-sky-700 px-2 py-0.5 text-xs font-medium capitalize">
                              {adm.status}
                            </span>
                          </td>
                          <td className="py-3 text-slate-700">
                            {adm.admission_date || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Pending bills</p>
                  <span className="text-xs text-slate-500">Top 5</span>
                </div>
                <div className="space-y-3">
                  {pendingBillingRecords.length === 0 && (
                    <p className="text-sm text-slate-500">No pending bills</p>
                  )}
                  {pendingBillingRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="text-sm text-slate-800">
                        <p className="font-semibold">Record #{rec.id.slice(0, 6)}</p>
                        <p className="text-xs text-slate-500">Items: {rec.items?.length || 0}</p>
                      </div>
                      <span className="text-amber-700 font-semibold">{currency(rec.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {show("analytics") && (
          <div className="mt-6 grid gap-6">
            <Section
              id="analytics"
              title="Operational Analytics"
              description="Monitor admissions, utilization, revenue, and efficiency."
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
            <ManageIPD />
          </div>
        )}

        {show("billing") && (
          <div className="mt-6 grid gap-6">
            <Section
              id="billing"
              title="Billing & Receipt"
              description="Itemized charges, real-time totals, and printable receipts."
            >
              <BillingPanel />
            </Section>
        </div>
        )}

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

        <UserFormModal
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          defaultValues={editingUser ?? undefined}
        />

        <PaymentSummaryModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          type={paymentModalType}
        />
      </main>
    </div>
  );
}
